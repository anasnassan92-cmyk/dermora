"""In-memory repositories – for local development without Supabase and for tests.

Data disappears when the server restarts. That is intended.
"""
from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from .base import Repos


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryProfiles:
    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}

    def get(self, user_id: str):
        return copy.deepcopy(self.rows.get(user_id))

    def upsert(self, user_id: str, data: dict[str, Any]):
        row = self.rows.get(user_id) or {
            "id": user_id,
            "display_name": None,
            "birth_year": None,
            "age_range": None,
            "gender": None,
            "country": "SE",
            "skin_tone": None,
            "skin_type": "unknown",
            "consent_images": False,
            "consent_at": None,
            "locale": "sv",
            "created_at": _now(),
        }
        row.update({k: v for k, v in data.items() if v is not None})
        if data.get("consent_images") and not row.get("consent_at"):
            row["consent_at"] = _now()
        row["updated_at"] = _now()
        self.rows[user_id] = row
        return copy.deepcopy(row)


class _Table:
    """Tiny helper: rows keyed by id, always filtered by user_id."""

    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}

    def _insert(self, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
        row = {"id": str(uuid4()), "user_id": user_id, "created_at": _now(), **data}
        self.rows[row["id"]] = row
        return copy.deepcopy(row)

    def _get(self, user_id: str, row_id: str):
        row = self.rows.get(row_id)
        return copy.deepcopy(row) if row and row["user_id"] == user_id else None

    def _list(self, user_id: str, **where: Any) -> list[dict[str, Any]]:
        out = [r for r in self.rows.values() if r["user_id"] == user_id]
        for k, v in where.items():
            out = [r for r in out if r.get(k) == v]
        out.sort(key=lambda r: r["created_at"], reverse=True)
        return copy.deepcopy(out)

    def _update(self, user_id: str, row_id: str, data: dict[str, Any]) -> dict[str, Any]:
        row = self.rows.get(row_id)
        if not row or row["user_id"] != user_id:
            raise KeyError(row_id)
        row.update(data)
        row["updated_at"] = _now()
        return copy.deepcopy(row)


class MemoryAssessments(_Table):
    def create(self, user_id, questionnaire_version):
        return self._insert(
            user_id,
            {
                "questionnaire_version": questionnaire_version,
                "status": "draft",
                "answers": {},
                "submitted_at": None,
                "analyzed_at": None,
            },
        )

    get = _Table._get
    list = lambda self, user_id: self._list(user_id)  # noqa: E731
    update = _Table._update


class MemoryImages(_Table):
    def create(self, user_id, data):
        return self._insert(user_id, data)

    get = _Table._get

    def list_for_assessment(self, user_id, assessment_id):
        return self._list(user_id, assessment_id=assessment_id)

    def list(self, user_id):
        return self._list(user_id)

    def delete(self, user_id, image_id):
        row = self.rows.get(image_id)
        if row and row["user_id"] == user_id:
            del self.rows[image_id]


class MemoryAIResults(_Table):
    def create(self, user_id, data):
        return self._insert(user_id, data)

    def latest_for_assessment(self, user_id, assessment_id):
        rows = self._list(user_id, assessment_id=assessment_id)
        return rows[0] if rows else None


class MemoryChats:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []

    def add(self, user_id, assessment_id, role, content):
        row = {
            "id": len(self.rows) + 1,
            "user_id": user_id,
            "assessment_id": assessment_id,
            "role": role,
            "content": content,
            "created_at": _now(),
        }
        self.rows.append(row)
        return copy.deepcopy(row)

    def list(self, user_id, assessment_id):
        return [
            copy.deepcopy(r)
            for r in self.rows
            if r["user_id"] == user_id and r["assessment_id"] == assessment_id
        ]


class MemoryPlans(_Table):
    def create(self, user_id, data):
        return self._insert(user_id, {"status": "proposed", "confirmed_at": None, **data})

    get = _Table._get

    def list(self, user_id):
        return self._list(user_id)

    update = _Table._update

    def archive_confirmed(self, user_id):
        for r in self.rows.values():
            if r["user_id"] == user_id and r["status"] == "confirmed":
                r["status"] = "archived"


class MemoryStorage:
    def __init__(self) -> None:
        self.blobs: dict[str, tuple[bytes, str]] = {}

    def put(self, path, data, content_type):
        self.blobs[path] = (data, content_type)

    def get(self, path):
        return self.blobs[path][0]

    def delete(self, path):
        self.blobs.pop(path, None)

    def signed_url(self, path, expires_in=600):
        return None  # served through GET /images/{id}/file in dev


def make_memory_repos() -> Repos:
    return Repos(
        profiles=MemoryProfiles(),
        assessments=MemoryAssessments(),
        images=MemoryImages(),
        ai_results=MemoryAIResults(),
        chats=MemoryChats(),
        plans=MemoryPlans(),
        storage=MemoryStorage(),
    )
