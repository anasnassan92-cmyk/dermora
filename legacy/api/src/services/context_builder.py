"""Turn profile + questionnaire answers + image checks into the text the AI sees.

Owner: Youssef. Keep this deterministic and readable: when the AI gives a
strange answer, the first thing to check is the context it was given.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_questionnaire(version: str = "1.0.0") -> dict[str, Any]:
    major = version.split(".")[0]
    path = DATA_DIR / f"questionnaire_v{major}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _label(question: dict[str, Any], value: Any) -> str:
    options = {o["value"]: o["label"] for o in question.get("options", [])}
    if isinstance(value, list):
        return ", ".join(options.get(v, str(v)) for v in value) or "–"
    if isinstance(value, bool):
        return "Ja" if value else "Nej"
    return options.get(value, str(value))


def is_visible(question: dict[str, Any], answers: dict[str, Any]) -> bool:
    cond = question.get("show_if")
    if not cond:
        return True
    value = answers.get(cond["question_id"])
    if "equals" in cond and cond["equals"] is not None:
        return value == cond["equals"]
    if cond.get("includes") is not None:
        return isinstance(value, list) and cond["includes"] in value
    if cond.get("gte") is not None:
        return isinstance(value, (int, float)) and value >= cond["gte"]
    return True


def validate_answers(questionnaire: dict[str, Any], answers: dict[str, Any]) -> list[str]:
    """Return a list of Swedish error strings (empty = valid)."""
    errors: list[str] = []
    for q in questionnaire["questions"]:
        if not is_visible(q, answers):
            continue
        val = answers.get(q["id"])
        if val in (None, "", []):
            if q.get("required", True):
                errors.append(f"Frågan '{q['title']}' saknar svar")
            continue
        allowed = {o["value"] for o in q.get("options", [])}
        if q["type"] == "single" and val not in allowed:
            errors.append(f"Ogiltigt svar på '{q['id']}'")
        elif q["type"] == "multi" and (not isinstance(val, list) or any(v not in allowed for v in val)):
            errors.append(f"Ogiltigt svar på '{q['id']}'")
        elif q["type"] == "scale" and not (
            isinstance(val, (int, float)) and q.get("min", 0) <= val <= q.get("max", 10)
        ):
            errors.append(f"Värdet på '{q['id']}' är utanför skalan")
        elif q["type"] == "boolean" and not isinstance(val, bool):
            errors.append(f"'{q['id']}' måste vara ja/nej")
        elif q["type"] == "text" and (not isinstance(val, str) or len(val) > 1000):
            errors.append(f"'{q['id']}' är för långt")
    return errors


def answers_as_text(questionnaire: dict[str, Any], answers: dict[str, Any]) -> str:
    lines = []
    for q in questionnaire["questions"]:
        if not is_visible(q, answers):
            continue
        val = answers.get(q["id"])
        if val in (None, "", []):
            continue
        lines.append(f"- {q['title']} → {_label(q, val)}")
    return "\n".join(lines) or "- (inga svar)"


def build_assessment_context(
    profile: dict[str, Any] | None,
    questionnaire: dict[str, Any],
    answers: dict[str, Any],
    images: list[dict[str, Any]],
) -> str:
    profile = profile or {}
    birth_year = profile.get("birth_year")
    parts = [
        "## Användarprofil",
        f"- Namn: {profile.get('display_name') or 'okänt'}",
        f"- Födelseår: {birth_year or 'okänt'}",
        f"- Angiven hudtyp i profilen: {profile.get('skin_type', 'unknown')}",
        "",
        "## Svar på frågeformuläret",
        answers_as_text(questionnaire, answers),
        "",
        "## Bilder",
    ]
    if not images:
        parts.append("- Inga bilder bifogade. Basera vägledningen på svaren och säg att en bild skulle hjälpa.")
    for i, img in enumerate(images, 1):
        fc = img.get("face_check") or {}
        parts.append(
            f"- Bild {i}: område={img.get('area', 'face')}, ansikte hittat={fc.get('face_found')}, "
            f"skärpa={fc.get('blur_score', '?')}, ljus={fc.get('brightness', '?')}, "
            f"kvalitet ok={fc.get('ok')}"
        )
    return "\n".join(parts)


def red_flag_hints(answers: dict[str, Any]) -> list[str]:
    """Deterministic safety hints computed from answers – passed to the AI and
    also checked in code so that a 'seek care' signal never depends on the model alone."""
    hints = []
    if answers.get("sudden_change") is True:
        hints.append("Användaren rapporterar snabb förändring/svullnad/vätskande sår/feber de senaste två veckorna.")
    if isinstance(answers.get("acne_pain"), (int, float)) and answers["acne_pain"] >= 7:
        hints.append("Användaren rapporterar hög smärta (≥7/10) från djupa knölar.")
    if "cystic" in (answers.get("acne_type") or []) and answers.get("acne_frequency") == "very_often":
        hints.append("Konstanta djupa, cystiska finnar – egenvård räcker ofta inte.")
    return hints
