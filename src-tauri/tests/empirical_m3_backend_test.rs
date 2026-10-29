use runner_lib::app_scanner::{
    is_uninstaller_or_helper, scan_windows_settings, SETTINGS_CATALOG, SYSTEM32_WHITELIST,
};
use runner_lib::db::Database;
use runner_lib::fuzzy::{apply_frecency, fuzzy_match, get_root_commands, search_all};
use runner_lib::models::AppCacheItem;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Helper to generate a realistic synthetic application catalog of N items
fn generate_synthetic_catalog(count: usize) -> Vec<AppCacheItem> {
    let vendors = [
        "Microsoft", "Google", "Adobe", "Apple", "Oracle", "JetBrains", "Spotify",
        "Mozilla", "Valve", "Amazon", "GitHub", "Docker", "Atlassian", "Figma",
        "Notion", "Slack", "Discord", "Zoom", "Autodesk", "Blender Foundation",
    ];
    let categories = [
        "Studio", "Browser", "Editor", "Player", "Manager", "Terminal", "Workbench",
        "Desktop", "Cloud Agent", "Optimizer", "Analytics", "Messenger", "Viewer",
        "Simulator", "Engine", "Server", "Client", "Tool", "Utility", "Console",
    ];
    let editions = [
        "Community", "Professional", "Enterprise", "Developer Edition", "Ultimate",
        "Preview", "Insider", "Standard", "Express", "Build 2026",
    ];

    let mut apps = Vec::with_capacity(count);

    for i in 0..count {
        let vendor = vendors[i % vendors.len()];
        let category = categories[(i / vendors.len()) % categories.len()];
        let edition = editions[(i / (vendors.len() * categories.len())) % editions.len()];
        let name = format!("{} {} {} v{}", vendor, category, edition, i + 1);
        let path = format!("C:\\Program Files\\{}\\{}\\app_{}.exe", vendor, category, i);

        apps.push(AppCacheItem {
            id: Some(i as i64),
            name,
            path,
            localized_name: None,
            app_id: format!("app:synthetic:{}", i),
            content_type: 0,
            icon_path: None,
        });
    }

    apps
}

// =========================================================================
// AREA 1: EMPIRICAL LATENCY & 10,000 - 20,000 ITEM STRESS BENCHMARK
// =========================================================================

#[test]
fn test_empirical_10k_to_20k_items_sub_50ms_latency() {
    let item_counts = [10_000, 15_000, 20_000];

    for &count in &item_counts {
        println!("\n=======================================================");
        println!("[BENCHMARK] Generating {} synthetic catalog items...", count);
        let catalog = generate_synthetic_catalog(count);
        let frecency_map = HashMap::new();

        // Battery of diverse query profiles
        let queries = [
            ("prefix_google", "Google"),
            ("prefix_micro", "Micro"),
            ("acronym_gbe", "GBE"), // Google Browser Editor
            ("acronym_mse", "MSE"), // Microsoft Studio Enterprise
            ("substring_edit", "edit"),
            ("substring_term", "term"),
            ("deep_subsequence_jbd", "jbd"), // JetBrains ... Developer
            ("single_char_m", "m"),
            ("single_char_c", "c"),
            ("non_matching_reject", "zzzyyyxxxq"), // Fast rejection path
            ("empty_query", ""),
        ];

        // Production release target is strictly < 50ms.
        // In unoptimized debug test runs without inlining/LTO, set 100ms ceiling for worst-case single-char queries.
        let default_budget = Duration::from_millis(50);
        let debug_worst_case_budget = Duration::from_millis(100);

        for (label, query) in queries {
            let start = Instant::now();
            let results = search_all(query, &catalog, &frecency_map, 50);
            let elapsed = start.elapsed();

            println!(
                "  -> Query '{:20}' on {:5} items: {:8.3} ms (matches: {})",
                label,
                count,
                elapsed.as_secs_f64() * 1000.0,
                results.len()
            );

            let budget = if cfg!(debug_assertions) {
                debug_worst_case_budget
            } else {
                default_budget
            };

            // Hard empirical assertion: strictly under budget
            assert!(
                elapsed < budget,
                "FAILED Sub-50ms SLA: Query '{}' on {} items took {:?} (budget: {:?})",
                query,
                count,
                elapsed,
                budget
            );

            if query.is_empty() {
                assert!(
                    !results.is_empty(),
                    "Empty query must return root commands"
                );
            } else if query == "zzzyyyxxxq" {
                assert_eq!(
                    results.len(),
                    0,
                    "Nonsense query must yield 0 results via fast-rejection"
                );
            } else {
                assert!(
                    !results.is_empty(),
                    "Expected query '{}' to yield matches in {} items",
                    query,
                    count
                );
            }
        }
    }
}

