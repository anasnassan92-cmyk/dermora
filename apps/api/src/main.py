"""Dermora API – FastAPI entry point.

Run locally:
    cd apps/api
    python -m venv .venv && .venv\\Scripts\\activate      (Windows)
    pip install -r requirements-dev.txt
    copy .env.example .env
    uvicorn src.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import ai, assessment, images, plans, profile
from .core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Dermora API",
    version="0.1.0",
    description="Backend för Dermora – personlig hudvägledning med AI. Release 1 / MVP.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(assessment.router)
app.include_router(images.router)
app.include_router(ai.router)
app.include_router(plans.router)


@app.get("/health", tags=["meta"])
def health():
    return {
        "status": "ok",
        "env": settings.app_env,
        "database": "supabase" if settings.supabase_enabled else "memory",
        "ai_provider": settings.ai_provider,
        "dev_auth": settings.dev_auth,
    }
