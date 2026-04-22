from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.orders.consumers import kitchen_group, waiter_group, session_orders_group


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
