from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel

User = get_user_model()

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a valid hex color string.",
)


class StaffRole(models.TextChoices):
    WAITER = "WAITER", "Waiter"
    ADMIN = "ADMIN", "Admin"
    KITCHEN = "KITCHEN", "Kitchen"
    CASHIER = "CASHIER", "Cashier"


class Restaurant(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=120, unique=True, db_index=True, editable=False)
    tagline = models.CharField(max_length=255, blank=True)
    welcome_message = models.TextField(blank=True)
    logo = models.FileField(upload_to="restaurants/logos/", null=True, blank=True)
    banner_image = models.FileField(upload_to="restaurants/banners/", null=True, blank=True)
    primary_color = models.CharField(
        max_length=7,
        null=True,
        blank=True,
        validators=[hex_color_validator],
    )
    secondary_color = models.CharField(
        max_length=7,
        null=True,
        blank=True,
        validators=[hex_color_validator],
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if self.pk:
            existing_slug = (
                Restaurant.objects.filter(pk=self.pk)
                .values_list("slug", flat=True)
                .first()
            )
            if existing_slug:
                self.slug = existing_slug
        else:
            self.slug = self._generate_unique_slug(self.slug or self.name)
        super().save(*args, **kwargs)

    def _generate_unique_slug(self, value: str) -> str:
        base_slug = slugify(value) or "restaurant"
        base_slug = base_slug[:120].strip("-") or "restaurant"
        candidate = base_slug
        suffix = 2
        while Restaurant.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
            suffix_text = f"-{suffix}"
            candidate = f"{base_slug[:120 - len(suffix_text)]}{suffix_text}"
            suffix += 1
        return candidate


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
