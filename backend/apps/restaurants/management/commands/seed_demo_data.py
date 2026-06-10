from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.management.base import BaseCommand

from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table

User = get_user_model()

STAFF_PASSWORD = "Password123!"
ASSET_DIR = Path(settings.BASE_DIR) / "demo_assets" / "el_baraka"

RESTAURANT_DATA = {
    "name": "البركة",
    "slug": "albarka",
    "tagline": "أكل مصري سريع بطعم البيت",
    "welcome_message": "أهلا بيك في البركة. اختار طلبك من المنيو وهنحضرهولك على الترابيزة.",
    "primary_color": "#D71920",
    "secondary_color": "#2B0000",
}

RESTAURANT_IMAGES = {
    "logo": "logo el abraka.jpg",
    "banner_image": "Banner image.jpg",
}

TABLES = [
    ("ترابيزة 1", "barka_table_001"),
    ("ترابيزة 2", "barka_table_002"),
    ("ترابيزة 3", "barka_table_003"),
    ("ترابيزة 4", "barka_table_004"),
]

STAFF_USERS = [
    ("barka_admin", "Barka Admin", StaffRole.ADMIN),
    ("barka_kitchen", "Barka Kitchen", StaffRole.KITCHEN),
    ("barka_waiter", "Barka Waiter", StaffRole.WAITER),
    ("barka_cashier", "Barka Cashier", StaffRole.CASHIER),
]

CATEGORIES = [
    {
        "name": "منيو الوجبات",
        "image": "Fried Chicken picture.jpg",
        "sort_order": 1,
    },
    {
        "name": "منيو الفتات",
        "image": "Big fattah.jpg",
        "sort_order": 2,
    },
    {
        "name": "الإضافات",
        "image": "coleslaw sauce.png",
        "sort_order": 3,
    },
    {
        "name": "الصوصات",
        "image": "Garlic sauce.png",
        "sort_order": 4,
    },
]

MENU_ITEMS = [
    {
        "category": "منيو الوجبات",
        "name": "ربع فرخة بروستد",
        "description": "ربع فرخة بروستد مع أرز وعيش ومخلل وصوص.",
        "price": "140.00",
        "image": "two piecee cheicken.png",
        "sort_order": 1,
    },
    {
        "category": "منيو الوجبات",
        "name": "وجبة سترس",
        "description": "قطع فراخ كرسبي مع أرز وعيش ومخلل وصوص.",
        "price": "155.00",
        "image": "Strips logo.jpg",
        "sort_order": 2,
    },
    {
        "category": "منيو الوجبات",
        "name": "وجبة البركة",
        "description": "وجبة فراخ كرسبي عائلية مع أرز وإضافات وصوصات.",
        "price": "240.00",
        "image": "Fried Chicken picture.jpg",
        "sort_order": 3,
    },
    {
        "category": "منيو الفتات",
        "name": "فتة",
        "description": "فتة رز وعيش محمص وقطع فراخ مع اختيار الصوص.",
        "price": "165.00",
        "image": "Big fattah.jpg",
        "sort_order": 1,
    },
    {
        "category": "منيو الفتات",
        "name": "بسمنتو",
        "description": "بسمنتو فراخ مع رز وصوص حسب الاختيار.",
        "price": "110.00",
        "image": "small fattha.jpg",
        "sort_order": 2,
    },
    {
        "category": "الإضافات",
        "name": "كول سلو",
        "description": "سلطة كول سلو.",
        "price": "20.00",
        "image": "coleslaw sauce.png",
        "sort_order": 1,
    },
    {
        "category": "الصوصات",
        "name": "تومية",
        "description": "صوص تومية.",
        "price": "10.00",
        "image": "Garlic sauce.png",
        "sort_order": 1,
    },
    {
        "category": "الصوصات",
        "name": "باربكيو",
        "description": "صوص باربكيو.",
        "price": "10.00",
        "image": "BBQ sauce.png",
        "sort_order": 2,
    },
    {
        "category": "الصوصات",
        "name": "رانش",
        "description": "صوص رانش.",
        "price": "10.00",
        "image": "Ranch sauec.jpg",
        "sort_order": 3,
    },
    {
        "category": "الصوصات",
        "name": "سبايسي",
        "description": "صوص سبايسي.",
        "price": "10.00",
        "image": "spice sauce.png",
        "sort_order": 4,
    },
]


