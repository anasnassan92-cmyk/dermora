"""Questionnaire + assessment contracts.

The questionnaire is a list of questions. A question can carry `show_if`, a
condition on an earlier answer – that is how conditional follow-ups work.
The same JSON drives the mobile QuestionRenderer (Adam) and validation here.
"""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

AssessmentStatus = Literal["draft", "submitted", "analyzed", "failed"]
QuestionType = Literal["single", "multi", "scale", "text", "boolean"]


class QuestionOption(BaseModel):
    value: str
    label: str
    description: str | None = None
    icon: str | None = None  # name of a brand-kit icon, used by the app
    image: str | None = None  # name of a bundled thumbnail (apps/mobile/assets/design)


class ShowIf(BaseModel):
    """Show this question only if answer[question_id] matches."""

    question_id: str
    equals: str | bool | None = None
    includes: str | None = None  # for multi-select answers
    gte: int | None = None  # for scale answers


class Question(BaseModel):
    id: str
    type: QuestionType
    title: str
    help: str | None = None
    required: bool = True
    options: list[QuestionOption] = Field(default_factory=list)
    min: int | None = None
    max: int | None = None
    show_if: ShowIf | None = None
    layout: Literal["list", "grid", "cards"] | None = None
    context: str | None = None  # small label above the title, e.g. 'Akne och finnar'
    note: str | None = None  # 'Bra att veta!' panel text


class Questionnaire(BaseModel):
    version: str
    title: str
    questions: list[Question]


class AssessmentCreate(BaseModel):
    questionnaire_version: str = "1.0.0"


class AnswersIn(BaseModel):
    answers: dict[str, Any]


class AssessmentOut(BaseModel):
    id: str
    user_id: str
    questionnaire_version: str
    status: AssessmentStatus
    answers: dict[str, Any] = Field(default_factory=dict)
    image_ids: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    submitted_at: datetime | None = None
    analyzed_at: datetime | None = None
