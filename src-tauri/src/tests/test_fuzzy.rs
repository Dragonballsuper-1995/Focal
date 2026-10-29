use std::collections::HashMap;
use std::time::Instant;
use crate::fuzzy::{apply_frecency, fuzzy_match, search_all};
use crate::models::AppCacheItem;

#[test]
fn test_fuzzy_exact_match_highest_score() {
    let query = "terminal";
    let exact_score = fuzzy_match(query, "Terminal").expect("exact match should succeed");
    let partial_score = fuzzy_match(query, "Windows Terminal").expect("subsequence match should succeed");

    assert!(
        exact_score > partial_score,
        "Exact match ({}) must exceed partial prefix match ({})",
        exact_score,
        partial_score
    );
}

#[test]
fn test_fuzzy_prefix_bonus() {
    let query = "calc";
    let prefix_score = fuzzy_match(query, "Calculator").expect("prefix match should succeed");
    let non_prefix_score = fuzzy_match(query, "Decalcify").expect("inner match should succeed");

    assert!(
        prefix_score > non_prefix_score,
        "Prefix match ({}) must exceed non-prefix match ({})",
        prefix_score,
        non_prefix_score
    );
}

#[test]
fn test_fuzzy_word_boundary_bonus() {
    let query = "gc";
    let boundary_score = fuzzy_match(query, "Google Chrome").expect("boundary match should succeed");
    let non_boundary_score = fuzzy_match(query, "Magic").expect("non-boundary match should succeed");

    assert!(
        boundary_score > non_boundary_score,
        "Word boundary acronym match 'gc' -> 'Google Chrome' ({}) must beat scattered 'gc' -> 'Magic' ({})",
        boundary_score,
        non_boundary_score
    );
}

#[test]
fn test_fuzzy_camel_case_bonus() {
    let query = "VS";
    let camel_score = fuzzy_match(query, "VisualStudio").expect("camelCase match should succeed");
    let non_camel_score = fuzzy_match(query, "VampireSlayer").expect("regular match should succeed");

    assert!(
        camel_score > non_camel_score,
        "CamelCase match 'VS' in 'VisualStudio' ({}) must beat 'VampireSlayer' ({}) due to length penalty and boundary",
        camel_score,
        non_camel_score
    );
}

#[test]
fn test_fuzzy_consecutive_bonus() {
    let query = "code";
    let consecutive_score = fuzzy_match(query, "Visual Studio Code").expect("consecutive match should succeed");
    let scattered_score = fuzzy_match(query, "C o o k i n g   D e l i c a c i e s").expect("scattered match should succeed");

    assert!(
        consecutive_score > scattered_score,
        "Consecutive substring match ({}) must beat scattered character match ({})",
        consecutive_score,
        scattered_score
    );
}

#[test]
fn test_fuzzy_empty_query_ordering() {
    let apps = vec![
        AppCacheItem {
            id: None,
            name: "Frequent App".into(),
            path: "C:\\app.exe".into(),
            localized_name: None,
            app_id: "app:frequent".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: None,
            name: "Unused App".into(),
            path: "C:\\unused.exe".into(),
            localized_name: None,
            app_id: "app:unused".into(),
            content_type: 0,
            icon_path: None,
        },
    ];

    let mut frecency = HashMap::new();
    frecency.insert("app:frequent".into(), 10.0);

    let results = search_all("", &apps, &frecency, 50);

    assert!(!results.is_empty(), "Empty query should return root commands and frecent apps");
    let has_frequent_app = results.iter().any(|r| r.id == "app:frequent");
    let has_unused_app = results.iter().any(|r| r.id == "app:unused");

    assert!(has_frequent_app, "Frequent app should appear on empty search");
    assert!(!has_unused_app, "Unused app should not clutter empty search");
}

#[test]
fn test_fuzzy_no_match_returns_none() {
    let result = fuzzy_match("xyz123", "Calculator");
    assert_eq!(result, None, "Query with non-existent characters must return None");
}

#[test]
fn test_fuzzy_case_insensitivity() {
    let lower = fuzzy_match("chrome", "Google Chrome");
    let upper = fuzzy_match("CHROME", "Google Chrome");
    let mixed = fuzzy_match("ChRoMe", "Google Chrome");

    assert!(lower.is_some());
    assert!(upper.is_some());
    assert!(mixed.is_some());
    assert_eq!(lower, upper);
    assert_eq!(upper, mixed);
}

#[test]
fn test_fuzzy_frecency_boosting() {
    let raw_score = 100.0;
    let zero_frecency = apply_frecency(raw_score, 0.0);
    let high_frecency = apply_frecency(raw_score, 15.0);

    assert_eq!(zero_frecency, raw_score);
    assert!(high_frecency > zero_frecency + 150.0);
}

