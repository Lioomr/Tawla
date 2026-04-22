from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(TimeStampedModel):
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.PROTECT,
        related_name="audit_logs",
    )
    actor_staff = models.ForeignKey(
        "restaurants.Staff",
        on_delete=models.PROTECT,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=100, db_index=True)
    target_identifier = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["restaurant", "created_at"],
                name="core_auditl_restaur_72aa5f_idx",
            ),
            models.Index(
                fields=["action", "created_at"],
                name="core_auditl_action_49a3ff_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} -> {self.target_type}:{self.target_identifier}"