class Command(BaseCommand):
    help = "Create or update the Barka-style demo restaurant for local API testing."

    def handle(self, *args, **options):
        restaurant = self.upsert_restaurant()
        tables = self.upsert_tables(restaurant=restaurant)
        self.upsert_staff(restaurant=restaurant)
        categories = self.upsert_categories(restaurant=restaurant)
        items = self.upsert_menu_items(restaurant=restaurant, categories=categories)

        self.stdout.write(
            self.style.SUCCESS(
                "Barka demo data ready: restaurant=albarka, "
                f"slug={restaurant.slug}, menu_items={len(items)}"
            )
        )
        self.stdout.write(f"Demo asset directory: {ASSET_DIR}")
        self.stdout.write("Demo table tokens:")
        for index, table in enumerate(tables, start=1):
            self.stdout.write(f"- Table {index}: {table.public_token}")
        self.stdout.write("Demo staff credentials:")
        for username, _, role in STAFF_USERS:
            self.stdout.write(
                f"- {role}: username={username}, password={STAFF_PASSWORD}"
            )

    def upsert_restaurant(self):
        restaurant = self.get_demo_restaurant()
        for field, value in RESTAURANT_DATA.items():
            setattr(restaurant, field, value)
        restaurant.save()
        if restaurant.slug != RESTAURANT_DATA["slug"]:
            Restaurant.objects.filter(pk=restaurant.pk).update(
                slug=RESTAURANT_DATA["slug"]
            )
            restaurant.refresh_from_db()
        self.attach_file(
            instance=restaurant,
            field_name="logo",
            filename=RESTAURANT_IMAGES["logo"],
            storage_name=self.storage_name(
                folder="restaurants/logos",
                stem="albarka-logo",
                filename=RESTAURANT_IMAGES["logo"],
            ),
        )
        self.attach_file(
            instance=restaurant,
            field_name="banner_image",
            filename=RESTAURANT_IMAGES["banner_image"],
            storage_name=self.storage_name(
                folder="restaurants/banners",
                stem="albarka-banner",
                filename=RESTAURANT_IMAGES["banner_image"],
            ),
        )
        return restaurant

    def get_demo_restaurant(self):
        try:
            return Restaurant.objects.get(slug=RESTAURANT_DATA["slug"])
        except Restaurant.DoesNotExist:
            existing = Restaurant.objects.filter(name=RESTAURANT_DATA["name"]).first()
            if existing:
                return existing
            return Restaurant.objects.create(**RESTAURANT_DATA)

    def upsert_tables(self, *, restaurant):
        tables = []
        for name, public_token in TABLES:
            table, _ = Table.objects.update_or_create(
                restaurant=restaurant,
                name=name,
                defaults={"public_token": public_token},
            )
            tables.append(table)
        return tables

    def upsert_staff(self, *, restaurant):
        for username, name, role in STAFF_USERS:
            user, _ = User.objects.get_or_create(username=username)
            user.set_password(STAFF_PASSWORD)
            user.save()
            Staff.objects.update_or_create(
                user=user,
                defaults={
                    "restaurant": restaurant,
                    "name": name,
                    "role": role,
                },
            )

    def upsert_categories(self, *, restaurant):
        categories = {}
        for category_data in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                restaurant=restaurant,
                name=category_data["name"],
                defaults={"sort_order": category_data["sort_order"]},
            )
            self.attach_file(
                instance=category,
                field_name="image",
                filename=category_data["image"],
                storage_name=self.storage_name(
                    folder="categories",
                    stem=f"albarka-{category.id}",
                    filename=category_data["image"],
                ),
            )
            categories[category_data["name"]] = category
        return categories

    def upsert_menu_items(self, *, restaurant, categories):
        items = []
        for item_data in MENU_ITEMS:
            category = categories[item_data["category"]]
            item, _ = MenuItem.objects.update_or_create(
                restaurant=restaurant,
                category=category,
                name=item_data["name"],
                defaults={
                    "description": item_data["description"],
                    "price": item_data["price"],
                    "is_available": True,
                    "sort_order": item_data["sort_order"],
                },
            )
            self.attach_file(
                instance=item,
                field_name="image",
                filename=item_data["image"],
                storage_name=self.storage_name(
                    folder="menu-items",
                    stem=f"albarka-{item.id}",
                    filename=item_data["image"],
                ),
            )
            items.append(item)
        return items

    def attach_file(self, *, instance, field_name, filename, storage_name):
        source_path = ASSET_DIR / filename
        if not source_path.exists():
            self.stdout.write(
                self.style.WARNING(f"Missing demo asset: {source_path}")
            )
            return

        field = getattr(instance, field_name)
        if field and field.name == storage_name and field.storage.exists(field.name):
            return

        if field and field.name and field.storage.exists(field.name):
            field.storage.delete(field.name)

        with source_path.open("rb") as source_file:
            field.save(storage_name, File(source_file), save=True)

    def storage_name(self, *, folder, stem, filename):
        suffix = Path(filename).suffix.lower()
        return f"{stem}{suffix}"