// =========================================================================
// AREA 2: EXTREME & HOSTILE BOUNDARY INPUTS
// =========================================================================

#[test]
fn test_empirical_extreme_and_hostile_inputs() {
    // 1. Queries longer than target
    let target = "notepad.exe";
    let long_query = "a".repeat(500);
    assert_eq!(
        fuzzy_match(&long_query, target),
        None,
        "Query longer than target must safely return None without panics"
    );

    let huge_query = "x".repeat(10_000);
    assert_eq!(
        fuzzy_match(&huge_query, target),
        None,
        "10,000-char query must safely return None"
    );

    // 2. Zero-length and whitespace boundary cases
    assert_eq!(
        fuzzy_match("", target),
        Some(0.0),
        "Empty query against non-empty target returns Some(0.0)"
    );
    assert_eq!(
        fuzzy_match("", ""),
        Some(0.0),
        "Empty query against empty target returns Some(0.0)"
    );
    assert_eq!(
        fuzzy_match("abc", ""),
        None,
        "Non-empty query against empty target returns None"
    );

    // Whitespace queries in search_all (should trim to empty)
    let catalog = generate_synthetic_catalog(100);
    let frecency_map = HashMap::new();
    let ws_results = search_all("   \t  \n  ", &catalog, &frecency_map, 50);
    assert!(
        !ws_results.is_empty(),
        "Whitespace-only query must be trimmed and return root commands"
    );

    // 3. Unicode, Emojis, and Non-ASCII Characters
    let unicode_cases = [
        ("🚀", "🚀 Rocket Launcher", true),
        ("rocket", "🚀 Rocket Launcher", true),
        ("café", "Café Bar Pro", true),
        ("cafe", "Café Bar Pro", false), // Subsequence 'cafe' != 'café' in standard code-point comparison
        ("CAFÉ", "café bar pro", true),  // Case insensitivity
        ("日本語", "日本語入力システム", true),
        ("入力", "日本語入力システム", true),
        ("微信", "腾讯微信 WeChat", true),
        ("wechat", "腾讯微信 WeChat", true),
        ("Калькулятор", "Калькулятор Windows", true),
        ("кальк", "Калькулятор Windows", true),
        ("👨‍👩‍👧‍👦", "Family 👨‍👩‍👧‍👦 Group App", true),
        ("🔍", "Search 🔍 Inspector", true),
    ];

    for (q, t, expect_match) in unicode_cases {
        let res = fuzzy_match(q, t);
        if expect_match {
            assert!(
                res.is_some(),
                "Expected Unicode match for query '{}' against target '{}'",
                q,
                t
            );
            assert!(
                res.unwrap() > 0.0,
                "Score must be strictly positive for match"
            );
        } else {
            assert_eq!(
                res, None,
                "Expected no match for query '{}' against target '{}'",
                q, t
            );
        }
    }

    // 4. SQL Injection and Shell Metacharacter Invariants
    let hostile_queries = [
        "' OR '1'='1",
        "\"; DROP TABLE app_cache; --",
        "admin'--",
        "UNION SELECT * FROM sqlite_master",
        "calc.exe & rm -rf /",
        "calc.exe | powershell -Command \"echo pwned\"",
        "`whoami`",
        "$(reboot)",
        "null\0byte.exe",
    ];

    for hostile in hostile_queries {
        // Query must never panic fuzzy matcher
        let score = fuzzy_match(hostile, "Windows Calculator");
        let _ = score;

        // Search in catalog must not crash or execute SQL
        let res = search_all(hostile, &catalog, &frecency_map, 50);
        let _ = res.len();
    }

    // 5. Repeated characters & Pathological Backtracking Stress
    let repeated_query = "a".repeat(200);
    let repeated_target = "a".repeat(2000);
    let start = Instant::now();
    let res = fuzzy_match(&repeated_query, &repeated_target);
    let elapsed = start.elapsed();

    assert!(res.is_some(), "Matching repeated 'a's must succeed");
    assert!(
        elapsed < Duration::from_millis(10),
        "Pathological repeated char check took {:?}, must not exhibit combinatorial explosion",
        elapsed
    );

    // Staggered pattern: "ababab..." against "a b a b a b..."
    let stagger_q = "ab".repeat(50);
    let stagger_t = "a b ".repeat(100);
    let start2 = Instant::now();
    let res2 = fuzzy_match(&stagger_q, &stagger_t);
    let elapsed2 = start2.elapsed();
    assert!(res2.is_some(), "Staggered repeated pattern must match");
    assert!(
        elapsed2 < Duration::from_millis(10),
        "Staggered pattern took {:?}, must complete under 10ms",
        elapsed2
    );
}

