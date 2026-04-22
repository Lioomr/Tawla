import os
import secrets
from datetime import timedelta

from django.utils import timezone

from apps.sessions.exceptions import ExpiredSessionError, InvalidSessionError
from apps.sessions.models import TableSession


SESSION_DURATION = timedelta(
    minutes=int(os.getenv("TABLE_SESSION_DURATION_MINUTES", "60"))
)
SESSION_HEADER = "HTTP_X_SESSION_TOKEN"


def create_table_session(*, table) -> TableSession:
    expires_at = timezone.now() + SESSION_DURATION

    while True:
        session_token = f"sess_{secrets.token_urlsafe(24)}"
        if not TableSession.objects.filter(session_token=session_token).exists():
            break

    return TableSession.objects.create(
        table=table,
        session_token=session_token,
        expires_at=expires_at,
    )


def get_valid_session_from_headers(*, headers) -> TableSession:
    session_token = headers.get(SESSION_HEADER, "").strip()
    if not session_token:
        raise InvalidSessionError("invalid session")

    return get_valid_session_by_token(session_token=session_token)


def get_valid_session_by_token(*, session_token: str) -> TableSession:
    if not session_token:
        raise InvalidSessionError("invalid session")

    try:
        session = TableSession.objects.select_related("table__restaurant").get(
            session_token=session_token
        )
    except TableSession.DoesNotExist as exc:
        raise InvalidSessionError("invalid session") from exc

    if session.expires_at <= timezone.now():
        raise ExpiredSessionError("expired session")

    return session
