"""
render_all_pngs.py
Renders all 24 generated SVG files into high-resolution PNGs using Chrome headless.
"""

import os
import subprocess
import glob

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SVG_DIR = r"C:\Users\sujal\Documents\Projects\Runner\assets\branding\svg_suite"

svg_files = glob.glob(os.path.join(SVG_DIR, "*.svg"))

print(f"Found {len(svg_files)} SVGs to render.")

for svg_path in svg_files:
    fname = os.path.basename(svg_path)
    base_name = os.path.splitext(fname)[0]
    png_path = os.path.join(SVG_DIR, f"{base_name}.png")

    is_lockup = "lockup" in base_name
    width = 1024 if is_lockup else 512
    height = 320 if is_lockup else 512

    # Create temporary HTML wrapper for pixel-perfect headless rendering
    html_temp = os.path.join(SVG_DIR, f"temp_{base_name}.html")
    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    html_content = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:{width}px;height:{height}px;overflow:hidden;">
  <div style="width:{width}px;height:{height}px;display:flex;align-items:center;justify-content:center;">
    {svg_content}
  </div>
</body>
</html>"""

    with open(html_temp, "w", encoding="utf-8") as f:
        f.write(html_content)

    file_url = f"file:///{html_temp.replace(os.sep, '/')}"

    cmd = [
        CHROME_PATH,
        "--headless=new",
        f"--window-size={width},{height}",
        "--default-background-color=00000000",
        f"--screenshot={png_path}",
        file_url
    ]

    subprocess.run(cmd, check=True)
    if os.path.exists(html_temp):
        os.remove(html_temp)

print("All PNG renders completed!")
