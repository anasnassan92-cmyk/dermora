"""Supabase-backed repositories. Table names match supabase/schema.sql.

Every method filters on user_id. The service-role key bypasses RLS, so this
filter *is* the security boundary on the backend side.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from .base import Repos


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _one(res) -> dict[str, Any] | None:
    data = res.data
    if isinstance(data, list):
        return data[0] if data else None
    return data


class SbProfiles:
    def __init__(self, sb):
        self.sb = sb

    def get(self, user_id):
        return _one(self.sb.table("profiles").select("*").eq("id", user_id).limit(1).execute())

    def upsert(self, user_id, data):
        payload = {k: v for k, v in data.items() if v is not None}
        if payload.get("consent_images"):
            payload.setdefault("consent_at", _now())
        payload["id"] = user_id
        return _one(self.sb.table("profiles").upsert(payload).execute())


class SbAssessments:
    def __init__(self, sb):
        self.sb = sb

    def create(self, user_id, questionnaire_version):
        return _one(
            self.sb.table("assessments")
            .insert({"user_id": user_id, "questionnaire_version": questionnaire_version})
            .execute()
        )

    def get(self, user_id, assessment_id):
        return _one(
            self.sb.table("assessments").select("*").eq("id", assessment_id).eq("user_id", user_id).execute()
        )

    def list(self, user_id):
        return (
            self.sb.table("assessments")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def update(self, user_id, assessment_id, data):
        return _one(
            self.sb.table("assessments").update(data).eq("id", assessment_id).eq("user_id", user_id).execute()
        )


class SbImages:
    def __init__(self, sb):
        self.sb = sb

    def create(self, user_id, data):
        return _one(self.sb.table("skin_images").insert({"user_id": user_id, **data}).execute())

    def get(self, user_id, image_id):
        return _one(self.sb.table("skin_images").select("*").eq("id", image_id).eq("user_id", user_id).execute())

    def list_for_assessment(self, user_id, assessment_id):
        return (
            self.sb.table("skin_images")
            .select("*")
            .eq("user_id", user_id)
            .eq("assessment_id", assessment_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def list(self, user_id):
        return (
            self.sb.table("skin_images").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data
        )

    def delete(self, user_id, image_id):
        self.sb.table("skin_images").delete().eq("id", image_id).eq("user_id", user_id).execute()


class SbAIResults:
    def __init__(self, sb):
        self.sb = sb

    def create(self, user_id, data):
        return _one(self.sb.table("ai_assessments").insert({"user_id": user_id, **data}).execute())

    def latest_for_assessment(self, user_id, assessment_id):
        return _one(
            self.sb.table("ai_assessments")
            .select("*")
            .eq("user_id", user_id)
            .eq("assessment_id", assessment_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )


class SbChats:
    def __init__(self, sb):
        self.sb = sb

    def add(self, user_id, assessment_id, role, content):
        return _one(
            self.sb.table("chat_messages")
            .insert({"user_id": user_id, "assessment_id": assessment_id, "role": role, "content": content})
            .execute()
        )

    def list(self, user_id, assessment_id):
        return (
            self.sb.table("chat_messages")
            .select("*")
            .eq("user_id", user_id)
            .eq("assessment_id", assessment_id)
            .order("id")
            .execute()
            .data
        )


class SbPlans:
    def __init__(self, sb):
        self.sb = sb

    def create(self, user_id, data):
        return _one(self.sb.table("treatment_plans").insert({"user_id": user_id, **data}).execute())

    def get(self, user_id, plan_id):
        return _one(self.sb.table("treatment_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute())

    def list(self, user_id):
        return (
            self.sb.table("treatment_plans")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
        )

    def update(self, user_id, plan_id, data):
        return _one(
            self.sb.table("treatment_plans").update(data).eq("id", plan_id).eq("user_id", user_id).execute()
        )

    def archive_confirmed(self, user_id):
        self.sb.table("treatment_plans").update({"status": "archived"}).eq("user_id", user_id).eq(
            "status", "confirmed"
        ).execute()


class SbStorage:
    def __init__(self, sb, bucket: str):
        self.bucket = sb.storage.from_(bucket)

    def put(self, path, data, content_type):
        self.bucket.upload(path, data, {"content-type": content_type, "upsert": "false"})

    def get(self, path):
        return self.bucket.download(path)

    def delete(self, path):
        self.bucket.remove([path])

    def signed_url(self, path, expires_in=600):
        res = self.bucket.create_signed_url(path, expires_in)
        return res.get("signedURL") or res.get("signedUrl")


def make_supabase_repos(sb, bucket: str) -> Repos:
    return Repos(
        profiles=SbProfiles(sb),
        assessments=SbAssessments(sb),
        images=SbImages(sb),
        ai_results=SbAIResults(sb),
        chats=SbChats(sb),
        plans=SbPlans(sb),
        storage=SbStorage(sb, bucket),
    )


def new_image_path(user_id: str, ext: str = "jpg") -> str:
    """Images live under the user's own folder – required by the storage RLS policy."""
    return f"{user_id}/{uuid4()}.{ext}"
