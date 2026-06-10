from rest_framework import serializers

ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def validate_uploaded_image(value):
    if value is None:
        return value
    content_type = getattr(value, "content_type", "")
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError("invalid image type")
    if value.size > MAX_IMAGE_SIZE_BYTES:
        raise serializers.ValidationError("image too large")
    return value
