# Generated for category and menu item image fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="image",
            field=models.FileField(blank=True, null=True, upload_to="categories/"),
        ),
        migrations.AddField(
            model_name="menuitem",
            name="image",
            field=models.FileField(blank=True, null=True, upload_to="menu-items/"),
        ),
    ]
