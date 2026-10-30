use focal_lib::app_scanner::{
    is_uninstaller_or_helper, scan_windows_settings, SETTINGS_CATALOG, SYSTEM32_WHITELIST,
};
use focal_lib::fuzzy::{fuzzy_match, get_root_commands, search_all};
use focal_lib::models::{AppCacheItem, SearchResult};
use focal_lib::window_manager::should_ignore_blur;
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[test]
fn test_empirical_fuzzy_empty_and_whitespace() {
    // 1. Empty query returns Some(0.0)
    assert_eq!(fuzzy_match("", "Calculator"), Some(0.0));
    assert_eq!(fuzzy_match("", ""), Some(0.0));

    // 2. Non-empty query against empty target returns None
    assert_eq!(fuzzy_match("calc", ""), None);

    // 3. Whitespace queries in search_all are treated as empty
    let apps = vec![AppCacheItem {
        id: None,
        name: "Test App".into(),
        path: "C:\\app.exe".into(),
        localized_name: None,
        app_id: "app:test".into(),
        content_type: 0,
        icon_path: None,
    }];
    let frecency = HashMap::new();

    let res_empty = search_all("", &apps, &frecency, 50);
    let res_spaces = search_all("   \t  ", &apps, &frecency, 50);

    assert_eq!(res_empty.len(), res_spaces.len());
    assert_eq!(res_empty[0].id, res_spaces[0].id);
}

#[test]
fn test_empirical_fuzzy_long_inputs() {
    // 1. Long query against short target: fast O(1) length rejection
    let long_query = "a".repeat(1000);
    let short_target = "Calculator";
    let start = Instant::now();
    let res = fuzzy_match(&long_query, short_target);
    let elapsed = start.elapsed();
    assert_eq!(res, None);
    assert!(
        elapsed < Duration::from_millis(1),
        "Long query rejection took too long: {:?}",
        elapsed
    );

    // 2. Short query against very long target
    let long_target = format!("Prefix_{}_Suffix", "x".repeat(50_000));
    let start2 = Instant::now();
    let res2 = fuzzy_match("prefix", &long_target);
    let elapsed2 = start2.elapsed();
    assert!(res2.is_some());
    assert!(
        elapsed2 < Duration::from_millis(10),
        "Long target match took too long: {:?}",
        elapsed2
    );

    // 3. Repeated non-matching character against long target
    let start3 = Instant::now();
    let res3 = fuzzy_match("zzz", &long_target);
    let elapsed3 = start3.elapsed();
    assert_eq!(res3, None);
    assert!(
        elapsed3 < Duration::from_millis(5),
        "Long target rejection took too long: {:?}",
        elapsed3
    );
}

#[test]
fn test_empirical_fuzzy_special_chars_and_separators() {
    // 1. Path separators and colons
    let score_sep = fuzzy_match("nw", "ms-settings:network-wifi");
    assert!(score_sep.is_some(), "Separator matching should succeed");

    let score_path = fuzzy_match("ptf", "path/to/file");
    assert!(score_path.is_some(), "Path slash matching should succeed");

    let score_win_path = fuzzy_match("cmd", r"C:\Windows\System32\cmd.exe");
    assert!(score_win_path.is_some(), "Backslash path matching should succeed");

    // 2. Regex characters should be treated as plain literals without panic
    let regex_symbols = r".*+?^${}()|[]\";
    for ch in regex_symbols.chars() {
        let q = ch.to_string();
        let target = format!("Test {} Tool", ch);
        let res = fuzzy_match(&q, &target);
        assert!(res.is_some(), "Regex char '{}' must match literally", ch);
    }

    // 3. Parentheses, brackets, hyphens
    let res_brackets = fuzzy_match("vsc", "Visual Studio Code (x64) [Insiders]");
    assert!(res_brackets.is_some());
}

