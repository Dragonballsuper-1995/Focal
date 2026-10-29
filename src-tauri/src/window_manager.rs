use std::sync::atomic::{AtomicIsize, AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

static PREVIOUS_FOREGROUND_HWND: AtomicIsize = AtomicIsize::new(0);
static LAST_SHOWN_MILLIS: AtomicU64 = AtomicU64::new(0);

/// Registers the global launcher hotkey with automated fallback on collision
pub fn register_launcher_hotkey(
    app: &AppHandle,
    primary: &str,
    fallback: &str,
) -> Result<String, String> {
    let shortcut_manager = app.global_shortcut();
    let _ = shortcut_manager.unregister_all();

    match shortcut_manager.register(primary) {
        Ok(_) => {
            println!("[Runner] Global hotkey '{}' registered successfully.", primary);
            Ok(primary.to_string())
        }
        Err(err) => {
            eprintln!(
                "[Runner Warning] Could not register primary hotkey '{}': {:?}. Trying fallback '{}'...",
                primary, err, fallback
            );
            if fallback != primary {
                match shortcut_manager.register(fallback) {
                    Ok(_) => {
                        println!("[Runner] Fallback hotkey '{}' registered successfully.", fallback);
                        Ok(fallback.to_string())
                    }
                    Err(fallback_err) => Err(format!(
                        "Failed to register hotkeys (primary '{}': {:?}, fallback '{}': {:?})",
                        primary, err, fallback, fallback_err
                    )),
                }
            } else {
                Err(format!("Failed to register hotkey '{}': {:?}", primary, err))
            }
        }
    }
}

/// Applies native Windows 11 DWM backdrop blur, rounded corners, and dark mode
#[cfg(target_os = "windows")]
pub fn apply_window_effects(hwnd_raw: isize) {
    use core::ffi::c_void;
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE, DWMWA_WINDOW_CORNER_PREFERENCE,
        DWMWCP_ROUND,
    };

    unsafe {
        let hwnd = hwnd_raw as HWND;

        // 1. Immersive dark mode (attribute 20)
        let dark_mode: i32 = 1;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE as u32,
            &dark_mode as *const _ as *const c_void,
            std::mem::size_of::<i32>() as u32,
        );

        // 2. Hardware rounded corners (attribute 33)
        let corner_pref = DWMWCP_ROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            &corner_pref as *const _ as *const c_void,
            std::mem::size_of::<i32>() as u32,
        );

        // 3. Hardware DWM Acrylic backdrop blur (attribute 38: DWMWA_SYSTEMBACKDROP_TYPE = 3)
        let backdrop_type: i32 = 3;
        let _ = DwmSetWindowAttribute(
            hwnd,
            38u32,
            &backdrop_type as *const _ as *const c_void,
            std::mem::size_of::<i32>() as u32,
        );
    }
}

/// Returns true if a blur/killfocus event occurred within 200ms of activation
pub fn should_ignore_blur() -> bool {
    let last_shown = LAST_SHOWN_MILLIS.load(Ordering::SeqCst);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    now.saturating_sub(last_shown) < 200
}

/// Restores focus to the window that owned foreground prior to Runner opening
#[cfg(target_os = "windows")]
pub fn restore_previous_focus() {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::SetForegroundWindow;

    let prev = PREVIOUS_FOREGROUND_HWND.load(Ordering::SeqCst);
    if prev != 0 {
        unsafe {
            SetForegroundWindow(prev as HWND);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn restore_previous_focus() {}

/// Cross-platform window activation and focus stealing logic
pub fn show_launcher(window: &WebviewWindow) {
    let _ = window.center();
    let _ = window.show();
    let _ = window.unminimize();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    LAST_SHOWN_MILLIS.store(now, Ordering::SeqCst);

    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            let raw_hwnd = hwnd.0 as isize;
            apply_window_effects(raw_hwnd);
            force_activate_win32(raw_hwnd);
        }
    }

    let _ = window.set_focus();
    let _ = window.emit("launcher-shown", ());
}

/// Hides the launcher and notifies frontend to clear search state
pub fn hide_launcher(window: &WebviewWindow) {
    let _ = window.hide();
    let _ = window.emit("launcher-hidden", ());
}

/// Toggles the launcher between visible and hidden states
pub fn toggle_launcher(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            hide_launcher(&window);
        } else {
            show_launcher(&window);
        }
    }
}

/// Low-level Win32 focus stealing implementation using AttachThreadInput
#[cfg(target_os = "windows")]
pub fn force_activate_win32(hwnd_raw: isize) {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        AllowSetForegroundWindow, BringWindowToTop, GetForegroundWindow,
        GetWindowThreadProcessId, SetForegroundWindow, ShowWindow, SW_SHOW,
    };

    const ASFW_ANY: u32 = 0xFFFFFFFF;

    unsafe {
        let hwnd = hwnd_raw as HWND;
        let fg_hwnd = GetForegroundWindow();

        if !fg_hwnd.is_null() && fg_hwnd != hwnd {
            PREVIOUS_FOREGROUND_HWND.store(fg_hwnd as isize, Ordering::SeqCst);
        }

        let cur_thread_id = GetCurrentThreadId();
        let mut fg_pid: u32 = 0;
        let fg_thread_id = GetWindowThreadProcessId(fg_hwnd, &mut fg_pid);

        let attached = if fg_thread_id != 0 && fg_thread_id != cur_thread_id {
            AttachThreadInput(cur_thread_id, fg_thread_id, 1) != 0
        } else {
            false
        };

        if !attached && fg_thread_id != cur_thread_id {
            AllowSetForegroundWindow(ASFW_ANY);
        }

        ShowWindow(hwnd, SW_SHOW);
        BringWindowToTop(hwnd);
        SetForegroundWindow(hwnd);
        windows_sys::Win32::UI::Input::KeyboardAndMouse::SetFocus(hwnd);

        if attached {
            AttachThreadInput(cur_thread_id, fg_thread_id, 0);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn force_activate_win32(_hwnd_raw: isize) {}
