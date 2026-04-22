from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.restaurants.models import Staff

User = get_user_model()


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        if hasattr(user, "staff_profile"):
            token["staff_role"] = user.staff_profile.role
            token["restaurant_id"] = user.staff_profile.restaurant_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        try:
            staff = self.user.staff_profile
        except Staff.DoesNotExist as exc:
            raise serializers.ValidationError({"error": "staff account not configured"}) from exc

        data["staff"] = {
            "username": self.user.username,
            "name": staff.name,
            "role": staff.role,
            "restaurant_id": staff.restaurant_id,
        }
        return data


class StaffProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")

    class Meta:
        model = Staff
        fields = ["username", "name", "role", "restaurant_id"]
