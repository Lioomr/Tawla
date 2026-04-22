from rest_framework import serializers

from apps.core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "action",
            "target_type",
            "target_identifier",
            "actor_name",
            "actor_role",
            "metadata",
            "created_at",
        ]

    def get_actor_name(self, obj):
        return obj.actor_staff.name if obj.actor_staff else None

    def get_actor_role(self, obj):
        return obj.actor_staff.role if obj.actor_staff else None
