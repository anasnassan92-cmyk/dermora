"""Structured AI output. This is the contract between Youssef's AI service and
Even's treatment-plan screens. The AI MUST answer in exactly this shape
(enforced with structured outputs), so the app never parses free text.
"""
from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["none", "mild", "moderate", "severe"]
Confidence = Literal["low", "medium", "high"]


class Observation(BaseModel):
    area: Literal["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline", "overall"]
    finding: str = Field(description="Kort beskrivning på svenska, t.ex. 'Några inflammerade finnar'")
    severity: Severity
    confidence: Confidence


class RoutineStep(BaseModel):
    step: str = Field(description="T.ex. 'Rengöring'")
    product_type: str = Field(description="Produkttyp, inte varumärke. T.ex. 'Mild rengöring utan parfym'")
    active_ingredient: str | None = Field(default=None, description="T.ex. 'Salicylsyra 2 %'")
    frequency: str = Field(description="T.ex. 'Varje morgon' / 'Varannan kväll'")
    why: str = Field(description="En mening om varför")


class TreatmentPlanProposal(BaseModel):
    title: str
    summary: str = Field(description="2–3 meningar på svenska")
    morning: list[RoutineStep]
    evening: list[RoutineStep]
    weekly: list[RoutineStep] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list, description="Saker att undvika")
    expectations: str = Field(description="Vad användaren kan förvänta sig och när")
    follow_up_days: int = Field(ge=7, le=90)


class SkinGuidance(BaseModel):
    skin_type_estimate: Literal["oily", "dry", "combination", "normal", "sensitive", "unknown"]
    primary_concern: str
    observations: list[Observation]
    overall_severity: Severity
    image_quality_note: str | None = Field(default=None, description="Om bilden var svår att bedöma")
    guidance: str = Field(description="Personlig vägledning i du-form, 4–8 meningar, svenska")
    plan: TreatmentPlanProposal
    red_flags: list[str] = Field(
        default_factory=list,
        description="Tecken som kräver vårdkontakt (infektion, snabb förändring, smärta, feber). Tom lista om inga.",
    )
    seek_care: bool = Field(description="True om användaren bör kontakta vården")
    disclaimer: str = Field(description="Alltid: vägledning, inte diagnos")


class ChatMessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(BaseModel):
    id: int | str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: str | None = None


class AnalyzeOut(BaseModel):
    assessment_id: str
    provider: str
    model: str
    result: SkinGuidance
