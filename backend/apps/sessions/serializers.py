from rest_framework import serializers

from apps.restaurants.serializers import RestaurantBrandingSerializer


class SessionStartRequestSerializer(serializers.Serializer):
    table_token = serializers.CharField(max_length=64, trim_whitespace=True)


class SessionStartResponseSerializer(serializers.Serializer):
    session_token = serializers.CharField()
    expires_at = serializers.DateTimeField()
    restaurant = serializers.SerializerMethodField()

    def get_restaurant(self, obj):
        return RestaurantBrandingSerializer(
            obj.table.restaurant,
            context=self.context,
        ).data
