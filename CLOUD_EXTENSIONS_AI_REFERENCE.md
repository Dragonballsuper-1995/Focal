# Raycast Ecosystem Reference: Extension Store, API, AI Assistant & Cloud Sync
**Technical Reference & Architectural Deconstruction for Focal**

> **Document Classification:** External Architecture Reference & Comparative Specification  
> **Target Scope:** Raycast Windows Hybrid Model vs. Native Rust Lightweight Alternatives  
> **Guiding Principle for Focal:** Focal remains strictly **100% offline, local, and zero-AI**, preserving ultra-fast (<20ms) latency and zero network/cloud attack surface. This document serves as a complete technical reference for understanding how Raycast implements these subsystems and how a future, optional, non-intrusive extension or sync layer could be designed without compromising performance.

---

## 1. Extension Store & Runtime Architecture

### 1.1 The Raycast Extension Model
Raycast achieves its third-party extensibility through a multi-tier runtime model:
1. **Host Execution Environment:**
   - On Windows, Raycast bundles a full Node.js runtime (`backend/node.exe` v22.x) alongside a native C# WPF host and Microsoft Chromium WebView2.
   - Extensions do not execute in the browser window; they execute inside Node.js worker threads or child processes.
2. **API Abstraction Layer (`@raycast/api`):**
   - Extensions are authored as TypeScript/React npm packages implementing `@raycast/api`.
   - The React components exported by extensions (`<List>`, `<Detail>`, `<Form>`, `<ActionPanel>`) do **not** render actual DOM nodes directly. Instead, they produce a declarative virtual UI specification serialized into JSON-RPC packets.
   - The UI specification is streamed over local IPC (named pipes or standard I/O) to the host UI layer, which renders native host widgets or WebView2 components.
3. **Manifest & Sandboxing:**
   - Every extension contains a `package.json` with a `"raycast"` manifest schema declaring:
     - `commands`: Array of commands, title, mode (`view` vs `no-view`), and keywords.
     - `preferences`: User-configurable options rendered automatically into a preferences pane.
     - `dependencies`: Standard npm dependencies bundled with `esbuild`.
   - **Windows Sandboxing Limitations:** Unlike macOS where sandbox entitlements restrict process boundaries, Node.js on Windows runs with the full user privileges of the parent process, meaning extensions can access disk and network unless explicitly constrained.

### 1.2 Extension Store Distribution & Caching
- **Registry:** Extensions are open-sourced on GitHub (`raycast/extensions`) and compiled into tarball artifacts distributed via Raycast's CDN (`https://backend.raycast.com/api/v1/extensions`).
- **Local Disk Cache:**
  - Installed extensions reside in:  
    `%APPDATA%\Raycast\extensions\<author>.<extension-name>\`
  - Metadata, permissions, and enabled states are stored in an SQLite database `extensions.db`.
- **Alternative Design for a Zero-Bloat Launcher (Focal):**
  - Spawning Node.js adds ~150–200 MB of RAM overhead per process.
  - A zero-bloat alternative suited for Focal:
    1. **WASM (WebAssembly) Sandboxed Extensions:** Using `wasmtime` or `wasmer` in Rust (~5 MB RAM, sub-millisecond startup, true sandboxing).
    2. **Native Script Focal:** Plain PowerShell, Python, or batch scripts with frontmatter metadata headers (`# @runner.title`, `# @runner.keyword`), requiring 0 extra daemon processes.

---

## 2. Raycast API Architecture

### 2.1 Core API Primitives

| Primitive Category | `@raycast/api` Component | Functionality |
| :--- | :--- | :--- |
| **Navigation** | `useNavigation()`, `showToast()` | Push/pop view stacks, present toast alerts and HUD notifications. |
| **Persistence** | `LocalStorage`, `useCachedState()` | Key-value storage backed by SQLite WAL with instant in-memory read cache. |
| **System I/O** | `Clipboard.copy()`, `Clipboard.paste()` | Read and manipulate clipboard buffer, trigger auto-paste via virtual keystrokes. |
| **Execution** | `exec()`, `open()` | Launch external URLs (`open("https://...")`) or shell executables. |
| **UI Components** | `<List>`, `<Grid>`, `<Detail>`, `<Form>` | Standardized layout primitives with built-in search, filtering, and pagination. |
| **Action Panels** | `<ActionPanel>`, `<Action>` | Uniform keyboard shortcut bar (`Enter` for primary action, `Ctrl+K` for secondary palette). |

### 2.2 Deep-Linking & Protocol Handlers
Raycast registers the `raycast://` URI scheme in the Windows registry:
`HKEY_CURRENT_USER\Software\Classes\raycast\shell\open\command`
- Syntax: `raycast://extensions/<author>/<extension>/<command>?arg1=val1`
- When invoked, the launcher summons itself, decodes the command path, passes parameters to the running extension, and brings the view into immediate focus.

---

## 3. Raycast AI Assistant Architecture (Forensic Breakdown)

> [!NOTE]
> Focal explicitly rejects AI integration to maintain absolute zero latency, zero cloud dependency, zero token costs, and 100% local privacy. The details below are documented solely for competitive and architectural analysis.

### 3.1 Model Routing & Cloud Proxy Architecture
1. **Cloud Gateway:** Raycast does not connect clients directly to OpenAI, Anthropic, or Mistral API keys. All client requests route through a centralized proxy (`https://backend.raycast.com/api/v1/ai/chat`).
2. **Subscription & Token Management:** The cloud gateway validates Raycast Pro / Advanced AI subscriptions, enforces rate limits, handles model failover, and injects model-specific system prompts.
3. **Supported LLM Engines:**
   - OpenAI: GPT-4o, GPT-4o mini, o1-preview.
   - Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku.
   - Open Source / EU: Mistral Large, Llama 3.1 70B/405B.

