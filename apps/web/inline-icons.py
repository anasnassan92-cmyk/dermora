"""Replace {{icon:name}} placeholders in index.html with inline SVGs from the brand kit.

Run once after editing index.html if you add new {{icon:...}} placeholders:
    python inline-icons.py
Icons live in assets/icons/ (Dermora brand kit, 24px line icons, currentColor).
"""
import re, pathlib

root = pathlib.Path(__file__).parent
html_path = root / "index.html"
html = html_path.read_text(encoding="utf-8")

def load(name: str) -> str:
    svg = (root / "assets" / "icons" / f"{name}.svg").read_text(encoding="utf-8")
    svg = re.sub(r"<title>.*?</title>", "", svg)
    svg = svg.replace("<svg ", '<svg class="icon" aria-hidden="true" focusable="false" ', 1)
    return svg

missing = []
def repl(m):
    name = m.group(1)
    try:
        return load(name)
    except FileNotFoundError:
        missing.append(name)
        return m.group(0)

out = re.sub(r"\{\{icon:([a-z0-9-]+)\}\}", repl, html)
html_path.write_text(out, encoding="utf-8")
print("inlined", out.count('class="icon"'), "icons;", "missing:", missing or "none")
