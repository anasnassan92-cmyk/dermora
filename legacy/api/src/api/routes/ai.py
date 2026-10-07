"""AI routes – owner: Youssef."""
from fastapi import APIRouter, Depends

from ...schemas.ai import AnalyzeOut, ChatMessageIn, ChatMessageOut
from ...services.ai_service import analyze_assessment, chat_reply
from ..deps import CurrentUser, Repos, get_current_user, get_provider, get_repos

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze/{assessment_id}", response_model=AnalyzeOut)
def analyze(
    assessment_id: str,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
    provider=Depends(get_provider),
):
    row = analyze_assessment(repos, provider, user.id, assessment_id)
    return {"assessment_id": assessment_id, "provider": row["provider"], "model": row["model"], "result": row["result"]}


@router.get("/result/{assessment_id}", response_model=AnalyzeOut | None)
def latest_result(
    assessment_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)
):
    row = repos.ai_results.latest_for_assessment(user.id, assessment_id)
    if not row:
        return None
    return {"assessment_id": assessment_id, "provider": row["provider"], "model": row["model"], "result": row["result"]}


@router.get("/chat/{assessment_id}", response_model=list[ChatMessageOut])
def chat_history(
    assessment_id: str, user: CurrentUser = Depends(get_current_user), repos: Repos = Depends(get_repos)
):
    return repos.chats.list(user.id, assessment_id)


@router.post("/chat/{assessment_id}", response_model=ChatMessageOut)
def chat(
    assessment_id: str,
    body: ChatMessageIn,
    user: CurrentUser = Depends(get_current_user),
    repos: Repos = Depends(get_repos),
    provider=Depends(get_provider),
):
    return chat_reply(repos, provider, user.id, assessment_id, body.content)
