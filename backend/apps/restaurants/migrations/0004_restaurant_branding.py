# Generated for restaurant branding fields.

import django.core.validators
from django.db import migrations, models
from django.utils.text import slugify


def populate_restaurant_slugs(apps, schema_editor):
    Restaurant = apps.get_model("restaurants", "Restaurant")
    used_slugs = set(
        Restaurant.objects.exclude(slug__isnull=True)
        .exclude(slug="")
        .values_list("slug", flat=True)
    )

    for restaurant in Restaurant.objects.filter(slug__isnull=True).order_by("id"):
        base_slug = slugify(restaurant.name) or "restaurant"
        base_slug = base_slug[:120].strip("-") or "restaurant"
        candidate = base_slug
        suffix = 2
        while candidate in used_slugs:
            suffix_text = f"-{suffix}"
            candidate = f"{base_slug[:120 - len(suffix_text)]}{suffix_text}"
            suffix += 1

        restaurant.slug = candidate
        restaurant.save(update_fields=["slug"])
        used_slugs.add(candidate)


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0003_alter_staff_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="restaurant",
            name="banner_image",
            field=models.FileField(blank=True, null=True, upload_to="restaurants/banners/"),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="logo",
            field=models.FileField(blank=True, null=True, upload_to="restaurants/logos/"),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="primary_color",
            field=models.CharField(
                blank=True,
                max_length=7,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Enter a valid hex color string.",
                        regex="^#[0-9A-Fa-f]{6}$",
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="secondary_color",
            field=models.CharField(
                blank=True,
                max_length=7,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Enter a valid hex color string.",
                        regex="^#[0-9A-Fa-f]{6}$",
                    )
                ],
            ),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="slug",
            field=models.SlugField(blank=True, db_index=True, editable=False, max_length=120, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="tagline",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="restaurant",
            name="welcome_message",
            field=models.TextField(blank=True),
        ),
        migrations.RunPython(populate_restaurant_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="restaurant",
            name="slug",
            field=models.SlugField(db_index=True, editable=False, max_length=120, unique=True),
        ),
    ]
