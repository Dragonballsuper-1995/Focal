# Runner — Advanced Features & Enhancement Roadmap
**Clean-Room Reimplementation of Raycast for Windows**

> **Document Version:** 2.0.0  
> **Target Platform:** Windows 10 / 11 (x64)  
> **Core Architecture:** Tauri v2 (Rust Core) + React 18 / TypeScript / Tailwind CSS  
> **Baseline Benchmark:** ~30 MB idle RAM, <10ms window summon, sub-19ms search across 20k items.  
> **Core Philosophy:** Strictly **zero AI integration**, **100% offline**, and focused on delivering the fastest desktop launcher for apps, settings, shortcuts, clipboard history, snippets, inline calculator, and emoji picker.

---

## Executive Summary

Runner has successfully collapsed the legacy 3-process architecture of Raycast Windows (.NET 10 WPF host + Node.js backend + Chromium WebView2 incurring ~500 MB idle RAM) into a unified, lightweight native Rust core. The active app currently features:
- **Global Hotkey & Window Management:** Instant toggle (`Shift+Alt+Space` or `Alt+Space`) with smooth focus retention and rounded DWM borders.
- **In-Memory Fuzzy Matcher:** Word-boundary & frecency-boosted indexing delivering sub-19ms searches across 20,000+ items.
- **Clipboard History:** Win32 format monitoring, SQLite WAL ring buffer, deduplication, and auto-paste keystroke synthesis (`SendInput`).
- **Dynamic Snippets:** Live expansion of `{date}`, `{time}`, `{uuid}`, `{clipboard}`, and `{cursor}`.
- **Local File Search & Preferences:** Multi-threaded disk queries with atomic JSON settings synchronization.
- **Bespoke Icon Engine:** Native vector SVG brand logos (Chrome, VS Code, Spotify, Discord, Edge, YouTube, etc.), contextual Windows settings icons, and dynamic monogram badges.
- **Basic Windows Power Controls:** Clean, native Win32 controls for **Lock**, **Sleep**, **Restart**, and **Shutdown**.

This document outlines the **recommended advanced features** to be added sequentially without compromising Runner's zero-bloat, sub-50ms performance profile.

---

## 1. Core Productivity Extensions

### 1.1 Inline Calculator & Math Evaluator (Raycast Parity)
* **Description:** Instant mathematical expression evaluation directly in the search bar without switching views or executing external programs.
* **Architecture:**
  - **Rust Backend:** Integrate an in-memory math parser (e.g. `meval` or `evalexpr`) in `src-tauri/src/calculator.rs`.
  - **Fast-Path Regex:** Detect arithmetic tokens (`+`, `-`, `*`, `/`, `^`, `%`, `sin`, `cos`, `sqrt`, `pi`, `abs`) in the query input.
  - **Result Presentation:** Returns a highlighted top item `= 362.5` with instant "Copy Result (`Enter`)" action.
* **Example Inputs:**
  - `(145 * 2.5) / 12` $\to$ `= 30.2083`
  - `sqrt(144) + 2^8` $\to$ `= 268`
  - `sin(pi / 2)` $\to$ `= 1`

### 1.2 Unit & Currency Converter
* **Description:** Live conversion of weights, lengths, data sizes, temperature, and currency units directly inline.
* **Architecture:**
  - **Static Conversions:** Offline lookup table for SI units, imperial measurements, data units (B, KB, MB, GB, TB, KiB, MiB, GiB), and temperature (Celsius, Fahrenheit, Kelvin).
  - **Currency Rates:** Lightweight offline fallback rate table with optional, cached daily sync from the European Central Bank (ECB) feed.
* **Example Inputs:**
  - `500 gb in tb` $\to$ `= 0.5 TB` (or `465.66 GiB`)
  - `72 f in c` $\to$ `= 22.2 °C`
  - `15 miles in km` $\to$ `= 24.14 km`
  - `100 usd in eur` $\to$ `= €92.45`

### 1.3 Emoji & Symbol Picker (Raycast Parity)
* **Description:** Instant emoji, symbol, and kaomoji search modal triggered by hotkey or command (`view:emoji`).
* **Architecture:**
  - **Catalog:** Embedded SQLite table or JSON array containing the complete Unicode 15.0 dataset (~3,600 emojis) with keywords, categories, and skin-tone variants.
  - **Search:** Instant fuzzy matching on emoji names, tags, and annotations (e.g., typing `party` returns 🎉, 🥳, 🎈, 🍻).
  - **Action:** Pressing `Enter` copies the character to the clipboard and synthesizes `Ctrl+V` to immediately paste it into the active foreground window.
  - **Recent / Favorites:** Persists recently used emojis in SQLite for instant top-row access.

