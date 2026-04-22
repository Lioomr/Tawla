from apps.core.models import AuditLog


def create_audit_log(
    *,
    restaurant,
    action,
    target_type,
    target_identifier,
    actor_staff=None,
    metadata=None,
):
    return AuditLog.objects.create(
        restaurant=restaurant,
        actor_staff=actor_staff,
        action=action,
        target_type=target_type,
        target_identifier=str(target_identifier),
        metadata=metadata or {},
    )
