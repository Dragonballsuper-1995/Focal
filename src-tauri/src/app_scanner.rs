use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use crate::models::AppCacheItem;

pub struct SettingItem {
    pub name: &'static str,
    pub uri: &'static str,
    pub keywords: &'static [&'static str],
}

/// 50+ Canonical Windows Settings URIs
pub const SETTINGS_CATALOG: &[SettingItem] = &[
    SettingItem { name: "Windows Settings", uri: "ms-settings:", keywords: &["system", "preferences", "config"] },
    SettingItem { name: "Windows Update", uri: "ms-settings:windowsupdate", keywords: &["update", "patch", "check", "windows update"] },
    SettingItem { name: "Windows Update History", uri: "ms-settings:windowsupdate-history", keywords: &["update", "history", "logs", "patches"] },
    SettingItem { name: "Advanced Windows Update Options", uri: "ms-settings:windowsupdate-options", keywords: &["update", "advanced", "delivery optimization"] },
    SettingItem { name: "Wi-Fi Settings", uri: "ms-settings:network-wifi", keywords: &["internet", "network", "wireless", "wlan", "wifi"] },
    SettingItem { name: "Ethernet Settings", uri: "ms-settings:network-ethernet", keywords: &["network", "wired", "lan", "cable"] },
    SettingItem { name: "Network & Internet Status", uri: "ms-settings:network-status", keywords: &["network", "connection", "ip", "dns", "adapter"] },
    SettingItem { name: "VPN Settings", uri: "ms-settings:network-vpn", keywords: &["vpn", "tunnel", "proxy", "virtual private network"] },
    SettingItem { name: "Mobile Hotspot", uri: "ms-settings:network-mobilehotspot", keywords: &["hotspot", "tethering", "share internet"] },
    SettingItem { name: "Proxy Settings", uri: "ms-settings:network-proxy", keywords: &["proxy", "pac", "server", "lan"] },
    SettingItem { name: "Airplane Mode", uri: "ms-settings:network-airplanemode", keywords: &["airplane", "flight", "disable wireless"] },
    SettingItem { name: "Bluetooth & Devices", uri: "ms-settings:bluetooth", keywords: &["pair", "wireless", "mouse", "keyboard", "headphones", "bluetooth"] },
    SettingItem { name: "Printers & Scanners", uri: "ms-settings:printers", keywords: &["print", "scan", "fax", "hardware", "printer"] },
    SettingItem { name: "Mouse Settings", uri: "ms-settings:mousetouchpad", keywords: &["cursor", "pointer", "click", "speed", "mouse"] },
    SettingItem { name: "Touchpad Settings", uri: "ms-settings:devices-touchpad", keywords: &["touchpad", "gestures", "trackpad"] },
    SettingItem { name: "Typing & Keyboard Settings", uri: "ms-settings:typing", keywords: &["keyboard", "autocorrect", "spellcheck", "typing"] },
    SettingItem { name: "Pen & Windows Ink", uri: "ms-settings:pen", keywords: &["stylus", "ink", "handwriting", "pen"] },
    SettingItem { name: "AutoPlay Settings", uri: "ms-settings:autoplay", keywords: &["usb", "sd card", "media", "default drive action"] },
    SettingItem { name: "USB Settings", uri: "ms-settings:usb", keywords: &["flash drive", "hub", "usb devices", "notifications"] },
    SettingItem { name: "Display Settings", uri: "ms-settings:display", keywords: &["monitor", "resolution", "scale", "hdr", "brightness", "screen"] },
    SettingItem { name: "Night Light", uri: "ms-settings:nightlight", keywords: &["blue light", "warm", "evening", "screen tint"] },
    SettingItem { name: "Graphics Settings", uri: "ms-settings:display-advancedgraphics", keywords: &["gpu", "hardware acceleration", "performance", "variable refresh"] },
    SettingItem { name: "Sound Settings", uri: "ms-settings:sound", keywords: &["volume", "audio", "speaker", "microphone", "sound"] },
    SettingItem { name: "Volume Mixer", uri: "ms-settings:apps-volume", keywords: &["audio levels", "per-app volume", "output"] },
    SettingItem { name: "Notifications & Actions", uri: "ms-settings:notifications", keywords: &["alerts", "banners", "action center", "badges"] },
    SettingItem { name: "Focus Assist", uri: "ms-settings:quiethours", keywords: &["dnd", "do not disturb", "focus", "silence", "priority"] },
    SettingItem { name: "Power & Battery", uri: "ms-settings:powersleep", keywords: &["sleep", "energy", "battery", "saver", "screen off", "power"] },
    SettingItem { name: "Battery Saver", uri: "ms-settings:batterysaver", keywords: &["charge", "battery limit", "power consumption"] },
    SettingItem { name: "Storage Settings", uri: "ms-settings:storagesense", keywords: &["disk", "space", "temporary files", "clean", "storage"] },
    SettingItem { name: "Nearby Sharing", uri: "ms-settings:crossdevice", keywords: &["airdrop", "bluetooth sharing", "transfer files"] },
    SettingItem { name: "Multitasking & Snap", uri: "ms-settings:multitasking", keywords: &["snap windows", "virtual desktops", "alt tab"] },
    SettingItem { name: "Activation Settings", uri: "ms-settings:activation", keywords: &["product key", "license", "windows genuine"] },
    SettingItem { name: "Troubleshoot Settings", uri: "ms-settings:troubleshoot", keywords: &["diagnostics", "fix problems", "recommended troubleshooters"] },
    SettingItem { name: "Recovery Options", uri: "ms-settings:recovery", keywords: &["reset this pc", "restore point", "advanced startup"] },
    SettingItem { name: "Projecting to this PC", uri: "ms-settings:project", keywords: &["miracast", "wireless display", "screen mirror"] },
    SettingItem { name: "Remote Desktop", uri: "ms-settings:remotedesktop", keywords: &["rdp", "remote connection", "mstsc"] },
    SettingItem { name: "About Your PC", uri: "ms-settings:about", keywords: &["specs", "version", "processor", "ram", "os build", "system info"] },
    SettingItem { name: "Personalization", uri: "ms-settings:personalization", keywords: &["look", "feel", "visual", "customize"] },
    SettingItem { name: "Background Settings", uri: "ms-settings:personalization-background", keywords: &["wallpaper", "desktop", "picture", "slideshow"] },
    SettingItem { name: "Colors & Dark Mode", uri: "ms-settings:colors", keywords: &["theme", "dark", "light", "accent color", "transparency"] },
    SettingItem { name: "Lock Screen Settings", uri: "ms-settings:lockscreen", keywords: &["spotlight", "login background", "widgets"] },
    SettingItem { name: "Themes & Accent Colors", uri: "ms-settings:themes", keywords: &["theme pack", "cursor", "sounds", "palette"] },
    SettingItem { name: "Fonts Settings", uri: "ms-settings:fonts", keywords: &["typography", "install font", "typefaces"] },
    SettingItem { name: "Start Menu Settings", uri: "ms-settings:personalization-start", keywords: &["pinned apps", "recent files", "recommendations"] },
    SettingItem { name: "Taskbar Settings", uri: "ms-settings:taskbar", keywords: &["dock", "icons", "behaviors", "pins", "alignment"] },
    SettingItem { name: "Installed Apps", uri: "ms-settings:appsfeatures", keywords: &["uninstall", "remove", "programs", "applications", "add or remove"] },
    SettingItem { name: "Default Apps", uri: "ms-settings:defaultapps", keywords: &["browser", "pdf", "file types", "associations", "defaults"] },
    SettingItem { name: "Startup Apps", uri: "ms-settings:startupapps", keywords: &["boot", "startup", "background apps", "autostart"] },
    SettingItem { name: "Optional Features", uri: "ms-settings:optionalfeatures", keywords: &["windows features", "rsat", "wsl", "hyper-v"] },
    SettingItem { name: "Offline Maps", uri: "ms-settings:maps", keywords: &["gps", "downloaded maps", "navigation"] },
    SettingItem { name: "Video Playback", uri: "ms-settings:videoplayback", keywords: &["hdr video", "battery streaming", "codecs"] },
    SettingItem { name: "Your Accounts & Info", uri: "ms-settings:yourinfo", keywords: &["microsoft account", "profile picture", "user"] },
    SettingItem { name: "Email & Accounts", uri: "ms-settings:emailandaccounts", keywords: &["outlook", "exchange", "work school account"] },
    SettingItem { name: "Sign-in Options", uri: "ms-settings:signinoptions", keywords: &["windows hello", "pin", "fingerprint", "face", "password"] },
    SettingItem { name: "Date & Time", uri: "ms-settings:dateandtime", keywords: &["clock", "timezone", "sync", "daylight saving"] },
    SettingItem { name: "Language & Region", uri: "ms-settings:regionlanguage", keywords: &["locale", "keyboard layout", "country", "formats"] },
    SettingItem { name: "Speech Settings", uri: "ms-settings:speech", keywords: &["mic voice", "recognition", "tts", "accent"] },
    SettingItem { name: "Gaming & Game Bar", uri: "ms-settings:gaming-gamebar", keywords: &["xbox", "fps", "capture", "recording"] },
    SettingItem { name: "Game Mode", uri: "ms-settings:gaming-gamemode", keywords: &["gaming performance", "optimize"] },
    SettingItem { name: "Text Size & Display Accessibility", uri: "ms-settings:easeofaccess-display", keywords: &["font size", "make text bigger", "zoom", "high contrast"] },
    SettingItem { name: "Mouse Pointer & Touch Accessibility", uri: "ms-settings:easeofaccess-mousepointer", keywords: &["pointer size", "cursor color", "touch indicator"] },
    SettingItem { name: "Magnifier", uri: "ms-settings:easeofaccess-magnifier", keywords: &["screen zoom", "lens", "reading"] },
    SettingItem { name: "Narrator", uri: "ms-settings:easeofaccess-narrator", keywords: &["screen reader", "voice guide", "speech feedback"] },
    SettingItem { name: "Audio Accessibility", uri: "ms-settings:easeofaccess-audio", keywords: &["mono audio", "flash screen", "visual alerts"] },
    SettingItem { name: "Captions Settings", uri: "ms-settings:easeofaccess-closedcaptioning", keywords: &["subtitles", "live captions", "style"] },
    SettingItem { name: "Windows Security", uri: "ms-settings:windowsdefender", keywords: &["antivirus", "firewall", "threat", "protection", "defender"] },
    SettingItem { name: "Find My Device", uri: "ms-settings:findmydevice", keywords: &["gps location", "lost laptop", "track"] },
    SettingItem { name: "Developer Settings", uri: "ms-settings:developers", keywords: &["sideloading", "debug", "developer mode", "symlinks"] },
];

