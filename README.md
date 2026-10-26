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

- Inspecting disks works without elevation.
- Applying changes requires running the app **as administrator**; the app
  shows the current elevation state in the status bar and banner, and the
  backend refuses write operations when not elevated.
- Partition-table conversion (GPT/MBR) is only allowed on an **empty** disk,
  to prevent accidental data loss.
- Operations the backend cannot do safely report a clear per-operation error
  instead of pretending to succeed: merge, split, clone, 4K realignment, MBR
  boot-code rebuild (requires WinRE), and whole-disk wipe.
- Moving a partition's start offset is not supported; resizing its end is.

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

Right-click the app and choose "Run as administrator" when you want to apply
changes.

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