// =========================================================================
// AREA 3: FRECENCY BOOSTING MATH & RANK ORDERING CONSISTENCY
// =========================================================================

#[test]
fn test_empirical_frecency_boosting_math_and_ranking_invariants() {
    let raw_scores = [10.0, 50.0, 100.0, 250.0, 500.0];
    let frecency_values = [0.0, 0.5, 1.0, 5.0, 10.0, 25.0, 100.0, 1000.0];

    // 1. Invariant: frecency <= 0 returns exact match_score
    for &score in &raw_scores {
        assert_eq!(
            apply_frecency(score, 0.0),
            score,
            "Frecency 0.0 must return unmodified match score"
        );
        assert_eq!(
            apply_frecency(score, -5.0),
            score,
            "Negative frecency must return unmodified match score"
        );
    }

    // 2. Invariant: Monotonicity with frecency for fixed score
    for &score in &raw_scores {
        for window in frecency_values.windows(2) {
            let f1 = window[0];
            let f2 = window[1];
            let s1 = apply_frecency(score, f1);
            let s2 = apply_frecency(score, f2);
            assert!(
                s2 > s1,
                "Monotonicity violation: for score {}, frecency {} ({}) must exceed frecency {} ({})",
                score, f2, s2, f1, s1
            );
        }
    }

    // 3. Invariant: Monotonicity with raw score for fixed frecency
    for &frecency in &frecency_values {
        for window in raw_scores.windows(2) {
            let s1 = window[0];
            let s2 = window[1];
            let r1 = apply_frecency(s1, frecency);
            let r2 = apply_frecency(s2, frecency);
            assert!(
                r2 > r1,
                "Score monotonicity violation: for frecency {}, raw score {} ({}) must exceed raw score {} ({})",
                frecency, s2, r2, s1, r1
            );
        }
    }

    // 4. Invariant: No NaN or Inf on boundary numbers
    let huge_frecency = 1e9;
    let boosted = apply_frecency(100.0, huge_frecency);
    assert!(boosted.is_finite(), "Boosted score must remain finite");
    assert!(!boosted.is_nan(), "Boosted score must not be NaN");

    // 5. Length penalty vs score monotonicity
    // Shorter titles have smaller unmatched penalty
    let score_short = fuzzy_match("App", "App B").unwrap();
    let score_long = fuzzy_match("App", "App Beta").unwrap();
    assert!(
        score_short > score_long,
        "Shorter matching title 'App B' ({}) must score higher than 'App Beta' ({}) due to length penalty",
        score_short, score_long
    );

    // 6. Alphabetical tie-breaking when scores are identical (identical lengths and prefix)
    let tied_apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "App 1".into(),
            path: "C:\\app1.exe".into(),
            localized_name: None,
            app_id: "app:1".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "App 2".into(),
            path: "C:\\app2.exe".into(),
            localized_name: None,
            app_id: "app:2".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "App 3".into(),
            path: "C:\\app3.exe".into(),
            localized_name: None,
            app_id: "app:3".into(),
            content_type: 0,
            icon_path: None,
        },
    ];

    let empty_frecency = HashMap::new();
    let res_tied = search_all("App", &tied_apps, &empty_frecency, 10);
    let app_results: Vec<_> = res_tied.iter().filter(|r| r.category == "app").collect();
    assert_eq!(app_results.len(), 3);
    assert_eq!(app_results[0].title, "App 1");
    assert_eq!(app_results[1].title, "App 2");
    assert_eq!(app_results[2].title, "App 3");

    // With frecency boosting on App 3: App 3 must jump to #1
    let mut app3_boosted = HashMap::new();
    app3_boosted.insert("app:3".to_string(), 50.0);
    let res_boosted = search_all("App", &tied_apps, &app3_boosted, 10);
    let app_results_boosted: Vec<_> = res_boosted.iter().filter(|r| r.category == "app").collect();
    assert_eq!(
        app_results_boosted[0].title, "App 3",
        "App 3 with frecency 50.0 must rank first"
    );
}

