from django.db import models

from apps.core.models import TimeStampedModel
from apps.restaurants.models import Restaurant


class Category(TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="categories",
    )
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["restaurant_id", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="menu_category_unique_name_per_restaurant",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class MenuItem(TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="menu_items",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="items",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ["restaurant_id", "category_id", "name"]
        indexes = [
            models.Index(fields=["restaurant", "category"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "category", "name"],
                name="menu_item_unique_name_per_category",
            ),
        ]

    def __str__(self) -> str:
        return self.name
