use crate::db::{Database, CURRENT_DB_VERSION};
use crate::models::SnippetItem;

#[test]
fn test_init_database_in_memory() {
    let db = Database::open_in_memory().expect("Should initialize in-memory database");
    let conn = db.get_conn().unwrap();

    // Verify user_version pragma
    let version: u32 = conn
        .query_row("PRAGMA user_version;", [], |row| row.get(0))
        .unwrap();
    assert_eq!(version, CURRENT_DB_VERSION);

    // Verify tables exist
    let tables: Vec<String> = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .unwrap()
        .query_map([], |row| row.get(0))
        .unwrap()
        .map(|r| r.unwrap())
        .collect();

    assert!(tables.contains(&"clipboard_entries".to_string()));
    assert!(tables.contains(&"clipboard_representations".to_string()));
    assert!(tables.contains(&"snippets".to_string()));
    assert!(tables.contains(&"snippets_search".to_string()));
    assert!(tables.contains(&"frecency_root_search".to_string()));
    assert!(tables.contains(&"app_cache".to_string()));
}

#[test]
fn test_clipboard_deduplication_and_count() {
    let db = Database::open_in_memory().unwrap();

    // First copy
    let id1 = db
        .add_clipboard_entry("Hello World", "text/plain", Some("Code.exe"), 500)
        .unwrap();

    // Second copy of identical content
    let id2 = db
        .add_clipboard_entry("Hello World", "text/plain", Some("Code.exe"), 500)
        .unwrap();
    assert_eq!(id1, id2, "Deduplication must return existing ID");

    let items = db.get_clipboard_history(None, 10).unwrap();
    assert_eq!(items.len(), 1, "Only 1 entry should exist in history");
    assert_eq!(items[0].copy_count, 2, "copy_count should be incremented to 2");
    assert_eq!(items[0].content, "Hello World");
}

#[test]
fn test_clipboard_ring_buffer_pruning() {
    let db = Database::open_in_memory().unwrap();
    let max_items = 5;

    // Insert 8 distinct items
    for i in 1..=8 {
        db.add_clipboard_entry(&format!("Item {}", i), "text/plain", None, max_items)
            .unwrap();
    }

    let history = db.get_clipboard_history(None, 20).unwrap();
    assert_eq!(history.len(), max_items, "Ring buffer must prune to max_items");

    // Ensure the newest items (8, 7, 6, 5, 4) are preserved
    assert_eq!(history[0].content, "Item 8");
    assert_eq!(history[4].content, "Item 4");
}

#[test]
fn test_clipboard_pinned_preservation_and_clear() {
    let db = Database::open_in_memory().unwrap();

    let id_pinned = db
        .add_clipboard_entry("Pinned Note", "text/plain", None, 500)
        .unwrap();
    let is_pinned = db.toggle_clipboard_pin(id_pinned).unwrap();
    assert!(is_pinned);

    let _id_unpinned = db
        .add_clipboard_entry("Temporary Text", "text/plain", None, 500)
        .unwrap();

    // Clear history
    let deleted = db.clear_clipboard_history().unwrap();
    assert_eq!(deleted, 1, "Should delete exactly 1 unpinned item");

    let remaining = db.get_clipboard_history(None, 10).unwrap();
    assert_eq!(remaining.len(), 1, "Pinned item must survive clear");
    assert_eq!(remaining[0].content, "Pinned Note");
    assert!(remaining[0].pinned);
}

#[test]
fn test_snippets_crud_and_keyword_lookup() {
    let db = Database::open_in_memory().unwrap();

    let snippet = SnippetItem {
        id: None,
        title: "Git Status Shortcut".to_string(),
        keyword: "gstat".to_string(),
        text: "git status -sb".to_string(),
        raw_content: None,
        copy_count: 0,
        pinned: false,
    };

    let id = db.save_snippet(&snippet).unwrap();
    assert!(id > 0);

    // Keyword lookup
    let found = db
        .get_snippet_by_keyword("gstat")
        .unwrap()
        .expect("Should find snippet");
    assert_eq!(found.title, "Git Status Shortcut");
    assert_eq!(found.text, "git status -sb");

    // Verify automatic synchronization trigger for snippets_search
    let conn = db.get_conn().unwrap();
    let search_text: String = conn
        .query_row(
            "SELECT text_search FROM snippets_search WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(search_text, "git status -sb");
}

#[test]
fn test_frecency_scoring_upsert() {
    let db = Database::open_in_memory().unwrap();

    db.record_frecency_access("app::terminal").unwrap();
    db.record_frecency_access("app::terminal").unwrap();
    db.record_frecency_access("app::browser").unwrap();

    let scores = db.get_frecency_scores().unwrap();
    assert_eq!(*scores.get("app::terminal").unwrap(), 2.0);
    assert_eq!(*scores.get("app::browser").unwrap(), 1.0);
}
