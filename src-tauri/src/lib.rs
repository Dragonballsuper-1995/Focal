pub mod app_scanner;
pub mod clipboard_manager;
pub mod config;
pub mod db;
pub mod file_search;
pub mod fuzzy;
pub mod icon_extractor;
pub mod models;
pub mod snippet_engine;
pub mod window_manager;

#[cfg(test)]
mod tests;

use std::sync::{Arc, RwLock};
use config::ConfigManager;
use db::Database;
use models::{AppCacheItem, ClipboardItem, FileResult, RunnerConfig, SearchResult, SnippetItem};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;

/// Central Application State managed by Tauri
pub struct AppState {
    pub db: Database,
    pub config: ConfigManager,
    pub apps: Arc<RwLock<Vec<AppCacheItem>>>,
}

// =========================================================================
// TAURI COMMANDS
// =========================================================================

#[tauri::command]
async fn search_items(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let frecency_map = state.db.get_frecency_scores().unwrap_or_default();
    let apps = state.apps.read().map_err(|e| e.to_string())?;
    let config = state.config.get();
    let results = fuzzy::search_all_with_sensitivity(
        &query,
        &apps,
        &frecency_map,
        50,
        config.search_sensitivity,
    );
    Ok(results)
}

#[cfg(target_os = "windows")]
pub fn native_launch_target(target: &str, run_as_admin: bool) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let verb_str = if run_as_admin { "runas" } else { "open" };
    let verb: Vec<u16> = OsStr::new(verb_str)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let file: Vec<u16> = OsStr::new(target)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let ret = ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
        if (ret as isize) > 32 {
            Ok(())
        } else {
            Err(format!("ShellExecuteW failed with error code: {}", ret as isize))
        }
    }
}

#[cfg(target_os = "windows")]
pub fn fast_launch_windows(target: &str, run_as_admin: bool) {
    use std::os::windows::process::CommandExt;

    // 1. Direct UWP / MSIX shell virtual paths (shell:AppsFolder\...)
    // ShellExecuteW fails on virtual namespace folders; explorer.exe launches them with zero delay
    if target.starts_with("shell:AppsFolder\\") {
        let mut cmd = std::process::Command::new("explorer.exe");
        cmd.arg(target).creation_flags(0x08000000);
        let _ = cmd.spawn();
        return;
    }

    // 2. Direct executable (.exe) launch without ShellExecute overhead
    if target.ends_with(".exe") && !run_as_admin && std::path::Path::new(target).is_file() {
        let mut cmd = std::process::Command::new(target);
        if let Some(parent) = std::path::Path::new(target).parent() {
            cmd.current_dir(parent);
        }
        if let Ok(_) = cmd.spawn() {
            return;
        }
    }

    // 3. Native ShellExecuteW for .lnk shortcuts, protocols (ms-settings:), and admin execution
    if let Err(e) = native_launch_target(target, run_as_admin) {
        eprintln!(
            "[Focal Warning] Native ShellExecute failed for '{}' ({}), falling back to explorer",
            target, e
        );
        let mut cmd = std::process::Command::new("explorer.exe");
        cmd.arg(target).creation_flags(0x08000000);
        let _ = cmd.spawn();
    }
}

