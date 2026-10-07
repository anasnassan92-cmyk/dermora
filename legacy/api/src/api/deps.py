"""Shared FastAPI dependencies."""
from ..core.security import CurrentUser, get_current_user, require_verified_email
from ..repositories import Repos, get_repos
from ..services.ai_service import get_provider

__all__ = ["CurrentUser", "get_current_user", "require_verified_email", "Repos", "get_repos", "get_provider"]