// =========================================================================
// AREA 4: APP SCANNER FILTERING HEURISTICS & SYSTEM32 WHITELIST
// =========================================================================

#[test]
fn test_empirical_app_scanner_heuristics_and_whitelist() {
    // 1. Uninstaller and documentation helper heuristics
    let uninstaller_names = [
        "Uninstall Microsoft Office",
        "unins000",
        "Setup Wizard v4",
        "Software Setup.exe",
        "Application Updater",
        "README",
        "Read Me First",
        "Release Notes 2026.1",
        "API Documentation",
        "GNU General Public License",
        "Help and Support Center",
        "Official Website",
        "Product Homepage",
        "Send Feedback",
        "setup_helper",
    ];

    for name in uninstaller_names {
        assert!(
            is_uninstaller_or_helper(name),
            "Heuristic must detect uninstaller/helper for '{}'",
            name
        );
    }

    // Heuristic boundary test: InnoSetup uninstaller variants are comprehensively filtered
    assert!(is_uninstaller_or_helper("unins000.exe"));
    assert!(is_uninstaller_or_helper("unins001.exe"));
    assert!(is_uninstaller_or_helper("unins002.exe"));
    assert!(is_uninstaller_or_helper("unins001"));

    // 2. Legitimate apps that must NOT be excluded
    let legitimate_apps = [
        "Visual Studio Code",
        "Windows Terminal",
        "Calculator",
        "Slack",
        "Spotify",
        "Google Chrome",
        "Mozilla Firefox",
        "Discord",
        "Notepad",
        "PowerToys",
        "Docker Desktop",
        "Sublime Text",
        "Postman",
        "Obsidian",
    ];

    for name in legitimate_apps {
        assert!(
            !is_uninstaller_or_helper(name),
            "Heuristic must NEVER exclude legitimate app '{}'",
            name
        );
    }

    // 3. System32 Whitelist coverage
    let expected_system32_utilities = [
        "notepad.exe",
        "calc.exe",
        "cmd.exe",
        "powershell.exe",
        "wt.exe",
        "taskmgr.exe",
        "mspaint.exe",
        "regedit.exe",
        "control.exe",
        "explorer.exe",
        "cleanmgr.exe",
        "resmon.exe",
        "perfmon.exe",
        "magnify.exe",
        "snippingtool.exe",
        "charmap.exe",
        "dxdiag.exe",
        "msinfo32.exe",
        "wordpad.exe",
    ];

    for util in expected_system32_utilities {
        assert!(
            SYSTEM32_WHITELIST.contains(&util),
            "System32 whitelist must include utility '{}'",
            util
        );
    }

    // 4. System32 OS host/internal processes that MUST NOT be whitelisted
    let forbidden_system32_processes = [
        "svchost.exe",
        "dllhost.exe",
        "lsass.exe",
        "csrss.exe",
        "smss.exe",
        "services.exe",
        "wininit.exe",
        "spoolsv.exe",
        "conhost.exe",
        "RuntimeBroker.exe",
        "SearchIndexer.exe",
        "dwm.exe",
        "fontdrvhost.exe",
        "sihost.exe",
    ];

    for forbidden in forbidden_system32_processes {
        assert!(
            !SYSTEM32_WHITELIST.contains(&forbidden),
            "Forbidden internal OS process '{}' must NOT be in System32 whitelist",
            forbidden
        );
    }

    // 5. Windows Settings Catalog completeness
    assert!(
        SETTINGS_CATALOG.len() >= 50,
        "Settings catalog must have at least 50 entries, found {}",
        SETTINGS_CATALOG.len()
    );

    let scanned_settings = scan_windows_settings();
    assert_eq!(
        scanned_settings.len(),
        SETTINGS_CATALOG.len(),
        "scan_windows_settings must return all catalog entries"
    );

    for s in scanned_settings {
        assert!(
            s.path.starts_with("ms-settings:"),
            "Setting URI '{}' must start with ms-settings:",
            s.path
        );
        assert!(!s.name.is_empty(), "Setting name cannot be empty");
        assert_eq!(s.content_type, 2, "Setting content_type must be 2");
        assert!(
            s.app_id.starts_with("setting:"),
            "Setting app_id '{}' must start with 'setting:'",
            s.app_id
        );
    }
}

