---
name: Focal Nordic Minimal HUD
version: 2.1.0
description: "The definitive design system and architectural specification for FOCAL — an inspired, compact, and spacious Windows desktop command instrument combining Nordic Industrial HUD DNA, restrained functional minimalism, proportional 760px geometry, 4 layout modes (including Hybrid Pinned Grid + List), adaptive Windows accents, and bottom-right anchored action dispatching."
author: Focal Architecture & Design Lab
standard: design-md/1.0.0

tokens:
  dimensions:
    window_width: "760px"
    window_height: "470px"
    header_height: "32px"
    omnibox_height: "44px"
    stage_height: "380px"
    dock_height: "36px"
    split_ratio: "60 / 40 (Left: ~450px, Right: ~300px)"
    action_popup_width: "256px"

  colors:
    canvas:
      base: "#0E1015"
      subsurface: "#14161C"
      panel: "#111318"
      card: "#161820"
      border_outer: "#262A36"
      border_grid: "#1D202A"
      border_hairline: "#161822"
    windows_accent:
      source: "var(--sys-accent, #0078D4)"
      hover: "var(--sys-accent-hover, #1A90F0)"
      muted: "var(--sys-accent-muted, rgba(0, 120, 212, 0.18))"
      subtle: "var(--sys-accent-subtle, rgba(0, 120, 212, 0.08))"
      border: "var(--sys-accent-border, rgba(0, 120, 212, 0.45))"
      glow: "var(--sys-accent-glow, rgba(0, 120, 212, 0.35))"
      on_accent: "#000000"
    monochrome:
      text_main: "#EAEAEF"
      text_muted: "#868A98"
      text_dim: "#505462"
      text_inverse: "#000000"
      selection_bg: "var(--sys-accent, #0078D4)"
      selection_text: "#000000"
    keycap:
      bg: "#1A1D24"
      text: "#C8CBD6"
      border: "#2F3442"
      border_bottom: "#0B0D10"
      active_bg: "#14161B"

  typography:
    font_mono: "'Geist Mono', Consolas, monospace"
    font_hud: "'Space Grotesk', sans-serif"
    scale:
      omnibox: { size: "12px", lineHeight: "16px", weight: "500", font: "mono", tracking: "0.03em", transform: "uppercase" }
      row_title: { size: "12px", lineHeight: "16px", weight: "600", font: "mono" }
      row_alias: { size: "9px", lineHeight: "12px", weight: "700", font: "mono" }
      row_tag: { size: "9.5px", lineHeight: "12px", weight: "600", font: "mono", transform: "uppercase" }
      telemetry: { size: "10.5px", lineHeight: "14px", weight: "500", font: "mono" }
      inspector_title: { size: "12px", lineHeight: "16px", weight: "700", font: "hud", tracking: "0.04em", transform: "uppercase" }
      keycap: { size: "9.5px", lineHeight: "11px", weight: "700", font: "mono", tracking: "0.03em", transform: "uppercase" }

  rounded:
    window: "6px"
    card: "3px"
    row: "2px"
    keycap: "2px"
    button: "2px"

  shadows:
    window_elevation: "0 24px 64px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px #161822"
    action_popup: "0 16px 40px -8px rgba(0, 0, 0, 0.9), 0 0 0 1px #2F3442"
    keycap_bevel: "0 1px 2px rgba(0, 0, 0, 0.5)"
    selection_flood: "0 1px 4px rgba(0, 0, 0, 0.35)"
---

# FOCAL DESIGN SYSTEM SPECIFICATION (DESIGN.md)
**Specification Version:** 2.1.0-PROD  
**Design Identity:** *Nordic Minimal HUD (Direction C Refined)*  
**Platform:** Windows 11 / Windows 10 (Tauri v2 + WebView2 + React 18/19 + Tailwind CSS)

---

## 1. Executive Philosophy: Nordic Functional Minimalism

