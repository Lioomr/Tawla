import secrets

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.restaurants.models import Staff, StaffRole, Table

User = get_user_model()


def generate_table_token() -> str:
    return f"tbl_{secrets.token_urlsafe(12)}"


class AdminTableSerializer(serializers.ModelSerializer):
    table_token = serializers.CharField(source="public_token")

    class Meta:
        model = Table
        fields = ["name", "table_token", "created_at"]


class AdminTableWriteSerializer(serializers.Serializer):
    table_token = serializers.CharField(required=False, allow_blank=True, max_length=64)
    name = serializers.CharField(max_length=100)


class AdminTableDeleteSerializer(serializers.Serializer):
    table_token = serializers.CharField(max_length=64)


class AdminStaffSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")

    class Meta:
        model = Staff
        fields = ["id", "username", "name", "role", "created_at"]


class AdminStaffCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128)
    name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=StaffRole.choices)


class AdminStaffUpdateSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField(min_value=1)
    name = serializers.CharField(required=False, max_length=255)
    role = serializers.ChoiceField(required=False, choices=StaffRole.choices)
    password = serializers.CharField(required=False, max_length=128)


class AdminStaffDeleteSerializer(serializers.Serializer):
    staff_id = serializers.IntegerField(min_value=1)
