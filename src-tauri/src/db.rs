use md5::{Digest, Md5};
use rusqlite::{Connection, Result as SqliteResult};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use thiserror::Error;

use crate::models::{AppCacheItem, ClipboardItem, SnippetItem};

pub const CURRENT_DB_VERSION: u32 = 1;

pub const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS clipboard_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    source_app TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    copy_count INTEGER NOT NULL DEFAULT 1,
    pinned REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS clipboard_representations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    content_type INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES clipboard_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clipboard_entries_updated_at ON clipboard_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clipboard_entries_pinned ON clipboard_entries(pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clipboard_entries_hash ON clipboard_entries(content_hash);
CREATE INDEX IF NOT EXISTS idx_clipboard_rep_entry_id ON clipboard_representations(entry_id);
CREATE INDEX IF NOT EXISTS idx_clipboard_rep_mime ON clipboard_representations(mime_type);

CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    keyword TEXT,
    text TEXT NOT NULL,
    raw_content TEXT,
    icon TEXT NOT NULL DEFAULT 'text',
    copy_count INTEGER NOT NULL DEFAULT 0,
    pinned REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_modified_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    accessed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS snippets_search (
    id INTEGER PRIMARY KEY,
    title_search TEXT NOT NULL,
    keyword_search TEXT,
    text_search TEXT NOT NULL,
    FOREIGN KEY (id) REFERENCES snippets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snippets_keyword ON snippets(keyword);
CREATE INDEX IF NOT EXISTS idx_snippets_pinned ON snippets(pinned DESC, title ASC);
CREATE INDEX IF NOT EXISTS idx_snippets_search_keyword ON snippets_search(keyword_search);

CREATE TRIGGER IF NOT EXISTS trg_snippets_insert AFTER INSERT ON snippets
BEGIN
    INSERT INTO snippets_search (id, title_search, keyword_search, text_search)
    VALUES (NEW.id, lower(NEW.title), lower(coalesce(NEW.keyword, '')), lower(NEW.text));
END;

CREATE TRIGGER IF NOT EXISTS trg_snippets_update AFTER UPDATE ON snippets
BEGIN
    UPDATE snippets_search
    SET title_search = lower(NEW.title),
        keyword_search = lower(coalesce(NEW.keyword, '')),
        text_search = lower(NEW.text)
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_snippets_delete AFTER DELETE ON snippets
BEGIN
    DELETE FROM snippets_search WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS frecency_root_search (
    item_id TEXT NOT NULL PRIMARY KEY,
    frecency_score REAL NOT NULL DEFAULT 1.0,
    access_count INTEGER NOT NULL DEFAULT 1,
    last_accessed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_frecency_score ON frecency_root_search(frecency_score DESC);

CREATE TABLE IF NOT EXISTS app_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    localized_name TEXT,
    app_id TEXT NOT NULL,
    content_type INTEGER NOT NULL DEFAULT 0,
    icon_path TEXT,
    last_scanned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_app_cache_name ON app_cache(name);
CREATE INDEX IF NOT EXISTS idx_app_cache_path ON app_cache(path);
"#;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Lock contention error: {0}")]
    Lock(String),
    #[error("Record not found: {0}")]
    NotFound(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Resolves the production path for the SQLite database: %LOCALAPPDATA%\Focal\focal.db
pub fn resolve_db_path() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data).join("Focal").join("focal.db")
    } else if let Some(proj_dirs) = directories::ProjectDirs::from("com", "focal", "Focal") {
        proj_dirs.data_local_dir().join("focal.db")
    } else {
        PathBuf::from("./data/focal.db")
    }
}

pub fn configure_pragmas(conn: &Connection) -> SqliteResult<()> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA temp_store = MEMORY;
         PRAGMA cache_size = -64000;",
    )?;
    Ok(())
}

pub fn init_database(conn: &mut Connection) -> Result<(), DbError> {
    configure_pragmas(conn)?;

    let current_version: u32 = conn.query_row(
        "PRAGMA user_version;",
        [],
        |row| row.get(0),
    )?;

    if current_version < 1 {
        let tx = conn.transaction()?;
        tx.execute_batch(SCHEMA_V1)?;
        tx.pragma_update(None, "user_version", 1)?;
        tx.commit()?;
    }

    Ok(())
}

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<rusqlite::Connection>>,
}

