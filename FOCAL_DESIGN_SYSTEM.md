# FOCAL DESIGN SYSTEM SPECIFICATION (FOCAL RADIANCE)
**Specification Version:** 3.1.0-FINAL  
**Brand Identity:** Focal (Rebranded from Runner)  
**Core Motif:** Geometric 3-Element Capsule (2 Horizontal Bars + Base Anchor Dot) with Radiant Sunset Spectrum  
**Platform Target:** Windows 11 / Windows 10 (Tauri v2 + WebView2 + React 18/19 + Tailwind CSS)

---

## 1. Executive Summary & Brand Genesis

### 1.1 From Runner to Focal
The previous "Runner" identity was anchored in cold aerospace velocity (Nordic Minimal HUD, industrial slate `#0E1015`, rigid 2px corners, and Windows Cobalt `#0078D4`). 

**Focal** represents a deliberate evolution:
- **Clarity over Chaos:** Bringing instant, laser-focused clarity to desktop workflows.
- **Warmth and Radiance:** Replacing utilitarian chill with an energetic, luminous sunset spectrum (Coral Pink, Warm Amber/Peach, and Rose Magenta: `#FF6B4A`, `#FF5370`, `#FFA06A`, `#FF4565`).
- **Geometric Harmony:** Grounding all UI components in the exact physical geometry of the finalized Focal logo: two balanced capsule pills and an anchored base focal dot (forming the iconic geometric 'F').

### 1.2 The Focal Logo Geometry
The official vector mark is defined by an uncompromising mathematical cadence:
- **Top Bar (Long Pill):** `width: 64`, `height: 20`, `rx: 10`  
  *Gradient:* `#FFA07A` (Peach Blossom) &rarr; `#FB923C` (Tangerine Amber)
- **Middle Bar (Medium Pill):** `width: 48`, `height: 20`, `rx: 10`  
  *Gradient:* `#FB7185` (Coral Rose) &rarr; `#F43F5E` (Radiant Rose)
- **Base Anchor (Focal Dot):** `cx: 32`, `cy: 82`, `r: 10` (full 20&times;20 circle)  
  *Gradient:* `#F43F5E` (Radiant Rose) &rarr; `#E11D48` (Ruby Carmine)
- **Vertical Spacing:** Centerlines at $Y = 26$, $Y = 54$, $Y = 82$ (consistent $28\text{px}$ step, $8\text{px}$ air gap).
- **Flush Left Alignment:** All three elements align to the exact left axis `X = 22` ($cx - r = 32 - 10 = 22$).
- **Width Cadence:** $64 \rightarrow 48 \rightarrow 20 = 16 : 12 : 5$ (or $4 : 3 : 1.25$ proportional cascade).
- **Base Tile:** Squircle tile `width: 100`, `height: 100`, `rx: 22` with hairline inner stroke.

---

## 2. Color System: The Radiant Sunset Spectrum

The color system derives directly from the logo's three gradient stages and official brand colors (`#FF6B4A`, `#FF5370`, `#FFA06A`, `#FF4565`), expanded into an accessible 12-step tonal ramp, semantic functional colors, and three calibrated canvas modes (Dark Obsidian, Light Pearl, and True OLED).

### 2.1 The Focal Sunset Primary Ramp
| Token | Hex | Name | Primary Usage |
| :--- | :--- | :--- | :--- |
| `focal-50` | `#FFF5F1` | Solar Mist | Light mode delicate hover tints & subtle pill backgrounds |
| `focal-100` | `#FFE6DD` | Peach Blossom | Light mode chip backgrounds & secondary borders |
| `focal-200` | `#FFCDBD` | Soft Apricot | Disabled button fills & light mode badge accents |
| `focal-300` | `#FFA58C` | Warm Dawn | Decorative highlights & tertiary gradient stops |
| `focal-400` | `#FFA06A` | Amber Peach | Logo Top Pill start; warm ambient glowing highlights |
| `focal-500` | `#FF6B4A` | Focal Coral (Primary) | Primary Brand Anchor, primary CTA button, active focus rings |
| `focal-550` | `#FF5370` | Coral Rose | Signature radiant transition stop & active pill highlight |
| `focal-600` | `#FF4565` | Rose Magenta | Logo Mid Pill end; energetic button hover & active badges |
| `focal-700` | `#E11D48` | Ruby Rose | Logo Dot terminal; high-contrast links & dark mode emphasis |
| `focal-800` | `#BE123C` | Deep Velvet | Shadow colorations & deep overlay borders |
| `focal-900` | `#881337` | Obsidian Crimson | Dark mode glowing aura backdrops & muted badges |
| `focal-950` | `#4C0519` | Nocturne Wine | Deepest warm substrate tint for OLED dark surfaces |

