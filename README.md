# RUNNER ⚡

> **A high-performance, clean-room desktop productivity launcher for Windows.**  
> Built with **Tauri v2**, **Rust**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ✦ Overview

**Runner** is a keyboard-first desktop launcher tailored specifically for Windows. Inspired by the refined ergonomics of Raycast and engineered with a **Nordic Minimal HUD** aesthetic, Runner delivers sub-millisecond search query filtering, instant application launching, and native Windows integration without background bloat.

---

## ✦ Key Features

- **Blazing Fast Application Launching:** Instantaneous process dispatch bypassing legacy shell translation. Native support for Win32 executables, Start Menu `.lnk` shortcuts, packaged UWP/MSIX applications (`shell:AppsFolder`), and Windows settings protocols (`ms-settings:`).
- **Raycast-Proportional Geometry:** 760px geometric footprint with frameless chrome, native Windows 11 hardware Acrylic frosted blur (`DWMWA_SYSTEMBACKDROP_TYPE`), and fluid mouse dragging.
- **Hybrid Layout Engine:**
  - **Pinned Favorites:** 2×5 compact grid with authentic vector brand icons, monospace titles, and speed aliases.
  - **Sectioned Search Results:** Dynamic contiguous category dividers (`Suggestions`, `Applications`, `Commands & Settings`) preserving zero-latency index navigation.
- **Subsystem Views:**
  - 📋 **Clipboard History:** SQLite-backed ring buffer with live preview and instant auto-paste.
  - ✂️ **Text Snippets:** Keyword triggers (`!trigger`) with dynamic token expansion (`{date}`, `{time}`, `{uuid}`, `{clipboard}`).
  - 🔍 **File Search:** Instant disk querying with size telemetry and explorer reveal.
  - ⚙️ **Runner Preferences:** Hotkey customization, theme toggling, directory indexing, and layout preferences.
- **Keyboard-First Action Dispatch:**
  - Press <kbd>Tab</kbd> to summon the floating action popover.
  - Quick shortcuts: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (Admin launch), <kbd>Ctrl</kbd>+<kbd>O</kbd> (Reveal in Explorer), <kbd>Ctrl</kbd>+<kbd>P</kbd> (Pin/Unpin), <kbd>Ctrl</kbd>+<kbd>C</kbd> (Copy Path).
  - Strict Escape hierarchy: Action Menu → Subsystem View → Query Reset → Hide to Tray.
- **Windows System Integration:** Dynamic Windows DWM accent color binding, dark/light theme switching, and global hotkeys with automatic fallback on collision.

---

## ✦ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Core** | Rust 2021 + Tauri v2 | Native Win32 APIs, DWM composition, process spawning, global shortcuts |
| **Database** | SQLite (`rusqlite`) | Local persistence for frecency scoring, clipboard buffer, and snippets |
| **Frontend UI** | React 19 + TypeScript | Component tree, keyboard navigation engine, reactive state |
| **Styling** | Tailwind CSS v3 | Design system tokens, hardware frosted glass, mechanical keycaps |
| **Testing** | Vitest + Testing Library | 63 automated unit, integration, and empirical stress tests |

---

## ✦ Prerequisites

To build and run Runner locally, ensure you have:

1. **Windows 10 / 11** (64-bit)
2. **Rust & Cargo** (1.75+): [https://rustup.rs](https://rustup.rs)
3. **Node.js** (v18+ or v20+): [https://nodejs.org](https://nodejs.org)
4. **Visual Studio C++ Build Tools** with the "Desktop development with C++" workload
5. **WebView2 Runtime** (installed by default on Windows 10/11)

---

## ✦ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts the Vite dev server and launches the Tauri window with live-reload:
```bash
npm run dev
```

### 3. Run Test Suite
Executes all 9 Vitest test suites (63 tests):
```bash
npm test
```

### 4. Build Release Executable
Compiles the optimized, standalone Windows binary:
```bash
npx tauri build --no-bundle
```
The compiled executable will be located at:
```
src-tauri/target/release/runner.exe
```

---

## ✦ Keyboard Shortcuts Matrix

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Space</kbd> | Global | Summon / Dismiss Runner launcher |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Search / Pinned | Navigate items and wrap boundaries |
| <kbd>Enter</kbd> | Selected Item | Execute primary action / Launch app |
| <kbd>Tab</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd> | Any | Toggle Floating Actions popover |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Selected App | Run Privileged (Run as Administrator) |
| <kbd>Ctrl</kbd>+<kbd>O</kbd> | Selected Item | Reveal file / item in Windows Explorer |
| <kbd>Ctrl</kbd>+<kbd>P</kbd> | Selected Item | Pin / Unpin from 2×5 Favorites Grid |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Selected Item | Copy item target path to clipboard |
| <kbd>Escape</kbd> | Root Window | Hide launcher to Windows notification tray |

---

## ✦ Project Structure

```
Runner/
├── src/                        # React Frontend
│   ├── components/             # UI Components (SearchBar, ResultsList, ActionMenu, etc.)
│   ├── hooks/                  # Custom hooks (useKeyboardNav, useSearch, useTheme)
│   ├── services/               # Tauri IPC communication layer
│   ├── tests/                  # Automated Vitest test suites
│   ├── types/                  # TypeScript interface and type definitions
│   ├── App.tsx                 # Root application shell
│   └── index.css               # Design system variables and keycap styles
├── src-tauri/                  # Rust Backend
│   ├── src/
│   │   ├── app_scanner.rs      # UWP, MSIX, System32 & Start Menu indexer
│   │   ├── clipboard_manager.rs# SQLite clipboard ring buffer
│   │   ├── db.rs               # Database schema and frecency scores
│   │   ├── fuzzy.rs            # Fuzzy scoring and ranking engine
│   │   ├── icon_extractor.rs   # Windows shell icon extraction to Data URI
│   │   ├── lib.rs              # Tauri command definitions & process dispatch
│   │   ├── snippet_engine.rs   # Template expansion engine
│   │   └── window_manager.rs   # Win32 DWM backdrop effects & focus stealing
│   ├── Cargo.toml              # Rust crate dependencies and build configuration
│   └── tauri.conf.json         # Tauri window geometry and permissions
├── .gitignore                  # Git exclusions for dependencies and build artifacts
├── package.json                # Frontend scripts and Node dependencies
├── README.md                   # Project documentation
└── tailwind.config.js          # Tailwind theme configurations
```

---

## ✦ License

Private & Confidential. Copyright © 2026. All rights reserved.