### 3.2 Streaming IPC & Context Injection
1. **Server-Sent Events (SSE):** The cloud proxy returns chunks via HTTP chunked transfer (`Content-Type: text/event-stream`).
2. **Context Harvesters:**
   - **Active Window Context:** Before issuing a prompt, the host queries Win32 `GetForegroundWindow()` and `GetWindowTextW()` to determine which app the user is working in.
   - **Clipboard & Selection:** Raycast reads the current selection using synthetic keystrokes (`Ctrl+C` into a temporary clipboard ring) to populate `{selection}` placeholders.
3. **Why Focal Omits AI:**
   - **Privacy Risk:** Sending window titles, file paths, clipboard content, and typed text to cloud proxies violates enterprise zero-trust security postures.
   - **Latency Penalty:** Cloud round-trips take 300ms to 2,000ms, conflicting with Focal's hard sub-20ms instant-response guarantee.
   - **Binary Bloat:** Supporting streaming markdown rendering, token counters, and cloud telemetry bloats binary size and memory footprints.

---

## 4. Cloud Synchronization Architecture

### 4.1 End-to-End Encryption (E2EE) Sync Protocol
Raycast offers cloud synchronization for settings, snippets, and quicklinks across multiple workstations (macOS and Windows). The protocol operates as follows:

```
+-------------------------------------------------------------+
|                     Client Device (Focal)                  |
|                                                             |
|  Local Data (Snippets/Settings)                             |
|          |                                                  |
|          v                                                  |
|  [Serialization: JSON / Protocol Buffers]                   |
|          |                                                  |
|          v                                                  |
|  [Client Key Derivation: Argon2id (User Master Passphrase)] |
|          |                                                  |
|          v                                                  |
|  [Authenticated Encryption: AES-256-GCM / ChaCha20-Poly1305]|
|          |                                                  |
+----------|--------------------------------------------------+
           | (Encrypted Payload + IV + Auth Tag Only)
           v
+-------------------------------------------------------------+
|                 Cloud Sync Server / Relay                   |
|                                                             |
|  - Zero-Knowledge Storage (Blind Key-Value / Blob Store)    |
|  - Sync Metadata: client_id, timestamp, revision_vector     |
|  - Cannot inspect or decrypt user payloads                  |
+-------------------------------------------------------------+
```

### 4.2 Synchronization Primitives & Conflict Resolution
1. **Entities Synced:**
   - Dynamic Snippets (keywords, templates, expansion rules).
   - Custom Quicklinks (URLs, query tokens, custom prefixes).
   - Hotkey assignments and user preferences.
   - Excluded: Clipboard history (for strict privacy and compliance reasons, clipboard buffers remain local to each machine).
2. **Conflict Resolution Strategy:**
   - **CRDT (Conflict-free Replicated Data Types):** Ideal for state-based distributed maps.
   - **Last-Write-Wins (LWW) with Lamport Timestamps:** Every record maintains an `updated_at` (nanosecond epoch) and a `device_id`. When conflicts arise, the highest timestamp prevails; identical timestamps resolve deterministically by device ID hash.

### 4.3 Zero-Cloud Alternative: Local File / Git Sync
For users who require cross-machine synchronization without cloud services:
- **Portable Folder Sync:** Focal can read and write its configuration and snippet database to a user-specified path (e.g. `OneDrive`, `Google Drive`, `Dropbox`, or a local Git repository).
- **Atomic File Watcher:** Focal utilizes Windows `ReadDirectoryChangesW` to automatically reload snippets and settings when the synchronized JSON files update externally.

---

## 5. Architectural Comparison Matrix

| Architectural Dimension | Raycast Windows Model | Focal Clean-Room Native Model |
| :--- | :--- | :--- |
| **Host Process Model** | 3 processes (.NET WPF host + Node.js + WebView2) | **Single native process** (Tauri v2 / Rust Core) |
| **Idle Memory Footprint** | ~350 MB to 600 MB RAM | **~28 MB to 35 MB RAM** |
| **Cold Startup Latency** | 800ms to 2,200ms | **<15ms** |
| **Disk Binary Size** | ~250 MB | **<5 MB** (single `.exe`) |
| **Extension Engine** | Heavy Node.js `@raycast/api` npm runtime | Native scripts (PowerShell/Python) or WebAssembly (WASM) |
| **AI Integration** | Cloud LLM multiplexer (GPT-4o/Claude/Mistral) | **Zero AI** (100% offline, private, deterministic) |
| **Cloud Sync** | Proprietary E2EE Cloud Relay | Local folder sync / Git / SQLite export (optional) |
| **Search Indexing** | Node.js / Rust FFI bridge | In-memory zero-copy Rust fuzzy matching |

---

## 6. Guidelines for Focal's Future Modular Growth
If external scripting or export/sync capabilities are implemented in Focal:
1. **Never sacrifice cold start or RAM:** Do not spawn long-running background runtimes (like Node.js or Python daemons). Spawns must be on-demand, non-blocking worker threads.
2. **Preserve data sovereignty:** All clipboard entries, snippets, and app indices must live strictly within the local SQLite WAL database at `%APPDATA%\Focal\runner.db`.
3. **Deterministic & Fast:** Keep all core utilities (calculator, emoji, file search, unit converter) compiled directly in Rust.
