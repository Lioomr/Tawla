from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.orders.consumers import cashier_group, kitchen_group, waiter_group, session_orders_group


def broadcast_order_created(*, order):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    customer_payload = {
        "type": "order_created",
        "order_id": order.public_token,
        "status": order.status,
    }
    staff_payload = {
        "type": "order_created",
        "order_id": order.public_token,
        "table": order.table.name,
        "status": order.status,
    }

    async_to_sync(channel_layer.group_send)(
        session_orders_group(order.session.session_token),
        {"type": "order_created", "payload": customer_payload},
    )
    async_to_sync(channel_layer.group_send)(
        kitchen_group(order.restaurant_id),
        {"type": "order_created", "payload": staff_payload},
    )
    async_to_sync(channel_layer.group_send)(
        waiter_group(order.restaurant_id),
        {"type": "order_created", "payload": staff_payload},
    )
    async_to_sync(channel_layer.group_send)(
        cashier_group(order.restaurant_id),
        {"type": "order_created", "payload": staff_payload},
    )


def broadcast_order_updated(*, order):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "type": "order_updated",
        "order_id": order.public_token,
        "status": order.status,
    }

    async_to_sync(channel_layer.group_send)(
        session_orders_group(order.session.session_token),
        {"type": "order_updated", "payload": payload},
    )
    async_to_sync(channel_layer.group_send)(
        kitchen_group(order.restaurant_id),
        {"type": "order_updated", "payload": payload},
    )
    async_to_sync(channel_layer.group_send)(
        waiter_group(order.restaurant_id),
        {"type": "order_updated", "payload": payload},
    )
    async_to_sync(channel_layer.group_send)(
        cashier_group(order.restaurant_id),
        {"type": "order_updated", "payload": payload},
    )


def broadcast_guest_joined(*, session, guest, guest_count, mode):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "type": "guest_joined",
        "guest_token": guest.guest_token,
        "display_name": guest.display_name,
        "avatar_color": guest.avatar_color,
        "guest_count": guest_count,
        "mode": mode,
    }

    async_to_sync(channel_layer.group_send)(
        session_orders_group(session.session_token),
        {"type": "guest_joined", "payload": payload},
    )


def broadcast_guest_updated(*, session, guest, guest_count, mode):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "type": "guest_updated",
        "guest_token": guest.guest_token,
        "display_name": guest.display_name,
        "avatar_color": guest.avatar_color,
        "guest_count": guest_count,
        "mode": mode,
    }

    async_to_sync(channel_layer.group_send)(
        session_orders_group(session.session_token),
        {"type": "guest_updated", "payload": payload},
    )


def broadcast_table_request_created(*, table_request):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "type": "table_request_created",
        "request_token": table_request.request_token,
        "request_type": table_request.request_type,
        "table": table_request.table.name,
        "status": table_request.status,
    }

    async_to_sync(channel_layer.group_send)(
        waiter_group(table_request.restaurant_id),
        {"type": "table_request_created", "payload": payload},
    )


def broadcast_table_request_resolved(*, table_request):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "type": "table_request_resolved",
        "request_token": table_request.request_token,
        "request_type": table_request.request_type,
        "status": table_request.status,
    }

    async_to_sync(channel_layer.group_send)(
        session_orders_group(table_request.session.session_token),
        {"type": "table_request_resolved", "payload": payload},
    )
