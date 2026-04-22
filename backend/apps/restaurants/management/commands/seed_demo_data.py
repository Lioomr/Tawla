from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table

User = get_user_model()


class Command(BaseCommand):
    help = "Create a demo restaurant and table for local API testing."

    def handle(self, *args, **options):
        restaurant, _ = Restaurant.objects.get_or_create(name="Tawlax Demo Restaurant")
        table, _ = Table.objects.get_or_create(
            restaurant=restaurant,
            name="Table 1",
            defaults={"public_token": "demo_table_token_001"},
        )
        drinks, _ = Category.objects.get_or_create(restaurant=restaurant, name="Drinks")
        meals, _ = Category.objects.get_or_create(restaurant=restaurant, name="Meals")
        cola, _ = MenuItem.objects.get_or_create(
            restaurant=restaurant,
            category=drinks,
            name="Cola",
            defaults={"price": "20.00", "is_available": True},
        )
        water, _ = MenuItem.objects.get_or_create(
            restaurant=restaurant,
            category=drinks,
            name="Water",
            defaults={"price": "10.00", "is_available": False},
        )
        burger, _ = MenuItem.objects.get_or_create(
            restaurant=restaurant,
            category=meals,
            name="Burger",
            defaults={"price": "75.00", "is_available": True},
        )
        kitchen_user, _ = User.objects.get_or_create(username="kitchen_demo")
        kitchen_user.set_password("Password123!")
        kitchen_user.save()
        Staff.objects.get_or_create(
            user=kitchen_user,
            defaults={
                "restaurant": restaurant,
                "name": "Kitchen Demo",
                "role": StaffRole.KITCHEN,
            },
        )
        waiter_user, _ = User.objects.get_or_create(username="waiter_demo")
        waiter_user.set_password("Password123!")
        waiter_user.save()
        Staff.objects.get_or_create(
            user=waiter_user,
            defaults={
                "restaurant": restaurant,
                "name": "Waiter Demo",
                "role": StaffRole.WAITER,
            },
        )
        admin_user, _ = User.objects.get_or_create(username="admin_demo")
        admin_user.set_password("Password123!")
        admin_user.save()
        Staff.objects.get_or_create(
            user=admin_user,
            defaults={
                "restaurant": restaurant,
                "name": "Admin Demo",
                "role": StaffRole.ADMIN,
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready: "
                f"restaurant={restaurant.name}, table={table.name}, "
                f"table_token={table.public_token}, "
                f"cola_id={cola.id}, burger_id={burger.id}, water_id={water.id}, "
                "staff_users=kitchen_demo|waiter_demo|admin_demo, "
                "staff_password=Password123!"
            )
        )