Previous prototype iterations suffered from visual crowding: heavy multi-pipe telemetry banners, rigid 5-column database headers (`ID  TARGET / ALIAS  TYPE  SOURCE  ACTION`), and an oversized window footprint (`1024px`) that overwhelmed the screen.

The **Nordic Minimal HUD** redesign recalibrates the aesthetic back to Dieter Rams' core tenet: **"Less, but better."**

### Core Principles
1. **Raycast-Proportional Geometry:** Window size is dialed to `760px` width (close to Raycast's ~680px, but slightly wider to comfortably house the split inspector and technical keycaps) and `470px` height.
2. **Direction C DNA Preserved:**
   - Deep industrial graphite slate palette (`#0E1015`, `#14161C`, `#111318`).
   - Clean monospace typography (`Geist Mono`).
   - **Solid Windows Accent Flood on Selection:** Selected rows/tiles are flooded with `var(--sys-accent)` with high-contrast `#000000` text and physical black enter keycaps.
   - Physical tactile keycaps (`.hud-key`) with 3D bottom bevels.
   - Authentic vector SVG brand icons (zero cartoon emojis).
3. **Restrained Signal-to-Noise Ratio:**
   - Telemetry header streamlined to a single elegant bar (`FOCAL // SYS_COMMAND_HUD • 842 TARGETS [READY]`).
   - Removed the noisy `ID TARGET / ALIAS TYPE SOURCE ACTION` table header; the columns speak for themselves with natural whitespace alignment.
   - Right-side context inspector simplified to a clean identity card and 4 critical technical specs (`PUBLISHER`, `VERSION`, `SUBSYSTEM`, `STATUS: VERIFIED`).
4. **Bottom-Right Anchored Action Pop-Up (<kbd>Tab</kbd>):**
   - Replaced full-pane takeovers and expanding bottom drawers.
   - Pressing <kbd>Tab</kbd> or clicking `[TAB] ACTIONS` summons a focused **floating pop-up menu anchored directly at the bottom-right corner** right above the dock.
   - Zero layout disruption to the primary list or inspector.

---

## 2. Window Anatomy & Compact Grid Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ [●] FOCAL // SYS_COMMAND_HUD • 842 TARGETS        [READY] ACCENT  [✕] │ Header (32px)
├────────────────────────────────────────────────────────────────────────┤
│ > EXECUTE QUERY, ALIAS (wh, vs), OR '/'...  [LIST|HYBRID|GRID|CAT][ESC]│ Omnibox (44px)
├────────────────────────────────────────┬───────────────────────────────┤
│ // FAVORITES [PINNED]                  │ // TELEMETRY_INSPECT  [READY] │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │ [ICON] WHATSAPP         [APP] │
│ │ ■ wh│ │ ■ vs│ │ ■ yt│ │ ■psh│ (Grid) │ WhatsApp_2.24...\\WhatsApp.exe│
│ └─────┘ └─────┘ └─────┘ └─────┘        │                               │
│ // SUGGESTIONS                         │ PUBLISHER:   Meta Platforms   │
│ 05  ■ Shut Down            [CMD]  [↵]  │ VERSION:     2.2443.4.0 (x64) │ Stage (380px)
│ 06  ■ Antigravity IDE      [APP]  [↵]  │ SUBSYSTEM:   UWP_MSIX         │
│ // APPLICATIONS                        │ STATUS:      VERIFIED         │
│ 08  ■ MATLAB R2026a        [APP]  [↵]  │                               │
│ 09  ■ Microsoft Teams [te] [APP]  [↵]  │                               │
├────────────────────────────────────────┴───────────────────────────────┤
│ [ONLINE] WHATSAPP           [ENTER] EXEC  [^ENTER] ADMIN  [TAB] ACTIONS│ Dock (36px)
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Four Layout Modes

FOCAL supports 4 layout paradigms selectable via the omnibar buttons or keyboard shortcuts:

### 3.1 Mode 1: HYBRID (Recommended Default)
* **Rationale:** Merges the high visual recognizability of pinned icon tiles with the dense scanning speed of tabular list rows.
* **Top Section (`// FAVORITES [PINNED]`):**
  - Rendered as a compact 4-column grid of smaller blocks.
  - Height: ~40px per tile. Contains 20px vector brand icon, monospace title (11px), and alias tag `[wh]`.
  - Focused state: Solid accent flood or bold accent border.
* **Lower Sections (`// SUGGESTIONS`, `// APPLICATIONS`, `// GAMES`, `// COMMANDS`):**
  - Rendered as clean, spacious single-row list items.
  - Seamless keyboard traversal from grid tiles into list rows.

### 3.2 Mode 2: LIST
* **Rationale:** Pure linear Nordic matrix for maximum scanning density.
* **Row Anatomy:**
  - `Left`: Sequential ID (`01`), real SVG brand icon (16px), title, speed alias chip.
  - `Right`: Type tag `[APP]` and mechanical enter keycap `[ENTER]`.
* **Selection State:** Solid flood of `var(--sys-accent)` with `#000000` text.

### 3.3 Mode 3: GRID
* **Rationale:** Windows 11 Start Menu tactical tile view.
* **Structure:** 3-column (preview ON) or 4-column (preview OFF) grid of compact industrial tiles with centered brand icons and monospace labels.

### 3.4 Mode 4: CATEGORY
* **Rationale:** Subsystem cluster modules (`[01 // DEV SYSTEMS]`, `[02 // COMMUNICATION]`, etc.) with authentic 2×2 mini brand icon clusters and drill-in navigation.

---

## 4. Floating Action Menu (<kbd>Tab</kbd>)

### Architecture & Positioning
* **Anchor:** Anchored at `bottom-11 right-3` within the HUD window, sitting directly above the footer's `[TAB] ACTIONS` pill.
* **Width:** `256px` (`w-64`).
* **Header:** `// ACTIONS: [ACTIVE_ITEM_TITLE]` with dismiss hint `[ESC]`.
* **Action Items:**
  - `[01] Open Application` `[↵]`
  - `[02] Run Privileged (Admin)` `[↵]`
  - `[03] Reveal in Explorer` `[↵]`
  - `[04] Copy Full Path` `[↵]`
  - `[05] Unpin from Favorites` `[↵]`
* **Keyboard Interaction:**
  - <kbd>↑</kbd> / <kbd>↓</kbd> navigates action items.
  - <kbd>Enter</kbd> executes the selected action.
  - <kbd>Tab</kbd> or <kbd>Esc</kbd> closes the pop-up immediately.
* **Visual Continuity:** Active action item is flooded with `var(--sys-accent)` and bold `#000000` text.

---

## 5. Preview Pane Setting (`ON` / `OFF`)

* **When Preview is ON:** 60/40 split stage. Right pane hosts the Context Telemetry Inspector.
* **When Preview is OFF:** 100% full-width stage for maximum space.
* **Consistency:** In both modes, pressing <kbd>Tab</kbd> triggers the same clean bottom-right action pop-up.

---

## 6. Implementation Guardrails

### MUST DO
- **Maintain 760px Proportional Width:** Do not expand the window back to 1024px desktop widths.
- **Solid Accent Floods:** Selection state in List and Hybrid modes must flood the background with `var(--sys-accent)` and invert text to `#000000`.
- **Authentic Vector SVGs:** Only high-fidelity vector SVG brand geometry.
- **Bottom-Right Action Pop-up:** Always anchor the action menu at the bottom-right corner above the `[TAB] ACTIONS` button.

### STRICTLY FORBIDDEN
- **NO Heavy Multi-Pipe Banners:** Keep the telemetry ribbon single-line and minimal.
- **NO Cluttered Table Headers:** Do not reinstate the `ID TARGET / ALIAS TYPE SOURCE ACTION` column strip.
- **NO Whole-Pane Action Takeovers:** Do not replace the preview pane or slide out full-window bottom drawers when <kbd>Tab</kbd> is pressed.
- **NO Soft Consumer Emojis or 16px Pill Borders:** Maintain the crisp 2px-4px Nordic industrial corners and monospace identity.
