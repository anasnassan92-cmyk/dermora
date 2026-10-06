"""Orchestrates one AI analysis: gather context → call provider → persist result.

Owner: Youssef. Routes call this; this calls the provider. Nothing else should
talk to the provider directly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache

from fastapi import HTTPException, status

from ..core.config import get_settings
from ..repositories.base import Repos
from ..schemas.ai import SkinGuidance
from .context_builder import build_assessment_context, load_questionnaire, red_flag_hints
from .provider import AIProvider, ImageInput, make_provider


@lru_cache
def get_provider() -> AIProvider:
    return make_provider(get_settings())


def analyze_assessment(repos: Repos, provider: AIProvider, user_id: str, assessment_id: str) -> dict:
    assessment = repos.assessments.get(user_id, assessment_id)
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bedömningen finns inte")
    if assessment["status"] == "draft":
        raise HTTPException(status.HTTP_409_CONFLICT, "Skicka in svaren först (POST /assessments/{id}/submit)")

    profile = repos.profiles.get(user_id)
    questionnaire = load_questionnaire(assessment["questionnaire_version"])
    images = repos.images.list_for_assessment(user_id, assessment_id)

    context = build_assessment_context(profile, questionnaire, assessment["answers"], images)
    hints = red_flag_hints(assessment["answers"])

    image_inputs: list[ImageInput] = []
    for img in images[:3]:  # cap: 3 images per analysis
        try:
            data = repos.storage.get(img["storage_path"])
        except Exception:  # missing blob in dev – skip
            continue
        image_inputs.append(ImageInput(data=data, media_type="image/jpeg"))

    try:
        result = provider.analyze(context, image_inputs, hints)
    except Exception as exc:
        repos.assessments.update(user_id, assessment_id, {"status": "failed"})
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"AI-analysen misslyckades: {exc}")

    stored = repos.ai_results.create(
        user_id,
        {
            "assessment_id": assessment_id,
            "provider": provider.name,
            "model": result.model,
            "result": result.guidance.model_dump(),
            "red_flags": result.guidance.red_flags,
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
        },
    )
    repos.assessments.update(
        user_id,
        assessment_id,
        {"status": "analyzed", "analyzed_at": datetime.now(timezone.utc).isoformat()},
    )
    # Seed the chat with the guidance so the conversation has a starting point
    if not repos.chats.list(user_id, assessment_id):
        repos.chats.add(user_id, assessment_id, "assistant", result.guidance.guidance)
    return stored


def chat_reply(repos: Repos, provider: AIProvider, user_id: str, assessment_id: str, message: str) -> dict:
    latest = repos.ai_results.latest_for_assessment(user_id, assessment_id)
    if not latest:
        raise HTTPException(status.HTTP_409_CONFLICT, "Kör analysen först (POST /ai/analyze)")
    assessment = repos.assessments.get(user_id, assessment_id)
    profile = repos.profiles.get(user_id)
    questionnaire = load_questionnaire(assessment["questionnaire_version"])
    images = repos.images.list_for_assessment(user_id, assessment_id)
    context = build_assessment_context(profile, questionnaire, assessment["answers"], images)

    history = repos.chats.list(user_id, assessment_id)[-20:]  # keep the last 20 turns
    repos.chats.add(user_id, assessment_id, "user", message)
    guidance = SkinGuidance.model_validate(latest["result"])
    try:
        answer = provider.chat(context, guidance, history, message)
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"AI-chatten misslyckades: {exc}")
    return repos.chats.add(user_id, assessment_id, "assistant", answer)
