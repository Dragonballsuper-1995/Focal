use runner_lib::config::{write_config_atomic, ConfigError, ConfigManager};
use runner_lib::db::Database;
use runner_lib::models::{RunnerConfig, ThemeMode};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tempfile::tempdir;

#[test]
fn test_empirical_ring_buffer_600_items_and_pinned_preservation() {
    let db = Database::open_in_memory().expect("in-memory db init failed");
    let max_items = 500;

    println!("[TEST] Inserting 600 items into clipboard ring buffer (max = 500)...");

    // Insert 50 unpinned items (1..=50)
    for i in 1..=50 {
        db.add_clipboard_entry(&format!("Unpinned Item {:04}", i), "text/plain", Some("app.exe"), max_items)
            .expect("insert failed");
    }

    // Insert 5 pinned items (pinned 1..=5)
    let mut pinned_ids = Vec::new();
    for p in 1..=5 {
        let pid = db
            .add_clipboard_entry(&format!("PINNED ITEM {:04}", p), "text/plain", Some("pinned.exe"), max_items)
            .expect("insert failed");
        let was_pinned = db.toggle_clipboard_pin(pid).expect("pin toggle failed");
        assert!(was_pinned, "Item must be pinned");
        pinned_ids.push(pid);
    }

    // Insert 500 more unpinned items (51..=550)
    for i in 51..=550 {
        db.add_clipboard_entry(&format!("Unpinned Item {:04}", i), "text/plain", Some("app.exe"), max_items)
            .expect("insert failed");
    }

    // Insert another 5 pinned items (pinned 6..=10)
    for p in 6..=10 {
        let pid = db
            .add_clipboard_entry(&format!("PINNED ITEM {:04}", p), "text/plain", Some("pinned.exe"), max_items)
            .expect("insert failed");
        let was_pinned = db.toggle_clipboard_pin(pid).expect("pin toggle failed");
        assert!(was_pinned, "Item must be pinned");
        pinned_ids.push(pid);
    }

    // Insert 50 more unpinned items (551..=600)
    // Total unpinned inserted: 50 + 500 + 50 = 600.
    // Total pinned inserted: 5 + 5 = 10.
    // Grand total insertions: 610.
    for i in 551..=600 {
        db.add_clipboard_entry(&format!("Unpinned Item {:04}", i), "text/plain", Some("app.exe"), max_items)
            .expect("insert failed");
    }

    let conn = db.get_conn().expect("lock failed");

    // 1. Verify exactly 500 unpinned items remain
    let unpinned_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM clipboard_entries WHERE pinned = 0.0",
            [],
            |row| row.get(0),
        )
        .expect("query failed");
    println!("[TEST] Remaining unpinned entries count: {}", unpinned_count);
    assert_eq!(
        unpinned_count, 500,
        "Ring buffer boundary must enforce exactly 500 unpinned entries"
    );

    // 2. Verify all 10 pinned items were preserved
    let pinned_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM clipboard_entries WHERE pinned > 0.0",
            [],
            |row| row.get(0),
        )
        .expect("query failed");
    println!("[TEST] Remaining pinned entries count: {}", pinned_count);
    assert_eq!(
        pinned_count, 10,
        "Pinned items must NEVER be deleted by ring buffer pruning"
    );

    for pid in &pinned_ids {
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM clipboard_entries WHERE id = ?1)",
                [pid],
                |row| row.get(0),
            )
            .expect("query failed");
        assert!(exists, "Pinned item with id {} must exist", pid);
    }

    // 3. Verify total entries in clipboard_entries == 510
    let total_entries: i64 = conn
        .query_row("SELECT count(*) FROM clipboard_entries", [], |row| row.get(0))
        .expect("query failed");
    assert_eq!(total_entries, 510);

    // 4. Verify cascade delete in clipboard_representations (must match total_entries: 510)
    let rep_count: i64 = conn
        .query_row("SELECT count(*) FROM clipboard_representations", [], |row| row.get(0))
        .expect("query failed");
    println!("[TEST] Remaining representations count: {}", rep_count);
    assert_eq!(
        rep_count, 510,
        "clipboard_representations must match clipboard_entries count via ON DELETE CASCADE (no orphaned rows)"
    );

    // 5. Verify the oldest unpinned items (e.g. Item 0001 to Item 0100) were pruned
    for i in 1..=100 {
        let title = format!("Unpinned Item {:04}", i);
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM clipboard_entries WHERE title = ?1)",
                [&title],
                |row| row.get(0),
            )
            .expect("query failed");
        assert!(
            !exists,
            "Older unpinned entry '{}' should have been pruned",
            title
        );
    }

    // 6. Verify newest unpinned items (Item 0501 to Item 0600) exist
    for i in 501..=600 {
        let title = format!("Unpinned Item {:04}", i);
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM clipboard_entries WHERE title = ?1)",
                [&title],
                |row| row.get(0),
            )
            .expect("query failed");
        assert!(
            exists,
            "Newer unpinned entry '{}' must be preserved",
            title
        );
    }
}