pub const SYSTEM32_WHITELIST: &[&str] = &[
    "notepad.exe",
    "calc.exe",
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "wt.exe",
    "mspaint.exe",
    "regedit.exe",
    "taskmgr.exe",
    "control.exe",
    "explorer.exe",
    "mstsc.exe",
    "cleanmgr.exe",
    "resmon.exe",
    "perfmon.exe",
    "magnify.exe",
    "snippingtool.exe",
    "charmap.exe",
    "dxdiag.exe",
    "msinfo32.exe",
    "cleanmgr.exe",
    "wordpad.exe",
];

pub const UNINSTALLER_PATTERNS: &[&str] = &[
    "uninstall",
    "unins",
    "setup",
    "updater",
    "readme",
    "read me",
    "release notes",
    "documentation",
    "license",
    "help",
    "website",
    "homepage",
    "feedback",
    "crashpad",
    "elevate",
    "notification_helper",
];

pub const BACKGROUND_OR_CLI_PATTERNS: &[&str] = &[
    "server",
    "mcpserver",
    "host",
    "broker",
    "runner",
    "autostarter",
    "update",
    "updater",
    "handler",
    "crashpad",
    "elevate",
    "helper",
    "daemon",
    "service",
    "telemetry",
    "proxy",
];

pub const MSIX_IGNORE_EXACT: &[&str] = &[
    "bash",
    "wsl",
    "wslconfig",
    "winget",
    "pip",
    "pip3",
    "python",
    "python3",
    "pythonw",
    "pythonw3",
    "idle",
    "idle3",
    "gameinputredist",
    "microsoftwindows.desktopstickereditorcentennial",
];

