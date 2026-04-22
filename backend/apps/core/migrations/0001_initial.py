from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("restaurants", "0002_staff"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("action", models.CharField(db_index=True, max_length=100)),
                ("target_type", models.CharField(db_index=True, max_length=100)),
                ("target_identifier", models.CharField(max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("actor_staff", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="audit_logs", to="restaurants.staff")),
                ("restaurant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="audit_logs", to="restaurants.restaurant")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["restaurant", "created_at"], name="core_auditl_restaur_72aa5f_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["action", "created_at"], name="core_auditl_action_49a3ff_idx"),
        ),
    ]