#[test]
fn test_empirical_deduplication_counter_and_updated_at() {
    let db = Database::open_in_memory().expect("in-memory db init failed");
    let content = "Empirical Deduplication Target Content - 2026";

    // First insert
    let id1 = db
        .add_clipboard_entry(content, "text/plain", Some("app1.exe"), 500)
        .expect("first insert failed");

    let conn = db.get_conn().expect("lock failed");
    let (created_at_1, updated_at_1, count_1): (String, String, i64) = conn
        .query_row(
            "SELECT created_at, updated_at, copy_count FROM clipboard_entries WHERE id = ?1",
            [id1],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("query failed");
    assert_eq!(count_1, 1);
    assert_eq!(created_at_1, updated_at_1);
    drop(conn);

    // Short sleep so that strftime timestamp advances if system clock has 10ms resolution
    thread::sleep(Duration::from_millis(50));

    // Second insert with identical text
    let id2 = db
        .add_clipboard_entry(content, "text/plain", Some("app2.exe"), 500)
        .expect("second insert failed");

    assert_eq!(id1, id2, "Deduplication must return existing ID");

    let conn = db.get_conn().expect("lock failed");
    let (created_at_2, updated_at_2, count_2): (String, String, i64) = conn
        .query_row(
            "SELECT created_at, updated_at, copy_count FROM clipboard_entries WHERE id = ?1",
            [id1],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("query failed");

    assert_eq!(count_2, 2, "copy_count must increment to 2");
    assert_eq!(created_at_1, created_at_2, "created_at must remain constant");
    assert!(
        updated_at_2 > updated_at_1,
        "updated_at must update to current timestamp (old: {}, new: {})",
        updated_at_1,
        updated_at_2
    );

    // Verify row counts: exactly 1 entry in clipboard_entries and 1 representation
    let entry_rows: i64 = conn
        .query_row("SELECT count(*) FROM clipboard_entries", [], |row| row.get(0))
        .expect("query failed");
    let rep_rows: i64 = conn
        .query_row("SELECT count(*) FROM clipboard_representations", [], |row| row.get(0))
        .expect("query failed");
    assert_eq!(entry_rows, 1, "Must have exactly 1 entry row");
    assert_eq!(rep_rows, 1, "Must have exactly 1 representation row");
    drop(conn);

    // Add intermediate items
    for i in 1..=5 {
        db.add_clipboard_entry(&format!("Other item {}", i), "text/plain", None, 500)
            .unwrap();
    }

    // Verify intermediate items are on top
    let history_before = db.get_clipboard_history(None, 10).unwrap();
    assert_ne!(history_before[0].id, id1);

    thread::sleep(Duration::from_millis(50));

    // Third insert with identical text: should bubble back to the top
    let id3 = db
        .add_clipboard_entry(content, "text/plain", None, 500)
        .expect("third insert failed");
    assert_eq!(id3, id1);

    let history_after = db.get_clipboard_history(None, 10).unwrap();
    assert_eq!(
        history_after[0].id, id1,
        "Deduplicated item must bubble to top of history after being re-copied"
    );
    assert_eq!(history_after[0].copy_count, 3);
}

#[test]
fn test_empirical_atomic_config_corrupt_recovery_and_backup() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.json");
    let backup_path = dir.path().join("config.bak");

    // 1. Initial creation
    let manager = ConfigManager::load(Some(config_path.clone())).expect("load failed");
    let mut initial = manager.get();
    initial.theme = ThemeMode::Dark;
    initial.global_hotkey = "Ctrl+Shift+Space".to_string();
    initial.max_clipboard_items = 750;
    manager.update(initial.clone()).expect("update failed");

    // Verify both config.json and config.bak exist
    assert!(config_path.exists(), "config.json must exist");
    assert!(backup_path.exists(), "config.bak must exist");

    // 2. Corrupt config.json with malformed JSON
    std::fs::write(&config_path, b"{\"theme\": \"corrupted\", incomplete json...")
        .expect("write failed");

    // Reload manager — should recover from .bak
    let recovered_manager =
        ConfigManager::load(Some(config_path.clone())).expect("reload should succeed from .bak");
    let recovered_config = recovered_manager.get();
    assert_eq!(
        recovered_config.theme,
        ThemeMode::Dark,
        "Theme must be recovered from backup"
    );
    assert_eq!(
        recovered_config.global_hotkey, "Ctrl+Shift+Space",
        "Hotkey must be recovered from backup"
    );
    assert_eq!(recovered_config.max_clipboard_items, 750);

    // 3. Test 0-byte (empty) file corruption
    std::fs::write(&config_path, b"").expect("empty write failed");
    let recovered_empty = ConfigManager::load(Some(config_path.clone()))
        .expect("reload from 0-byte file should recover from .bak");
    assert_eq!(recovered_empty.get().theme, ThemeMode::Dark);

    // 4. Test when both config and backup are corrupted
    std::fs::write(&config_path, b"garbage data 1").expect("write failed");
    std::fs::write(&backup_path, b"garbage data 2").expect("write failed");
    let fallback_manager = ConfigManager::load(Some(config_path.clone()))
        .expect("reload with both corrupt should fallback to default");
    assert_eq!(
        fallback_manager.get(),
        RunnerConfig::default(),
        "Must fallback to RunnerConfig::default() if both corrupt"
    );
}

#[test]
fn test_empirical_concurrent_config_writes() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.json");

    let manager = Arc::new(ConfigManager::load(Some(config_path.clone())).expect("init failed"));

    // Spawn 10 concurrent threads updating config
    let num_threads = 10;
    let mut handles = Vec::new();

    for i in 0..num_threads {
        let mgr = Arc::clone(&manager);
        let handle = thread::spawn(move || {
            let mut cfg = mgr.get();
            cfg.max_clipboard_items = 100 + i * 10;
            mgr.update(cfg)
        });
        handles.push(handle);
    }

    let mut success_count = 0;
    let mut err_count = 0;
    let mut errors = Vec::new();

    for h in handles {
        match h.join().unwrap() {
            Ok(_) => success_count += 1,
            Err(e) => {
                err_count += 1;
                errors.push(format!("{:?}", e));
            }
        }
    }

    println!(
        "[CONCURRENT TEST] Result: {} successes, {} errors: {:?}",
        success_count, err_count, errors
    );

    // Regardless of whether concurrent write had contention errors or retried,
    // the resulting config file on disk MUST NOT BE CORRUPTED!
    let reloaded = ConfigManager::load(Some(config_path)).expect("config file must not be corrupted");
    let valid_cfg = reloaded.get();
    assert!(
        valid_cfg.max_clipboard_items >= 100 && valid_cfg.max_clipboard_items <= 190,
        "max_clipboard_items should be a valid updated value"
    );
}

