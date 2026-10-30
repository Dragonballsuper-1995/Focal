"""
build_all_logos.py
Generates pixel-perfect, ultra-high-quality SVGs for:
1. Runner
2. Valence
3. Scout
4. Focal

For each brand, generates:
- Full Lockup (Mark + Wordmark)
- Mark Only
- App Icon Dark
- App Icon Light
- Monochrome Dark
- Monochrome Light
"""

import os

OUTPUT_DIR = r"C:\Users\sujal\Documents\Projects\Runner\assets\branding\svg_suite"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Container template for App Icons (Dark, Light, Mono Dark, Mono Light)
def wrap_app_icon(mark_svg, defs_svg, mode="dark"):
    """
    mode: 'dark' | 'light' | 'mono-dark' | 'mono-light'
    """
    if mode == "dark":
        bg_fill = "#0E1117"
        border_stroke = "#1F2636"
    elif mode == "light":
        bg_fill = "#FFFFFF"
        border_stroke = "#E2E8F0"
    elif mode == "mono-dark":
        bg_fill = "#0E1117"
        border_stroke = "#1F2636"
    elif mode == "mono-light":
        bg_fill = "#FFFFFF"
        border_stroke = "#E2E8F0"
    else:
        bg_fill = "#0E1117"
        border_stroke = "#1F2636"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  {defs_svg}
  <!-- Squircle Base Tile -->
  <rect width="100" height="100" rx="22" fill="{bg_fill}"/>
  <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="21.25" stroke="{border_stroke}" stroke-width="1.5"/>

  <!-- Centered Scaled Logo Mark -->
  <g transform="translate(10, 10) scale(0.8)">
    {mark_svg}
  </g>
</svg>"""

# Full Horizontal Lockup (Mark + Wordmark)
def wrap_lockup(mark_svg, defs_svg, wordmark_text, font_family="Inter, -apple-system, sans-serif"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" fill="none">
  {defs_svg}
  <!-- Mark Container -->
  <g transform="translate(10, 0)">
    {mark_svg}
  </g>
  <!-- Wordmark Text -->
  <text x="125" y="65" font-family="{font_family}" font-size="46" font-weight="700" fill="#FFFFFF" letter-spacing="-0.03em">{wordmark_text}</text>
</svg>"""

# Mark Only
def wrap_mark_only(mark_svg, defs_svg):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  {defs_svg}
  {mark_svg}