#[tauri::command]
async fn launch_item(
    id: String,
    item_type: String,
    target: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // 1. Immediately hide launcher window so the user gets instant visual responsiveness
    if let Some(window) = app.get_webview_window("main") {
        window_manager::hide_launcher(&window);
    }

    let raw_target = target.strip_prefix("launch:").unwrap_or(&target).to_string();

    // 2. Instant dispatch to OS process launcher
    if raw_target.starts_with("view:") {
        let view = raw_target.strip_prefix("view:").unwrap_or("root");
        let _ = app.emit("navigate-view", view);
    } else if raw_target.starts_with("system:") {
        let action = raw_target.strip_prefix("system:").unwrap_or("");
        match action {
            "lock" => {
                let _ = std::process::Command::new("rundll32.exe")
                    .args(["user32.dll,LockWorkStation"])
                    .spawn();
            }
            "sleep" => {
                let _ = std::process::Command::new("rundll32.exe")
                    .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                    .spawn();
            }
            "restart" => {
                let _ = std::process::Command::new("shutdown.exe")
                    .args(["/r", "/t", "0"])
                    .spawn();
            }
            "shutdown" => {
                let _ = std::process::Command::new("shutdown.exe")
                    .args(["/s", "/t", "0"])
                    .spawn();
            }
            _ => return Err(format!("Unknown system action: {}", action)),
        }
    } else if item_type == "reveal" {
        let _ = std::process::Command::new("explorer.exe")
            .args(["/select,", &raw_target])
            .spawn();
    } else {
        #[cfg(target_os = "windows")]
        {
            let run_as_admin = item_type == "app_admin";
            fast_launch_windows(&raw_target, run_as_admin);
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = app.opener().open_path(&raw_target, None::<&str>);
        }
    }

    // 3. Record frecency access in background thread so database disk I/O does not delay app startup
    let db = state.db.clone();
    std::thread::spawn(move || {
        let _ = db.record_frecency_access(&id);
    });

    Ok(())
}