#[test]
fn test_empirical_config_boundary_validation() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config_boundary.json");

    let mut cfg = RunnerConfig::default();

    // Boundary: max_clipboard_items must be between 10 and 10,000
    cfg.max_clipboard_items = 9;
    let err = write_config_atomic(&cfg, &config_path).unwrap_err();
    assert!(matches!(err, ConfigError::Validation(_)));

    cfg.max_clipboard_items = 10;
    assert!(write_config_atomic(&cfg, &config_path).is_ok());

    cfg.max_clipboard_items = 10_000;
    assert!(write_config_atomic(&cfg, &config_path).is_ok());

    cfg.max_clipboard_items = 10_001;
    let err = write_config_atomic(&cfg, &config_path).unwrap_err();
    assert!(matches!(err, ConfigError::Validation(_)));

    // Hotkey boundaries: empty / whitespace strings
    cfg.max_clipboard_items = 500;
    cfg.global_hotkey = "   ".to_string();
    let err = write_config_atomic(&cfg, &config_path).unwrap_err();
    assert!(matches!(err, ConfigError::Validation(_)));

    cfg.global_hotkey = "Alt+Space".to_string();
    cfg.fallback_hotkey = "".to_string();
    let err = write_config_atomic(&cfg, &config_path).unwrap_err();
    assert!(matches!(err, ConfigError::Validation(_)));
}