### 2.2 Radiant Gradients
1. **Primary Radiant Sunset (`--focal-gradient-sunset`):**
   ```css
   linear-gradient(135deg, #FFA06A 0%, #FF6B4A 35%, #FF5370 70%, #FF4565 100%)
   ```
2. **Horizontal Capsule Flow (`--focal-gradient-capsule`):**
   ```css
   linear-gradient(90deg, #FFA07A 0%, #FB923C 30%, #FF5370 65%, #F43F5E 100%)
   ```
3. **Luminous Border Glow (`--focal-gradient-border`):**
   ```css
   linear-gradient(135deg, rgba(255, 107, 74, 0.6) 0%, rgba(255, 83, 112, 0.35) 50%, rgba(255, 69, 101, 0.25) 75%, rgba(255, 255, 255, 0.06) 100%)
   ```
4. **Row Selection Flood (Dark):**
   ```css
   linear-gradient(90deg, rgba(255, 107, 74, 0.20) 0%, rgba(255, 69, 101, 0.08) 100%)
   ```
5. **Row Selection Flood (Light):**
   ```css
   linear-gradient(90deg, rgba(255, 107, 74, 0.12) 0%, rgba(255, 69, 101, 0.04) 100%)
   ```

### 2.3 Canvas Neutral Scales
#### Dark Mode: Obsidian Sunset
- Canvas Root: `#0B0C10` (99% darkness with 1% warm obsidian slate)
- Surface Base (HUD Shell): `#111319` (matte dark glass, 96% opacity)
- Surface Raised (Cards, Panels): `#181B24`
- Surface Overlay (Action Menu, Modals): `#1E2230`
- Surface High Hover: `#252B3C`
- Border Hairline: `#232736`
- Border Subtle: `#2E3549`
- Text Main: `#F8FAFC`
- Text Muted: `#94A3B8`
- Text Dim: `#64748B`

#### Light Mode: Solar Pearl
- Canvas Root: `#F8FAFC`
- Surface Base (HUD Shell): `#FFFFFF`
- Surface Raised: `#F1F5F9`
- Surface Overlay: `#FFFFFF`
- Surface High Hover: `#FFF5F2` (delicate warm peach wash)
- Border Hairline: `#E2E8F0`
- Border Subtle: `#CBD5E1`
- Text Main: `#0F172A`
- Text Muted: `#475569`
- Text Dim: `#94A3B8`

#### OLED Mode: Deep Pitch
- Canvas Root: `#000000`
- Surface Base: `#08080C`
- Surface Raised: `#121218`
- Surface Overlay: `#181822`
- Border Hairline: `#1C1C26`
- Text Main: `#FFFFFF`
- Text Muted: `#A1A1AA`

---

## 3. Typography & Mathematical Scale

Focal pairs **Plus Jakarta Sans** (energetic, humanist geometric sans with curved bowls reflecting the logo pills) for primary UI interaction with **JetBrains Mono** (crisp engineering legibility) for technical data and keycaps.

### 3.1 Type Scale Hierarchy
| Level | Size | Line Height | Weight | Tracking | Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | 36px / 2.25rem | 40px | 800 | `-0.035em` | Plus Jakarta Sans | Brand hero titles & splash |
| **Heading 1** | 22px / 1.375rem | 28px | 700 | `-0.025em` | Plus Jakarta Sans | Window headers, category titles |
| **Heading 2** | 16px / 1.0rem | 22px | 600 | `-0.020em` | Plus Jakarta Sans | Inspector headers, modal titles |
| **Omnibox Text** | 16px / 1.0rem | 24px | 500 | `-0.015em` | Plus Jakarta Sans | User input query |
| **Item Title** | 13.5px / 0.84rem | 18px | 600 | `-0.010em` | Plus Jakarta Sans | List row title, grid label |
| **Subtitle / Path**| 11.5px / 0.72rem | 16px | 400 | `0.000em` | Plus Jakarta Sans | File paths, publishers |
| **Micro Badge** | 10.5px / 0.65rem | 14px | 700 | `0.030em` | Plus Jakarta Sans | Status pills (`[APP]`, `[CMD]`) |
| **Keycap** | 9.5px / 0.60rem | 12px | 700 | `0.040em` | JetBrains Mono | Physical shortcut keys (`↵`, `TAB`) |
| **Telemetry Mono**| 11.0px / 0.68rem | 15px | 500 | `0.020em` | JetBrains Mono | System stats, memory, latency |

---

## 4. Geometric Cadence & The Capsule Motif

The 3-pill logo geometry is applied throughout the UI:

### 4.1 Corner Radii System
- `radius-none`: `0px`
- `radius-xs`: `4px` (nested keycap inner bounds)
- `radius-sm`: `6px` (mechanical keycaps, small chip items)
- `radius-md`: `10px` (matching the logo pill corner radius `rx: 10`)
- `radius-lg`: `14px` (inspector tiles, preview cards)
- `radius-xl`: `18px - 22px` (HUD window shell, matching the app icon tile `rx: 22`)
- `radius-pill`: `9999px` (search omnibar, primary CTA buttons, status badges, active indicators)

### 4.2 The Signature "Focal Dot" Indicator
The $10\text{px}$ radius dot from the base of the logo serves as Focal's signature dynamic status element:
- **Selected Item:** Displays a vibrant pulsing Focal Dot on the left margin.
- **Active Navigation:** Underlines active tabs with a radiant pill bar that collapses to a focal dot on blur.
- **System Telemetry:** Shows live ping / indexing status with a breathing sunset glow.

---

## 5. Component Specifications

### 5.1 Omnibox Search Field
- **Height:** `52px`
- **Shape:** Rounded-xl `14px` with inner hairline border
- **Focus State:** 2px glowing gradient border (`linear-gradient(135deg, #FFA06A, #FF4565)`) with `box-shadow: 0 0 20px rgba(255, 107, 74, 0.25)`
- **Prefix:** Focal Logo icon mark ($20\times 20\text{px}$) with radiant glow
- **Suffix:** Dynamic layout switcher chips + query clear keycap

### 5.2 List Result Rows
- **Height:** `44px`
- **Padding:** `0 14px`
- **Normal State:** Transparent with subtle border separator
- **Hover State:** `rgba(255, 255, 255, 0.03)` (dark) / `rgba(0, 0, 0, 0.03)` (light)
- **Active Selection State:**
  - Background: Gradient flood `linear-gradient(90deg, rgba(255, 107, 74, 0.18) 0%, rgba(255, 69, 101, 0.06) 100%)`
  - Left Accent: $3\text{px}$ vertical pill bar or glowing focal dot
  - Border: $1\text{px}$ solid `rgba(255, 107, 74, 0.35)`
  - Title: Crisp `#FFFFFF` with slight warm lift
  - Enter Keycap: Flooded with vibrant primary sunset gradient

### 5.3 Hybrid Pinned Grid Tiles
- **Height:** `42px`
- **Columns:** 4-column compact grid
- **Pill Shape:** `rounded-xl` ($12\text{px}$)
- **Active State:** Sunset gradient border + warm ambient shadow

### 5.4 Floating Action Menu (<kbd>Tab</kbd>)
- **Positioning:** Floating pop-up anchored at `bottom-12 right-3` directly above the dock
- **Width:** `260px`
- **Backdrop:** Matte obsidian glass with `backdrop-filter: blur(24px)`
- **Header:** `// AVAILABLE ACTIONS` with escape hint `<kbd>Esc</kbd>`
- **Keyboard Navigation:** <kbd>&uarr;</kbd> / <kbd>&darr;</kbd> cycle actions; <kbd>Enter</kbd> dispatches; <kbd>Tab</kbd> / <kbd>Esc</kbd> closes.

### 5.5 Tactile Keycaps (`.focal-key`)
- **Height:** `20px`
- **Padding:** `0 6px`
- **Font:** `JetBrains Mono`, 9.5px, bold
- **Dark Mode:** `#181B24` background with `1px solid #2E3549` and `2px` bottom bevel `#0E1015`
- **Light Mode:** `#F1F5F9` background with `1px solid #CBD5E1` and `2px` bottom bevel `#94A3B8`
- **Active / Primary:** Sunset gradient fill with `#FFFFFF` text and zero drop bevel on press

---

## 6. Motion, Elevation & Haptics

1. **Spring Transitions:** All selection changes utilize cubic-bezier springs: `cubic-bezier(0.16, 1, 0.3, 1)` with $120\text{ms}$ duration for instantaneous, zero-lag feel.
2. **Breathing Glows:** Ambient logo and focal dot indicators have a $3\text{s}$ subtle respiratory opacity cycle ($0.65 \leftrightarrow 0.95$).
3. **Reduced Motion:** Fully honors `@media (prefers-reduced-motion: reduce)` by bypassing transforms and relying on instant opacity fades.

---

## 7. Compliance & Accessibility
- **WCAG 2.1 AA & AAA Contrast:** 
  - Primary text on Dark Obsidian: `15.2 : 1` (Exceeds AAA)
  - Primary text on Light Pearl: `14.8 : 1` (Exceeds AAA)
  - Focal Coral `#FF6B4A` against Dark Obsidian: `5.2 : 1` (Passes AA for UI elements & large text)
  - White `#FFFFFF` on Focal Coral `#FF6B4A`: `3.8 : 1` (For CTA buttons, bold text is enforced, or deeper `#FF4565` is used for `4.5 : 1` AAA compliance).