#[tauri::command]
async fn get_clipboard_history(
    query: Option<String>,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<ClipboardItem>, String> {
    let limit_val = limit.unwrap_or(50);
    state
        .db
        .get_clipboard_history(query.as_deref(), limit_val)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn copy_to_clipboard(
    content: String,
    auto_paste: bool,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let max_items = state.config.get().max_clipboard_items;
    let _ = state.db.add_clipboard_entry(&content, "text/plain", None, max_items);
    let _ = clipboard_manager::set_win32_clipboard_text(&content);

    if auto_paste {
        if let Some(window) = app.get_webview_window("main") {
            window_manager::hide_launcher(&window);
        }
        #[cfg(target_os = "windows")]
        {
            window_manager::restore_previous_focus();
            std::thread::sleep(std::time::Duration::from_millis(50));
            clipboard_manager::synthesize_paste();
        }
    }
    Ok(())
}

#[tauri::command]
async fn clear_clipboard_history(state: State<'_, AppState>) -> Result<usize, String> {
    state.db.clear_clipboard_history().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_snippets(state: State<'_, AppState>) -> Result<Vec<SnippetItem>, String> {
    state.db.get_snippets().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_snippet(
    snippet: SnippetItem,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    state.db.save_snippet(&snippet).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_snippet(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_snippet(id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn expand_snippet(id: i64, state: State<'_, AppState>) -> Result<String, String> {
    let snippets = state.db.get_snippets().map_err(|e| e.to_string())?;
    if let Some(s) = snippets.iter().find(|s| s.id == Some(id)) {
        let clip_text = clipboard_manager::get_win32_clipboard_text();
        let (expanded, _) = snippet_engine::expand_placeholders(&s.text, clip_text.as_deref());
        Ok(expanded)
    } else {
        Err(format!("Snippet with id {} not found", id))
    }
}

#[tauri::command]
async fn search_files(
    query: String,
    directories: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<FileResult>, String> {
    let dirs = if directories.is_empty() {
        state.config.get().search_directories
    } else {
        directories
    };
    Ok(file_search::search_local_files(&query, &dirs, 40))
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<RunnerConfig, String> {
    Ok(state.config.get())
}

#[tauri::command]
async fn update_settings(
    settings: RunnerConfig,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let old_hotkey = state.config.get().global_hotkey;
    let old_fallback = state.config.get().fallback_hotkey;
    let new_hotkey = settings.global_hotkey.clone();
    let new_fallback = settings.fallback_hotkey.clone();

    state.config.update(settings).map_err(|e| e.to_string())?;

    if old_hotkey != new_hotkey || old_fallback != new_fallback {
        window_manager::register_launcher_hotkey(&app, &new_hotkey, &new_fallback)?;
    }
    Ok(())
}

#[tauri::command]
async fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window_manager::hide_launcher(&window);
    }
    Ok(())
}

#[tauri::command]
async fn show_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window_manager::show_launcher(&window);
    }
    Ok(())
}

#[tauri::command]
async fn toggle_window(app: AppHandle) -> Result<(), String> {
    window_manager::toggle_launcher(&app);
    Ok(())
}

// =========================================================================
// RUN ENTRYPOINT & LIFECYCLE WIRING
// =========================================================================

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                window_manager::show_launcher(&win);
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    eprintln!("[Focal Hotkey Triggered] {:?}, state: {:?}", shortcut, event.state());
                    if event.state() == ShortcutState::Pressed {
                        window_manager::toggle_launcher(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // 1. Initialize SQLite Database
            let db_path = db::resolve_db_path();
            let db = Database::open(&db_path)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            // 2. Initialize JSON Config Store
            let config = ConfigManager::load(None)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            // 3. Pre-load cached apps from SQLite or immediately prime on cold start
            let mut cached_apps = db.get_cached_apps().unwrap_or_default();
            if cached_apps.is_empty() {
                let initial = app_scanner::scan_all_apps_with_options(config.get().include_path_executables);
                if !initial.is_empty() {
                    let _ = db.cache_apps(&initial);
                    cached_apps = initial;
                }
            }
            let apps_arc = Arc::new(RwLock::new(cached_apps));

            // 4. Spawn non-blocking background scanner to refresh cache
            let db_worker = db.clone();
            let apps_worker = apps_arc.clone();
            let include_path = config.get().include_path_executables;
            std::thread::spawn(move || {
                let fresh_apps = app_scanner::scan_all_apps_with_options(include_path);
                if !fresh_apps.is_empty() {
                    let _ = db_worker.cache_apps(&fresh_apps);
                    if let Ok(mut lock) = apps_worker.write() {
                        *lock = fresh_apps;
                    }
                }
            });

            // 5. Register Managed Application State
            let config_data = config.get();
            let db_clone = db.clone();
            app.manage(AppState {
                db,
                config,
                apps: apps_arc,
            });

            // Start native clipboard monitoring thread
            clipboard_manager::start_clipboard_listener(db_clone, config_data.max_clipboard_items);

            // 6. System Tray Icon (taskbar notification overflow area / hidden icons)
            if let Some(icon) = app.default_window_icon().cloned() {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let show_i = MenuItem::with_id(app, "show", "Open Focal", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit Focal", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                let _tray = TrayIconBuilder::new()
                    .icon(icon)
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .tooltip("Focal")
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "show" => {
                                if let Some(win) = app.get_webview_window("main") {
                                    window_manager::show_launcher(&win);
                                }
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        match event {
                            TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } => {
                                let app = tray.app_handle();
                                window_manager::toggle_launcher(app);
                            }
                            TrayIconEvent::DoubleClick {
                                button: MouseButton::Left,
                                ..
                            } => {
                                if let Some(win) = tray.app_handle().get_webview_window("main") {
                                    window_manager::show_launcher(&win);
                                }
                            }
                            _ => {}
                        }
                    })
                    .build(app)?;
            }

            // 7. Register configured global hotkey with collision fallback
            let _ = window_manager::register_launcher_hotkey(
                app.app_handle(),
                &config_data.global_hotkey,
                &config_data.fallback_hotkey,
            );

            // 8. Ensure launcher window is centered and shown on launch
            if let Some(win) = app.get_webview_window("main") {
                window_manager::show_launcher(&win);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_items,
            launch_item,
            get_clipboard_history,
            copy_to_clipboard,
            clear_clipboard_history,
            get_snippets,
            save_snippet,
            delete_snippet,
            expand_snippet,
            search_files,
            get_settings,
            update_settings,
            hide_window,
            show_window,
            toggle_window,
        ])
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::Focused(focused) => {
                eprintln!("[Focal WindowEvent] Focused: {}", focused);
                if !focused {
                    #[cfg(target_os = "windows")]
                    let is_external = match window.hwnd() {
                        Ok(hwnd) => window_manager::is_external_blur(hwnd.0 as isize),
                        Err(_) => !window_manager::should_ignore_blur(),
                    };
                    #[cfg(not(target_os = "windows"))]
                    let is_external = !window_manager::should_ignore_blur();

                    if is_external {
                        let _ = window.hide();
                        let _ = window.emit("launcher-hidden", ());
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running focal application");
}
