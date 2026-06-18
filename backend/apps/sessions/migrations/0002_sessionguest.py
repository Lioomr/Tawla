import apps.sessions.models
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("table_sessions", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SessionGuest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "guest_token",
                    models.CharField(
                        db_index=True,
                        default=apps.sessions.models.generate_guest_token,
                        max_length=128,
                        unique=True,
                    ),
                ),
                ("display_name", models.CharField(max_length=40)),
                ("avatar_color", models.CharField(blank=True, max_length=7)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="guests",
                        to="table_sessions.tablesession",
                    ),
                ),
            ],
            options={
                "ordering": ["joined_at", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="sessionguest",
            index=models.Index(fields=["session", "joined_at"], name="sess_guest_session_joined_idx"),
        ),
    ]
