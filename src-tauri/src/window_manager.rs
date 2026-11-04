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
            println!("[Focal] Global hotkey '{}' registered successfully.", primary);
            Ok(primary.to_string())
        }
        Err(err) => {
            eprintln!(
                "[Focal Warning] Could not register primary hotkey '{}': {:?}. Trying fallback '{}'...",
                primary, err, fallback
            );
            if fallback != primary {
                match shortcut_manager.register(fallback) {
                    Ok(_) => {
                        println!("[Focal] Fallback hotkey '{}' registered successfully.", fallback);
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

        // 2. Hardware rounded corners (attribute 33: DWMWCP_ROUND = 2)
        let corner_pref = DWMWCP_ROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            &corner_pref as *const _ as *const c_void,
            std::mem::size_of::<i32>() as u32,
        );

        // 3. Hardware DWM Acrylic backdrop blur (attribute 38: DWMWA_SYSTEMBACKDROP_TYPE = 3)
        // Provides the native frosted glass blur behind the window.
        let backdrop_type: i32 = 3;
        let _ = DwmSetWindowAttribute(
            hwnd,
            38u32, // DWMWA_SYSTEMBACKDROP_TYPE
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

/// Determines whether a blur/unfocus event was caused by switching to another window,
/// or if it was an internal modal move loop artifact (e.g. window dragging).
#[cfg(target_os = "windows")]
pub fn is_external_blur(hwnd_raw: isize) -> bool {
    use windows_sys::Win32::Foundation::{HWND, POINT, RECT};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetAncestor, GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
        GA_ROOT,
    };

    if should_ignore_blur() {
        return false;
    }

    unsafe {
        let hwnd = hwnd_raw as HWND;
        let fg_hwnd = GetForegroundWindow();

        // If foreground window is temporarily null (e.g. clicking desktop, window transition),
        // check whether cursor is inside our window. If outside, it is an external blur.
        if fg_hwnd.is_null() {
            let mut pt = POINT { x: 0, y: 0 };
            let mut rect = RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            };
            if GetCursorPos(&mut pt) != 0 && GetWindowRect(hwnd, &mut rect) != 0 {
                let inside = pt.x >= rect.left
                    && pt.x <= rect.right
                    && pt.y >= rect.top
                    && pt.y <= rect.bottom;
                if inside {
                    // Cursor is inside Focal's window rect - likely an internal click/drag
                    return false;
                }
            }
            return true;
        }

        // If our window (or root ancestor) is still the foreground window, this blur is an internal
        // Chromium/WebView2 or modal move loop artifact (e.g. data-tauri-drag-region).
        if fg_hwnd == hwnd || GetAncestor(fg_hwnd, GA_ROOT) == hwnd {
            return false;
        }

        // If the foreground window belongs to our own process, ignore blur.
        let mut fg_pid = 0u32;
        GetWindowThreadProcessId(fg_hwnd, &mut fg_pid);
        if fg_pid == std::process::id() {
            return false;
        }

        // Focus has genuinely shifted to an external application or desktop shell.
        true
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_external_blur(_hwnd_raw: isize) -> bool {
    !should_ignore_blur()
}

/// Restores focus to the window that owned foreground prior to Focal opening
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

#[cfg(target_os = "windows")]
fn get_process_image_name(pid: u32) -> Option<String> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return None;
        }

        let mut buf = [0u16; 1024];
        let mut size = buf.len() as u32;
        let success = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
        CloseHandle(handle);

        if success != 0 && size > 0 {
            let full_path = String::from_utf16_lossy(&buf[..size as usize]);
            let path = std::path::Path::new(&full_path);
            return path
                .file_name()
                .and_then(|f| f.to_str())
                .map(|s| s.to_string());
        }
        None
    }
}

/// Raycast Pillar A: Searches for an existing top-level window belonging to the target application.
/// If running, restores (if minimized) and brings the window to the foreground in <5ms.
#[cfg(target_os = "windows")]
pub fn activate_app_window(target: &str) -> bool {
    use core::ffi::c_void;
    use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
    use windows_sys::Win32::Graphics::Dwm::DwmGetWindowAttribute;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindow, GetWindowLongW, GetWindowRect, GetWindowTextW,
        GetWindowThreadProcessId, IsIconic, IsWindowVisible, GWL_EXSTYLE, GW_OWNER,
        WS_EX_TOOLWINDOW,
    };

    let target_cleaned = target.trim().to_lowercase();
    if target_cleaned.is_empty() {
        return false;
    }

    let mut search_tokens: Vec<String> = Vec::new();

    if let Some(aumid) = target_cleaned.strip_prefix("shell:appsfolder\\") {
        let base = aumid.split('!').next().unwrap_or(aumid);
        let name_part = base.split('_').next().unwrap_or(base);
        for part in name_part.split('.') {
            let p = part.trim();
            if !p.is_empty() && p != "microsoft" && p.len() >= 3 {
                search_tokens.push(p.to_string());
                if let Some(stripped) = p.strip_suffix("desktop") {
                    if stripped.len() >= 3 {
                        search_tokens.push(stripped.to_string());
                    }
                }
                if let Some(stripped) = p.strip_suffix("app") {
                    if stripped.len() >= 3 {
                        search_tokens.push(stripped.to_string());
                    }
                }
                if let Some(stripped) = p.strip_prefix("windows") {
                    if stripped.len() >= 3 {
                        search_tokens.push(stripped.to_string());
                    }
                }
            }
        }
    } else {
        let path = std::path::Path::new(&target_cleaned);
        let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(&target_cleaned);
        let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or(&target_cleaned);

        let stem_cleaned = file_stem.strip_suffix(".lnk").unwrap_or(file_stem);
        search_tokens.push(stem_cleaned.to_string());

        if file_name.ends_with(".exe") {
            search_tokens.push(file_name.to_string());
        }
    }

    if search_tokens.is_empty() {
        return false;
    }

    struct WindowSearchContext {
        tokens: Vec<String>,
        found_hwnd: HWND,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let ctx = &mut *(lparam as *mut WindowSearchContext);

        if IsWindowVisible(hwnd) == 0 {
            return 1;
        }

        if !GetWindow(hwnd, GW_OWNER).is_null() {
            return 1;
        }

        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if (ex_style & WS_EX_TOOLWINDOW) != 0 {
            return 1;
        }

        let mut cloaked: u32 = 0;
        let hr = DwmGetWindowAttribute(
            hwnd,
            14u32, // DWMWA_CLOAKED
            &mut cloaked as *mut _ as *mut c_void,
            std::mem::size_of::<u32>() as u32,
        );
        if hr == 0 && cloaked != 0 {
            return 1;
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 || pid == std::process::id() {
            return 1;
        }

        if let Some(proc_exe) = get_process_image_name(pid) {
            let proc_lower = proc_exe.to_lowercase();
            let mut matched = false;

            for token in &ctx.tokens {
                if proc_lower == *token
                    || proc_lower.starts_with(&format!("{}.", token))
                    || (token.ends_with(".exe") && proc_lower == *token)
                    || (!token.ends_with(".exe") && proc_lower.contains(token))
                {
                    matched = true;
                    break;
                }
            }

            if !matched {
                let mut title_buf = [0u16; 512];
                let title_len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
                if title_len > 0 {
                    let title_lower = String::from_utf16_lossy(&title_buf[..title_len as usize]).to_lowercase();
                    for token in &ctx.tokens {
                        if token.len() >= 3 && title_lower.contains(token) {
                            matched = true;
                            break;
                        }
                    }
                }
            }

            if matched {
                let is_minimized = IsIconic(hwnd) != 0;
                let mut rect = RECT {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                };
                GetWindowRect(hwnd, &mut rect);
                let w = rect.right - rect.left;
                let h = rect.bottom - rect.top;
                if is_minimized || (w > 60 && h > 60) {
                    ctx.found_hwnd = hwnd;
                    return 0; // stop enumeration
                }
            }
        }

        1
    }

    let mut context = WindowSearchContext {
        tokens: search_tokens,
        found_hwnd: std::ptr::null_mut(),
    };

    unsafe {
        EnumWindows(Some(enum_proc), &mut context as *mut _ as LPARAM);
        if !context.found_hwnd.is_null() {
            force_activate_target_window(context.found_hwnd);
            return true;
        }
    }

    false
}

#[cfg(not(target_os = "windows"))]
pub fn activate_app_window(_target: &str) -> bool {
    false
}

/// Activates an external application's window, restoring if minimized and forcing foreground focus
#[cfg(target_os = "windows")]
pub fn force_activate_target_window(hwnd: windows_sys::Win32::Foundation::HWND) {
    use windows_sys::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYEVENTF_KEYUP, VK_MENU};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        AllowSetForegroundWindow, BringWindowToTop, GetForegroundWindow,
        GetWindowThreadProcessId, IsIconic, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
    };

    const ASFW_ANY: u32 = 0xFFFFFFFF;

    unsafe {
        if IsIconic(hwnd) != 0 {
            ShowWindow(hwnd, SW_RESTORE);
        } else {
            ShowWindow(hwnd, SW_SHOW);
        }

        let cur_thread_id = GetCurrentThreadId();
        let fg_hwnd = GetForegroundWindow();
        let mut fg_pid: u32 = 0;
        let fg_thread_id = GetWindowThreadProcessId(fg_hwnd, &mut fg_pid);

        let mut target_pid: u32 = 0;
        let target_thread_id = GetWindowThreadProcessId(hwnd, &mut target_pid);

        let attached_fg = if fg_thread_id != 0 && fg_thread_id != cur_thread_id {
            AttachThreadInput(cur_thread_id, fg_thread_id, 1) != 0
        } else {
            false
        };

        let attached_target = if target_thread_id != 0
            && target_thread_id != cur_thread_id
            && target_thread_id != fg_thread_id
        {
            AttachThreadInput(cur_thread_id, target_thread_id, 1) != 0
        } else {
            false
        };

        AllowSetForegroundWindow(ASFW_ANY);
        BringWindowToTop(hwnd);
        if SetForegroundWindow(hwnd) == 0 {
            // Synthesize Alt key to temporarily release foreground lock
            keybd_event(VK_MENU as u8, 0, 0, 0);
            keybd_event(VK_MENU as u8, 0, KEYEVENTF_KEYUP, 0);
            SetForegroundWindow(hwnd);
        }
        windows_sys::Win32::UI::Input::KeyboardAndMouse::SetFocus(hwnd);

        if attached_target {
            AttachThreadInput(cur_thread_id, target_thread_id, 0);
        }
        if attached_fg {
            AttachThreadInput(cur_thread_id, fg_thread_id, 0);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn force_activate_target_window(_hwnd_raw: isize) {}

