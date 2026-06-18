from rest_framework import serializers

from apps.restaurants.serializers import RestaurantBrandingSerializer
from apps.sessions.exceptions import GuestValidationError
from apps.sessions.models import SessionGuest
from apps.sessions.services import DISPLAY_NAME_MAX_LENGTH, clean_guest_display_name


class SessionStartRequestSerializer(serializers.Serializer):
    table_token = serializers.CharField(max_length=64, trim_whitespace=True)


class SessionStartResponseSerializer(serializers.Serializer):
    session_token = serializers.CharField()
    guest_token = serializers.CharField()
    mode = serializers.CharField()
    guest_count = serializers.IntegerField()
    expires_at = serializers.DateTimeField()
    restaurant = serializers.SerializerMethodField()

    def get_restaurant(self, obj):
        return RestaurantBrandingSerializer(
            obj.session.table.restaurant,
            context=self.context,
        ).data


class GuestDisplayNameUpdateRequestSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=DISPLAY_NAME_MAX_LENGTH,
        trim_whitespace=True,
    )

    def validate_display_name(self, value):
        try:
            return clean_guest_display_name(value)
        except GuestValidationError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class GuestDisplayNameUpdateResponseSerializer(serializers.Serializer):
    guest_token = serializers.CharField()
    display_name = serializers.CharField()
    avatar_color = serializers.CharField(allow_blank=True)
    mode = serializers.CharField()
    guest_count = serializers.IntegerField()


class SessionGuestPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionGuest
        fields = ["guest_token", "display_name", "avatar_color"]


class SessionRosterResponseSerializer(serializers.Serializer):
    mode = serializers.CharField()
    guest_count = serializers.IntegerField()
    current_guest = SessionGuestPublicSerializer()
    guests = SessionGuestPublicSerializer(many=True)