### 1.4 Custom Quicklinks
* **Description:** User-defined URL shortcuts with dynamic query placeholders, enabling instant web navigation without manually opening a browser first.
* **Architecture:**
  - **Configuration:** Stored in `%APPDATA%\Runner\quicklinks.json` or SQLite `quicklinks` table.
  - **Token Interpolation:** Templates supporting `{query}`, `{selection}`, or `{clipboard}` tokens.
* **Examples:**
  - Keyword `gh <query>` $\to$ `https://github.com/search?q={query}`
  - Keyword `yt <query>` $\to$ `https://www.youtube.com/results?search_query={query}`
  - Keyword `so <query>` $\to$ `https://stackoverflow.com/search?q={query}`
  - Keyword `wiki <query>` $\to$ `https://en.wikipedia.org/wiki/{query}`

### 1.5 Quick Notes & Scratchpad
* **Description:** A floating, instantaneous markdown note editor accessible via a dedicated shortcut (`Alt+N`) or `view:notes`.
* **Architecture:**
  - **Storage:** SQLite `notes` table with `id`, `title`, `content_markdown`, `pinned`, `updated_at`.
  - **Editor:** Minimalist zero-delay markdown editor with live preview and syntax styling.
  - **Persistence:** Auto-saved on every keystroke with a 300ms debounce loop.

---

## 2. File Navigation & Rich Actions

