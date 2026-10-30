# FOCAL ⚡

> **A high-performance, clean-room desktop productivity launcher for Windows.**  
> Built with **Tauri v2**, **Rust**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ✦ Overview

**Focal** is a keyboard-first desktop launcher tailored specifically for Windows. Inspired by the refined ergonomics of Raycast and engineered with a **Nordic Minimal HUD** aesthetic, Focal delivers sub-millisecond search query filtering, instant application launching, and native Windows integration without background bloat or electron/node daemon overhead.

---

## ✦ Key Features

- **Blazing Fast Application Launching:** Instantaneous process dispatch bypassing legacy shell translation. Native support for Win32 executables, Start Menu `.lnk` shortcuts, packaged UWP/MSIX applications (`shell:AppsFolder`), and Windows settings protocols (`ms-settings:`).
- **Nordic Minimal HUD & Raycast Geometry:** 760px geometric footprint with frameless chrome, native Windows 11 hardware Acrylic frosted blur (`DWMWA_SYSTEMBACKDROP_TYPE`), and smooth mouse dragging.
- **Hybrid Layout Engine:**
  - **Pinned Favorites:** 2×5 compact grid with authentic vector brand icons, monospace titles, and speed aliases.
  - **Sectioned Search Results:** Dynamic contiguous category dividers (`Suggestions`, `Applications`, `Commands & Settings`) preserving zero-latency index navigation.
  - **Layout Modes:** Quick toggling between Hybrid (`Ctrl+1`), List (`Ctrl+2`), and Grid (`Ctrl+3`).
- **Subsystem Views:**
  - 📋 **Clipboard History:** SQLite WAL-backed ring buffer with live preview and instant auto-paste.
  - ✂️ **Text Snippets:** Keyword triggers (`!trigger`) with dynamic token expansion (`{date}`, `{time}`, `{uuid}`, `{clipboard}`).
  - 🔍 **File Search:** Instant local disk querying with size telemetry and Windows Explorer reveal.
  - ⚙️ **Focal Preferences:** Hotkey customization with automatic fallback, theme toggling, directory indexing, and layout preferences saved atomically to `%APPDATA%\Focal\config.json`.
- **Keyboard-First Action Dispatch:**
  - Press <kbd>Tab</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> to summon the floating action popover.
  - Quick shortcuts: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (Admin launch), <kbd>Ctrl</kbd>+<kbd>O</kbd> (Reveal in Explorer), <kbd>Ctrl</kbd>+<kbd>P</kbd> (Pin/Unpin), <kbd>Ctrl</kbd>+<kbd>C</kbd> (Copy Path).
  - Strict Escape hierarchy: Action Menu → Subsystem View → Query Reset → Hide to Tray.
- **Windows System Integration:** Dynamic Windows DWM accent color binding, dark/light theme switching, and global hotkeys with automatic fallback on collision.

---

## ✦ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Core** | Rust 2021 + Tauri v2 (`focal_lib`) | Native Win32 APIs, DWM composition, process spawning, global shortcuts |
| **Database** | SQLite (`rusqlite`) | Local persistence for frecency scoring, clipboard buffer, and snippets (`%LOCALAPPDATA%\Focal\focal.db`) |
| **Frontend UI** | React 19 + TypeScript | Component tree, keyboard navigation engine, reactive state |
| **Styling** | Tailwind CSS v3 | Design system tokens, hardware frosted glass, mechanical keycaps |
| **Branding** | Focal Identity Suite | Coral/rose radiant mark, rounded geometry, dark & light SVG/PNG assets |
| **Testing** | Vitest + Cargo Test | 67 Vitest frontend tests + 63 Cargo Rust backend tests (130 automated tests) |

---

## ✦ Prerequisites

To build and run Focal locally, ensure you have:

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
Executes all 9 Vitest frontend test suites (67 tests):
```bash
npm test
```

Executes all Rust backend unit and empirical challenge tests (63 tests):
```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

### 4. Build Release Executable & Installers
Compiles the optimized, standalone Windows binary and distribution installers:
```bash
# Build standalone binary (src-tauri/target/release/focal.exe)
npx tauri build --no-bundle

