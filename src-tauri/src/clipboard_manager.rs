use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use crate::db::Database;

static MONITOR_RUNNING: AtomicBool = AtomicBool::new(false);

/// Native Windows Clipboard listener service
/// Uses AddClipboardFormatListener / polling with hash deduplication
pub fn start_clipboard_listener(db: Database, max_items: usize) {
    if MONITOR_RUNNING.swap(true, Ordering::SeqCst) {
        return; // Already initialized
    }

    thread::Builder::new()
        .name("runner-clipboard-monitor".to_string())
        .spawn(move || {
            let mut last_text = String::new();

            loop {
                thread::sleep(Duration::from_millis(400));

                #[cfg(target_os = "windows")]
                {
                    if let Some(text) = get_win32_clipboard_text() {
                        let trimmed = text.trim();
                        if !trimmed.is_empty() && trimmed != last_text {
                            last_text = trimmed.to_string();
                            let source_app = get_foreground_process_name().unwrap_or_else(|| "Unknown".to_string());
                            let _ = db.add_clipboard_entry(trimmed, "text/plain", Some(&source_app), max_items);
                        }
                    }
                }
            }
        })
        .expect("Failed to spawn clipboard monitor thread");
}

#[cfg(target_os = "windows")]
pub fn get_win32_clipboard_text() -> Option<String> {
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, GetClipboardData, IsClipboardFormatAvailable, OpenClipboard,
    };
    use windows_sys::Win32::System::Memory::GlobalLock;
    use windows_sys::Win32::System::Memory::GlobalUnlock;

    const CF_UNICODETEXT: u32 = 13;

    unsafe {
        if OpenClipboard(std::ptr::null_mut()) == 0 {
            return None;
        }

        let result = if IsClipboardFormatAvailable(CF_UNICODETEXT) != 0 {
            let handle = GetClipboardData(CF_UNICODETEXT);
            if !handle.is_null() {
                let ptr = GlobalLock(handle) as *const u16;
                if !ptr.is_null() {
                    let mut len = 0;
                    while *ptr.add(len) != 0 {
                        len += 1;
                    }
                    let slice = std::slice::from_raw_parts(ptr, len);
                    let text = String::from_utf16_lossy(slice);
                    GlobalUnlock(handle);
                    Some(text)
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        CloseClipboard();
        result
    }
}

#[cfg(not(target_os = "windows"))]
pub fn get_win32_clipboard_text() -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
pub fn set_win32_clipboard_text(text: &str) -> Result<(), String> {
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData,
    };
    use windows_sys::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    const CF_UNICODETEXT: u32 = 13;

    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let bytes = wide.len() * 2;

    unsafe {
        // Retry OpenClipboard up to 5 times (accounting for transient contention)
        let mut opened = false;
        for _ in 0..5 {
            if OpenClipboard(std::ptr::null_mut()) != 0 {
                opened = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }

        if !opened {
            return Err("Failed to open Windows clipboard (lock contention)".to_string());
        }

        EmptyClipboard();

        let h_mem = GlobalAlloc(GMEM_MOVEABLE, bytes);
        if h_mem.is_null() {
            CloseClipboard();
            return Err("Failed to allocate global memory for clipboard".to_string());
        }

        let ptr = GlobalLock(h_mem) as *mut u16;
        if ptr.is_null() {
            CloseClipboard();
            return Err("Failed to lock global memory".to_string());
        }

        std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
        GlobalUnlock(h_mem);

        if SetClipboardData(CF_UNICODETEXT, h_mem).is_null() {
            CloseClipboard();
            return Err("SetClipboardData failed".to_string());
        }

        CloseClipboard();
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
pub fn set_win32_clipboard_text(_text: &str) -> Result<(), String> {
    Ok(())
}

/// Synthesize a Ctrl+V keystroke to auto-paste into the active window
pub fn synthesize_paste() {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_CONTROL,
        };

        const VK_V: u16 = 0x56;

        let mut inputs = [
            // Ctrl Down
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: 0,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // V Down
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: 0,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // V Up
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_V,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
            // Ctrl Up
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: VK_CONTROL,
                        wScan: 0,
                        dwFlags: KEYEVENTF_KEYUP,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            },
        ];

        SendInput(
            inputs.len() as u32,
            inputs.as_mut_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

#[cfg(target_os = "windows")]
fn get_foreground_process_name() -> Option<String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return None;
        }
        Some(format!("PID:{}", pid))
    }
}