### 2.1 Quick Look File Preview (`Spacebar`)
* **Description:** Pressing `Spacebar` on any file in search results immediately opens a clean, floating Quick Look modal without launching heavy desktop applications.
* **Supported File Types:**
  - **Code & Text:** `.txt`, `.rs`, `.ts`, `.tsx`, `.js`, `.py`, `.json`, `.css`, `.html`, `.md`, `.log` with syntax highlighting and line numbers.
  - **Images:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico` rendered in full native resolution with image dimensions and byte size.
  - **Documents:** Quick preview for `.pdf` documents via embedded WebView2 canvas.
  - **Audio/Video:** Lightweight playback for `.mp3`, `.wav`, `.mp4`.
* **Keyboard Navigation:** Press `Spacebar` to toggle preview; use `Up` / `Down` arrows to navigate files while keeping preview open; press `Escape` or `Spacebar` to dismiss.

### 2.2 Rich File Action Bar Look (`Tab` / `Ctrl+K`)
* **Description:** Raycast-style action drawer and contextual action menu for file results.
* **Visual Presentation:**
  - Bottom bar displaying primary action: `↵ Open` and secondary shortcut: `⇥ Actions` (or `Ctrl+K`).
  - Slide-out / popover action palette with keyboard accelerators:
    - `↵` **Open File** (Default application)
    - `Ctrl+↵` **Open With...** (Windows application chooser)
    - `Ctrl+Shift+E` **Reveal in File Explorer** (`explorer.exe /select,"<path>"`)
    - `Ctrl+C` **Copy File Path**
    - `Ctrl+Shift+C` **Copy File to Clipboard** (Win32 `CF_HDROP` format)
    - `Ctrl+Backspace` **Move to Recycle Bin** (`SHFileOperationW` / `IFileOperation`)
    - `Alt+Enter` **Properties** (Native Windows file property dialog)

---

## 3. Extended Windows System & Process Palette

> [!NOTE]
> The active application currently implements the fundamental power controls: **Lock**, **Sleep**, **Restart**, and **Shutdown**. The following additional system commands are recommended for future phases:

### 3.1 Extended Power & Hardware Controls
* **Empty Recycle Bin:** Native Win32 `SHEmptyRecycleBinW(NULL, NULL, SHERB_NOCONFIRMATION)` with a safety confirmation prompt.
* **Hibernate:** Call `SetSuspendState(TRUE, FALSE, FALSE)` to hibernate the machine.
* **Toggle Night Light:** Manipulate Windows Registry key `Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Cloud\...` to activate or disable display blue-light filter.
* **System Volume Control:**
  - `Mute / Unmute Volume`
  - `Volume Up (10%)` / `Volume Down (10%)` via Win32 `IAudioEndpointVolume` interface.

### 3.2 Network & Connectivity Commands
* **Flush DNS Cache:** Spawns `ipconfig /flushdns` in the background and reports confirmation toast.
* **Show Local IP / Gateway:** Displays active adapter IPv4/IPv6 and MAC addresses.
* **Toggle Wi-Fi / Bluetooth:** Toggles radio adapters via Windows Runtime (`Windows.Devices.Radios`).

### 3.3 Process Explorer & Task Terminator
* **Description:** Search active Windows processes and view real-time CPU/RAM usage.
* **Actions:**
  - `Kill Process` (`taskkill /PID <pid> /F`)
  - `Restart Explorer` (Terminates and restarts `explorer.exe` to fix shell glitches)

---

## 4. Developer Utilities & Offline Tools

* **JSON Formatter & Validator:** Paste unformatted or minified JSON to instantly validate, format with 2-space indentation, or minify.
* **Base64 & URL Encoder/Decoder:** Instant two-way conversions for raw strings or file payloads.
* **Hash Calculator:** Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for text strings or files.
* **Unix Timestamp Converter:** Two-way conversion between Unix epoch timestamps (seconds/milliseconds) and human-readable UTC/Local date-times.
* **UUID / GUID Generator:** Generate single or batch v4 UUIDs directly into the clipboard.

---

## 5. Visual Polish & Desktop Integration

### 5.1 Windows 11 Mica & Acrylic Backdrop Blur
* **Description:** Upgrade window transparency from standard alpha blending to Windows 11 DWM Mica or Acrylic backdrop materials.
* **Implementation:**
  - Call `DwmSetWindowAttribute` with `DWMWA_SYSTEMBACKDROP_TYPE = 2 (Mica)` or `3 (Acrylic)` on Windows 11 builds $\ge 22000$.
  - Fall back cleanly to DWM BlurBehind on Windows 10.

### 5.2 System Tray & Autostart on Boot
* **Description:** Background icon in the Windows taskbar notification area with quick actions:
  - Menu: `Open Runner`, `Preferences`, `Clear Clipboard History`, `Exit`.
  - Windows Startup Registry Hook:
    `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run\Runner`

### 5.3 Dynamic Category Filter Strip (Addon Feature)
* **Description:** Configurable scope switcher pill bar (`All`, `Favorites`, `Applications`, `Games`, `Commands`, `Files`) placed beneath the omnibar for power users who want rapid manual domain narrowing.
* **Architecture:**
  - **Setting Toggle:** `config.enable_category_filter_strip: boolean` (Default: `false` to maintain a spacious, minimal Nordic HUD layout).
  - **Inline Activations:** When enabled, users can filter using keyboard shortcuts (`Ctrl+1`..`6`) or typed prefix tokens (`/app`, `/game`, `/cmd`).
  - **Minimalist Default:** Kept off by default in the core UI to eliminate stacked header clutter, leaving the omnibox clean and spacious with instant fuzzy categorization.

---

## 6. Implementation Priority Matrix

| Phase | Feature | Complexity | Latency Impact | Target Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Inline Math Calculator** | Low | < 0.1ms | `calculator.rs`, `SearchBar.tsx` |
| **Phase 1** | **Emoji & Symbol Picker** | Low | < 1ms | `emoji_catalog.rs`, `EmojiPickerView.tsx` |
| **Phase 1** | **Unit & Currency Converter**| Low | < 0.2ms | `converter.rs`, `SearchBar.tsx` |
| **Phase 2** | **Category Filter Strip (Addon)**| Low | < 0.1ms | `SearchBar.tsx`, `SettingsModal.tsx` |
| **Phase 2** | **Custom Quicklinks** | Low | < 0.1ms | `quicklinks.rs`, `fuzzy.rs` |
| **Phase 2** | **Quick Look Preview (`Space`)**| Medium | < 5ms | `FilePreviewModal.tsx`, `file_search.rs` |
| **Phase 2** | **Rich File Action Bar (`Tab`)**| Low | < 0.1ms | `ActionBar.tsx`, `ActionMenu.tsx` |
| **Phase 3** | **Quick Notes / Scratchpad** | Medium | < 2ms | `db.rs`, `NotesView.tsx` |
| **Phase 3** | **System Tray & Autostart** | Low | 0ms | `main.rs`, `config.rs`, `SettingsModal.tsx` |
| **Phase 4** | **Extended System Controls** | Medium | < 1ms | `system_tools.rs`, `lib.rs` |
| **Phase 4** | **Windows 11 Mica Backdrop** | Low | 0ms | `window_manager.rs` |
