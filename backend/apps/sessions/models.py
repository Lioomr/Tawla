import secrets

from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.restaurants.models import Table


def generate_guest_token() -> str:
    return f"guest_{secrets.token_urlsafe(24)}"


class TableSession(TimeStampedModel):
    table = models.ForeignKey(
        Table,
        on_delete=models.PROTECT,
        related_name="sessions",
    )
    session_token = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.table.name} session"


class SessionGuest(TimeStampedModel):
    session = models.ForeignKey(
        TableSession,
        on_delete=models.PROTECT,
        related_name="guests",
    )
    guest_token = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        default=generate_guest_token,
    )
    display_name = models.CharField(max_length=40)
    avatar_color = models.CharField(max_length=7, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["joined_at", "id"]
        indexes = [
            models.Index(
                fields=["session", "joined_at"],
                name="sess_guest_session_joined_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.display_name
