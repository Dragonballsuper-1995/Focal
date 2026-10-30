"""
update_icons.py
Resizes assets/branding/svg_suite/focal-icon-dark.png to all Tauri packaging icon dimensions
and generates a multi-resolution Windows icon.ico file.
"""

import os
from PIL import Image

SOURCE_PNG = r"C:\Users\sujal\Documents\Projects\Runner\assets\branding\svg_suite\focal-icon-dark.png"
ICONS_DIR = r"C:\Users\sujal\Documents\Projects\Runner\src-tauri\icons"

src_img = Image.open(SOURCE_PNG).convert("RGBA")

# 1. Main Windows / Desktop icons
sizes_map = {
    "icon.png": (512, 512),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "64x64.png": (64, 64),
    "32x32.png": (32, 32),
    "Square30x30Logo.png": (30, 30),
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square89x89Logo.png": (89, 89),
    "Square107x107Logo.png": (107, 107),
    "Square142x142Logo.png": (142, 142),
    "Square150x150Logo.png": (150, 150),
    "Square284x284Logo.png": (284, 284),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
}

for filename, (w, h) in sizes_map.items():
    dest_path = os.path.join(ICONS_DIR, filename)
    resized = src_img.resize((w, h), Image.Resampling.LANCZOS)
    resized.save(dest_path, "PNG")
    print(f"Generated {filename} ({w}x{h})")

# 2. Multi-layer Windows icon.ico
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_path = os.path.join(ICONS_DIR, "icon.ico")
src_img.save(ico_path, format="ICO", sizes=ico_sizes)
print("Generated multi-resolution icon.ico")

# 3. Android mipmaps
android_dir = os.path.join(ICONS_DIR, "android")
if os.path.exists(android_dir):
    android_sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }
    for folder, (w, h) in android_sizes.items():
        folder_path = os.path.join(android_dir, folder)
        if os.path.exists(folder_path):
            resized = src_img.resize((w, h), Image.Resampling.LANCZOS)
            for target_name in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
                dest = os.path.join(folder_path, target_name)
                resized.save(dest, "PNG")
            print(f"Updated Android {folder}")

# 4. iOS icons
ios_dir = os.path.join(ICONS_DIR, "ios")
if os.path.exists(ios_dir):
    for f in os.listdir(ios_dir):
        if f.endswith(".png"):
            full_path = os.path.join(ios_dir, f)
            try:
                with Image.open(full_path) as existing:
                    w, h = existing.size
                resized = src_img.resize((w, h), Image.Resampling.LANCZOS)
                resized.save(full_path, "PNG")
            except Exception as e:
                pass
    print("Updated iOS icon assets")

print("All icons successfully updated to FOCAL brand!")