# Or build complete distribution bundles (.msi and .exe installer)
npx tauri build
```

The compiled release outputs:
- **Standalone Binary:** `src-tauri/target/release/focal.exe` (~4.8 MB)
- **NSIS Setup Installer:** `src-tauri/target/release/bundle/nsis/Focal_0.1.0_x64-setup.exe` (~1.85 MB)
- **WiX MSI Installer:** `src-tauri/target/release/bundle/msi/Focal_0.1.0_x64_en-US.msi` (~2.6 MB)

---

## ✦ Keyboard Shortcuts Matrix

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>Space</kbd> | Global | Summon / Dismiss Focal launcher |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Space</kbd> | Global | Fallback launcher summon shortcut |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Search / Pinned | Navigate items and wrap boundaries |
| <kbd>Enter</kbd> | Selected Item | Execute primary action / Launch app |
| <kbd>Tab</kbd> / <kbd>Ctrl</kbd>+<kbd>K</kbd> | Any | Toggle Floating Actions popover |
| <kbd>Ctrl</kbd>+<kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Omnibar | Switch Layout Mode (Hybrid / List / Grid) |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Selected App | Run Privileged (Run as Administrator) |
| <kbd>Ctrl</kbd>+<kbd>O</kbd> | Selected Item | Reveal file / item in Windows Explorer |
| <kbd>Ctrl</kbd>+<kbd>P</kbd> | Selected Item | Pin / Unpin from 2×5 Favorites Grid |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Selected Item | Copy item target path to clipboard |
| <kbd>Escape</kbd> | Root Window | Hide launcher to Windows notification tray |

---

## ✦ Project Structure

```
Focal/
├── assets/                     # Focal Brand Identity Suite & SVGs
│   └── branding/
│       ├── focal-logo.svg      # Focal coral/rose geometric logo
│       ├── focal-mark.svg      # Focal icon symbol mark
│       └── svg_suite/          # High-resolution PNG and SVG exports
├── public/                     # Static web assets & favicons
│   ├── favicon.ico             # Focal application favicon
│   └── favicon.svg             # Focal SVG vector icon
├── src/                        # React 19 Frontend
│   ├── components/             # UI Components (FocalLogo, SearchBar, ResultsList, ActionMenu, etc.)
│   ├── hooks/                  # Custom hooks (useKeyboardNav, useSearch, useTheme)
│   ├── services/               # Tauri IPC communication layer (ipc.ts)
│   ├── tests/                  # Automated Vitest test suites (67 tests)
│   ├── types/                  # TypeScript interface and type definitions
│   ├── App.tsx                 # Root application shell
│   └── index.css               # Design system variables, HUD glass & keycap styles
├── src-tauri/                  # Rust Backend (focal_lib)
│   ├── icons/                  # Windows .ico, PNGs, and Store logos
│   ├── src/
│   │   ├── app_scanner.rs      # UWP, MSIX, System32 & Start Menu indexer
│   │   ├── clipboard_manager.rs# SQLite clipboard ring buffer
│   │   ├── config.rs           # Atomic config manager (%APPDATA%\Focal\config.json)
│   │   ├── db.rs               # Database schema and frecency scores (%LOCALAPPDATA%\Focal\focal.db)
│   │   ├── fuzzy.rs            # Fuzzy scoring and ranking engine
│   │   ├── icon_extractor.rs   # Windows shell icon extraction to Data URI
│   │   ├── lib.rs              # Tauri command definitions & process dispatch
│   │   ├── snippet_engine.rs   # Template expansion engine
│   │   └── window_manager.rs   # Win32 DWM backdrop effects & focus stealing
│   ├── tests/                  # Rust empirical stress & benchmark test suites
│   ├── Cargo.toml              # Rust crate dependencies and build configuration (`focal`)
│   └── tauri.conf.json         # Tauri window geometry, tray, and permissions
├── .gitignore                  # Git exclusions for dependencies and build artifacts
├── package.json                # Frontend scripts and Node dependencies (`focal`)
├── README.md                   # Project documentation
└── tailwind.config.js          # Tailwind theme configurations
```

---

## ✦ License

Private & Confidential. Copyright © 2026. All rights reserved.
