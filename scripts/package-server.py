"""Build the Hostinger "Node.js Web App" ZIP: server + landing page + web app, one folder.

  apps/web (landing, presentation, assets)  ─┐
  apps/mobile → expo export (API at /api)   ─┼─► dermora-deploy/public/
  apps/server (src, package.json, lockfile) ─┴─► dermora-deploy/

Usage:  apps/api/.venv/Scripts/python scripts/package-server.py [--no-export]
Output: dist/dermora-deploy.zip

Rules from earlier Hostinger deploys (see the hostinger-nodejs-deploy notes):
  * real ZIP, forward-slash names, everything inside ONE folder: dermora-deploy/
    (that folder becomes the Web App's locked "Root directory" on the first upload)
  * never ship .env, node_modules, databases or uploads – durable data lives in $HOME/dermora-data
  * the archive is read back and verified before it is handed over
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERVER = ROOT / "apps/server"
WEB = ROOT / "apps/web"
MOBILE = ROOT / "apps/mobile"
DIST = ROOT / "dist"
FOLDER = "dermora-deploy"

SERVER_FILES = ["package.json", "package-lock.json", "tsconfig.json", ".env.example"]
SKIP_NAMES = {"node_modules", ".data", "dist", ".env", ".claude", "inline-icons.py"}


def export_web_app() -> None:
    env = dict(os.environ, EXPO_PUBLIC_API_URL="/api", EXPO_BASE_URL="/app", MSYS_NO_PATHCONV="1")
    shutil.rmtree(WEB / "app", ignore_errors=True)
    npx = "npx.cmd" if os.name == "nt" else "npx"
    r = subprocess.run([npx, "expo", "export", "--platform", "web", "--output-dir", "../web/app", "--clear"], cwd=MOBILE, env=env)
    if r.returncode != 0:
        sys.exit("expo export failed")
    import re

    html = (WEB / "app/index.html").read_text(encoding="utf-8")
    src = re.search(r'src="/app/(_expo/static/js/web/index-[a-f0-9]+\.js)"', html)
    bundle = (WEB / "app" / src.group(1)).read_text(encoding="utf-8", errors="ignore") if src else ""
    if '"/api"' not in bundle:
        sys.exit("web app was not built with EXPO_PUBLIC_API_URL=/api")


def copy_tree(src: Path, dst: Path) -> None:
    for path in src.rglob("*"):
        rel = path.relative_to(src)
        if any(part in SKIP_NAMES for part in rel.parts) or path.suffix in {".db", ".log"}:
            continue
        target = dst / rel
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-export", action="store_true", help="reuse apps/web/app")
    args = ap.parse_args()
    if not args.no_export:
        export_web_app()

    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp) / FOLDER
        stage.mkdir()
        for name in SERVER_FILES:
            shutil.copy2(SERVER / name, stage / name)
        copy_tree(SERVER / "src", stage / "src")
        copy_tree(WEB, stage / "public")

        DIST.mkdir(exist_ok=True)
        out = DIST / f"{FOLDER}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    z.write(path, f"{FOLDER}/{path.relative_to(stage).as_posix()}")

    # read back and verify
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
    problems = []
    for required in ["package.json", "package-lock.json", "tsconfig.json", "src/index.ts", "public/index.html", "public/app/index.html", "src/data/questionnaire_v1.json"]:
        if f"{FOLDER}/{required}" not in names:
            problems.append(f"missing {required}")
    if any("\\" in n for n in names):
        problems.append("backslash in entry name")
    if any(not n.startswith(f"{FOLDER}/") for n in names):
        problems.append("entry outside the wrapper folder")
    if any(n.endswith((".env", ".db")) or "/node_modules/" in n for n in names):
        problems.append("secret, database or node_modules included")
    if problems:
        sys.exit("PACKAGE INVALID: " + "; ".join(problems))
    print(f"Created {out} ({out.stat().st_size / 1_048_576:.1f} MB, {len(names)} files)")
    print(f"Verified: real ZIP, forward slashes, everything under {FOLDER}/, no secrets.")


if __name__ == "__main__":
    main()
