from rest_framework import serializers


class SessionStartRequestSerializer(serializers.Serializer):
    table_token = serializers.CharField(max_length=64, trim_whitespace=True)


class SessionStartResponseSerializer(serializers.Serializer):
    session_token = serializers.CharField()
    expires_at = serializers.DateTimeField()
