use crate::config::{ConfigError, ConfigManager};
use crate::models::{RunnerConfig, ThemeMode};
use tempfile::tempdir;

#[test]
fn test_default_config_values() {
    let cfg = RunnerConfig::default();
    assert_eq!(cfg.theme, ThemeMode::System);
    assert_eq!(cfg.global_hotkey, "Shift+Alt+Space");
    assert_eq!(cfg.fallback_hotkey, "Ctrl+Alt+Space");
    assert_eq!(cfg.max_clipboard_items, 500);
    assert!(cfg.auto_paste_on_select);
    assert!(cfg.snippet_expansion_enabled);
}

#[test]
fn test_atomic_write_and_reload() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.json");

    let manager = ConfigManager::load(Some(config_path.clone())).unwrap();
    let mut modified = manager.get();
    modified.theme = ThemeMode::Dark;
    modified.global_hotkey = "Ctrl+Space".to_string();
    modified.max_clipboard_items = 250;

    manager.update(modified.clone()).unwrap();

    // Fresh reload from disk
    let reloaded = ConfigManager::load(Some(config_path)).unwrap();
    assert_eq!(reloaded.get(), modified);
}

#[test]
fn test_config_validation_rejection() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.json");
    let manager = ConfigManager::load(Some(config_path)).unwrap();

    let mut invalid = manager.get();
    invalid.global_hotkey = "".to_string(); // Empty hotkey
    assert!(matches!(manager.update(invalid), Err(ConfigError::Validation(_))));

    let mut invalid_items = manager.get();
    invalid_items.max_clipboard_items = 0; // Invalid item count
    assert!(matches!(manager.update(invalid_items), Err(ConfigError::Validation(_))));
}

#[test]
fn test_corrupt_config_fallback_to_backup() {
    let dir = tempdir().unwrap();
    let config_path = dir.path().join("config.json");

    // 1. Establish valid config
    let manager = ConfigManager::load(Some(config_path.clone())).unwrap();
    let mut valid = manager.get();
    valid.theme = ThemeMode::Light;
    manager.update(valid).unwrap();

    // 2. Corrupt main config.json
    std::fs::write(&config_path, b"{ invalid json content").unwrap();

    // 3. Reload should recover from .bak
    let recovered = ConfigManager::load(Some(config_path)).unwrap();
    assert_eq!(recovered.get().theme, ThemeMode::Light);
}

#[test]
fn test_json_serialization_matches_typescript_dto() {
    let cfg = RunnerConfig::default();
    let json_str = serde_json::to_string(&cfg).unwrap();
    let v: serde_json::Value = serde_json::from_str(&json_str).unwrap();

    assert!(v.get("theme").is_some());
    assert!(v.get("global_hotkey").is_some());
    assert!(v.get("fallback_hotkey").is_some());
    assert!(v.get("max_clipboard_items").is_some());
    assert!(v.get("auto_paste_on_select").is_some());
    assert!(v.get("search_directories").is_some());
    assert!(v.get("snippet_expansion_enabled").is_some());
}