impl Database {
    /// Opens the persistent database file at the specified path
    pub fn open(path: &Path) -> Result<Self, DbError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut conn = Connection::open(path)?;
        init_database(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Opens an isolated in-memory database for unit testing
    pub fn open_in_memory() -> Result<Self, DbError> {
        let mut conn = Connection::open_in_memory()?;
        init_database(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Helper to access underlying connection lock
    pub fn get_conn(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, DbError> {
        self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))
    }

    /// Ingests clipboard text. If matching identical content recently, increments copy_count
    /// and bubbles item to the top. Enforces ring buffer capacity.
    pub fn add_clipboard_entry(
        &self,
        content: &str,
        mime_type: &str,
        source_app: Option<&str>,
        max_items: usize,
    ) -> Result<i64, DbError> {
        let mut hasher = Md5::new();
        hasher.update(content.as_bytes());
        let hash = format!("{:x}", hasher.finalize());

        let preview_title = if content.lines().next().unwrap_or("").chars().count() > 100 {
            let truncated: String = content.lines().next().unwrap_or("").chars().take(100).collect();
            format!("{}...", truncated)
        } else {
            content.lines().next().unwrap_or("").to_string()
        };

        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        // 1. Check for duplicate content_hash
        let existing: Option<(i64, i32)> = conn
            .query_row(
                "SELECT id, copy_count FROM clipboard_entries WHERE content_hash = ?1 LIMIT 1",
                [&hash],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        if let Some((existing_id, count)) = existing {
            conn.execute(
                "UPDATE clipboard_entries 
                 SET copy_count = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') 
                 WHERE id = ?2",
                rusqlite::params![count + 1, existing_id],
            )?;
            return Ok(existing_id);
        }

        // 2. Insert new entry in a transaction
        let tx = conn.unchecked_transaction()?;

        tx.execute(
            "INSERT INTO clipboard_entries (title, content_hash, source_app, created_at, updated_at)
             VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            rusqlite::params![preview_title, hash, source_app.unwrap_or("")],
        )?;
        let entry_id = tx.last_insert_rowid();

        tx.execute(
            "INSERT INTO clipboard_representations (entry_id, mime_type, content_type, content)
             VALUES (?1, ?2, 0, ?3)",
            rusqlite::params![entry_id, mime_type, content],
        )?;

        // 3. Prune ring buffer (delete oldest unpinned items exceeding max_items)
        tx.execute(
            "DELETE FROM clipboard_entries 
             WHERE pinned = 0.0 AND id NOT IN (
                 SELECT id FROM clipboard_entries 
                 WHERE pinned = 0.0 
                 ORDER BY updated_at DESC, id DESC 
                 LIMIT ?1
             )",
            [max_items as i64],
        )?;

        tx.commit()?;
        Ok(entry_id)
    }

    /// Queries clipboard history with optional search query and limit
    pub fn get_clipboard_history(
        &self,
        query: Option<&str>,
        limit: usize,
    ) -> Result<Vec<ClipboardItem>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;

        let mut sql = String::from(
            "SELECT e.id, r.content, e.source_app, e.created_at, e.copy_count, e.pinned
             FROM clipboard_entries e
             JOIN clipboard_representations r ON e.id = r.entry_id AND r.mime_type = 'text/plain' ",
        );

        let has_query = query.map(|q| !q.trim().is_empty()).unwrap_or(false);
        if has_query {
            sql.push_str("WHERE (e.title LIKE ?1 OR r.content LIKE ?1) ");
        }
        sql.push_str("ORDER BY e.pinned DESC, e.updated_at DESC, e.id DESC LIMIT ?2");

        let mut stmt = conn.prepare(&sql)?;

        let rows = if has_query {
            let pattern = format!("%{}%", query.unwrap());
            stmt.query_map(rusqlite::params![pattern, limit as i64], Self::map_clipboard_row)?
        } else {
            stmt.query_map(rusqlite::params!["", limit as i64], Self::map_clipboard_row)?
        };

        let mut items = Vec::new();
        for item in rows {
            items.push(item?);
        }
        Ok(items)
    }

    fn map_clipboard_row(row: &rusqlite::Row) -> rusqlite::Result<ClipboardItem> {
        let pinned_val: f64 = row.get(5)?;
        Ok(ClipboardItem {
            id: row.get(0)?,
            content: row.get(1)?,
            source_app: {
                let s: String = row.get(2)?;
                if s.is_empty() {
                    None
                } else {
                    Some(s)
                }
            },
            created_at: row.get(3)?,
            copy_count: row.get(4)?,
            pinned: pinned_val > 0.0,
        })
    }

    /// Toggles pinned status of a clipboard item
    pub fn toggle_clipboard_pin(&self, id: i64) -> Result<bool, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let currently_pinned: f64 = conn.query_row(
            "SELECT pinned FROM clipboard_entries WHERE id = ?1",
            [id],
            |row| row.get(0),
        )?;

        let new_pinned = if currently_pinned > 0.0 { 0.0 } else { 1.0 };
        conn.execute(
            "UPDATE clipboard_entries SET pinned = ?1 WHERE id = ?2",
            rusqlite::params![new_pinned, id],
        )?;
        Ok(new_pinned > 0.0)
    }

    /// Clears unpinned history, preserving pinned items
    pub fn clear_clipboard_history(&self) -> Result<usize, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let deleted = conn.execute("DELETE FROM clipboard_entries WHERE pinned = 0.0", [])?;
        Ok(deleted)
    }

