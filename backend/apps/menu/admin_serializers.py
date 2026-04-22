from rest_framework import serializers

from apps.menu.models import Category, MenuItem


class AdminCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "item_count", "created_at"]

    def get_item_count(self, obj):
        annotated_count = getattr(obj, "item_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.items.count()


class AdminCategoryWriteSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False, min_value=1)
    name = serializers.CharField(max_length=120)


class AdminCategoryDeleteSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(min_value=1)


class AdminMenuItemSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "category_id",
            "category_name",
            "name",
            "description",
            "price",
            "is_available",
            "created_at",
        ]


class AdminMenuItemWriteSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField(required=False, min_value=1)
    category_id = serializers.IntegerField(min_value=1)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    is_available = serializers.BooleanField(required=False, default=True)


class AdminMenuItemDeleteSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField(min_value=1)
