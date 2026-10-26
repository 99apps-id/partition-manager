//! Partition Manager backend.
//!
//! All real disk work happens here, on Windows, through the Windows Storage
//! PowerShell module (Get-Disk / Get-Partition / Get-Volume /
//! Get-StorageReliabilityCounter for reads, and the matching Set/New/Remove
//! cmdlets for writes). A browser cannot enumerate or modify disks, which is
//! why this app ships as a Tauri desktop application: the frontend asks this
//! layer for real data instead of rendering sample data.
//!
//! Safety model:
//! - Reads work without elevation.
//! - Writes require an elevated (administrator) process; the frontend shows
//!   the elevation state and this layer refuses write operations otherwise.
//! - Operations run sequentially and stop at the first failure, so a batch
//!   never continues on top of a half-applied layout change.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::process::Command;

const GIB: f64 = 1_073_741_824.0;

// ---------------------------------------------------------------------------
// DTOs shared with the frontend (field names match src/types/partition.ts)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentInfo {
    platform: String,
    is_elevated: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackendOp {
    id: String,
    kind: String,
    disk_number: u32,
    partition_number: Option<u32>,
    /// Current drive letter without colon, e.g. "C". Empty when none.
    drive_letter: String,
    params: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpOutcome {
    id: String,
    ok: bool,
    message: String,
}

// ---------------------------------------------------------------------------
// PowerShell plumbing
// ---------------------------------------------------------------------------

fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

/// Runs a PowerShell script on Windows and returns stdout.
/// Returns Err with the PowerShell error text when the script fails.
fn run_powershell(script: &str) -> Result<String, String> {
    if !is_windows() {
        return Err(
            "Disk operations are only supported on Windows. This build is running on a different platform."
                .to_string(),
        );
    }
    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to start PowerShell: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let detail = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("PowerShell exited with code {:?}", output.status.code())
        };
        Err(detail)
    }
}

fn check_elevated() -> bool {
    if !is_windows() {
        return false;
    }
    let script = "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)";
    matches!(run_powershell(script), Ok(out) if out.eq_ignore_ascii_case("true"))
}

fn ps_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn gb_to_bytes(gb: f64) -> i64 {
    (gb * GIB).round() as i64
}

fn valid_letter(raw: &str) -> Option<char> {
    let mut chars = raw.trim().trim_end_matches(':').chars();
    match (chars.next(), chars.next()) {
        (Some(c), None) if c.is_ascii_alphabetic() => Some(c.to_ascii_uppercase()),
        _ => None,
    }
}

fn valid_filesystem(raw: &str) -> Result<&'static str, String> {
    match raw.trim().to_ascii_uppercase().as_str() {
        "NTFS" => Ok("NTFS"),
        "FAT32" => Ok("FAT32"),
        "EXFAT" => Ok("exFAT"),
        "REFS" => Ok("ReFS"),
        other => Err(format!("Unsupported file system: {other}")),
    }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_environment() -> EnvironmentInfo {
    EnvironmentInfo {
        platform: std::env::consts::OS.to_string(),
        is_elevated: check_elevated(),
    }
}

const LIST_DISKS_SCRIPT: &str = r#"
$ErrorActionPreference = 'Stop'
try { Update-HostStorageCache -ErrorAction SilentlyContinue } catch {}
$volumes = @{}
foreach ($v in @(Get-Volume -ErrorAction SilentlyContinue)) {
  if ($v.DriveLetter) { $volumes[[string]$v.DriveLetter] = $v }
}
$physical = @{}
foreach ($pd in @(Get-PhysicalDisk -ErrorAction SilentlyContinue)) { $physical[[string]$pd.DeviceId] = $pd }
$out = @()
foreach ($d in @(Get-Disk | Sort-Object Number)) {
  $rel = $null
  $pd = $physical[[string]$d.Number]
  if ($pd) { try { $rel = Get-StorageReliabilityCounter -PhysicalDisk $pd -ErrorAction Stop } catch {} }
  $parts = @()
  foreach ($p in @(Get-Partition -DiskNumber $d.Number -ErrorAction SilentlyContinue | Sort-Object Offset)) {
    $vol = $null
    if ($p.DriveLetter) { $vol = $volumes[[string]$p.DriveLetter] }
    $parts += [pscustomobject]@{
      Number = $p.PartitionNumber; Offset = [int64]$p.Offset; Size = [int64]$p.Size
      DriveLetter = if ($p.DriveLetter) { [string]$p.DriveLetter } else { '' }
      Type = [string]$p.Type; GptType = [string]$p.GptType; MbrType = $p.MbrType
      IsActive = [bool]$p.IsActive; IsBoot = [bool]$p.IsBoot; IsSystem = [bool]$p.IsSystem; IsHidden = [bool]$p.IsHidden
      FileSystem = if ($vol) { [string]$vol.FileSystem } else { '' }
      Label = if ($vol) { [string]$vol.FileSystemLabel } else { '' }
      VolumeSize = if ($vol) { [int64]$vol.Size } else { 0 }
      SizeRemaining = if ($vol) { [int64]$vol.SizeRemaining } else { 0 }
      AllocationUnitSize = if ($vol) { [int64]$vol.AllocationUnitSize } else { 0 }
      HealthStatus = if ($vol) { [string]$vol.HealthStatus } else { '' }
    }
  }
  $out += [pscustomobject]@{
    Number = $d.Number; FriendlyName = [string]$d.FriendlyName; SerialNumber = ([string]$d.SerialNumber).Trim()
    Size = [int64]$d.Size; BusType = [string]$d.BusType; PartitionStyle = [string]$d.PartitionStyle
    MediaType = if ($pd) { [string]$pd.MediaType } else { '' }
    Temperature = if ($rel) { $rel.Temperature } else { $null }
    PowerOnHours = if ($rel) { $rel.PowerOnHours } else { $null }
    Wear = if ($rel) { $rel.Wear } else { $null }
    StartStopCycleCount = if ($rel) { $rel.StartStopCycleCount } else { $null }
    ReadErrorsTotal = if ($rel) { $rel.ReadErrorsTotal } else { $null }
    WriteErrorsTotal = if ($rel) { $rel.WriteErrorsTotal } else { $null }
    Partitions = $parts
  }
}
ConvertTo-Json -InputObject $out -Depth 5
"#;