    // =========================================================================
    // SNIPPETS CRUD OPERATIONS
    // =========================================================================

    pub fn get_snippets(&self) -> Result<Vec<SnippetItem>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, title, keyword, text, raw_content, copy_count, pinned
             FROM snippets
             ORDER BY pinned DESC, title ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            let pinned_val: f64 = row.get(6)?;
            Ok(SnippetItem {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                keyword: row.get(2)?,
                text: row.get(3)?,
                raw_content: row.get(4)?,
                copy_count: row.get(5)?,
                pinned: pinned_val > 0.0,
            })
        })?;

        let mut snippets = Vec::new();
        for s in rows {
            snippets.push(s?);
        }
        Ok(snippets)
    }

    pub fn save_snippet(&self, snippet: &SnippetItem) -> Result<i64, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let pinned_val = if snippet.pinned { 1.0 } else { 0.0 };

        if let Some(id) = snippet.id {
            conn.execute(
                "UPDATE snippets 
                 SET title = ?1, keyword = ?2, text = ?3, raw_content = ?4, pinned = ?5,
                     last_modified_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                 WHERE id = ?6",
                rusqlite::params![
                    snippet.title,
                    snippet.keyword,
                    snippet.text,
                    snippet.raw_content,
                    pinned_val,
                    id
                ],
            )?;
            Ok(id)
        } else {
            conn.execute(
                "INSERT INTO snippets (title, keyword, text, raw_content, pinned)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    snippet.title,
                    snippet.keyword,
                    snippet.text,
                    snippet.raw_content,
                    pinned_val
                ],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }

    pub fn delete_snippet(&self, id: i64) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute("DELETE FROM snippets WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn get_snippet_by_keyword(&self, keyword: &str) -> Result<Option<SnippetItem>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let result = conn.query_row(
            "SELECT id, title, keyword, text, raw_content, copy_count, pinned
             FROM snippets
             WHERE lower(keyword) = lower(?1)
             LIMIT 1",
            [keyword],
            |row| {
                let pinned_val: f64 = row.get(6)?;
                Ok(SnippetItem {
                    id: Some(row.get(0)?),
                    title: row.get(1)?,
                    keyword: row.get(2)?,
                    text: row.get(3)?,
                    raw_content: row.get(4)?,
                    copy_count: row.get(5)?,
                    pinned: pinned_val > 0.0,
                })
            },
        );

        match result {
            Ok(s) => Ok(Some(s)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DbError::Sqlite(e)),
        }
    }

    // =========================================================================
    // FRECENCY ROOT SEARCH SCORING
    // =========================================================================

    pub fn record_frecency_access(&self, item_id: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        conn.execute(
            "INSERT INTO frecency_root_search (item_id, frecency_score, access_count, last_accessed_at)
             VALUES (?1, 1.0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
             ON CONFLICT(item_id) DO UPDATE SET
                 access_count = access_count + 1,
                 frecency_score = frecency_score + 1.0,
                 last_accessed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            [item_id],
        )?;
        Ok(())
    }

    pub fn get_frecency_scores(&self) -> Result<HashMap<String, f64>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let mut stmt = conn.prepare("SELECT item_id, frecency_score FROM frecency_root_search")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        let mut scores = HashMap::new();
        for r in rows {
            let (id, score) = r?;
            scores.insert(id, score);
        }
        Ok(scores)
    }

    // =========================================================================
    // APPLICATION DISCOVERY CACHE
    // =========================================================================

    pub fn cache_apps(&self, apps: &[AppCacheItem]) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let tx = conn.unchecked_transaction()?;

        tx.execute("DELETE FROM app_cache", [])?;
        for app in apps {
            tx.execute(
                "INSERT INTO app_cache (name, path, localized_name, app_id, content_type, icon_path)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    app.name,
                    app.path,
                    app.localized_name,
                    app.app_id,
                    app.content_type,
                    app.icon_path
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn get_cached_apps(&self) -> Result<Vec<AppCacheItem>, DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, path, localized_name, app_id, content_type, icon_path FROM app_cache ORDER BY name ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AppCacheItem {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                path: row.get(2)?,
                localized_name: row.get(3)?,
                app_id: row.get(4)?,
                content_type: row.get(5)?,
                icon_path: row.get(6)?,
            })
        })?;

        let mut apps = Vec::new();
        for a in rows {
            apps.push(a?);
        }
        Ok(apps)
    }
}
