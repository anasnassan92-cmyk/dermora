"""Treatment plan routes – owner: Even.

The AI proposes a plan inside the analysis result. The user reviews it in the
app and confirms. Confirming creates the saved plan (one confirmed plan per
user; the previous one is archived).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ...schemas.ai import SkinGuidance
from ...schemas.plan import PlanCreate, PlanOut
from ..deps import CurrentUser, Repos, get_current_user, get_repos

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("/from-assessment/{assessment_id}", response_model=PlanOut, status_code=201)
def propose_from_assessment(
    assessment_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)
):
    """Create a *proposed* plan from the latest AI result (user can still edit/confirm)."""
    latest = repos.ai_results.latest_for_assessment(user.id, assessment_id)
    if not latest:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ingen AI-bedömning finns för denna bedömning")
    guidance = SkinGuidance.model_validate(latest["result"])
    plan = guidance.plan
    return repos.plans.create(
        user.id,
        {"assessment_id": assessment_id, "title": plan.title, "summary": plan.summary, "plan": plan.model_dump()},
    )


@router.post("", response_model=PlanOut, status_code=201)
def create_plan(body: PlanCreate, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    """Create a proposed plan from an (edited) proposal."""
    return repos.plans.create(
        user.id,
        {
            "assessment_id": body.assessment_id,
            "title": body.plan.title,
            "summary": body.plan.summary,
            "plan": body.plan.model_dump(),
        },
    )


@router.get("", response_model=list[PlanOut])
def list_plans(user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    return repos.plans.list(user.id)


@router.get("/active", response_model=PlanOut | None)
def active_plan(user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    for p in repos.plans.list(user.id):
        if p["status"] == "confirmed":
            return p
    return None


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.plans.get(user.id, plan_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Planen finns inte")
    return row


@router.post("/{plan_id}/confirm", response_model=PlanOut)
def confirm_plan(plan_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.plans.get(user.id, plan_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Planen finns inte")
    if row["status"] == "confirmed":
        return row
    repos.plans.archive_confirmed(user.id)
    return repos.plans.update(
        user.id, plan_id, {"status": "confirmed", "confirmed_at": datetime.now(timezone.utc).isoformat()}
    )


@router.post("/{plan_id}/archive", response_model=PlanOut)
def archive_plan(plan_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.plans.get(user.id, plan_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Planen finns inte")
    return repos.plans.update(user.id, plan_id, {"status": "archived"})
