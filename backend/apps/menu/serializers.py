from rest_framework import serializers

from apps.menu.models import Category, MenuItem


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ["id", "name", "price", "is_available"]


class CategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "items"]

    def get_items(self, obj):
        items = getattr(obj, "available_items", obj.items.filter(is_available=True))
        return MenuItemSerializer(items, many=True).data
