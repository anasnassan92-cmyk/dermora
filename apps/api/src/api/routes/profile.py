"""Profile routes – owner: Anas (auth + profile).

Sign-up / login / email verification happen in Supabase Auth directly from the
app (see apps/mobile/src/services/auth). The backend only needs the resulting
JWT. These routes read and update the profile row that the DB trigger created.
"""
from fastapi import APIRouter, Depends

from ..deps import CurrentUser, Repos, get_current_user, get_repos
from ...schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
def get_profile(user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    row = repos.profiles.get(user.id) or repos.profiles.upsert(user.id, {"display_name": (user.email or "").split("@")[0]})
    return row


@router.put("", response_model=ProfileOut)
def update_profile(
    body: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
):
    return repos.profiles.upsert(user.id, body.model_dump(exclude_unset=True))


@router.delete("", status_code=204)
def delete_my_data(user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)):
    """GDPR: remove all images and rows for this user. The auth account itself is
    deleted by the app via Supabase (or by an admin) afterwards."""
    for img in repos.images.list(user.id):
        try:
            repos.storage.delete(img["storage_path"])
        except Exception:
            pass
        repos.images.delete(user.id, img["id"])
    for plan in repos.plans.list(user.id):
        repos.plans.update(user.id, plan["id"], {"status": "archived"})
    return None