#[test]
fn test_empirical_concurrent_database_operations() {
    let db = Arc::new(Database::open_in_memory().expect("in-memory db failed"));
    let num_threads = 20;
    let mut handles = Vec::new();

    for t in 0..num_threads {
        let db_clone = Arc::clone(&db);
        let handle = thread::spawn(move || {
            for i in 0..25 {
                let text = format!("Thread {} - Item {}", t, i);
                let _id = db_clone.add_clipboard_entry(&text, "text/plain", Some("worker.exe"), 200).unwrap();

                // Interleaved reads and queries
                if i % 5 == 0 {
                    let _ = db_clone.get_clipboard_history(Some("Item"), 10);
                    let _ = db_clone.record_frecency_access(&format!("item_t_{}", t));
                }
            }
        });
        handles.push(handle);
    }

    for h in handles {
        h.join().expect("thread join failed");
    }

    // Verify database remains fully consistent and accessible
    let history = db.get_clipboard_history(None, 500).expect("query failed");
    assert_eq!(history.len(), 200, "Ring buffer must strictly enforce 200 max items even under 20 concurrent threads");

    let frecency = db.get_frecency_scores().expect("frecency query failed");
    assert_eq!(frecency.len(), 20, "All 20 thread frecency keys must be recorded");
}

#[test]
fn test_empirical_unicode_and_special_characters_dedup() {
    let db = Database::open_in_memory().expect("db open failed");

    // Multibyte emojis and characters exceeding 100 characters to test preview truncation safety
    let long_unicode = "🚀🎉🔥🦀✨ ".repeat(25); // > 150 chars with complex multi-byte code points
    let id1 = db.add_clipboard_entry(&long_unicode, "text/plain", None, 50).unwrap();
    let id2 = db.add_clipboard_entry(&long_unicode, "text/plain", None, 50).unwrap();
    assert_eq!(id1, id2, "Unicode text must deduplicate correctly");

    let history = db.get_clipboard_history(None, 10).unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].copy_count, 2);
    assert_eq!(history[0].content, long_unicode);

    // Empty content test
    let empty_id1 = db.add_clipboard_entry("", "text/plain", None, 50).unwrap();
    let empty_id2 = db.add_clipboard_entry("", "text/plain", None, 50).unwrap();
    assert_eq!(empty_id1, empty_id2);

    let history2 = db.get_clipboard_history(None, 10).unwrap();
    assert_eq!(history2.len(), 2);
}

#[test]
fn test_empirical_sql_injection_and_escaping_safety() {
    let db = Database::open_in_memory().expect("db open failed");

    let malicious_payloads = [
        "'; DROP TABLE clipboard_entries; --",
        "' OR '1'='1",
        "\" UNION SELECT id, content, '' FROM clipboard_representations --",
        "NULL\0BYTE_TEST",
    ];

    for (idx, payload) in malicious_payloads.iter().enumerate() {
        let id = db.add_clipboard_entry(payload, "text/plain", Some("attacker.exe"), 50).unwrap();
        assert!(id > 0);

        // Search with malicious query
        let results = db.get_clipboard_history(Some(payload), 10).unwrap();
        assert_eq!(results.len(), 1, "Payload index {} should safely match as literal string", idx);
        assert_eq!(results[0].content, *payload);
    }

    // Verify tables still exist
    let conn = db.get_conn().unwrap();
    let count: i64 = conn.query_row("SELECT count(*) FROM clipboard_entries", [], |r| r.get(0)).unwrap();
    assert_eq!(count, malicious_payloads.len() as i64);
}