</svg>"""

# ==============================================================================
# 1. RUNNER DEFINITIONS
# ==============================================================================
def get_runner_defs(prefix=""):
    return f"""
    <defs>
      <linearGradient id="{prefix}runner-grad" x1="10" y1="11" x2="85" y2="87" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#00F0FF"/>
        <stop offset="35%" stop-color="#0072FF"/>
        <stop offset="70%" stop-color="#6B21A8"/>
        <stop offset="100%" stop-color="#9333EA"/>
      </linearGradient>
    </defs>
    """

def get_runner_mark(fill="url(#runner-grad)"):
    return f"""
    <g id="runner-mark">
      <!-- Top speed bar flowing into upper loop of R -->
      <path d="M 16 23 
               C 12.7 23, 10 20.3, 10 17 
               C 10 13.7, 12.7 11, 16 11 
               L 54 11 
               C 70 11, 82 20.5, 82 35 
               C 82 48.5, 71 57, 56 57 
               L 44 57 
               L 44 45.5 
               L 53 45.5 
               C 62.5 45.5, 68.5 41, 68.5 35 
               C 68.5 28.5, 62.5 23, 53 23 
               Z" fill="{fill}"/>

      <!-- Middle speed streak -->
      <path d="M 28 35 
               C 25.2 35, 23 37.2, 23 40 
               C 23 42.8, 25.2 45, 28 45 
               L 44 45 
               L 44 35 
               Z" fill="{fill}"/>

      <!-- Third lower speed streak -->
      <path d="M 24 58 
               C 21.2 58, 19 60.2, 19 63 
               C 19 65.8, 21.2 68, 24 68 
               L 46 68 
               C 48.8 68, 51 65.8, 51 63 
               C 51 60.2, 48.8 58, 46 58 
               Z" fill="{fill}"/>

      <!-- Standalone trailing speed particle / dot -->
      <circle cx="12" cy="63" r="4" fill="{fill}"/>

      <!-- Dynamic sweeping forward leg of R -->
      <path d="M 43 51 
               C 50 51, 56 55.5, 59 62 
               L 71 80 
               C 74.5 85.5, 79 87, 85 87 
               L 73 87 
               C 67 87, 62 83, 58 76 
               L 48 58 
               Z" fill="{fill}"/>
    </g>
    """

# ==============================================================================
# 2. VALENCE DEFINITIONS
# ==============================================================================
def get_valence_defs(prefix=""):
    return f"""
    <defs>
      <linearGradient id="{prefix}val-grad" x1="12" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#A855F7"/>
        <stop offset="25%" stop-color="#7C3AED"/>
        <stop offset="60%" stop-color="#2563EB"/>
        <stop offset="100%" stop-color="#38BDF8"/>
      </linearGradient>
    </defs>
    """

def get_valence_mark(fill="url(#val-grad)", shadow=True):
    shadow_element = ""
    if shadow:
        shadow_element = """
        <!-- Fold Underside Shadow for 3D depth at top right -->
        <path d="M 75 18 C 78 22, 80 28, 80 34 C 77 31, 74 27, 70 24 Z" fill="#0F172A" opacity="0.6"/>
        """
    return f"""
    <g id="valence-mark">
      <!-- Main Continuous Sweeping Ribbon 'V' -->
      <path d="M 18 20 
               C 12 25, 10 33, 14 40 
               L 36 78 
               C 42 88, 54 88, 60 78 
               L 82 32 
               C 85 25, 83 18, 77 15 
               C 71 12, 65 16, 62 23 
               L 48 57 
               C 46 62, 42 62, 40 57 
               L 26 23 
               C 24 18, 20 18, 18 20 
               Z" fill="{fill}"/>

      {shadow_element}

      <!-- Top-left 3D Fold Highlight -->
      <path d="M 18 20 C 13 25, 12 32, 16 38 C 17 33, 20 28, 25 24 Z" fill="#FFFFFF" opacity="0.35"/>
    </g>
    """

# ==============================================================================
# 3. SCOUT DEFINITIONS
# ==============================================================================
def get_scout_defs(prefix=""):
    return f"""
    <defs>
      <!-- Ring Gradient: Emerald to Cyan -->
      <linearGradient id="{prefix}scout-ring-grad" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#00FFA3"/>
        <stop offset="50%" stop-color="#00D2FF"/>
        <stop offset="100%" stop-color="#0084FF"/>
      </linearGradient>

      <!-- Arrow Light Facet -->
      <linearGradient id="{prefix}scout-arrow-light" x1="30" y1="30" x2="71" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#00F0FF"/>
        <stop offset="100%" stop-color="#00A3FF"/>
      </linearGradient>

      <!-- Arrow Dark Facet -->
      <linearGradient id="{prefix}scout-arrow-dark" x1="44" y1="40" x2="65" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0284C7"/>
        <stop offset="100%" stop-color="#1E3A8A"/>
      </linearGradient>
    </defs>
    """

def get_scout_mark(ring_fill="url(#scout-ring-grad)", arrow_light="url(#scout-arrow-light)", arrow_dark="url(#scout-arrow-dark)"):
    return f"""
    <g id="scout-mark">
      <!-- Outer Reticle Ring with 4 Cardinal Crosshair Gaps -->
      <!-- Quadrant 1: Top-Right (North to East) -->
      <path d="M 54 12 A 38 38 0 0 1 88 46" fill="none" stroke="{ring_fill}" stroke-width="8" stroke-linecap="round"/>
      <!-- Quadrant 2: Bottom-Right (East to South) -->
      <path d="M 88 54 A 38 38 0 0 1 54 88" fill="none" stroke="{ring_fill}" stroke-width="8" stroke-linecap="round"/>
      <!-- Quadrant 3: Bottom-Left (South to West) -->
      <path d="M 46 88 A 38 38 0 0 1 12 54" fill="none" stroke="{ring_fill}" stroke-width="8" stroke-linecap="round"/>
      <!-- Quadrant 4: Top-Left (West to North) -->
      <path d="M 12 46 A 38 38 0 0 1 46 12" fill="none" stroke="{ring_fill}" stroke-width="8" stroke-linecap="round"/>

      <!-- 4 Cardinal Hairline Ticks extending slightly outward -->
      <line x1="50" y1="7" x2="50" y2="12" stroke="{ring_fill}" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="88" x2="50" y2="93" stroke="{ring_fill}" stroke-width="3" stroke-linecap="round"/>
      <line x1="7" y1="50" x2="12" y2="50" stroke="{ring_fill}" stroke-width="3" stroke-linecap="round"/>
      <line x1="88" y1="50" x2="93" y2="50" stroke="{ring_fill}" stroke-width="3" stroke-linecap="round"/>

      <!-- Inner 3D Beveled Compass Needle pointing North-East (~52 deg) -->
      <polygon points="71,29 30,48 44,56" fill="{arrow_light}"/>
      <polygon points="71,29 44,56 52,70" fill="{arrow_dark}"/>
    </g>
    """

# ==============================================================================
# 4. FOCAL DEFINITIONS
# ==============================================================================
def get_focal_defs(prefix=""):
    return f"""
    <defs>
      <linearGradient id="{prefix}focal-grad1" x1="22" y1="26" x2="86" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFA07A"/>
        <stop offset="100%" stop-color="#FB923C"/>
      </linearGradient>

      <linearGradient id="{prefix}focal-grad2" x1="22" y1="54" x2="70" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FB7185"/>
        <stop offset="100%" stop-color="#F43F5E"/>
      </linearGradient>

      <linearGradient id="{prefix}focal-grad3" x1="22" y1="82" x2="42" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#F43F5E"/>
        <stop offset="100%" stop-color="#E11D48"/>
      </linearGradient>
    </defs>
    """

def get_focal_mark(fill1="url(#focal-grad1)", fill2="url(#focal-grad2)", fill3="url(#focal-grad3)"):
    return f"""
    <g id="focal-mark">
      <!-- Top Pill Bar (Long) -->
      <rect x="22" y="16" width="64" height="20" rx="10" fill="{fill1}"/>

      <!-- Middle Pill Bar (Medium) -->
      <rect x="22" y="44" width="48" height="20" rx="10" fill="{fill2}"/>

      <!-- Bottom Standalone Dot / Pill (Base of F) -->
      <circle cx="32" cy="82" r="10" fill="{fill3}"/>
    </g>
    """

# ==============================================================================
# GENERATION ENGINE
# ==============================================================================
brands = [
    {
        "name": "runner",
        "wordmark": "Runner",
        "get_defs": get_runner_defs,
        "get_mark_color": lambda: get_runner_mark("url(#runner-grad)"),
        "get_mark_white": lambda: get_runner_mark("#FFFFFF"),
        "get_mark_dark": lambda: get_runner_mark("#11141B"),
    },
    {
        "name": "valence",
        "wordmark": "Valence",
        "get_defs": get_valence_defs,
        "get_mark_color": lambda: get_valence_mark("url(#val-grad)", shadow=True),
        "get_mark_white": lambda: get_valence_mark("#FFFFFF", shadow=False),
        "get_mark_dark": lambda: get_valence_mark("#11141B", shadow=False),
    },
    {
        "name": "scout",
        "wordmark": "Scout",
        "get_defs": get_scout_defs,
        "get_mark_color": lambda: get_scout_mark("url(#scout-ring-grad)", "url(#scout-arrow-light)", "url(#scout-arrow-dark)"),
        "get_mark_white": lambda: get_scout_mark("#FFFFFF", "#FFFFFF", "#E2E8F0"),
        "get_mark_dark": lambda: get_scout_mark("#11141B", "#11141B", "#2D3748"),
    },
    {
        "name": "focal",
        "wordmark": "Focal",
        "get_defs": get_focal_defs,
        "get_mark_color": lambda: get_focal_mark("url(#focal-grad1)", "url(#focal-grad2)", "url(#focal-grad3)"),
        "get_mark_white": lambda: get_focal_mark("#FFFFFF", "#FFFFFF", "#FFFFFF"),
        "get_mark_dark": lambda: get_focal_mark("#11141B", "#11141B", "#11141B"),
    }
]

created_files = []

for b in brands:
    bname = b["name"]
    wtext = b["wordmark"]
    defs = b["get_defs"]()
    mark_color = b["get_mark_color"]()
    mark_white = b["get_mark_white"]()
    mark_dark = b["get_mark_dark"]()

    # 1. Primary Lockup (Mark + Text)
    f_lockup = os.path.join(OUTPUT_DIR, f"{bname}-lockup.svg")
    with open(f_lockup, "w", encoding="utf-8") as f:
        f.write(wrap_lockup(mark_color, defs, wtext))
    created_files.append(f_lockup)

    # 2. Mark Only
    f_mark = os.path.join(OUTPUT_DIR, f"{bname}-mark.svg")
    with open(f_mark, "w", encoding="utf-8") as f:
        f.write(wrap_mark_only(mark_color, defs))
    created_files.append(f_mark)

    # 3. App Icon Dark
    f_dark = os.path.join(OUTPUT_DIR, f"{bname}-icon-dark.svg")
    with open(f_dark, "w", encoding="utf-8") as f:
        f.write(wrap_app_icon(mark_color, defs, mode="dark"))
    created_files.append(f_dark)

    # 4. App Icon Light
    f_light = os.path.join(OUTPUT_DIR, f"{bname}-icon-light.svg")
    with open(f_light, "w", encoding="utf-8") as f:
        f.write(wrap_app_icon(mark_color, defs, mode="light"))
    created_files.append(f_light)

    # 5. Monochrome Dark
    f_mono_dark = os.path.join(OUTPUT_DIR, f"{bname}-mono-dark.svg")
    with open(f_mono_dark, "w", encoding="utf-8") as f:
        f.write(wrap_app_icon(mark_white, "", mode="mono-dark"))
    created_files.append(f_mono_dark)

    # 6. Monochrome Light
    f_mono_light = os.path.join(OUTPUT_DIR, f"{bname}-mono-light.svg")
    with open(f_mono_light, "w", encoding="utf-8") as f:
        f.write(wrap_app_icon(mark_dark, "", mode="mono-light"))
    created_files.append(f_mono_light)

print(f"Generated {len(created_files)} SVG files across all 4 brands.")