#[test]
fn test_fuzzy_sub_50ms_performance_10k_items() {
    // Generate 10,000 synthetic realistic targets
    let mut apps = Vec::with_capacity(10_000);
    let sample_prefixes = ["Microsoft", "Google", "Adobe", "Apple", "Oracle", "JetBrains", "Spotify", "Discord"];
    let sample_nouns = ["Studio", "Browser", "Editor", "Player", "Manager", "Terminal", "Tool", "Service"];

    for i in 0..10_000 {
        let prefix = sample_prefixes[i % sample_prefixes.len()];
        let noun = sample_nouns[(i / 8) % sample_nouns.len()];
        let name = format!("{} {} Professional Edition v{}", prefix, noun, i);
        apps.push(AppCacheItem {
            id: Some(i as i64),
            name,
            path: format!("C:\\Program Files\\App{}\\app.exe", i),
            localized_name: None,
            app_id: format!("app:{}", i),
            content_type: 0,
            icon_path: None,
        });
    }

    let frecency_map = HashMap::new();
    let query = "term";

    let start = Instant::now();
    let results = search_all(query, &apps, &frecency_map, 50);
    let elapsed = start.elapsed();

    println!("Scored 10,000 items in {:?}", elapsed);
    assert!(!results.is_empty());
    assert!(
        elapsed.as_millis() < 50,
        "Fuzzy search across 10,000 items took {:?}, exceeding 50ms budget!",
        elapsed
    );
}

#[test]
fn test_acronym_ndm_ranks_neat_download_manager_and_rejects_project() {
    let apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "Neat Download Manager".into(),
            path: r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Neat Download Manager.lnk".into(),
            localized_name: None,
            app_id: "app:ndm".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "Project".into(),
            path: r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Microsoft\Project.lnk".into(),
            localized_name: None,
            app_id: "app:project".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "PowerPoint".into(),
            path: r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Microsoft\PowerPoint.lnk".into(),
            localized_name: None,
            app_id: "app:powerpoint".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(4),
            name: "Proton VPN".into(),
            path: r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Proton\Proton VPN.lnk".into(),
            localized_name: None,
            app_id: "app:proton".into(),
            content_type: 0,
            icon_path: None,
        },
    ];

    let frecency = HashMap::new();
    let results = search_all("ndm", &apps, &frecency, 10);

    // Neat Download Manager must rank #1
    assert!(!results.is_empty(), "Should find Neat Download Manager");
    assert_eq!(results[0].title, "Neat Download Manager");

    // Project, PowerPoint, and Proton VPN must NOT be matched via their Windows Start Menu path
    let has_project = results.iter().any(|r| r.title == "Project");
    let has_powerpoint = results.iter().any(|r| r.title == "PowerPoint");
    let has_proton = results.iter().any(|r| r.title == "Proton VPN");

    assert!(!has_project, "Project must not match 'ndm' via its Start Menu path");
    assert!(!has_powerpoint, "PowerPoint must not match 'ndm' via its Start Menu path");
    assert!(!has_proton, "Proton VPN must not match 'ndm' via its Start Menu path");
}

#[test]
fn test_short_query_yt_ranks_youtube_and_rejects_python() {
    let apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "YouTube Music".into(),
            path: r"C:\Users\test\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Brave Apps\YouTube Music.lnk".into(),
            localized_name: None,
            app_id: "app:ytmusic".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "python".into(),
            path: r"C:\Python314\python.exe".into(),
            localized_name: None,
            app_id: "bin:python".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "pytest".into(),
            path: r"C:\Python314\Scripts\pytest.exe".into(),
            localized_name: None,
            app_id: "bin:pytest".into(),
            content_type: 0,
            icon_path: None,
        },
    ];

    let frecency = HashMap::new();
    let results = search_all("yt", &apps, &frecency, 10);

    assert!(!results.is_empty(), "YouTube Music must be found");
    assert_eq!(results[0].title, "YouTube Music");

    // python and pytest must be rejected by sensitivity cutoff
    let has_python = results.iter().any(|r| r.title == "python");
    let has_pytest = results.iter().any(|r| r.title == "pytest");

    assert!(!has_python, "python must be rejected for 'yt' query under Raycast sensitivity");
    assert!(!has_pytest, "pytest must be rejected for 'yt' query under Raycast sensitivity");
}

#[test]
fn test_packaged_whatsapp_and_store_search_ranking() {
    let apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "WhatsApp".into(),
            path: r"shell:AppsFolder\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App".into(),
            localized_name: None,
            app_id: "uwp:5319275a.whatsappdesktop_cv1g1gvanyjgm!app".into(),
            content_type: 1,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "Microsoft Store".into(),
            path: r"shell:AppsFolder\Microsoft.WindowsStore_8wekyb3d8bbwe!App".into(),
            localized_name: None,
            app_id: "uwp:microsoft.windowsstore_8wekyb3d8bbwe!app".into(),
            content_type: 1,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "Storage Settings".into(),
            path: "ms-settings:storagesense".into(),
            localized_name: None,
            app_id: "setting:ms-settings:storagesense".into(),
            content_type: 2,
            icon_path: None,
        },
    ];

    let frecency = HashMap::new();

    // 1. Searching "whatsapp" must rank WhatsApp #1 with high score
    let res_wa = search_all("whatsapp", &apps, &frecency, 5);
    assert!(!res_wa.is_empty());
    assert_eq!(res_wa[0].title, "WhatsApp");
    assert_eq!(
        res_wa[0].action,
        r"launch:shell:AppsFolder\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App"
    );

    // 2. Searching "store" must rank Microsoft Store #1
    let res_store = search_all("store", &apps, &frecency, 5);
    assert!(!res_store.is_empty());
    assert_eq!(res_store[0].title, "Microsoft Store");
    assert_eq!(
        res_store[0].action,
        r"launch:shell:AppsFolder\Microsoft.WindowsStore_8wekyb3d8bbwe!App"
    );
}
