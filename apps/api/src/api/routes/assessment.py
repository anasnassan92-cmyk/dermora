"""Questionnaire + assessment routes – owner: Adam (questionnaire), Assad (API)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ...schemas.assessment import AnswersIn, AssessmentCreate, AssessmentOut, Questionnaire
from ...services.context_builder import load_questionnaire, validate_answers
from ..deps import CurrentUser, Repos, get_current_user, get_repos

router = APIRouter(tags=["assessment"])


@router.get("/questionnaire", response_model=Questionnaire)
def get_questionnaire(version: str = "1.0.0"):
    """The active questionnaire, including `show_if` rules for conditional follow-ups."""
    try:
        return load_questionnaire(version)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Okänd version")


def _with_images(repos: Repos, user_id: str, row: dict) -> dict:
    row = dict(row)
    row["image_ids"] = [i["id"] for i in repos.images.list_for_assessment(user_id, row["id"])]
    return row


@router.post("/assessments", response_model=AssessmentOut, status_code=201)
def create_assessment(
    body: AssessmentCreate,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
):
    load_questionnaire(body.questionnaire_version)  # 404 if unknown
    return _with_images(repos, user.id, repos.assessments.create(user.id, body.questionnaire_version))


@router.get("/assessments", response_model=list[AssessmentOut])
def list_assessments(user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    return [_with_images(repos, user.id, a) for a in repos.assessments.list(user.id)]


@router.get("/assessments/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)
):
    row = repos.assessments.get(user.id, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bedömningen finns inte")
    return _with_images(repos, user.id, row)


@router.put("/assessments/{assessment_id}/answers", response_model=AssessmentOut)
def save_answers(
    assessment_id: str,
    body: AnswersIn,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
):
    """Save partial answers (autosave). No validation – that happens on submit."""
    row = repos.assessments.get(user.id, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bedömningen finns inte")
    if row["status"] != "draft":
        raise HTTPException(status.HTTP_409_CONFLICT, "Bedömningen är redan inskickad")
    merged = {**row["answers"], **body.answers}
    return _with_images(repos, user.id, repos.assessments.update(user.id, assessment_id, {"answers": merged}))


@router.post("/assessments/{assessment_id}/submit", response_model=AssessmentOut)
def submit(
    assessment_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)
):
    row = repos.assessments.get(user.id, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bedömningen finns inte")
    errors = validate_answers(load_questionnaire(row["questionnaire_version"]), row["answers"])
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, {"errors": errors})
    return _with_images(
        repos,
        user.id,
        repos.assessments.update(
            user.id,
            assessment_id,
            {"status": "submitted", "submitted_at": datetime.now(timezone.utc).isoformat()},
        ),
    )
