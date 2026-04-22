import apps.orders.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_public_token"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="public_token",
            field=models.CharField(
                default=apps.orders.models.generate_order_public_token,
                max_length=64,
                unique=True,
            ),
        ),
    ]
