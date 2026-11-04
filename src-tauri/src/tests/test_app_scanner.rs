use crate::app_scanner::{
    is_background_or_cli_stub, is_uninstaller_or_helper, scan_windows_settings, SETTINGS_CATALOG,
    SYSTEM32_WHITELIST,
};

#[test]
fn test_settings_catalog_has_over_50_entries() {
    assert!(
        SETTINGS_CATALOG.len() >= 50,
        "Settings catalog must contain at least 50 entries, found {}",
        SETTINGS_CATALOG.len()
    );

    for setting in SETTINGS_CATALOG {
        assert!(
            setting.uri.starts_with("ms-settings:"),
            "Setting URI '{}' must start with 'ms-settings:'",
            setting.uri
        );
        assert!(!setting.name.is_empty(), "Setting name cannot be empty");
        assert!(!setting.keywords.is_empty(), "Setting must have keywords");
    }
}

#[test]
fn test_uninstaller_filtering_logic() {
    // Should filter out noise
    assert!(is_uninstaller_or_helper("Uninstall Visual Studio"));
    assert!(is_uninstaller_or_helper("unins000"));
    assert!(is_uninstaller_or_helper("unins001"));
    assert!(is_uninstaller_or_helper("unins002"));
    assert!(is_uninstaller_or_helper("unins000.exe"));
    assert!(is_uninstaller_or_helper("unins001.exe"));
    assert!(is_uninstaller_or_helper("unins002.exe"));
    assert!(is_uninstaller_or_helper("Git Setup"));
    assert!(is_uninstaller_or_helper("App Updater"));
    assert!(is_uninstaller_or_helper("README"));
    assert!(is_uninstaller_or_helper("Release Notes v2.0"));
    assert!(is_uninstaller_or_helper("Product Documentation"));
    assert!(is_uninstaller_or_helper("Software License"));
    assert!(is_uninstaller_or_helper("Help & Support"));

    // Should NOT filter out legitimate applications
    assert!(!is_uninstaller_or_helper("Visual Studio Code"));
    assert!(!is_uninstaller_or_helper("Calculator"));
    assert!(!is_uninstaller_or_helper("Slack"));
    assert!(!is_uninstaller_or_helper("Spotify"));
    assert!(!is_uninstaller_or_helper("Terminal"));
    assert!(!is_uninstaller_or_helper("Sublime Text"));
}

#[test]
fn test_system32_whitelist() {
    assert!(SYSTEM32_WHITELIST.contains(&"notepad.exe"));
    assert!(SYSTEM32_WHITELIST.contains(&"calc.exe"));
    assert!(SYSTEM32_WHITELIST.contains(&"cmd.exe"));
    assert!(SYSTEM32_WHITELIST.contains(&"powershell.exe"));
    assert!(SYSTEM32_WHITELIST.contains(&"wt.exe"));
    assert!(SYSTEM32_WHITELIST.contains(&"taskmgr.exe"));

    // Ensure internal OS host processes are NOT in whitelist
    assert!(!SYSTEM32_WHITELIST.contains(&"svchost.exe"));
    assert!(!SYSTEM32_WHITELIST.contains(&"dllhost.exe"));
    assert!(!SYSTEM32_WHITELIST.contains(&"lsass.exe"));
    assert!(!SYSTEM32_WHITELIST.contains(&"csrss.exe"));
}

#[test]
fn test_scan_settings_returns_valid_items() {
    let settings = scan_windows_settings();
    assert!(settings.len() >= 50);

    for s in settings {
        assert_eq!(s.content_type, 2, "Settings must have content_type 2");
        assert!(s.path.starts_with("ms-settings:"));
        assert!(s.app_id.starts_with("setting:ms-settings:"));
        assert_eq!(s.icon_path, Some("settings".into()));
    }
}

#[test]
fn test_msix_background_server_and_cli_stub_filtering() {
    // Background execution aliases and server hosts that must be filtered
    assert!(is_background_or_cli_stub("WindowsPackageManagerServer"));
    assert!(is_background_or_cli_stub("WindowsPackageManagerMCPServer"));
    assert!(is_background_or_cli_stub("ActionsMcpHost"));
    assert!(is_background_or_cli_stub("codex-chrome-native-host"));
    assert!(is_background_or_cli_stub("ms-teamsupdate"));
    assert!(is_background_or_cli_stub("ms-teams_autostarter"));

    // CLI stubs and tools in WindowsApps
    assert!(is_background_or_cli_stub("python"));
    assert!(is_background_or_cli_stub("python3"));
    assert!(is_background_or_cli_stub("python3.12"));
    assert!(is_background_or_cli_stub("pythonw"));
    assert!(is_background_or_cli_stub("pythonw3"));
    assert!(is_background_or_cli_stub("pip"));
    assert!(is_background_or_cli_stub("pip3"));
    assert!(is_background_or_cli_stub("wsl"));
    assert!(is_background_or_cli_stub("winget"));
    assert!(is_background_or_cli_stub("bash"));

    // Legitimate packaged applications that must NOT be filtered
    assert!(!is_background_or_cli_stub("SnippingTool"));
    assert!(!is_background_or_cli_stub("notepad"));
    assert!(!is_background_or_cli_stub("wt"));
    assert!(!is_background_or_cli_stub("wintoys"));
    assert!(!is_background_or_cli_stub("PredatorSense"));
    assert!(!is_background_or_cli_stub("VisualAssist"));
}

#[test]
fn test_live_scan_finds_uwp_apps() {
    let apps = crate::app_scanner::scan_all_apps();
    println!("Total apps scanned: {}", apps.len());
    for a in &apps {
        if a.name.contains("WhatsApp") || a.name.contains("Store") || a.name.contains("Terminal") || a.name.contains("Photos") {
            println!("MATCHED APP: name='{}', path='{}', app_id='{}'", a.name, a.path, a.app_id);
        }
    }
}

#[test]
fn test_resolve_lnk_nonexistent() {
    let result = crate::app_scanner::resolve_lnk(r"C:\Windows\definitely_not_a_shortcut.lnk");
    assert!(result.is_none());
}

#[test]
fn test_resolve_lnk_start_menu_shortcuts() {
    let apps = crate::app_scanner::scan_start_menu_shortcuts();
    let lnk_apps: Vec<_> = apps.iter().filter(|a| a.path.ends_with(".lnk")).collect();
    println!("Found {} .lnk shortcuts in Start Menu", lnk_apps.len());

    let mut resolved_count = 0;
    for app in lnk_apps.iter().take(10) {
        if let Some(resolved) = crate::app_scanner::resolve_lnk(&app.path) {
            println!(
                "Successfully resolved .lnk: '{}' -> exe: '{:?}', args: '{}', workdir: '{:?}'",
                app.name, resolved.target_exe, resolved.arguments, resolved.working_dir
            );
            resolved_count += 1;

            // Test caching: resolving a second time should immediately hit cache and match
            let cached = crate::app_scanner::resolve_lnk(&app.path);
            assert_eq!(cached, Some(resolved));
        }
    }
    println!("Resolved {}/{} sampled .lnk shortcuts via COM IShellLinkW", resolved_count, lnk_apps.len().min(10));
}

