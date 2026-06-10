import re

from rest_framework import serializers

from apps.core.upload_validators import validate_uploaded_image
from apps.restaurants.models import Restaurant

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class RestaurantBrandingSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(read_only=True)
    primary_color = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=False,
    )
    secondary_color = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=False,
    )

    class Meta:
        model = Restaurant
        fields = [
            "name",
            "slug",
            "tagline",
            "welcome_message",
            "logo",
            "banner_image",
            "primary_color",
            "secondary_color",
        ]
        read_only_fields = ["name", "slug"]

    def validate_primary_color(self, value):
        return self._validate_hex_color(value)

    def validate_secondary_color(self, value):
        return self._validate_hex_color(value)

    def validate_logo(self, value):
        return validate_uploaded_image(value)

    def validate_banner_image(self, value):
        return validate_uploaded_image(value)

    def _validate_hex_color(self, value):
        if value is None:
            return value
        if not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError("invalid color format")
        return value