fn v_str(v: &Value, key: &str) -> String {
    v.get(key).and_then(Value::as_str).unwrap_or("").to_string()
}

fn v_i64(v: &Value, key: &str) -> i64 {
    v.get(key).and_then(Value::as_i64).unwrap_or(0)
}

fn v_bool(v: &Value, key: &str) -> bool {
    v.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn v_opt_i64(v: &Value, key: &str) -> Option<i64> {
    v.get(key).and_then(Value::as_i64)
}

fn bytes_to_gb(bytes: i64) -> f64 {
    ((bytes as f64 / GIB) * 100.0).round() / 100.0
}

fn map_partition(disk_number: i64, p: &Value) -> Value {
    let number = v_i64(p, "Number");
    let offset = v_i64(p, "Offset");
    let size = v_i64(p, "Size");
    let letter_raw = v_str(p, "DriveLetter");
    let letter = if letter_raw.is_empty() {
        String::new()
    } else {
        format!("{}:", letter_raw.to_uppercase())
    };
    let gpt_type = v_str(p, "GptType").to_lowercase();
    let ptype_raw = v_str(p, "Type");
    let is_system = v_bool(p, "IsSystem");
    let is_boot = v_bool(p, "IsBoot");
    let is_active = v_bool(p, "IsActive");
    let is_hidden = v_bool(p, "IsHidden");

    let ptype = if gpt_type == "{c12a7328-f81f-11d2-ba4b-00a0c93ec93b}" || is_system {
        "system"
    } else if ptype_raw.eq_ignore_ascii_case("recovery")
        || gpt_type == "{de3bba2c-a143-46f3-ac29-9235b2d2bbe5}"
    {
        "recovery"
    } else if ptype_raw.eq_ignore_ascii_case("reserved") {
        "system" // Microsoft Reserved (MSR): hidden system area
    } else if v_i64(p, "MbrType") == 5 || v_i64(p, "MbrType") == 15 {
        "extended"
    } else {
        "primary"
    };

    let label = v_str(p, "Label");
    let name = if !label.is_empty() {
        label.clone()
    } else if !letter.is_empty() {
        format!("Local Disk {letter}")
    } else {
        match ptype {
            "system" => "EFI System Partition".to_string(),
            "recovery" => "Recovery Partition".to_string(),
            _ => "Partition".to_string(),
        }
    };

    let volume_size = v_i64(p, "VolumeSize");
    let used = if volume_size > 0 {
        bytes_to_gb((volume_size - v_i64(p, "SizeRemaining")).max(0))
    } else {
        0.0
    };
    let fs_raw = v_str(p, "FileSystem");
    let filesystem = match fs_raw.to_uppercase().as_str() {
        "NTFS" => "NTFS",
        "FAT32" => "FAT32",
        "EXFAT" => "exFAT",
        "REFS" => "ReFS",
        _ => "-",
    };
    let status = match v_str(p, "HealthStatus").to_lowercase().as_str() {
        "healthy" => "healthy",
        "warning" => "warning",
        "" => "healthy",
        _ => "error",
    };
    let cluster_kb = v_i64(p, "AllocationUnitSize") / 1024;

    let mut flags: Vec<&str> = Vec::new();
    if is_boot {
        flags.push("Boot");
    }
    if is_system {
        flags.push("System");
    }
    if is_active {
        flags.push("Active");
    }
    if is_hidden {
        flags.push("Hidden");
    }
    if gpt_type == "{c12a7328-f81f-11d2-ba4b-00a0c93ec93b}" {
        flags.push("EFI System");
    }

    json!({
        "id": format!("p{disk_number}-{number}"),
        "number": number,
        "name": name,
        "letter": letter,
        "type": ptype,
        "sizeGB": bytes_to_gb(size),
        "usedGB": used,
        "filesystem": filesystem,
        "status": status,
        "clusterSizeKB": if cluster_kb > 0 { json!(cluster_kb) } else { Value::Null },
        "is4kAligned": offset % 1_048_576 == 0,
        "isActive": is_active,
        "isHidden": is_hidden,
        "volumeLabel": label,
        "startSector": offset / 512,
        "flags": flags,
    })
}

fn unallocated_partition(disk_number: i64, index: i64, offset: i64, size: i64) -> Value {
    json!({
        "id": format!("p{disk_number}-unallocated-{index}"),
        "number": 0,
        "name": "Unallocated Space",
        "letter": "",
        "type": "unallocated",
        "sizeGB": bytes_to_gb(size),
        "usedGB": 0,
        "filesystem": "-",
        "status": "healthy",
        "isActive": false,
        "isHidden": false,
        "volumeLabel": "",
        "startSector": offset / 512,
        "flags": [],
    })
}

fn map_disk(d: &Value) -> Value {
    let number = v_i64(d, "Number");
    let size = v_i64(d, "Size");
    let bus = v_str(d, "BusType");
    let interface = match bus.to_uppercase().as_str() {
        "NVME" => "NVMe",
        "USB" => "USB",
        "SCSI" | "RAID" => "SCSI",
        _ => "SATA",
    };
    let style_raw = v_str(d, "PartitionStyle");
    let style = if style_raw.eq_ignore_ascii_case("GPT") {
        "GPT"
    } else {
        "MBR"
    };
    let wear = v_opt_i64(d, "Wear");
    let health = wear.map(|w| (100 - w).clamp(0, 100)).unwrap_or(100);
    let temperature = v_opt_i64(d, "Temperature").unwrap_or(0);
    let power_hours = v_opt_i64(d, "PowerOnHours").unwrap_or(0);
    let cycles = v_opt_i64(d, "StartStopCycleCount").unwrap_or(0);
    let model = {
        let m = v_str(d, "FriendlyName");
        if m.is_empty() {
            "Unknown Disk".to_string()
        } else {
            m
        }
    };
    let is_ssd = v_str(d, "MediaType").eq_ignore_ascii_case("SSD")
        || bus.eq_ignore_ascii_case("NVMe");

    // Partitions, sorted by offset, with unallocated gaps materialized so the
    // UI can offer "create" on free space like a real partition manager.
    let mut raw_parts: Vec<&Value> = d
        .get("Partitions")
        .and_then(Value::as_array)
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    raw_parts.sort_by_key(|p| v_i64(p, "Offset"));
    let mut partitions: Vec<Value> = Vec::new();
    let mut cursor: i64 = 0;
    let mut gap_index: i64 = 0;
    for p in &raw_parts {
        let offset = v_i64(p, "Offset");
        let psize = v_i64(p, "Size");
        if offset - cursor > 1_048_576 {
            partitions.push(unallocated_partition(number, gap_index, cursor, offset - cursor));
            gap_index += 1;
        }
        partitions.push(map_partition(number, p));
        cursor = cursor.max(offset + psize);
    }
    if size - cursor > 1_048_576 {
        partitions.push(unallocated_partition(number, gap_index, cursor, size - cursor));
    }

    // Conservative SMART summary from the reliability counter. Detailed
    // vendor attributes are not exposed by the Windows Storage stack.
    let mut smart: Vec<Value> = Vec::new();
    if temperature > 0 || power_hours > 0 || wear.is_some() {
        smart.push(json!({
            "id": 194, "name": "Temperature", "current": temperature, "worst": temperature,
            "threshold": 0, "rawValue": format!("{temperature} C"),
            "status": if temperature >= 65 { "Warning" } else { "OK" },
        }));
        smart.push(json!({
            "id": 9, "name": "Power-On Hours", "current": 100, "worst": 100,
            "threshold": 0, "rawValue": power_hours.to_string(), "status": "OK",
        }));
        smart.push(json!({
            "id": 12, "name": "Power Cycle Count", "current": 100, "worst": 100,
            "threshold": 0, "rawValue": cycles.to_string(), "status": "OK",
        }));
        if let Some(w) = wear {
            smart.push(json!({
                "id": 177, "name": "Wear Leveling Count", "current": (100 - w).clamp(0, 100),
                "worst": (100 - w).clamp(0, 100), "threshold": 0, "rawValue": format!("{w} % used"),
                "status": if w >= 90 { "Warning" } else { "OK" },
            }));
        }
        let read_errors = v_opt_i64(d, "ReadErrorsTotal").unwrap_or(0);
        let write_errors = v_opt_i64(d, "WriteErrorsTotal").unwrap_or(0);
        smart.push(json!({
            "id": 1, "name": "Read Errors Total", "current": 100, "worst": 100,
            "threshold": 0, "rawValue": read_errors.to_string(),
            "status": if read_errors > 0 { "Warning" } else { "OK" },
        }));
        smart.push(json!({
            "id": 2, "name": "Write Errors Total", "current": 100, "worst": 100,
            "threshold": 0, "rawValue": write_errors.to_string(),
            "status": if write_errors > 0 { "Warning" } else { "OK" },
        }));
    }

    json!({
        "id": format!("disk-{number}"),
        "number": number,
        "name": format!("Disk {number}"),
        "model": model,
        "serialNumber": v_str(d, "SerialNumber"),
        "sizeGB": bytes_to_gb(size),
        "interface": interface,
        "partitionStyle": style,
        "diskType": "Basic",
        "isSSD": is_ssd,
        "temperatureC": temperature,
        "healthPercent": health,
        "powerOnHours": power_hours,
        "powerCycleCount": cycles,
        "totalBytesWrittenTB": 0,
        "partitions": partitions,
        "smartAttributes": smart,
        "expanded": number == 0,
    })
}

#[tauri::command]
fn list_disks() -> Result<Value, String> {
    if !is_windows() {
        return Err(
            "No disks detected: disk enumeration requires Windows (Windows Storage APIs). Run the desktop app on Windows."
                .to_string(),
        );
    }
    let stdout = run_powershell(LIST_DISKS_SCRIPT)?;
    if stdout.is_empty() {
        return Ok(json!([]));
    }
    let parsed: Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Could not parse disk information from Windows: {e}"))?;
    let raw_disks: Vec<&Value> = match &parsed {
        Value::Array(a) => a.iter().collect(),
        Value::Object(_) => vec![&parsed],
        _ => Vec::new(),
    };
    Ok(Value::Array(raw_disks.iter().map(|d| map_disk(d)).collect()))
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

fn param_f64(params: &Value, key: &str) -> f64 {
    params.get(key).and_then(Value::as_f64).unwrap_or(0.0)
}

fn param_str(params: &Value, key: &str) -> String {
    params
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string()
}

fn build_op_script(op: &BackendOp) -> Result<String, String> {
    let d = op.disk_number;
    let p = op
        .partition_number
        .ok_or_else(|| "This operation needs a target partition.".to_string());
    match op.kind.as_str() {
        "resize_move" => {
            let p = p?;
            if param_f64(&op.params, "spaceBeforeGB") > 0.05 {
                return Err(
                    "Moving a partition (changing its start offset) is not supported yet. Only resizing its end is."
                        .to_string(),
                );
            }
            let size = gb_to_bytes(param_f64(&op.params, "sizeGB"));
            if size <= 0 {
                return Err("Invalid target size.".to_string());
            }
            Ok(format!(
                "Resize-Partition -DiskNumber {d} -PartitionNumber {p} -Size {size} -ErrorAction Stop; 'OK'"
            ))
        }
        "create" => {
            let size = gb_to_bytes(param_f64(&op.params, "sizeGB"));
            if size <= 0 {
                return Err("Invalid partition size.".to_string());
            }
            let letter = valid_letter(&param_str(&op.params, "letter"));
            let letter_arg = match letter {
                Some(l) => format!("-DriveLetter {l}"),
                None => "-AssignDriveLetter".to_string(),
            };
            let fs_raw = param_str(&op.params, "filesystem");
            let mut script = format!(
                "$part = New-Partition -DiskNumber {d} -Size {size} {letter_arg} -ErrorAction Stop;"
            );
            if !fs_raw.is_empty() && fs_raw != "-" {
                let fs = valid_filesystem(&fs_raw)?;
                let label = param_str(&op.params, "name");
                let cluster_kb = param_f64(&op.params, "clusterSizeKB") as i64;
                let cluster_arg = if cluster_kb > 0 {
                    format!(" -AllocationUnitSize {}", cluster_kb * 1024)
                } else {
                    String::new()
                };
                script.push_str(&format!(
                    " Format-Volume -DriveLetter $part.DriveLetter -FileSystem {fs} -NewFileSystemLabel {} -Confirm:$false{} -ErrorAction Stop;",
                    ps_quote(&label),
                    cluster_arg
                ));
            }
            script.push_str(" 'OK'");
            Ok(script)
        }
        "format" => {
            let letter = valid_letter(&op.drive_letter)
                .ok_or_else(|| "The partition has no drive letter. Assign one before formatting.".to_string())?;
            let fs = valid_filesystem(&param_str(&op.params, "filesystem"))?;
            let label = param_str(&op.params, "volumeLabel");
            let cluster_kb = param_f64(&op.params, "clusterSizeKB") as i64;
            let cluster_arg = if cluster_kb > 0 {
                format!(" -AllocationUnitSize {}", cluster_kb * 1024)
            } else {
                String::new()
            };
            Ok(format!(
                "Format-Volume -DriveLetter {letter} -FileSystem {fs} -NewFileSystemLabel {} -Confirm:$false{} -ErrorAction Stop; 'OK'",
                ps_quote(&label),
                cluster_arg
            ))
        }
        "delete" => {
            let p = p?;
            Ok(format!(
                "Remove-Partition -DiskNumber {d} -PartitionNumber {p} -Confirm:$false -ErrorAction Stop; 'OK'"
            ))
        }
        "change_letter" => {
            let p = p?;
            let new_letter = param_str(&op.params, "newLetter");
            match valid_letter(&new_letter) {
                Some(l) => Ok(format!(
                    "Set-Partition -DiskNumber {d} -PartitionNumber {p} -NewDriveLetter {l} -ErrorAction Stop; 'OK'"
                )),
                None => Ok(format!(
                    "$paths = (Get-Partition -DiskNumber {d} -PartitionNumber {p}).AccessPaths | Where-Object {{ $_ -match '^[A-Za-z]:\\\\$' }}; foreach ($ap in $paths) {{ Remove-PartitionAccessPath -DiskNumber {d} -PartitionNumber {p} -AccessPath $ap -ErrorAction Stop }}; 'OK'"
                )),
            }
        }
        "set_active" => {
            let p = p?;
            Ok(format!(
                "Set-Partition -DiskNumber {d} -PartitionNumber {p} -IsActive $true -ErrorAction Stop; 'OK'"
            ))
        }
        "convert_gpt" | "convert_mbr" => {
            let (style, lower) = if op.kind == "convert_gpt" {
                ("GPT", "gpt")
            } else {
                ("MBR", "mbr")
            };
            Ok(format!(
                "$pc = @(Get-Partition -DiskNumber {d} -ErrorAction SilentlyContinue).Count; \
                 if ($pc -gt 0) {{ throw 'Conversion is only allowed on an empty disk to prevent data loss. Back up and delete all partitions first.' }}; \
                 $style = (Get-Disk -Number {d}).PartitionStyle; \
                 if ($style -eq 'RAW') {{ Initialize-Disk -Number {d} -PartitionStyle {style} -ErrorAction Stop }} \
                 else {{ $tmp = New-TemporaryFile; \"select disk {d}`r`nconvert {lower}`r`n\" | Set-Content -Path $tmp -Encoding ASCII; diskpart /s $tmp | Out-Null; Remove-Item $tmp }}; 'OK'"
            ))
        }
        "wipe" => {
            if op.partition_number.is_none() {
                return Err(
                    "Wiping a whole disk is not supported from the app. Wipe individual partitions instead."
                        .to_string(),
                );
            }
            let letter = valid_letter(&op.drive_letter)
                .ok_or_else(|| "The partition has no drive letter. Assign one before wiping.".to_string())?;
            Ok(format!(
                "Format-Volume -DriveLetter {letter} -Confirm:$false -Full -ErrorAction Stop; 'OK'"
            ))
        }
        // The frontend only offers operations this backend can really
        // execute (merge/split/clone/alignment/rebuild-MBR tools were removed
        // from the UI rather than failing or faking success). Anything else
        // arriving here is a programming error and is reported as such.
        other => Err(format!(
            "Unsupported operation type: {other}. It was not executed."
        )),
    }
}

fn run_chkdsk(op: &BackendOp) -> Result<String, String> {
    let letter = valid_letter(&op.drive_letter)
        .ok_or_else(|| "The volume has no drive letter to check.".to_string())?;
    let mut cmd = Command::new("chkdsk.exe");
    cmd.arg(format!("{letter}:"));
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to start chkdsk: {e}"))?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let tail: Vec<&str> = text.lines().rev().take(6).collect();
    let summary = tail
        .iter()
        .rev()
        .cloned()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    match output.status.code() {
        Some(0) => Ok(format!("chkdsk {letter}: no errors found. {summary}")),
        Some(code) => Ok(format!(
            "chkdsk {letter}: finished with code {code}. {summary}"
        )),
        None => Ok(format!("chkdsk {letter}: finished. {summary}")),
    }
}

#[tauri::command]
fn apply_operations(ops: Vec<BackendOp>) -> Result<Vec<OpOutcome>, String> {
    if !is_windows() {
        return Err(
            "Disk operations are only supported on Windows. Nothing was executed.".to_string(),
        );
    }
    if !check_elevated() {
        return Err(
            "Administrator rights are required to modify partitions. Restart Partition Manager as administrator. Nothing was executed."
                .to_string(),
        );
    }
    let mut outcomes: Vec<OpOutcome> = Vec::new();
    let mut failed_at: Option<usize> = None;
    for (idx, op) in ops.iter().enumerate() {
        if failed_at.is_some() {
            outcomes.push(OpOutcome {
                id: op.id.clone(),
                ok: false,
                message: "Skipped because an earlier operation failed.".to_string(),
            });
            continue;
        }
        let result: Result<String, String> = if op.kind == "chkdsk" {
            run_chkdsk(op)
        } else {
            match build_op_script(op) {
                Ok(script) => run_powershell(&script).map(|_| "Completed.".to_string()),
                Err(e) => Err(e),
            }
        };
        match result {
            Ok(message) => outcomes.push(OpOutcome {
                id: op.id.clone(),
                ok: true,
                message,
            }),
            Err(message) => {
                failed_at = Some(idx);
                outcomes.push(OpOutcome {
                    id: op.id.clone(),
                    ok: false,
                    message,
                });
            }
        }
    }
    Ok(outcomes)
}

// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_environment,
            list_disks,
            apply_operations
        ])
        .run(tauri::generate_context!())
        .expect("error while running Partition Manager");
}

