# Partition Manager

A professional partition manager for **Windows**, in the style of tools like
EaseUS Partition Master: a disk map and partition table, a staged operations
queue (stage changes, review them, then Apply), disk health (S.M.A.R.T.
summary), and wizards for the common jobs.

## Why this is a desktop app, not a web page

A browser cannot enumerate physical disks, read partition tables, or modify
them. The original version of this project was a Vite + React mockup: it
rendered sample data (`src/data/mockDisks.ts`), its "Apply" only mutated React
state, and its custom title bar targeted a desktop shell that did not exist in
the repo, so on Windows there was no working disk detection and no native
window controls at all.

The app now ships as a **Tauri 2 desktop application** with a Rust backend
(`src-tauri/`) that talks to the real Windows Storage APIs:

- **Reads** use the Windows Storage PowerShell module: `Get-Disk`,
  `Get-Partition`, `Get-Volume`, and `Get-StorageReliabilityCounter`
  (temperature, power-on hours, wear, error counters). Unallocated gaps
  between partitions are computed from real offsets, so "Create" targets real
  free space.
- **Writes** use the matching cmdlets (`Resize-Partition`, `New-Partition`,
  `Format-Volume`, `Remove-Partition`, `Set-Partition`, `Initialize-Disk`,
  `chkdsk`), executed sequentially, stopping at the first failure, followed by
  an automatic rescan so the UI always shows the true layout afterwards.
- **Window controls are the native Windows buttons.** The window uses OS
  decorations (`decorations: true` in `src-tauri/tauri.conf.json`); there is
  no custom title bar.

## Safety model

- The app **requests administrator rights at launch**: its embedded Windows
  manifest (`src-tauri/app.manifest`, `requireAdministrator`) makes Windows
  show the UAC consent prompt before the app opens, like other partition
  tools. If the user declines, the app does not start, instead of starting
  powerless and failing mysteriously later.
- As a second line of defense, the backend still checks elevation before
  every write batch and refuses with an explicit error; the UI also shows the
  elevation state in the status bar and a banner. Read or enumeration errors
  are surfaced in the UI as well. Nothing fails silently.
- Partition-table conversion (GPT/MBR) is only allowed on an **empty** disk,
  to prevent accidental data loss.
- Tools the backend cannot execute for real are not in the UI at all (this
  app does not ship buttons that fail or fake success): merge, split, clone,
  4K realignment, MBR boot-code rebuild, whole-disk wipe, surface test, and
  benchmark were removed; resizing cannot move a partition's start offset.
- Moving a partition's start offset is not supported; resizing its end is.
- A partition can only **grow into unallocated space that immediately
  follows it** (a Windows `Resize-Partition` limit). The resize dialog caps
  the maximum at the adjacent gap, not at all free space on the disk, and
  says so when a partition can only shrink.
- The **Windows boot/system partitions are protected**: the disk and the
  partitions carry visible "System" / "Boot" markers, format / delete /
  wipe / drive-letter change are disabled for them in the UI with the
  reason shown, the operation queue refuses them as a final check, and
  the generated PowerShell itself re-checks `IsBoot`/`IsSystem` and aborts
  before touching them. Resizing the boot volume and read-only checks stay
  available, as Windows supports both.

## Running

Requirements: Windows 10/11, Node.js 20+, Rust (stable) with the Tauri
prerequisites (WebView2 is preinstalled on Windows 11).

```powershell
npm install
npm run desktop:dev     # development, hot reload
npm run desktop:build   # produces NSIS + MSI installers in src-tauri/target/release/bundle
```

Both desktop commands first regenerate the app icons into `src-tauri/icons/`
from `public/partition-manager-icon.png` (`npm run gen:icons`), because icon
files are binary build artifacts and are not committed to the repository.

Windows will ask for administrator permission (UAC) every time the app
starts; that prompt is expected and required for partition changes.

Running plain `npm run dev` opens the UI in a browser in **demo mode**:
sample data, clearly labeled, with simulated operations. It exists for UI
development only; it never touches a real disk.

## Layout

| Path | Purpose |
| --- | --- |
| `src/` | React 19 + TypeScript frontend (disk map, table, staged ops queue, modals, views) |
| `src/lib/backend.ts` | Typed bridge to the Rust commands (`list_disks`, `apply_operations`, `get_environment`) |
| `src/data/mockDisks.ts` | Sample data used only by the browser demo mode |
| `src-tauri/` | Tauri 2 shell and Rust backend (Windows Storage integration) |
| `src-tauri/tauri.conf.json` | Window and bundle config; `decorations: true` gives native OS window controls |
