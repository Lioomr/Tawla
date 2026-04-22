from django.db.models import Prefetch

from apps.menu.models import Category, MenuItem


def get_menu_categories_for_restaurant(*, restaurant):
    available_items = Prefetch(
        "items",
        queryset=MenuItem.objects.filter(is_available=True).order_by("name"),
        to_attr="available_items",
    )
    return Category.objects.filter(restaurant=restaurant).prefetch_related(available_items)
