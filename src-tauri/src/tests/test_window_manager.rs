use crate::window_manager::{activate_app_window, is_external_blur, should_ignore_blur};

#[test]
fn test_should_ignore_blur_initial() {
    // Before any window is shown, should_ignore_blur should return false
    // unless recently stored
    let _ = should_ignore_blur();
}

#[test]
fn test_activate_app_window_empty_or_whitespace() {
    assert!(!activate_app_window(""));
    assert!(!activate_app_window("   "));
}

#[test]
fn test_activate_app_window_nonexistent() {
    assert!(!activate_app_window("definitely_not_a_real_app_123456789.exe"));
}

#[cfg(target_os = "windows")]
#[test]
fn test_activate_app_window_running_explorer() {
    // explorer.exe is the Windows shell and is always running on Windows desktop
    // We check that calling activate_app_window does not panic
    let result = activate_app_window("explorer.exe");
    println!("activate_app_window(explorer.exe) returned: {}", result);
}

#[cfg(target_os = "windows")]
#[test]
fn test_is_external_blur_with_null_or_invalid_hwnd() {
    // When hwnd is 0 or invalid, is_external_blur executes without crashing
    let _ = is_external_blur(0);
}

#[cfg(target_os = "windows")]
#[test]
fn test_activate_app_window_lnk_shortcut_stem_extraction() {
    // Should extract stem and not panic
    let result = activate_app_window(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\NonExistentApp123.lnk");
    assert!(!result);
}

#[cfg(target_os = "windows")]
#[test]
fn test_activate_app_window_uwp_aumid_parsing() {
    // Should parse AUMID tokens cleanly without crashing
    let result = activate_app_window("shell:AppsFolder\\Microsoft.NonExistentUwpApp_8wekyb3d8bbwe!App");
    assert!(!result);
}

#[cfg(target_os = "windows")]
#[test]
fn test_activate_app_window_live_running_apps() {
    // Tests that activate_app_window executes safely on common Windows targets
    let _ = activate_app_window("explorer.exe");
    let _ = activate_app_window("notepad.exe");
    let _ = activate_app_window("Notepad.lnk");
    let _ = activate_app_window("shell:AppsFolder\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App");
}

