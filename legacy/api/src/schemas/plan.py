from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from .ai import TreatmentPlanProposal

PlanStatus = Literal["proposed", "confirmed", "archived"]


class PlanCreate(BaseModel):
    assessment_id: str | None = None
    plan: TreatmentPlanProposal


class PlanOut(BaseModel):
    id: str
    user_id: str
    assessment_id: str | None = None
    status: PlanStatus
    title: str
    summary: str | None = None
    plan: TreatmentPlanProposal
    confirmed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
