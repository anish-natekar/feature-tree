#!/usr/bin/env python3
"""Build the GitHub Pages site into ./site: docs/USAGE.md as index.html, plus the viewer."""
import pathlib, shutil, sys
import markdown

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "site"
shutil.rmtree(out, ignore_errors=True)
out.mkdir()

body = markdown.markdown(
    (root / "docs" / "USAGE.md").read_text(),
    extensions=["fenced_code", "tables", "toc"],
)
page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Feature Tree</title>
<style>
:root {{ color-scheme: light dark; }}
body {{ max-width: 52rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; font: 16px/1.6 system-ui, sans-serif; }}
pre {{ overflow-x: auto; padding: .75rem 1rem; background: color-mix(in srgb, currentColor 8%, transparent); border-radius: 6px; }}
code {{ font-family: ui-monospace, monospace; font-size: .92em; }}
table {{ border-collapse: collapse; display: block; overflow-x: auto; }}
th, td {{ border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: .35rem .6rem; text-align: left; }}
nav {{ margin-bottom: 1.5rem; }}
</style></head><body>
<nav><a href="viewer.html">Live demo viewer (this project's own plan)</a> ·
<a href="https://github.com/anish-natekar/feature-tree">GitHub</a></nav>
{body}
</body></html>"""
(out / "index.html").write_text(page)

viewer = root / "features" / "viewer.html"
if not viewer.exists():
    sys.exit("features/viewer.html missing; run `ft view` first")
shutil.copy(viewer, out / "viewer.html")
(out / ".nojekyll").write_text("")
print("built", out)
