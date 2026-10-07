"""End-to-end test of the MVP journey against in-memory repositories + mock AI.

Profile → questionnaire → answers → submit → (image) → analyze → chat → plan → confirm.
Runs without Supabase, without an API key and without network.
"""
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from src.core.config import get_settings
from src.main import app
from src.repositories import get_repos
from src.repositories.memory import make_memory_repos
from src.services.ai_service import get_provider
from src.services.provider import MockProvider

USER = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
AUTH = {"Authorization": f"Bearer dev:{USER}"}


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.setenv("DEV_AUTH", "true")
    monkeypatch.setenv("SUPABASE_URL", "")
    get_settings.cache_clear()
    get_repos.cache_clear()
    get_provider.cache_clear()
    repos = make_memory_repos()
    app.dependency_overrides[get_repos] = lambda: repos
    app.dependency_overrides[get_provider] = lambda: MockProvider()
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def _fake_face_jpeg(size=(720, 960)) -> bytes:
    """A plain image (no real face) – enough to exercise the pipeline."""
    im = Image.new("RGB", size, (235, 200, 180))
    d = ImageDraw.Draw(im)
    d.ellipse((160, 200, 560, 760), fill=(220, 170, 150))
    for i in range(0, size[0], 7):  # texture so blur score is not zero
        d.line((i, 0, i, size[1]), fill=(225, 185, 165), width=1)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return buf.getvalue()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["database"] == "memory"


def test_requires_auth(client):
    assert client.get("/profile").status_code == 401


def test_questionnaire_has_conditional_followups(client):
    q = client.get("/questionnaire").json()
    ids = {x["id"]: x for x in q["questions"]}
    assert ids["acne_area"]["show_if"] == {"question_id": "concerns", "includes": "acne", "equals": None, "gte": None}


def test_full_mvp_journey(client):
    # 1. profile
    r = client.put("/profile", json={"display_name": "Sara", "birth_year": 2001, "consent_images": True}, headers=AUTH)
    assert r.status_code == 200 and r.json()["consent_images"] is True

    # 2. assessment + answers
    a = client.post("/assessments", json={}, headers=AUTH).json()
    answers = {
        "skin_type": "combination",
        "sensitive": "no",
        "concerns": ["acne", "dark_spots"],
        "acne_area": ["forehead", "chin"],
        "acne_frequency": "often",
        "acne_type": ["whiteheads", "papules"],
        "duration": "1_6m",
        "sudden_change": False,
        "current_routine": ["cleanser"],
        "goal": "fewer_breakouts",
    }
    r = client.put(f"/assessments/{a['id']}/answers", json={"answers": answers}, headers=AUTH)
    assert r.status_code == 200

    # 3. image upload (face check runs, may or may not find a face in a synthetic image)
    r = client.post(
        "/images",
        files={"file": ("face.jpg", _fake_face_jpeg(), "image/jpeg")},
        data={"assessment_id": a["id"], "area": "face"},
        headers=AUTH,
    )
    assert r.status_code == 201, r.text
    img = r.json()
    assert img["bytes"] > 0 and img["face_check"] is not None
    assert "ok" in img["face_check"]

    # 4. submit → analyze
    r = client.post(f"/assessments/{a['id']}/submit", headers=AUTH)
    assert r.status_code == 200 and r.json()["status"] == "submitted"
    r = client.post(f"/ai/analyze/{a['id']}", headers=AUTH)
    assert r.status_code == 200, r.text
    result = r.json()["result"]
    assert result["seek_care"] is False
    assert result["plan"]["follow_up_days"] >= 7
    assert "diagnos" in result["disclaimer"].lower()

    # 5. chat
    r = client.post(f"/ai/chat/{a['id']}", json={"content": "Varför salicylsyra?"}, headers=AUTH)
    assert r.status_code == 200 and r.json()["role"] == "assistant"
    history = client.get(f"/ai/chat/{a['id']}", headers=AUTH).json()
    assert [m["role"] for m in history] == ["assistant", "user", "assistant"]

    # 6. plan: propose → confirm → active
    p = client.post(f"/plans/from-assessment/{a['id']}", headers=AUTH).json()
    assert p["status"] == "proposed"
    r = client.post(f"/plans/{p['id']}/confirm", headers=AUTH)
    assert r.json()["status"] == "confirmed"
    assert client.get("/plans/active", headers=AUTH).json()["id"] == p["id"]

    # 7. another user cannot see any of it
    other = {"Authorization": f"Bearer dev:{OTHER}"}
    assert client.get(f"/assessments/{a['id']}", headers=other).status_code == 404
    assert client.get(f"/images/{img['id']}/file", headers=other).status_code == 404
    assert client.get("/plans", headers=other).json() == []


def test_submit_validates_required_answers(client):
    a = client.post("/assessments", json={}, headers=AUTH).json()
    client.put(f"/assessments/{a['id']}/answers", json={"answers": {"skin_type": "oily"}}, headers=AUTH)
    r = client.post(f"/assessments/{a['id']}/submit", headers=AUTH)
    assert r.status_code == 422
    assert any("concerns" in e or "besvär" in e.lower() for e in r.json()["detail"]["errors"])


def test_red_flags_force_seek_care(client):
    client.put("/profile", json={"consent_images": True}, headers=AUTH)
    a = client.post("/assessments", json={}, headers=AUTH).json()
    answers = {
        "skin_type": "oily", "sensitive": "often", "concerns": ["acne"], "acne_area": ["cheeks"],
        "acne_frequency": "very_often", "acne_type": ["cystic"], "acne_pain": 8, "duration": "gt_1y",
        "sudden_change": True, "current_routine": ["nothing"], "goal": "calm_skin",
    }
    client.put(f"/assessments/{a['id']}/answers", json={"answers": answers}, headers=AUTH)
    client.post(f"/assessments/{a['id']}/submit", headers=AUTH)
    result = client.post(f"/ai/analyze/{a['id']}", headers=AUTH).json()["result"]
    assert result["seek_care"] is True
    assert result["red_flags"]


def test_image_requires_consent(client):
    client.put("/profile", json={"consent_images": False}, headers=AUTH)
    r = client.post("/images", files={"file": ("f.jpg", _fake_face_jpeg(), "image/jpeg")}, headers=AUTH)
    assert r.status_code == 403


def test_one_confirmed_plan_at_a_time(client):
    plan = {
        "title": "A", "summary": "s", "morning": [], "evening": [], "weekly": [], "avoid": [],
        "expectations": "e", "follow_up_days": 14,
    }
    p1 = client.post("/plans", json={"plan": plan}, headers=AUTH).json()
    p2 = client.post("/plans", json={"plan": {**plan, "title": "B"}}, headers=AUTH).json()
    client.post(f"/plans/{p1['id']}/confirm", headers=AUTH)
    client.post(f"/plans/{p2['id']}/confirm", headers=AUTH)
    plans = {p["id"]: p["status"] for p in client.get("/plans", headers=AUTH).json()}
    assert plans[p1["id"]] == "archived" and plans[p2["id"]] == "confirmed"
