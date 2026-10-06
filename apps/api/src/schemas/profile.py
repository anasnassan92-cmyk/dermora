from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SkinType = Literal["oily", "dry", "combination", "normal", "sensitive", "unknown"]
AgeRange = Literal["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"]
Gender = Literal["female", "male", "non_binary", "undisclosed"]


class ProfileOut(BaseModel):
    id: str
    display_name: str | None = None
    birth_year: int | None = None
    age_range: AgeRange | None = None
    gender: Gender | None = None
    country: str | None = None
    skin_type: SkinType = "unknown"
    consent_images: bool = False
    consent_at: datetime | None = None
    locale: str = "sv"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    age_range: AgeRange | None = None
    gender: Gender | None = None
    country: str | None = Field(default=None, max_length=2, description="ISO 3166-1 alpha-2, t.ex. SE")
    skin_type: SkinType | None = None
    consent_images: bool | None = None
    locale: Literal["sv", "en"] | None = None