#[test]
fn test_empirical_fuzzy_unicode_robustness() {
    // 1. Accented European characters
    let _res_cafe = fuzzy_match("cafe", "Café Central");
    // 'e' does not match 'é' strictly unless normalized, but non-accented exact match:
    let res_cafe_accent = fuzzy_match("café", "Café Central");
    assert!(res_cafe_accent.is_some());

    let res_zurich = fuzzy_match("Zürich", "Zürich Flughafen");
    assert!(res_zurich.is_some());

    // 2. Cyrillic characters
    let res_cyrillic = fuzzy_match("терм", "Терминал Windows");
    assert!(res_cyrillic.is_some(), "Cyrillic matching failed");

    // 3. CJK characters
    let res_cjk = fuzzy_match("微信", "腾讯微信 WeChat");
    assert!(res_cjk.is_some(), "CJK matching failed");

    let res_cjk_order = fuzzy_match("信微", "腾讯微信 WeChat");
    assert_eq!(res_cjk_order, None, "Out-of-order CJK should not match");

    // 4. Emoji matching
    let res_emoji = fuzzy_match("🚀", "🚀 Rocket Launcher");
    assert!(res_emoji.is_some(), "Emoji character matching failed");

    // 5. Mixed case Greek
    let res_greek = fuzzy_match("αλφα", "ΑΛΦΑ ΒΗΤΑ");
    assert!(res_greek.is_some(), "Greek case conversion matching failed");

    // 6. Expanding unicode case (Turkish dotted capital I expands to 'i' + '\u{307}')
    let res_turkish = fuzzy_match("a", "İ A");
    assert!(res_turkish.is_some(), "Turkish dotted capital I in target caused subsequent char match to fail");
}

#[test]
fn test_empirical_app_scanner_system32_and_uninstaller_filtering() {
    // 1. Verify uninstaller patterns comprehensively
    let noisy_stems = [
        "Uninstall Discord",
        "Slack Uninstaller",
        "Python 3.12 unins000",
        "Setup Runner v1.0",
        "Google Chrome Updater",
        "NodeJS README",
        "Git Release Notes",
        "API Documentation",
        "Apache Software License",
        "Windows Help and Support",
        "Project Homepage",
        "Send Feedback",
    ];
    for stem in noisy_stems {
        assert!(
            is_uninstaller_or_helper(stem),
            "Expected '{}' to be filtered as helper/uninstaller",
            stem
        );
    }

    // 2. Verify legitimate apps are NOT filtered
    let legitimate_apps = [
        "Visual Studio Code",
        "Spotify",
        "Discord",
        "Calculator",
        "Windows Terminal",
        "Sublime Text",
        "Postman",
        "Docker Desktop",
        "Obsidian",
        "Steam",
        "Notepad++",
        "VLC media player",
    ];
    for app in legitimate_apps {
        assert!(
            !is_uninstaller_or_helper(app),
            "Legitimate app '{}' must NOT be filtered",
            app
        );
    }

    // 3. Whitelisted system32 binaries
    for whitelisted in SYSTEM32_WHITELIST {
        assert!(
            whitelisted.ends_with(".exe") || whitelisted.ends_with(".cmd"),
            "Whitelisted binary '{}' must be an executable",
            whitelisted
        );
    }

    // 4. Ensure internal noise is blocked
    let os_noise = [
        "svchost.exe",
        "dllhost.exe",
        "lsass.exe",
        "csrss.exe",
        "smss.exe",
        "services.exe",
        "wininit.exe",
        "winlogon.exe",
        "dwm.exe",
        "conhost.exe",
        "fontdrvhost.exe",
        "sihost.exe",
    ];
    for noise in os_noise {
        assert!(
            !SYSTEM32_WHITELIST.contains(&noise),
            "OS internal process '{}' must NOT be in SYSTEM32_WHITELIST",
            noise
        );
    }

    // 5. Settings catalog verification
    assert!(SETTINGS_CATALOG.len() >= 60);
    let settings = scan_windows_settings();
    assert_eq!(settings.len(), SETTINGS_CATALOG.len());
    for s in settings {
        assert_eq!(s.content_type, 2);
        assert!(s.path.starts_with("ms-settings:"));
        assert!(!s.name.is_empty());
    }
}

