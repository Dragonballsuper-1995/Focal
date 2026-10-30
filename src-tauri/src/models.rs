use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Dark,
    Light,
    System,
}

impl Default for ThemeMode {
    fn default() -> Self {
        ThemeMode::System
    }
}

impl std::fmt::Display for ThemeMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ThemeMode::Dark => write!(f, "dark"),
            ThemeMode::Light => write!(f, "light"),
            ThemeMode::System => write!(f, "system"),
        }
    }
}

/// Root search sensitivity for fuzzy matching cutoff
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SearchSensitivity {
    Low,
    Medium,
    High,
}

impl Default for SearchSensitivity {
    fn default() -> Self {
        SearchSensitivity::Medium
    }
}

/// High-performance search result returned to the Command Palette
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub category: String, // "app" | "command" | "setting" | "file" | "clipboard"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub action: String,
    pub score: f64,
}

/// Clipboard item stored in the SQLite ring buffer
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: i64,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_app: Option<String>,
    pub created_at: String,
    pub copy_count: i64,
    pub pinned: bool,
}

/// Snippet definition with keyword trigger and metadata
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SnippetItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub title: String,
    pub keyword: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_content: Option<String>,
    pub copy_count: i64,
    pub pinned: bool,
}

/// Local file query result
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileResult {
    pub path: String,
    pub file_name: String,
    pub extension: String,
    pub size_bytes: u64,
    pub modified_at: u64,
}

/// Pinned item displayed in the Start Menu-style 2x5 grid
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PinnedItem {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub action: String,
}

/// Persistent configuration store (%APPDATA%\Focal\config.json)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RunnerConfig {
    pub theme: ThemeMode,
    pub global_hotkey: String,
    pub fallback_hotkey: String,
    pub max_clipboard_items: usize,
    pub auto_paste_on_select: bool,
    pub search_directories: Vec<String>,
    pub snippet_expansion_enabled: bool,
    #[serde(default)]
    pub search_sensitivity: SearchSensitivity,
    #[serde(default)]
    pub include_path_executables: bool,
    #[serde(default)]
    pub pinned_items: Vec<PinnedItem>,
}

pub type FocalConfig = RunnerConfig;

impl Default for RunnerConfig {
    fn default() -> Self {
        Self {
            theme: ThemeMode::System,
            global_hotkey: "Shift+Alt+Space".to_string(),
            fallback_hotkey: "Ctrl+Alt+Space".to_string(),
            max_clipboard_items: 500,
            auto_paste_on_select: true,
            search_directories: default_search_directories(),
            snippet_expansion_enabled: true,
            search_sensitivity: SearchSensitivity::Medium,
            include_path_executables: false,
            pinned_items: Vec::new(),
        }
    }
}

pub fn default_search_directories() -> Vec<String> {
    let mut dirs = Vec::new();
    if let Some(user_dir) = directories::UserDirs::new() {
        if let Some(desktop) = user_dir.desktop_dir() {
            dirs.push(desktop.to_string_lossy().to_string());
        }
        if let Some(docs) = user_dir.document_dir() {
            dirs.push(docs.to_string_lossy().to_string());
        }
        if let Some(downloads) = user_dir.download_dir() {
            dirs.push(downloads.to_string_lossy().to_string());
        }
    }
    dirs
}

/// Application Discovery Cache Entry
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AppCacheItem {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub localized_name: Option<String>,
    pub app_id: String,
    pub content_type: i32, // 0 = Win32 (.lnk/.exe), 1 = UWP/MSIX, 2 = ms-settings
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        let config = RunnerConfig::default();
        assert_eq!(config.theme, ThemeMode::System);
        assert_eq!(config.global_hotkey, "Shift+Alt+Space");
        assert_eq!(config.fallback_hotkey, "Ctrl+Alt+Space");
        assert_eq!(config.max_clipboard_items, 500);
        assert!(config.auto_paste_on_select);
        assert!(config.snippet_expansion_enabled);
        assert_eq!(config.search_sensitivity, SearchSensitivity::Medium);
        assert!(!config.include_path_executables);
    }

    #[test]
    fn test_search_result_json_serialization() {
        let res = SearchResult {
            id: "app-terminal".to_string(),
            title: "Windows Terminal".to_string(),
            subtitle: "System Application".to_string(),
            category: "app".to_string(),
            icon: Some("terminal.png".to_string()),
            action: "launch:wt.exe".to_string(),
            score: 98.5,
        };

        let json = serde_json::to_string(&res).expect("serialization failed");
        let decoded: SearchResult = serde_json::from_str(&json).expect("deserialization failed");
        assert_eq!(res, decoded);
    }

    #[test]
    fn test_clipboard_item_roundtrip() {
        let item = ClipboardItem {
            id: 42,
            content: "cargo check --workspace".to_string(),
            source_app: Some("Code.exe".to_string()),
            created_at: "2026-10-28T10:00:00Z".to_string(),
            copy_count: 3,
            pinned: true,
        };

        let json = serde_json::to_string(&item).unwrap();
        let parsed: ClipboardItem = serde_json::from_str(&json).unwrap();
        assert_eq!(item, parsed);
    }
}
