from functools import lru_cache

from ..core.config import get_settings
from ..core.supabase import get_supabase
from .base import Repos
from .memory import make_memory_repos


@lru_cache
def get_repos() -> Repos:
    settings = get_settings()
    sb = get_supabase()
    if sb is None:
        return make_memory_repos()
    from .supabase import make_supabase_repos

    return make_supabase_repos(sb, settings.supabase_bucket)


__all__ = ["Repos", "get_repos", "make_memory_repos"]
