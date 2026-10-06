"""Image upload routes – owner: Ali.

Flow: app picks/takes a photo → POST /images (multipart) → backend strips EXIF,
re-encodes, runs the face-quality check, stores the file privately, saves
metadata → returns ImageOut with face_check so the app can ask for a retake.
"""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status

from ..deps import CurrentUser, Repos, get_current_user, get_repos
from ...core.config import Settings, get_settings
from ...schemas.image import FaceCheck, ImageArea, ImageOut
from ...services.face_detection import image_dimensions, run_face_check, strip_metadata_and_normalize

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED = {"image/jpeg", "image/png", "image/webp"}


@router.post("", response_model=ImageOut, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    assessment_id: str | None = Form(default=None),
    area: ImageArea = Form(default="face"),
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
    settings: Settings = Depends(get_settings),
):
    profile = repos.profiles.get(user.id)
    if not profile or not profile.get("consent_images"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Du måste godkänna bildbehandling i din profil först")
    if file.content_type not in ALLOWED:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Endast JPEG, PNG eller WebP")
    raw = await file.read()
    if len(raw) > settings.max_image_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Bilden är större än 8 MB")
    if assessment_id:
        a = repos.assessments.get(user.id, assessment_id)
        if not a:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Bedömningen finns inte")

    try:
        data, media_type = strip_metadata_and_normalize(raw)
        width, height = image_dimensions(data)
    except Exception:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Kunde inte läsa bilden")
    if min(width, height) < settings.min_image_side:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Bilden har för låg upplösning")

    try:
        face_check = (
            run_face_check(data, settings.face_detector, settings.google_vision_api_key) if area == "face" else None
        )
    except Exception:
        face_check = None

    image_id = str(uuid4())
    path = f"{user.id}/{image_id}.jpg"
    repos.storage.put(path, data, media_type)
    row = repos.images.create(
        user.id,
        {
            "id": image_id,
            "assessment_id": assessment_id,
            "storage_path": path,
            "area": area,
            "width": width,
            "height": height,
            "bytes": len(data),
            "face_check": face_check.model_dump() if face_check else None,
            "taken_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    row["url"] = repos.storage.signed_url(path) or f"/images/{row['id']}/file"
    return row


@router.get("", response_model=list[ImageOut])
def list_images(
    assessment_id: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
):
    rows = repos.images.list_for_assessment(user.id, assessment_id) if assessment_id else repos.images.list(user.id)
    for r in rows:
        r["url"] = repos.storage.signed_url(r["storage_path"]) or f"/images/{r['id']}/file"
    return rows


@router.get("/{image_id}/file")
def get_file(image_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.images.get(user.id, image_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bilden finns inte")
    return Response(repos.storage.get(row["storage_path"]), media_type="image/jpeg")


@router.post("/check", response_model=FaceCheck)
async def check_only(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Dry run: quality check without storing anything (used by the camera guide)."""
    raw = await file.read()
    try:
        data, _ = strip_metadata_and_normalize(raw)
        return run_face_check(data, settings.face_detector, settings.google_vision_api_key)
    except Exception:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Kunde inte läsa bilden")


@router.delete("/{image_id}", status_code=204)
def delete_image(image_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.images.get(user.id, image_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bilden finns inte")
    repos.storage.delete(row["storage_path"])
    repos.images.delete(user.id, image_id)
    return None
