fn main() {
    // Embed the Windows application manifest (app.manifest) that requests
    // administrator elevation, so Windows prompts with UAC at launch.
    // On non-Windows targets the manifest is ignored by tauri-build.
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("app.manifest"));
    let attributes = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attributes).expect("failed to run tauri build script");
}
