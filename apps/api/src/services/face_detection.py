"""Face *detection* for photo quality – not face recognition.

What this does:   finds whether a (single) face is present, how sharp and how
                  bright the photo is, and whether the face fills enough of the
                  frame. Returns a verdict and Swedish hints for the user.
What this never does: landmarks, embeddings, identity matching, age/gender
                  estimation. Nothing from this module can identify a person.

Implementation: OpenCV's bundled Haar cascade (no model download, CPU-only).
If OpenCV is not installed the check degrades gracefully to "unknown" so the
rest of the pipeline keeps working.

Owner: Ali (images) together with Youssef (AI input quality).
"""
from __future__ import annotations

import io

from ..schemas.image import FaceCheck

BLUR_MIN = 60.0  # variance of Laplacian below this = too blurry
BRIGHT_MIN, BRIGHT_MAX = 60.0, 215.0
COVERAGE_MIN = 0.04  # face box should cover at least 4 % of the image


def _load_gray(data: bytes):
    import numpy as np
    import cv2

    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Kunde inte läsa bilden")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img, gray


def check_face_photo(data: bytes) -> FaceCheck:
    try:
        import cv2

        if not hasattr(cv2, "CascadeClassifier"):  # OpenCV 5 dropped Haar cascades
            raise ImportError("opencv-python-headless must be <5 (see requirements.txt)")
    except ImportError as exc:  # pragma: no cover – dev machines without a usable OpenCV
        return FaceCheck(face_found=False, faces=0, blur_score=0, brightness=0, ok=True,
                         reasons=[f"Ansiktskontroll ej tillgänglig ({exc}) – bilden godkänd utan kontroll."])

    # OpenCV's internal thread pool can deadlock when called from the ASGI worker
    # thread pool on Windows; the images are small so single-threaded is fine.
    cv2.setNumThreads(1)
    img, gray = _load_gray(data)
    h, w = gray.shape
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())

    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    # Downscale for speed; min face ~ 15 % of the short side
    scale = 640 / max(h, w) if max(h, w) > 640 else 1.0
    small = cv2.resize(gray, None, fx=scale, fy=scale) if scale != 1.0 else gray
    min_side = int(min(small.shape) * 0.15)
    faces = cascade.detectMultiScale(small, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side))
    n = len(faces)

    coverage = 0.0
    if n:
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        coverage = float((fw * fh) / (small.shape[0] * small.shape[1]))

    reasons: list[str] = []
    if n == 0:
        reasons.append("Vi hittade inget ansikte. Håll kameran rakt framför ansiktet i bra ljus.")
    elif n > 1:
        reasons.append("Flera ansikten i bild – ta bilden ensam.")
    if blur < BLUR_MIN:
        reasons.append("Bilden är suddig. Håll kameran stilla och fokusera på ansiktet.")
    if brightness < BRIGHT_MIN:
        reasons.append("Bilden är för mörk. Ställ dig vänd mot ett fönster eller tänd mer ljus.")
    elif brightness > BRIGHT_MAX:
        reasons.append("Bilden är överexponerad. Undvik direkt starkt ljus eller blixt.")
    if n == 1 and coverage < COVERAGE_MIN:
        reasons.append("Ansiktet är för litet i bild. Gå närmare kameran.")

    ok = n == 1 and not reasons
    return FaceCheck(
        face_found=n >= 1,
        faces=int(n),
        blur_score=round(blur, 1),
        brightness=round(brightness, 1),
        face_coverage=round(coverage, 3),
        ok=ok,
        reasons=reasons,
    )


LIKELY = {"LIKELY", "VERY_LIKELY"}


