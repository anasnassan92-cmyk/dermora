"""Build a Hostinger-ready zip of the static site (landing page + presentation + web app).

Steps performed:
  1. cd apps/mobile && npx expo export --platform web --output-dir ../web/app   (unless --no-export)
  2. zip apps/web/** (minus inline-icons.py and .claude) into dist/dermora-web.zip

Upload: Hostinger hPanel -> Files -> File Manager -> public_html -> Upload -> dermora-web.zip -> Extract.
The site then runs at https://<your-domain>/ with the app at https://<your-domain>/app/.
Without a backend the app runs in demo (mock) mode. To connect the real API, set
EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SUPABASE_* in apps/mobile/.env before exporting.
"""
import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "apps/web"
MOBILE = ROOT / "apps/mobile"
DIST = ROOT / "dist"
SKIP = {"inline-icons.py", ".claude"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-export", action="store_true", help="reuse apps/web/app from a previous export")
    args = ap.parse_args()

    if not args.no_export:
        shutil.rmtree(WEB / "app", ignore_errors=True)
        npx = "npx.cmd" if os.name == "nt" else "npx"
        r = subprocess.run([npx, "expo", "export", "--platform", "web", "--output-dir", "../web/app"], cwd=MOBILE)
        if r.returncode != 0:
            sys.exit("expo export failed")

    DIST.mkdir(exist_ok=True)
    out = DIST / "dermora-web.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for path in WEB.rglob("*"):
            rel = path.relative_to(WEB)
            if any(part in SKIP for part in rel.parts) or path.is_dir():
                continue
            z.write(path, str(rel))
    # .htaccess so /app/ deep links fall back to the app's index.html (Apache on Hostinger)
    print(f"wrote {out} ({out.stat().st_size / 1_048_576:.1f} MB)")


if __name__ == "__main__":
    main()
