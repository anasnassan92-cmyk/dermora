"""Supabase client factory (service role).

The backend uses the *service role* key, which bypasses Row Level Security.
That is why every repository method takes `user_id` from the verified JWT and
filters on it explicitly – the backend is the RLS for itself.
"""
from functools import lru_cache

from .config import get_settings


@lru_cache
def get_supabase():
    settings = get_settings()
    if not settings.supabase_enabled:
        return None
    from supabase import create_client  # imported lazily so tests run without the package

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