// ---------------------------------------------------------------------------
// Tests: the mapping from raw Windows Storage output and the operation
// script generation are pure functions, so they are covered with fixtures
// that mimic real PowerShell output. These tests run on any platform.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const GIB_I: i64 = 1_073_741_824;

    fn efi_partition() -> Value {
        json!({
            "Number": 1, "Offset": 1_048_576, "Size": 272_629_760,
            "DriveLetter": "", "Type": "System",
            "GptType": "{c12a7328-f81f-11d2-ba4b-00a0c93ec93b}", "MbrType": 0,
            "IsActive": false, "IsBoot": false, "IsSystem": true, "IsHidden": true,
            "FileSystem": "FAT32", "Label": "",
            "VolumeSize": 272_629_760, "SizeRemaining": 209_715_200,
            "AllocationUnitSize": 4096, "HealthStatus": "Healthy"
        })
    }

    fn msr_partition() -> Value {
        // The 16 MiB Microsoft Reserved partition that sits between the EFI
        // partition and C: on a real Windows GPT layout.
        json!({
            "Number": 2, "Offset": 273_678_336, "Size": 16_777_216,
            "DriveLetter": "", "Type": "Reserved",
            "GptType": "{e3c9e316-0b5c-4db8-817d-f92df00215ae}", "MbrType": 0,
            "IsActive": false, "IsBoot": false, "IsSystem": false, "IsHidden": true,
            "FileSystem": "", "Label": "",
            "VolumeSize": 0, "SizeRemaining": 0,
            "AllocationUnitSize": 0, "HealthStatus": "Healthy"
        })
    }

    fn windows_partition() -> Value {
        json!({
            "Number": 3, "Offset": 290_455_552, "Size": 300 * GIB_I,
            "DriveLetter": "C", "Type": "Basic",
            "GptType": "{ebd0a0a2-b9e5-4433-87c0-68b6b72699c7}", "MbrType": 0,
            "IsActive": false, "IsBoot": true, "IsSystem": false, "IsHidden": false,
            "FileSystem": "NTFS", "Label": "Windows",
            "VolumeSize": 300 * GIB_I, "SizeRemaining": 120 * GIB_I,
            "AllocationUnitSize": 4096, "HealthStatus": "Healthy"
        })
    }

    fn sample_gpt_disk() -> Value {
        json!({
            "Number": 0, "FriendlyName": "NVMe Samsung SSD 990", "SerialNumber": "S123",
            "Size": 512 * GIB_I, "BusType": "NVMe", "PartitionStyle": "GPT",
            "MediaType": "SSD", "Temperature": 41, "PowerOnHours": 1200,
            "Wear": 5, "StartStopCycleCount": 300,
            "ReadErrorsTotal": 0, "WriteErrorsTotal": 0,
            "Partitions": [efi_partition(), msr_partition(), windows_partition()]
        })
    }

    #[test]
    fn maps_gpt_nvme_disk_identity_and_health() {
        let d = map_disk(&sample_gpt_disk());
        assert_eq!(d["id"], "disk-0");
        assert_eq!(d["number"], 0);
        assert_eq!(d["model"], "NVMe Samsung SSD 990");
        assert_eq!(d["interface"], "NVMe");
        assert_eq!(d["partitionStyle"], "GPT");
        assert_eq!(d["isSSD"], true);
        assert_eq!(d["healthPercent"], 95); // 100 - wear 5
        assert_eq!(d["temperatureC"], 41);
        assert_eq!(d["powerOnHours"], 1200);
        assert_eq!(d["sizeGB"], 512.0);
        assert!(!d["smartAttributes"].as_array().unwrap().is_empty());
    }

    #[test]
    fn maps_partitions_types_letters_and_used_space() {
        let d = map_disk(&sample_gpt_disk());
        let parts = d["partitions"].as_array().unwrap();
        let efi = &parts[0];
        assert_eq!(efi["type"], "system");
        assert_eq!(efi["name"], "EFI System Partition");
        assert_eq!(efi["filesystem"], "FAT32");
        assert_eq!(efi["isHidden"], true);

        let c = parts.iter().find(|p| p["letter"] == "C:").unwrap();
        assert_eq!(c["type"], "primary");
        assert_eq!(c["number"], 3);
        assert_eq!(c["usedGB"], 180.0); // 300 GiB volume, 120 GiB free
        assert_eq!(c["filesystem"], "NTFS");
        assert_eq!(c["volumeLabel"], "Windows");
        assert_eq!(c["clusterSizeKB"], 4);
        assert_eq!(c["is4kAligned"], true);
        assert!(c["flags"].as_array().unwrap().iter().any(|f| f == "Boot"));
    }

    #[test]
    fn materializes_trailing_unallocated_gap() {
        let d = map_disk(&sample_gpt_disk());
        let parts = d["partitions"].as_array().unwrap();
        let gaps: Vec<&Value> = parts.iter().filter(|p| p["type"] == "unallocated").collect();
        assert_eq!(gaps.len(), 1);
        // 512 GiB disk, partitions end at 322413002752 bytes (~300.27 GiB)
        assert!(gaps[0]["sizeGB"].as_f64().unwrap() > 200.0);
        assert_eq!(gaps[0]["number"], 0);
    }

    #[test]
    fn materializes_middle_gap_and_empty_disk() {
        // MBR data disk with a hole between two partitions
        let mut disk = sample_gpt_disk();
        disk["PartitionStyle"] = json!("MBR");
        disk["BusType"] = json!("SATA");
        disk["Partitions"] = json!([
            {
                "Number": 1, "Offset": 1_048_576, "Size": 10 * GIB_I,
                "DriveLetter": "D", "Type": "Basic", "GptType": "", "MbrType": 7,
                "IsActive": true, "IsBoot": false, "IsSystem": false, "IsHidden": false,
                "FileSystem": "NTFS", "Label": "Data",
                "VolumeSize": 10 * GIB_I, "SizeRemaining": 5 * GIB_I,
                "AllocationUnitSize": 4096, "HealthStatus": "Healthy"
            },
            {
                "Number": 2, "Offset": 21 * GIB_I, "Size": 10 * GIB_I,
                "DriveLetter": "E", "Type": "Basic", "GptType": "", "MbrType": 7,
                "IsActive": false, "IsBoot": false, "IsSystem": false, "IsHidden": false,
                "FileSystem": "NTFS", "Label": "",
                "VolumeSize": 10 * GIB_I, "SizeRemaining": 10 * GIB_I,
                "AllocationUnitSize": 4096, "HealthStatus": "Healthy"
            }
        ]);
        let d = map_disk(&disk);
        assert_eq!(d["partitionStyle"], "MBR");
        assert_eq!(d["interface"], "SATA");
        let parts = d["partitions"].as_array().unwrap();
        let gaps: Vec<&Value> = parts.iter().filter(|p| p["type"] == "unallocated").collect();
        // middle gap (21 GiB offset minus the first partition's ~10 GiB end,
        // i.e. ~11 GiB) and trailing gap (rest of the 512 GiB disk)
        assert_eq!(gaps.len(), 2);
        let middle = gaps[0]["sizeGB"].as_f64().unwrap();
        assert!(middle > 10.9 && middle < 11.1, "middle gap was {middle}");

        // Empty disk: everything is one unallocated region
        let mut empty = sample_gpt_disk();
        empty["Partitions"] = json!([]);
        let d = map_disk(&empty);
        let parts = d["partitions"].as_array().unwrap();
        assert_eq!(parts.len(), 1);
        assert_eq!(parts[0]["type"], "unallocated");
        assert_eq!(parts[0]["sizeGB"], 512.0);
    }

    #[test]
    fn single_disk_object_without_array_is_accepted() {
        // PowerShell returns a bare object instead of an array for one disk;
        // list_disks normalizes it before mapping (covered there), but the
        // mapper itself must handle the disk object shape directly.
        let raw = sample_gpt_disk();
        assert_eq!(raw["Number"], 0);
        let d = map_disk(&raw);
        assert_eq!(d["name"], "Disk 0");
    }

    fn op(kind: &str, params: Value) -> BackendOp {
        BackendOp {
            id: "op-1".to_string(),
            kind: kind.to_string(),
            disk_number: 1,
            partition_number: Some(2),
            drive_letter: "D".to_string(),
            params,
        }
    }

    #[test]
    fn resize_script_uses_bytes_and_rejects_moves() {
        let s = build_op_script(&op("resize_move", json!({"sizeGB": 100.0}))).unwrap();
        assert!(s.contains("Resize-Partition -DiskNumber 1 -PartitionNumber 2"));
        assert!(s.contains(&format!("-Size {}", 100 * GIB_I)));
        let err = build_op_script(&op(
            "resize_move",
            json!({"sizeGB": 100.0, "spaceBeforeGB": 5.0}),
        ))
        .unwrap_err();
        assert!(err.contains("start offset"), "unexpected error: {err}");
    }

    #[test]
    fn create_script_formats_and_escapes_label() {
        let s = build_op_script(&op(
            "create",
            json!({"sizeGB": 50.0, "letter": "E", "filesystem": "NTFS", "name": "Bob's Data", "clusterSizeKB": 8}),
        ))
        .unwrap();
        assert!(s.contains("New-Partition -DiskNumber 1"));
        assert!(s.contains("-DriveLetter E"));
        assert!(s.contains("Format-Volume"));
        assert!(s.contains("-AllocationUnitSize 8192"));
        assert!(s.contains("'Bob''s Data'"), "label must be PS-escaped: {s}");
    }

    #[test]
    fn format_requires_letter_and_known_filesystem() {
        let mut no_letter = op("format", json!({"filesystem": "NTFS", "volumeLabel": "X"}));
        no_letter.drive_letter = String::new();
        assert!(build_op_script(&no_letter).unwrap_err().contains("no drive letter"));
        let err = build_op_script(&op("format", json!({"filesystem": "HFS+", "volumeLabel": "X"})))
            .unwrap_err();
        assert!(err.contains("Unsupported file system"));
    }

    #[test]
    fn delete_change_letter_and_set_active_scripts() {
        assert!(build_op_script(&op("delete", json!({})))
            .unwrap()
            .contains("Remove-Partition -DiskNumber 1 -PartitionNumber 2"));
        assert!(build_op_script(&op("change_letter", json!({"newLetter": "F"})))
            .unwrap()
            .contains("-NewDriveLetter F"));
        let remove = build_op_script(&op("change_letter", json!({"newLetter": ""}))).unwrap();
        assert!(remove.contains("Remove-PartitionAccessPath"));
        assert!(build_op_script(&op("set_active", json!({})))
            .unwrap()
            .contains("-IsActive $true"));
    }

    #[test]
    fn convert_script_refuses_non_empty_disks() {
        let s = build_op_script(&op("convert_gpt", json!({}))).unwrap();
        assert!(s.contains("Conversion is only allowed on an empty disk"));
        assert!(s.contains("convert gpt"));
    }

    #[test]
    fn wipe_is_partition_only_and_unknown_ops_are_rejected() {
        let s = build_op_script(&op("wipe", json!({}))).unwrap();
        assert!(s.contains("Format-Volume -DriveLetter D"));
        assert!(s.contains("-Full"));
        let mut disk_wipe = op("wipe", json!({}));
        disk_wipe.partition_number = None;
        assert!(build_op_script(&disk_wipe)
            .unwrap_err()
            .contains("not supported"));
        // Removed tools must never be executable again
        for kind in ["merge", "split", "clone", "align_4k", "rebuild_mbr"] {
            assert!(
                build_op_script(&op(kind, json!({}))).unwrap_err().contains("Unsupported"),
                "{kind} should be rejected"
            );
        }
    }

    #[test]
    fn letter_and_size_helpers_validate() {
        assert_eq!(valid_letter("d"), Some('D'));
        assert_eq!(valid_letter("D:"), Some('D'));
        assert_eq!(valid_letter(""), None);
        assert_eq!(valid_letter("DD"), None);
        assert_eq!(valid_letter("1"), None);
        assert_eq!(gb_to_bytes(1.0), GIB_I);
        assert_eq!(ps_quote("a'b"), "'a''b'");
    }
}
