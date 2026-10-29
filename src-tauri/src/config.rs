use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::thread::sleep;
use std::time::Duration;
use thiserror::Error;

use crate::models::RunnerConfig;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Validation failed: {0}")]
    Validation(String),
}

/// Resolves the production path for the JSON config: %APPDATA%\Runner\config.json
pub fn resolve_config_path() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        PathBuf::from(app_data).join("Runner").join("config.json")
    } else if let Some(proj_dirs) = directories::ProjectDirs::from("com", "runner", "Runner") {
        proj_dirs.config_dir().join("config.json")
    } else {
        PathBuf::from("./config.json")
    }
}

pub fn validate_config(config: &RunnerConfig) -> Result<(), ConfigError> {
    if config.global_hotkey.trim().is_empty() {
        return Err(ConfigError::Validation("global_hotkey cannot be empty".to_string()));
    }
    if config.fallback_hotkey.trim().is_empty() {
        return Err(ConfigError::Validation("fallback_hotkey cannot be empty".to_string()));
    }
    if config.max_clipboard_items < 10 || config.max_clipboard_items > 10_000 {
        return Err(ConfigError::Validation(
            "max_clipboard_items must be between 10 and 10,000".to_string(),
        ));
    }
    Ok(())
}

pub fn write_config_atomic(config: &RunnerConfig, target_path: &Path) -> Result<(), ConfigError> {
    validate_config(config)?;

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let json_data = serde_json::to_string_pretty(config)?;

    // Unique temporary file in the same directory (guarantees atomic same-volume rename)
    let temp_path = target_path.with_extension(format!("tmp.{}", std::process::id()));

    // Write and sync
    {
        let mut file = File::create(&temp_path)?;
        file.write_all(json_data.as_bytes())?;
        file.sync_all()?;
    }

    // Backup existing configuration if present
    if target_path.exists() {
        let backup_path = target_path.with_extension("bak");
        let _ = fs::copy(target_path, backup_path);
    }

    // Windows atomic rename with retry loop for transient locks
    let mut attempts = 0;
    loop {
        match fs::rename(&temp_path, target_path) {
            Ok(_) => break,
            Err(_) if attempts < 5 => {
                attempts += 1;
                sleep(Duration::from_millis(10 * attempts));
            }
            Err(e) => {
                let _ = fs::remove_file(&temp_path);
                return Err(ConfigError::Io(e));
            }
        }
    }

    // Update backup mirror with the newly verified configuration
    let backup_path = target_path.with_extension("bak");
    let _ = fs::copy(target_path, backup_path);

    Ok(())
}

#[derive(Clone)]
pub struct ConfigManager {
    path: PathBuf,
    cached: Arc<RwLock<RunnerConfig>>,
}

impl ConfigManager {
    pub fn load(custom_path: Option<PathBuf>) -> Result<Self, ConfigError> {
        let path = custom_path.unwrap_or_else(resolve_config_path);

        let config = if path.exists() {
            match fs::read_to_string(&path) {
                Ok(content) => match serde_json::from_str::<RunnerConfig>(&content) {
                    Ok(parsed) => parsed,
                    Err(err) => {
                        eprintln!(
                            "[RunnerConfig] Warning: Corrupted config, attempting backup recovery: {}",
                            err
                        );
                        let backup_path = path.with_extension("bak");
                        if let Ok(bak_content) = fs::read_to_string(&backup_path) {
                            serde_json::from_str(&bak_content).unwrap_or_default()
                        } else {
                            RunnerConfig::default()
                        }
                    }
                },
                Err(_) => RunnerConfig::default(),
            }
        } else {
            let default_cfg = RunnerConfig::default();
            write_config_atomic(&default_cfg, &path)?;
            default_cfg
        };

        Ok(Self {
            path,
            cached: Arc::new(RwLock::new(config)),
        })
    }

    pub fn get(&self) -> RunnerConfig {
        self.cached.read().unwrap().clone()
    }

    pub fn update(&self, new_config: RunnerConfig) -> Result<(), ConfigError> {
        write_config_atomic(&new_config, &self.path)?;
        *self.cached.write().unwrap() = new_config;
        Ok(())
    }
}
