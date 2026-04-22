from django.db import models

from apps.core.models import TimeStampedModel
from apps.restaurants.models import Table


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
