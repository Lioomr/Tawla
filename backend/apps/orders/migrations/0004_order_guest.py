import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("table_sessions", "0002_sessionguest"),
        ("orders", "0003_alter_order_public_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="guest",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="orders",
                to="table_sessions.sessionguest",
            ),
        ),
    ]
