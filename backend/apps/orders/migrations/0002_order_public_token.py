import secrets

from django.db import migrations, models


def generate_order_public_token():
    return f"ord_{secrets.token_urlsafe(12)}"


def populate_order_public_tokens(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.filter(public_token__isnull=True):
        order.public_token = generate_order_public_token()
        order.save(update_fields=["public_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="public_token",
            field=models.CharField(max_length=64, null=True),
        ),
        migrations.RunPython(populate_order_public_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="order",
            name="public_token",
            field=models.CharField(
                default=generate_order_public_token,
                max_length=64,
                unique=True,
            ),
        ),
    ]
