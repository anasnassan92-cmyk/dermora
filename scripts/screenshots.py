"""Capture the 15 design screens from the running Expo web build with headless Edge/Chrome.

Prerequisites:  cd apps/mobile && npx expo start --web --port 8081   (mock mode, no .env)
Usage:          python scripts/screenshots.py [--base http://localhost:8081] [--out apps/web/assets/screens]

Each screen is opened as ?preview=<Screen> (see apps/mobile/src/dev/PreviewApp.tsx), rendered at
390x844 (iPhone 14/15 size) with 2x device scale and saved as PNG. The landing page's "Appen" section
reads these files.
"""
import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

SCREENS = [
    ("01-valkomst", "Welcome", "Välkomstskärm"),
    ("02-skapa-konto", "Register", "Skapa konto"),
    ("03-verifiera", "VerifyEmail", "Verifiera e-post"),
    ("04-grundprofil", "ProfileSetup", "Grundprofil"),
    ("05-intro", "AssessmentIntro", "Frågeformulär – introduktion"),
    ("06-hudtyp", "Assessment&q=0", "Hudtyp"),
    ("07-hudproblem", "Assessment&q=1", "Hudproblem"),
    ("08-foljdfragor", "Assessment&q=2", "Villkorliga frågor"),
    ("09-bilder", "ImageUpload", "Bilduppladdning"),
    ("10-granska-bilder", "ImageReview", "Granska bilder"),
    ("11-analys", "Analyzing", "AI-analys"),
    ("12-chat", "AIChat", "AI-vägledning (chat)"),
    ("13-plan", "TreatmentPlan", "AI-föreslagen plan"),
    ("14-bekrafta", "ConfirmPlan", "Bekräfta plan"),
    ("15-sparad", "PlanSaved", "Plan sparad"),
    ("16-hem", "Tabs&tab=Home", "Hem"),
    ("17-skanna", "Tabs&tab=Scan", "Skanna"),
]

CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
]


def find_browser() -> str:
    for c in CANDIDATES:
        if os.path.isfile(c) or shutil.which(c):
            return c
    sys.exit("No Chrome/Edge found – install one or set --browser")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8081")
    ap.add_argument("--out", default="apps/web/assets/screens")
    ap.add_argument("--browser", default=None)
    ap.add_argument("--only", default=None, help="comma-separated file prefixes, e.g. 01,12")
    args = ap.parse_args()

    browser = args.browser or find_browser()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    profile = Path(os.environ.get("TEMP", "/tmp")) / "dermora-shots-profile"

    for fname, screen, title in SCREENS:
        if args.only and not any(fname.startswith(p) for p in args.only.split(",")):
            continue
        url = f"{args.base}/?preview={screen}"
        target = out / f"{fname}.png"
        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=2",
            "--window-size=390,844",
            f"--user-data-dir={profile}",
            "--virtual-time-budget=20000",
            f"--screenshot={target}",
            url,
        ]
        t = time.time()
        r = subprocess.run(cmd, check=False, capture_output=True, timeout=120, text=True, errors="replace")
        ok = target.exists() and target.stat().st_size > 10_000
        print(f"{'ok ' if ok else 'FAIL'} {fname:<20} {title:<32} {time.time() - t:4.1f}s")
        if not ok:
            print("   ", (r.stderr or "").strip().splitlines()[-1:] )

    # manifest for the landing page
    (out / "manifest.json").write_text(
        "[\n" + ",\n".join(f'  {{"file": "{f}.png", "title": "{t}"}}' for f, _, t in SCREENS) + "\n]\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