def check_face_photo_google(data: bytes, api_key: str, timeout: float = 15.0) -> FaceCheck:
    """Same verdict, computed by the Google Cloud Vision API (FACE_DETECTION).

    We only use the quality signals Vision gives us: number of faces, bounding
    box size, blur/under-exposure likelihood and head angle. We never request
    or store landmarks, and Vision's face detection is not identity recognition.
    """
    import base64

    import httpx

    body = {
        "requests": [
            {
                "image": {"content": base64.b64encode(data).decode("ascii")},
                "features": [{"type": "FACE_DETECTION", "maxResults": 5}],
            }
        ]
    }
    res = httpx.post(
        "https://vision.googleapis.com/v1/images:annotate",
        params={"key": api_key},
        json=body,
        timeout=timeout,
    )
    res.raise_for_status()
    payload = res.json()["responses"][0]
    if "error" in payload:
        raise RuntimeError(payload["error"].get("message", "Vision API error"))
    faces = payload.get("faceAnnotations", [])
    width, height = image_dimensions(data)
    return face_check_from_vision(faces, width, height)


def face_check_from_vision(faces: list[dict], width: int, height: int) -> FaceCheck:
    """Pure function (testable without network) turning Vision annotations into our verdict."""
    n = len(faces)
    reasons: list[str] = []
    coverage = 0.0
    blurred = False
    dark = False
    turned = False
    if n:
        f = max(faces, key=lambda a: _box_area(a.get("boundingPoly", {})))
        coverage = _box_area(f.get("boundingPoly", {})) / float(width * height or 1)
        blurred = f.get("blurredLikelihood") in LIKELY
        dark = f.get("underExposedLikelihood") in LIKELY
        turned = abs(float(f.get("panAngle", 0))) > 25 or abs(float(f.get("tiltAngle", 0))) > 25
    if n == 0:
        reasons.append("Vi hittade inget ansikte. Håll kameran rakt framför ansiktet i bra ljus.")
    elif n > 1:
        reasons.append("Flera ansikten i bild – ta bilden ensam.")
    if blurred:
        reasons.append("Bilden är suddig. Håll kameran stilla och fokusera på ansiktet.")
    if dark:
        reasons.append("Bilden är för mörk. Ställ dig vänd mot ett fönster eller tänd mer ljus.")
    if turned:
        reasons.append("Titta rakt in i kameran så att hela ansiktet syns.")
    if n == 1 and coverage < COVERAGE_MIN:
        reasons.append("Ansiktet är för litet i bild. Gå närmare kameran.")
    return FaceCheck(
        face_found=n >= 1,
        faces=n,
        blur_score=0.0 if blurred else 100.0,  # Vision gives likelihoods, not a numeric score
        brightness=60.0 if dark else 140.0,
        face_coverage=round(coverage, 3),
        ok=n == 1 and not reasons,
        reasons=reasons,
    )


def _box_area(poly: dict) -> float:
    verts = poly.get("vertices") or []
    if len(verts) < 3:
        return 0.0
    xs = [v.get("x", 0) for v in verts]
    ys = [v.get("y", 0) for v in verts]
    return float(max(xs) - min(xs)) * float(max(ys) - min(ys))


def run_face_check(data: bytes, detector: str, google_api_key: str = "") -> FaceCheck:
    """Dispatcher used by the routes. Falls back to OpenCV if Google is unavailable."""
    if detector == "google" and google_api_key:
        try:
            return check_face_photo_google(data, google_api_key)
        except Exception as exc:  # network / quota – degrade, don't block the user
            fc = check_face_photo(data)
            fc.reasons.append(f"(Google Vision ej tillgänglig: {exc}; lokal kontroll användes)")
            return fc
    return check_face_photo(data)


def image_dimensions(data: bytes) -> tuple[int, int]:
    from PIL import Image

    with Image.open(io.BytesIO(data)) as im:
        return im.width, im.height


def strip_metadata_and_normalize(data: bytes, max_side: int = 1600) -> tuple[bytes, str]:
    """Re-encode as JPEG: removes EXIF (GPS!), fixes orientation, caps size.

    Returns (bytes, media_type). Privacy: location metadata never reaches storage.
    """
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(data)) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        im.thumbnail((max_side, max_side))
        out = io.BytesIO()
        im.save(out, format="JPEG", quality=88, optimize=True)
        return out.getvalue(), "image/jpeg"
