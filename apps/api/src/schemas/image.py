from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ImageArea = Literal["face", "forehead", "left_cheek", "right_cheek", "chin", "other"]


class FaceCheck(BaseModel):
    """Quality verdict from face *detection* (not recognition).

    We only store whether a face was found and whether the photo is usable.
    No landmarks, embeddings or templates are ever computed or stored.
    """

    face_found: bool
    faces: int = 0
    blur_score: float = Field(description="Variance of Laplacian; higher = sharper")
    brightness: float = Field(description="Mean luminance 0–255")
    face_coverage: float = Field(default=0.0, description="Face box area / image area")
    ok: bool
    reasons: list[str] = Field(default_factory=list, description="Swedish user-facing hints")


class ImageOut(BaseModel):
    id: str
    user_id: str
    assessment_id: str | None = None
    area: ImageArea = "face"
    width: int | None = None
    height: int | None = None
    bytes: int | None = None
    face_check: FaceCheck | None = None
    taken_at: datetime | None = None
    created_at: datetime | None = None
    url: str | None = Field(default=None, description="Short-lived signed URL for display")
