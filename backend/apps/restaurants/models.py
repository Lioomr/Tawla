from django.contrib.auth import get_user_model
from django.db import models

from apps.core.models import TimeStampedModel

User = get_user_model()


class StaffRole(models.TextChoices):
    WAITER = "WAITER", "Waiter"
    ADMIN = "ADMIN", "Admin"
    KITCHEN = "KITCHEN", "Kitchen"


class Restaurant(TimeStampedModel):
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Table(TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="tables",
    )
    name = models.CharField(max_length=100)
    public_token = models.CharField(max_length=64, unique=True, db_index=True)

    class Meta:
        ordering = ["restaurant_id", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="restaurants_table_unique_name_per_restaurant",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.restaurant.name} - {self.name}"


class Staff(TimeStampedModel):
    user = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name="staff_profile",
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="staff_members",
    )
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=StaffRole.choices)

    class Meta:
        ordering = ["restaurant_id", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.role})"