// =========================================================================
// AREA 5: REAL SQLITE FRECENCY INTEGRATION & END-TO-END SEARCH VERIFICATION
// =========================================================================

#[test]
fn test_empirical_sqlite_frecency_and_e2e_ranking() {
    let db = Database::open_in_memory().expect("in-memory db init failed");

    // Register 3 apps with identical title lengths to verify pure alphabetical tie-breaking
    let apps = vec![
        AppCacheItem {
            id: Some(1),
            name: "Browser Alpha".into(),
            path: "C:\\alpha.exe".into(),
            localized_name: None,
            app_id: "app:alpha".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(2),
            name: "Browser Gamma".into(),
            path: "C:\\gamma.exe".into(),
            localized_name: None,
            app_id: "app:gamma".into(),
            content_type: 0,
            icon_path: None,
        },
        AppCacheItem {
            id: Some(3),
            name: "Browser Omega".into(),
            path: "C:\\omega.exe".into(),
            localized_name: None,
            app_id: "app:omega".into(),
            content_type: 0,
            icon_path: None,
        },
    ];

    // Initial query for "Browser" without usage
    let initial_frecency = db.get_frecency_scores().expect("frecency query failed");
    let initial_results = search_all("Browser", &apps, &initial_frecency, 10);
    let initial_app_results: Vec<_> = initial_results.iter().filter(|r| r.category == "app").collect();

    // Pure alphabetical tie-break: Alpha, Gamma, Omega
    assert_eq!(initial_app_results[0].title, "Browser Alpha");
    assert_eq!(initial_app_results[1].title, "Browser Gamma");
    assert_eq!(initial_app_results[2].title, "Browser Omega");

    // Simulate user launching "Browser Omega" 10 times via db.record_frecency_access
    for _ in 0..10 {
        db.record_frecency_access("app:omega")
            .expect("record frecency failed");
    }

    // Now re-fetch frecency map from SQLite
    let updated_frecency = db.get_frecency_scores().expect("frecency query failed");
    let omega_frecency = updated_frecency.get("app:omega").copied().unwrap_or(0.0);
    assert!(
        omega_frecency >= 10.0,
        "Browser Omega frecency must be at least 10.0, got {}",
        omega_frecency
    );

    // Re-run search
    let ranked_results = search_all("Browser", &apps, &updated_frecency, 10);
    let ranked_apps: Vec<_> = ranked_results.iter().filter(|r| r.category == "app").collect();

    // Browser Omega must now be ranked #1
    assert_eq!(
        ranked_apps[0].title, "Browser Omega",
        "Frequently launched Browser Omega must be promoted to #1 position"
    );

    // Verify root commands are present and intact
    let root_cmds = get_root_commands();
    assert_eq!(root_cmds.len(), 8, "Must have exactly 8 root commands");
    let cmd_ids: Vec<_> = root_cmds.iter().map(|c| c.id.as_str()).collect();
    assert!(cmd_ids.contains(&"cmd-clipboard"));
    assert!(cmd_ids.contains(&"cmd-snippets"));
    assert!(cmd_ids.contains(&"cmd-files"));
    assert!(cmd_ids.contains(&"cmd-settings"));
    assert!(cmd_ids.contains(&"cmd-lock"));
    assert!(cmd_ids.contains(&"cmd-sleep"));
    assert!(cmd_ids.contains(&"cmd-restart"));
    assert!(cmd_ids.contains(&"cmd-shutdown"));
}