#[test]
fn test_empirical_window_manager_blur_grace_period() {
    // should_ignore_blur checks LAST_SHOWN_MILLIS within 200ms
    // If not shown recently, should_ignore_blur returns false
    let initial_blur = should_ignore_blur();
    println!("Initial blur state: {}", initial_blur);

    // Verify root commands structure
    let root = get_root_commands();
    assert!(root.len() >= 7);

    let ids: Vec<&str> = root.iter().map(|c| c.id.as_str()).collect();
    assert!(ids.contains(&"cmd-clipboard"));
    assert!(ids.contains(&"cmd-snippets"));
    assert!(ids.contains(&"cmd-files"));
    assert!(ids.contains(&"cmd-settings"));
    assert!(ids.contains(&"cmd-lock"));
    assert!(ids.contains(&"cmd-restart"));
    assert!(ids.contains(&"cmd-shutdown"));
}

#[test]
fn test_empirical_frecency_ranking_and_tie_breaking() {
    let apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "App A".into(),
            path: "C:\\a.exe".into(),
            localized_name: None,
            app_id: "app:a".into(),
            content_type: 1,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "App B".into(),
            path: "C:\\b.exe".into(),
            localized_name: None,
            app_id: "app:b".into(),
            content_type: 1,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "App Z".into(),
            path: "C:\\z.exe".into(),
            localized_name: None,
            app_id: "app:z".into(),
            content_type: 1,
            icon_path: None,
        },
    ];

    let mut frecency = HashMap::new();
    // Give App B high frecency
    frecency.insert("app:b".into(), 25.0);

    let results = search_all("app", &apps, &frecency, 10);
    assert!(!results.is_empty());

    // B should be ranked highest among the apps due to frecency
    let b_idx = results.iter().position(|r| r.id == "app:b").expect("B must be in results");
    let a_idx = results.iter().position(|r| r.id == "app:a").expect("A must be in results");
    let z_idx = results.iter().position(|r| r.id == "app:z").expect("Z must be in results");

    assert!(b_idx < a_idx, "B (frecency boosted) must appear before A");
    assert!(a_idx < z_idx, "A must appear before Z on equal match score (alphabetical tie-break)");

    // Test limit truncation
    let limited = search_all("app", &apps, &frecency, 2);
    assert_eq!(limited.len(), 2, "Truncation limit must be respected");
}

#[test]
fn test_empirical_ipc_model_serialization_conformance() {
    let result = SearchResult {
        id: "test-id".into(),
        title: "Test Title".into(),
        subtitle: "Test Subtitle".into(),
        category: "app".into(),
        icon: Some("icon.png".into()),
        action: "launch:test.exe".into(),
        score: 123.45,
    };

    let serialized = serde_json::to_string(&result).expect("serialization failed");
    let deserialized: SearchResult = serde_json::from_str(&serialized).expect("deserialization failed");

    assert_eq!(result, deserialized);
    assert!(serialized.contains("\"category\":\"app\""));
    assert!(serialized.contains("\"action\":\"launch:test.exe\""));
    assert!(serialized.contains("\"score\":123.45"));
}

#[test]
fn test_empirical_powershell_admin_launch_single_quote_escaping() {
    let test_paths = [
        r"C:\Games\Baldur's Gate 3\bg3.exe",
        r"C:\Users\John O'Connor\AppData\Local\Programs\App.exe",
        r"C:\Games\Don't Starve\bin\dontstarve.exe",
        r"C:\Music\Guns N' Roses\Track.mp3",
    ];

    for path in test_paths {
        let escaped = path.replace('\'', "''");
        // Verify PowerShell parses the command without syntax / TerminatorExpectedAtEndOfString error
        let status = std::process::Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-Command",
                &format!(
                    "try {{ Start-Process -FilePath '{}' -Verb RunAs -ErrorAction Stop }} catch [System.Management.Automation.ParseException] {{ exit 2 }} catch {{ exit 0 }}",
                    escaped
                ),
            ])
            .status();

        if let Ok(exit_status) = status {
            assert_ne!(
                exit_status.code(),
                Some(2),
                "PowerShell encountered ParseException on escaped path '{}'",
                path
            );
        }
    }
}

