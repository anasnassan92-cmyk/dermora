"""Authentication: who is calling the API?

The mobile app signs in with Supabase Auth and sends the Supabase access token
as `Authorization: Bearer <jwt>`. We verify the token signature with the
project's JWT secret and read the user id from the `sub` claim. The user id is
NEVER taken from the request body.

Local development without Supabase: with DEV_AUTH=true the header
`Authorization: Bearer dev:<any-uuid>` is accepted. This is refused in
production by config validation.
"""
from dataclasses import dataclass
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status

from .config import Settings, get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None = None
    email_verified: bool = False


DEV_USER_ID = "00000000-0000-4000-8000-000000000001"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def get_current_user(request: Request, settings: Settings = Depends(get_settings)) -> CurrentUser:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise _unauthorized("Saknar Authorization: Bearer-token")
    token = header[7:].strip()

    if settings.dev_auth and token.startswith("dev:"):
        raw = token[4:] or DEV_USER_ID
        try:
            UUID(raw)
        except ValueError:
            raise _unauthorized("dev-token måste följas av ett UUID")
        return CurrentUser(id=raw, email=f"{raw[:8]}@dev.local", email_verified=True)

    if not settings.supabase_jwt_secret:
        raise _unauthorized("Servern saknar SUPABASE_JWT_SECRET")

    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["sub", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token har gått ut")
    except jwt.InvalidTokenError as exc:
        raise _unauthorized(f"Ogiltig token: {exc}")

    user_meta = claims.get("user_metadata") or {}
    return CurrentUser(
        id=claims["sub"],
        email=claims.get("email"),
        email_verified=bool(user_meta.get("email_verified") or claims.get("email_confirmed_at")),
    )


def require_verified_email(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Use on routes that handle skin images / AI – only verified accounts."""
    if not user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Verifiera din e-post först")
    return user
