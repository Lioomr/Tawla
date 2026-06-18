import os
import re
import secrets
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.restaurants.models import Table
from apps.sessions.exceptions import (
    ExpiredSessionError,
    GuestValidationError,
    InvalidGuestError,
    InvalidSessionError,
)
from apps.sessions.models import SessionGuest, TableSession


SESSION_DURATION = timedelta(
    minutes=int(os.getenv("TABLE_SESSION_DURATION_MINUTES", "60"))
)
SESSION_HEADER = "HTTP_X_SESSION_TOKEN"
GUEST_HEADER = "HTTP_X_GUEST_TOKEN"
DISPLAY_NAME_MAX_LENGTH = 40
MODE_SOLO = "solo"
MODE_LOBBY = "lobby"
AVATAR_COLORS = [
    "#2563EB",
    "#DC2626",
    "#16A34A",
    "#9333EA",
    "#EA580C",
    "#0891B2",
]
UNSAFE_DISPLAY_NAME_RE = re.compile(r"[\x00-\x1f\x7f<>]")


@dataclass(frozen=True)
class SessionStartResult:
    session: TableSession
    guest: SessionGuest
    mode: str
    guest_count: int

    @property
    def session_token(self) -> str:
        return self.session.session_token

    @property
    def guest_token(self) -> str:
        return self.guest.guest_token

    @property
    def expires_at(self):
        return self.session.expires_at


@dataclass(frozen=True)
class GuestUpdateResult:
    guest: SessionGuest
    mode: str
    guest_count: int

    @property
    def guest_token(self) -> str:
        return self.guest.guest_token

    @property
    def display_name(self) -> str:
        return self.guest.display_name

    @property
    def avatar_color(self) -> str:
        return self.guest.avatar_color


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


def start_or_join_table_session(*, table) -> SessionStartResult:
    with transaction.atomic():
        locked_table = (
            Table.objects.select_for_update()
            .select_related("restaurant")
            .get(pk=table.pk)
        )
        session = get_active_table_session(table=locked_table)
        if session is None:
            session = create_table_session(table=locked_table)

        guest_count_before = session.guests.count()
        guest = create_session_guest(
            session=session,
            guest_number=guest_count_before + 1,
        )
        guest_count = guest_count_before + 1
        mode = get_session_mode(guest_count=guest_count)

    if guest_count >= 2:
        from apps.orders.events import broadcast_guest_joined

        broadcast_guest_joined(
            session=session,
            guest=guest,
            guest_count=guest_count,
            mode=mode,
        )

    return SessionStartResult(
        session=session,
        guest=guest,
        mode=mode,
        guest_count=guest_count,
    )


def get_active_table_session(*, table) -> TableSession | None:
    return (
        TableSession.objects.select_related("table__restaurant")
        .filter(table=table, expires_at__gt=timezone.now())
        .order_by("-created_at")
        .first()
    )


def create_session_guest(*, session, guest_number: int | None = None) -> SessionGuest:
    if guest_number is None:
        guest_number = session.guests.count() + 1

    while True:
        guest_token = f"guest_{secrets.token_urlsafe(24)}"
        if not SessionGuest.objects.filter(guest_token=guest_token).exists():
            break

    return SessionGuest.objects.create(
        session=session,
        guest_token=guest_token,
        display_name=get_default_guest_display_name(guest_number=guest_number),
        avatar_color=get_guest_avatar_color(guest_number=guest_number),
        last_seen_at=timezone.now(),
    )


def get_default_guest_display_name(*, guest_number: int) -> str:
    return f"Guest {guest_number}"


def get_guest_avatar_color(*, guest_number: int) -> str:
    return AVATAR_COLORS[(guest_number - 1) % len(AVATAR_COLORS)]


def get_session_mode(*, guest_count: int) -> str:
    if guest_count >= 2:
        return MODE_LOBBY
    return MODE_SOLO


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


def get_guest_for_session_from_headers(*, session, headers) -> SessionGuest | None:
    guest_token = headers.get(GUEST_HEADER, "").strip()
    if not guest_token:
        return None

    return get_guest_for_session_by_token(session=session, guest_token=guest_token)


def get_required_guest_for_session_from_headers(*, session, headers) -> SessionGuest:
    guest_token = headers.get(GUEST_HEADER, "").strip()
    if not guest_token:
        raise InvalidGuestError("invalid guest")

    return get_guest_for_session_by_token(session=session, guest_token=guest_token)


def get_guest_for_session_by_token(*, session, guest_token: str) -> SessionGuest:
    if not guest_token:
        raise InvalidGuestError("invalid guest")

    try:
        guest = SessionGuest.objects.get(session=session, guest_token=guest_token)
    except SessionGuest.DoesNotExist as exc:
        raise InvalidGuestError("invalid guest") from exc

    guest.last_seen_at = timezone.now()
    guest.save(update_fields=["last_seen_at", "updated_at"])
    return guest


def clean_guest_display_name(display_name: str | None) -> str:
    if display_name is None:
        return ""

    stripped = display_name.strip()
    if UNSAFE_DISPLAY_NAME_RE.search(stripped):
        raise GuestValidationError("invalid display name")

    cleaned = " ".join(stripped.split())
    if not cleaned:
        return ""

    if len(cleaned) > DISPLAY_NAME_MAX_LENGTH:
        raise GuestValidationError("invalid display name")

    return cleaned


def update_session_guest_display_name(*, session, guest, display_name) -> GuestUpdateResult:
    cleaned_name = clean_guest_display_name(display_name)
    if not cleaned_name:
        cleaned_name = get_default_guest_display_name(
            guest_number=get_guest_number(guest=guest),
        )

    guest.display_name = cleaned_name
    guest.last_seen_at = timezone.now()
    guest.save(update_fields=["display_name", "last_seen_at", "updated_at"])

    guest_count = session.guests.count()
    mode = get_session_mode(guest_count=guest_count)

    from apps.orders.events import broadcast_guest_updated

    broadcast_guest_updated(
        session=session,
        guest=guest,
        guest_count=guest_count,
        mode=mode,
    )

    return GuestUpdateResult(
        guest=guest,
        mode=mode,
        guest_count=guest_count,
    )


def get_guest_number(*, guest) -> int:
    if not guest.pk:
        return 1

    return SessionGuest.objects.filter(
        session=guest.session,
        id__lte=guest.id,
    ).count()