/// Checks if an application title indicates a background service or developer CLI tool
pub fn is_background_or_cli_stub(name: &str) -> bool {
    let lower = name.to_lowercase();
    let base_name = lower.trim_end_matches(|c: char| c.is_ascii_digit() || c == '.');
    if MSIX_IGNORE_EXACT.iter().any(|&exact| lower == exact || base_name == exact) {
        return true;
    }
    BACKGROUND_OR_CLI_PATTERNS.iter().any(|&pattern| lower.ends_with(pattern) || lower.contains(pattern))
}

/// Checks if an application title indicates an uninstaller, updater, or documentation shortcut
pub fn is_uninstaller_or_helper(name: &str) -> bool {
    let lower = name.to_lowercase();
    UNINSTALLER_PATTERNS.iter().any(|&pattern| lower.contains(pattern))
}

/// Recursively scans Start Menu directories for .lnk shortcuts
pub fn scan_start_menu_shortcuts() -> Vec<AppCacheItem> {
    let mut apps = Vec::new();
    let mut dirs_to_scan = Vec::new();

    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs_to_scan.push(PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Ok(progdata) = std::env::var("ProgramData") {
        dirs_to_scan.push(PathBuf::from(progdata).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        dirs_to_scan.push(PathBuf::from(userprofile).join("Desktop"));
    }
    if let Ok(public_dir) = std::env::var("PUBLIC") {
        dirs_to_scan.push(PathBuf::from(public_dir).join("Desktop"));
    }

    let mut seen_paths = HashSet::new();

    for dir in dirs_to_scan {
        if dir.exists() {
            walk_dir_for_shortcuts(&dir, &mut apps, &mut seen_paths);
        }
    }

    apps
}

fn walk_dir_for_shortcuts(dir: &Path, apps: &mut Vec<AppCacheItem>, seen: &mut HashSet<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk_dir_for_shortcuts(&path, apps, seen);
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("lnk") {
                        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                            if !is_uninstaller_or_helper(stem) {
                                let canonical = path.to_string_lossy().to_string();
                                if seen.insert(canonical.clone()) {
                                    let icon_path = crate::icon_extractor::extract_icon_as_data_uri(&canonical);
                                    apps.push(AppCacheItem {
                                        id: None,
                                        name: stem.to_string(),
                                        path: canonical.clone(),
                                        localized_name: None,
                                        app_id: format!("lnk:{}", stem.to_lowercase()),
                                        content_type: 0,
                                        icon_path,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Scans packaged UWP/MSIX applications using Windows Shell / Get-StartApps
pub fn scan_uwp_apps() -> Vec<AppCacheItem> {
    let mut apps = Vec::new();
    let mut cmd = std::process::Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-StartApps | Where-Object { $_.AppID -match '!' } | ForEach-Object { [Console]::WriteLine($_.Name + '|' + $_.AppID) }",
    ]);
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW prevents visible PowerShell console flash

    let output = match cmd.output() {
        Ok(out) => out,
        Err(_) => return apps,
    };

    if !output.status.success() {
        return apps;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut seen_ids = HashSet::new();

    for line in stdout.lines() {
        let line = line.trim();
        if let Some((name, aumid)) = line.split_once('|') {
            let name = name.trim();
            let aumid = aumid.trim();
            if name.is_empty() || aumid.is_empty() {
                continue;
            }
            if is_uninstaller_or_helper(name) || is_background_or_cli_stub(name) {
                continue;
            }
            let canonical_path = format!(r"shell:AppsFolder\{}", aumid);
            if seen_ids.insert(aumid.to_lowercase()) {
                let icon_path = crate::icon_extractor::extract_icon_as_data_uri(&canonical_path);
                apps.push(AppCacheItem {
                    id: None,
                    name: name.to_string(),
                    path: canonical_path,
                    localized_name: None,
                    app_id: format!("uwp:{}", aumid.to_lowercase()),
                    content_type: 1,
                    icon_path,
                });
            }
        }
    }

    apps
}

/// Scans packaged MSIX apps (delegates to UWP Shell scanner for WhatsApp, Microsoft Store, etc.)
pub fn scan_msix_apps() -> Vec<AppCacheItem> {
    scan_uwp_apps()
}

/// Scans directories in PATH for executable binaries with System32 filtering
pub fn scan_path_executables() -> Vec<AppCacheItem> {
    let mut apps = Vec::new();
    let path_var = match std::env::var_os("PATH") {
        Some(val) => val,
        None => return apps,
    };

    let mut seen_names = HashSet::new();

    for p in std::env::split_paths(&path_var) {
        if !p.exists() || !p.is_dir() {
            continue;
        }

        let is_system32 = p.to_string_lossy().to_lowercase().contains("system32")
            || p.to_string_lossy().to_lowercase().contains("syswow64");

        if let Ok(entries) = fs::read_dir(&p) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                if file_path.is_file() {
                    if let Some(name) = file_path.file_name().and_then(|n| n.to_str()) {
                        let name_lower = name.to_lowercase();
                        if name_lower.ends_with(".exe") || name_lower.ends_with(".cmd") {
                            // If in System32, only allow whitelisted user utilities
                            if is_system32 && !SYSTEM32_WHITELIST.iter().any(|&w| name_lower == w) {
                                continue;
                            }

                            if let Some(stem) = file_path.file_stem().and_then(|s| s.to_str()) {
                                if !is_uninstaller_or_helper(stem) && seen_names.insert(stem.to_lowercase()) {
                                    let canonical = file_path.to_string_lossy().to_string();
                                    let icon_path = crate::icon_extractor::extract_icon_as_data_uri(&canonical);
                                    apps.push(AppCacheItem {
                                        id: None,
                                        name: stem.to_string(),
                                        path: canonical,
                                        localized_name: None,
                                        app_id: format!("bin:{}", stem.to_lowercase()),
                                        content_type: 0,
                                        icon_path,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    apps
}

/// Catalogues canonical Windows Settings URIs (50+ entries)
pub fn scan_windows_settings() -> Vec<AppCacheItem> {
    SETTINGS_CATALOG
        .iter()
        .map(|item| AppCacheItem {
            id: None,
            name: item.name.to_string(),
            path: item.uri.to_string(),
            localized_name: None,
            app_id: format!("setting:{}", item.uri),
            content_type: 2,
            icon_path: Some("settings".into()),
        })
        .collect()
}

/// Returns keywords for a given ms-settings URI from the catalog
pub fn get_setting_keywords(uri: &str) -> &'static [&'static str] {
    for item in SETTINGS_CATALOG {
        if item.uri.eq_ignore_ascii_case(uri) {
            return item.keywords;
        }
    }
    &[]
}

/// Aggregates discovery sources, defaulting to GUI applications only
pub fn scan_all_apps() -> Vec<AppCacheItem> {
    scan_all_apps_with_options(false)
}

/// Aggregates discovery sources with optional PATH binary inclusion
pub fn scan_all_apps_with_options(include_path: bool) -> Vec<AppCacheItem> {
    let mut aggregated = Vec::new();
    let mut seen_ids = HashSet::new();

    // 1. Start Menu Shortcuts (Primary fidelity)
    for app in scan_start_menu_shortcuts() {
        if seen_ids.insert(app.app_id.clone()) {
            aggregated.push(app);
        }
    }

    // 2. Packaged UWP/MSIX Apps (WhatsApp, Microsoft Store, Calculator, etc.)
    for app in scan_uwp_apps() {
        if seen_ids.insert(app.app_id.clone()) {
            aggregated.push(app);
        }
    }

    // 3. Windows Settings URIs (50+ Canonical Items)
    for setting in scan_windows_settings() {
        if seen_ids.insert(setting.app_id.clone()) {
            aggregated.push(setting);
        }
    }

    // 4. System PATH Executables (only if explicitly enabled)
    if include_path {
        for bin in scan_path_executables() {
            if seen_ids.insert(bin.app_id.clone()) {
                aggregated.push(bin);
            }
        }
    }

    aggregated
}
