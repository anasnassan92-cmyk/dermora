"""AI providers.

`MockProvider`      – deterministic answers, no network. Used in dev/tests and
                      by teammates who are not working on the AI feature.
`GeminiProvider`    – Google Gemini (team default, free tier). JSON output is
                      constrained with response_schema=SkinGuidance.
`AnthropicProvider` – Claude with vision + structured outputs. Kept as an
                      alternative; switch with AI_PROVIDER=anthropic.
All providers return a validated SkinGuidance, so the rest of the system never
sees malformed JSON.

Owner: Youssef.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Protocol

from ..core.config import Settings
from ..schemas.ai import SkinGuidance
from .prompts import CHAT_SYSTEM_PROMPT, GUIDANCE_SYSTEM_PROMPT


@dataclass
class ImageInput:
    data: bytes
    media_type: str  # image/jpeg | image/png | image/webp


@dataclass
class AIResult:
    guidance: SkinGuidance
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


class AIProvider(Protocol):
    name: str

    def analyze(self, context: str, images: list[ImageInput], red_flag_hints: list[str]) -> AIResult: ...
    def chat(self, context: str, guidance: SkinGuidance, history: list[dict], user_message: str) -> str: ...


# ----------------------------------------------------------------------------
# Mock
# ----------------------------------------------------------------------------
class MockProvider:
    name = "mock"

    def analyze(self, context, images, red_flag_hints):
        seek_care = bool(red_flag_hints)
        guidance = SkinGuidance(
            skin_type_estimate="combination",
            primary_concern="Mild till måttlig akne i T-zonen",
            observations=[
                {"area": "forehead", "finding": "Några små finnar och pormaskar", "severity": "mild", "confidence": "medium"},
                {"area": "chin", "finding": "Enstaka röda, ömma finnar", "severity": "mild", "confidence": "medium"},
                {"area": "left_cheek", "finding": "Lugn hud, lätt torrhet", "severity": "none", "confidence": "high"},
            ],
            overall_severity="mild",
            image_quality_note=None if images else "Ingen bild bifogad – bedömningen bygger bara på dina svar.",
            guidance=(
                "Dina svar och bilder tyder på blandhud med mild akne, främst i panna och haka. "
                "Det viktigaste nu är en enkel, konsekvent rutin: mild rengöring, en aktiv ingrediens "
                "som salicylsyra på kvällen och solskydd varje morgon. Undvik att lägga till många "
                "nya produkter samtidigt – ge rutinen 4–6 veckor innan du bedömer effekten. "
                "Detta är vägledning, inte en medicinsk diagnos."
            ),
            plan={
                "title": "Lugn start för blandhud med mild akne",
                "summary": "En enkel rutin i tre steg morgon och kväll, med salicylsyra varannan kväll. Uppföljning med ny bild om två veckor.",
                "morning": [
                    {"step": "Rengöring", "product_type": "Mild, parfymfri rengöring", "active_ingredient": None, "frequency": "Varje morgon", "why": "Tar bort talg utan att torka ut."},
                    {"step": "Fukt", "product_type": "Lätt, oljefri fuktkräm", "active_ingredient": "Niacinamid", "frequency": "Varje morgon", "why": "Stärker hudbarriären och lugnar rodnad."},
                    {"step": "Solskydd", "product_type": "SPF 30+ för ansiktet", "active_ingredient": None, "frequency": "Varje morgon", "why": "Förebygger mörka fläckar efter finnar."},
                ],
                "evening": [
                    {"step": "Rengöring", "product_type": "Samma milda rengöring", "active_ingredient": None, "frequency": "Varje kväll", "why": "Tar bort dagens smuts och solskydd."},
                    {"step": "Behandling", "product_type": "Exfolierande serum eller toner", "active_ingredient": "Salicylsyra 2 %", "frequency": "Varannan kväll", "why": "Rensar porer och minskar nya finnar."},
                    {"step": "Fukt", "product_type": "Lätt fuktkräm", "active_ingredient": None, "frequency": "Varje kväll", "why": "Motverkar torrhet från syran."},
                ],
                "weekly": [],
                "goals": ["Minska utbrott", "Balansera talgproduktion", "Stärka hudbarriären", "Jämnare hudstruktur"],
                "key_ingredients": [
                    "Salicylsyra 2 % – rensar porer och förebygger nya finnar",
                    "Niacinamid – lugnar rodnad och balanserar talg",
                    "Ceramider – stärker hudbarriären",
                    "SPF 30+ – förebygger mörka fläckar efter finnar",
                ],
                "tips": [
                    "Byt örngott varje vecka",
                    "Rör inte ansiktet under dagen",
                    "Rengör mobilskärmen regelbundet",
                    "Prioritera sömn – stress och sömnbrist förvärrar ofta akne",
                ],
                "avoid": ["Skrubbar med korn", "Att klämma finnar", "Att prova flera nya aktiva produkter samtidigt"],
                "expectations": "Lite torrhet första veckan är normalt. Färre nya finnar brukar synas efter 4–6 veckor.",
                "follow_up_days": 14,
            },
            red_flags=[
                "Du har angett snabb förändring, svullnad eller feber – kontakta vården." if seek_care else ""
            ] if seek_care else [],
            seek_care=seek_care,
            disclaimer="Dermora ger vägledning, inte medicinsk diagnos. Kontakta vården vid oro.",
        )
        return AIResult(guidance=guidance, model="mock-v1")

    def chat(self, context, guidance, history, user_message):
        msg = user_message.lower()
        if "varför" in msg or "why" in msg:
            return (
                "Salicylsyra föreslås eftersom den löser upp talg i porerna och passar blandhud med "
                "finnar i T-zonen. Börja varannan kväll så att huden hinner vänja sig. "
                "Detta är vägledning, inte diagnos."
            )
        if "läkare" in msg or "vård" in msg:
            return (
                "Kontakta vården om du får djupa, smärtsamma knölar, snabb försämring, feber eller om "
                "rutinen inte hjälpt efter 8–12 veckor. Dermora ersätter inte en läkare."
            )
        return (
            "Bra fråga! Utifrån din plan är det viktigaste att vara konsekvent i 4–6 veckor och att "
            "använda solskydd varje morgon. Vill du att jag förklarar något steg närmare?"
        )


# ----------------------------------------------------------------------------
# Anthropic (Claude)
# ----------------------------------------------------------------------------
class AnthropicProvider:
    name = "anthropic"

    def __init__(self, settings: Settings):
        import anthropic  # lazy import: not needed when AI_PROVIDER=mock

        self._anthropic = anthropic
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)
        self.model = settings.ai_model
        self.effort = settings.ai_effort

    def _image_blocks(self, images: list[ImageInput]) -> list[dict]:
        return [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img.media_type,
                    "data": base64.standard_b64encode(img.data).decode("ascii"),
                },
            }
            for img in images
        ]

    def analyze(self, context, images, red_flag_hints):
        hints = "\n".join(f"- {h}" for h in red_flag_hints) or "- inga"
        user_text = (
            f"{context}\n\n## Regelbaserade varningssignaler (måste vägas in)\n{hints}\n\n"
            "Analysera bilderna och svaren. Svara enligt schemat, på svenska."
        )
        # Server-side refusal fallback ("default" form) is a beta: sent via extra headers/body
        # so it works together with the typed `parse()` helper.
        response = self.client.messages.parse(
            model=self.model,
            max_tokens=16000,
            system=[{"type": "text", "text": GUIDANCE_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            output_config={"effort": self.effort},
            messages=[{"role": "user", "content": [*self._image_blocks(images), {"type": "text", "text": user_text}]}],
            output_format=SkinGuidance,
            extra_headers={"anthropic-beta": "server-side-fallback-2026-07-01"},
            extra_body={"fallbacks": "default"},
        )
        if response.stop_reason == "refusal":
            raise RuntimeError("AI-tjänsten avböjde att analysera den här förfrågan.")
        guidance: SkinGuidance = response.parsed_output
        # Belt and braces: rule-based red flags always win.
        if red_flag_hints and not guidance.seek_care:
            guidance.seek_care = True
            guidance.red_flags = list(dict.fromkeys([*guidance.red_flags, *red_flag_hints]))
        return AIResult(
            guidance=guidance,
            model=self.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )

    def chat(self, context, guidance, history, user_message):
        system = (
            f"{CHAT_SYSTEM_PROMPT}\n\n## Kontext om användaren\n{context}\n\n"
            f"## Din tidigare bedömning (JSON)\n{guidance.model_dump_json()}"
        )
        messages = [{"role": m["role"], "content": m["content"]} for m in history if m["role"] in ("user", "assistant")]
        messages.append({"role": "user", "content": user_message})
        with self.client.messages.stream(
            model=self.model,
            max_tokens=4000,
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            output_config={"effort": "low"},
            messages=messages,
            extra_headers={"anthropic-beta": "server-side-fallback-2026-07-01"},
            extra_body={"fallbacks": "default"},
        ) as stream:
            final = stream.get_final_message()
        if final.stop_reason == "refusal":
            return "Jag kan tyvärr inte svara på det. Kontakta vården om du är orolig."
        return "".join(b.text for b in final.content if b.type == "text").strip()


# ----------------------------------------------------------------------------
# Google Gemini (default for the team – free tier via Google AI Studio)
# ----------------------------------------------------------------------------
class GeminiProvider:
    name = "gemini"

    def __init__(self, settings: Settings):
        from google import genai  # lazy import: not needed when AI_PROVIDER=mock
        from google.genai import types

        self._types = types
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

    def analyze(self, context, images, red_flag_hints):
        t = self._types
        hints = "\n".join(f"- {h}" for h in red_flag_hints) or "- inga"
        user_text = (
            f"{context}\n\n## Regelbaserade varningssignaler (måste vägas in)\n{hints}\n\n"
            "Analysera bilderna och svaren. Svara enligt schemat, på svenska."
        )
        contents = [t.Part.from_bytes(data=img.data, mime_type=img.media_type) for img in images]
        contents.append(user_text)
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=t.GenerateContentConfig(
                system_instruction=GUIDANCE_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=SkinGuidance,
                temperature=0.3,
            ),
        )
        guidance = response.parsed
        if guidance is None:  # safety block or empty answer – validate the raw text if any
            if not response.text:
                raise RuntimeError("AI-tjänsten gav inget svar (möjligen blockerat av säkerhetsfilter).")
            guidance = SkinGuidance.model_validate_json(response.text)
        if not isinstance(guidance, SkinGuidance):
            guidance = SkinGuidance.model_validate(guidance)
        if red_flag_hints and not guidance.seek_care:
            guidance.seek_care = True
            guidance.red_flags = list(dict.fromkeys([*guidance.red_flags, *red_flag_hints]))
        usage = response.usage_metadata
        return AIResult(
            guidance=guidance,
            model=self.model,
            input_tokens=getattr(usage, "prompt_token_count", None),
            output_tokens=getattr(usage, "candidates_token_count", None),
        )

    def chat(self, context, guidance, history, user_message):
        t = self._types
        system = (
            f"{CHAT_SYSTEM_PROMPT}\n\n## Kontext om användaren\n{context}\n\n"
            f"## Din tidigare bedömning (JSON)\n{guidance.model_dump_json()}"
        )
        past = [
            t.Content(role="user" if m["role"] == "user" else "model", parts=[t.Part.from_text(text=m["content"])])
            for m in history
            if m["role"] in ("user", "assistant") and m["content"]
        ]
        chat = self.client.chats.create(
            model=self.model,
            history=past,
            config=t.GenerateContentConfig(system_instruction=system, temperature=0.5, max_output_tokens=800),
        )
        response = chat.send_message(user_message)
        text = (response.text or "").strip()
        return text or "Jag kan tyvärr inte svara på det. Kontakta vården om du är orolig."


def make_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("AI_PROVIDER=gemini kräver GEMINI_API_KEY")
        return GeminiProvider(settings)
    if settings.ai_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise RuntimeError("AI_PROVIDER=anthropic kräver ANTHROPIC_API_KEY")
        return AnthropicProvider(settings)
    return MockProvider()
