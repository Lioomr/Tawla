from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.menu.models import MenuItem
from apps.orders.events import (
    broadcast_order_created,
    broadcast_order_updated,
    broadcast_table_request_created,
    broadcast_table_request_resolved,
)
from apps.orders.models import (
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentStatus,
    TableRequest,
    TableRequestStatus,
)


ORDER_COOLDOWN_SECONDS = 10
ALLOWED_ORDER_STATUS_TRANSITIONS = {
    OrderStatus.NEW: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.SERVED, OrderStatus.CANCELLED},
    OrderStatus.SERVED: set(),
    OrderStatus.CANCELLED: set(),
}


class OrderValidationError(Exception):
    pass


class TableRequestValidationError(Exception):
    pass


def create_order_for_session(*, session, items_data, guest=None):
    if not items_data:
        raise OrderValidationError("items are required")

    if guest is not None and guest.session_id != session.id:
        raise OrderValidationError("invalid guest")

    latest_order = session.orders.order_by("-created_at").first()
    if latest_order and (timezone.now() - latest_order.created_at).total_seconds() < ORDER_COOLDOWN_SECONDS:
        raise OrderValidationError("please wait before placing another order")

    requested_item_ids = [item["menu_item_id"] for item in items_data]
    if len(requested_item_ids) != len(set(requested_item_ids)):
        raise OrderValidationError("duplicate menu items are not allowed")

    menu_items = {
        item.id: item
        for item in MenuItem.objects.filter(
            id__in=requested_item_ids,
            restaurant=session.table.restaurant,
            is_available=True,
        )
    }

    if len(menu_items) != len(requested_item_ids):
        raise OrderValidationError("one or more menu items are invalid or unavailable")

    with transaction.atomic():
        order = Order.objects.create(
            restaurant=session.table.restaurant,
            table=session.table,
            session=session,
            guest=guest,
            status=OrderStatus.NEW,
            total_price=Decimal("0.00"),
        )

        total_price = Decimal("0.00")
        order_items = []
        for item_data in items_data:
            menu_item = menu_items[item_data["menu_item_id"]]
            line_total = menu_item.price * item_data["quantity"]
            total_price += line_total
            order_items.append(
                OrderItem(
                    order=order,
                    menu_item=menu_item,
                    quantity=item_data["quantity"],
                    price_at_time=menu_item.price,
                    notes=item_data.get("notes", ""),
                )
            )

        OrderItem.objects.bulk_create(order_items)
        order.total_price = total_price
        order.save(update_fields=["total_price", "updated_at"])

    broadcast_order_created(order=order)
    return order


def update_order_status(*, order, new_status):
    current_status = order.status
    if new_status == current_status:
        return order

    allowed_statuses = ALLOWED_ORDER_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in allowed_statuses:
        raise OrderValidationError(
            f"invalid status transition from {current_status} to {new_status}"
        )

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    broadcast_order_updated(order=order)
    return order


def create_payment_for_order(*, order, method):
    if hasattr(order, "payment"):
        raise OrderValidationError("payment already recorded")

    with transaction.atomic():
        payment = Payment.objects.create(
            order=order,
            method=method,
            status=PaymentStatus.PAID,
            amount=order.total_price,
        )

    return payment


def create_table_request_for_session(*, session, request_type, guest=None):
    if session.expires_at <= timezone.now():
        raise TableRequestValidationError("expired session")

    if guest is not None and guest.session_id != session.id:
        raise TableRequestValidationError("invalid guest")

    table_request = TableRequest.objects.create(
        restaurant=session.table.restaurant,
        table=session.table,
        session=session,
        guest=guest,
        request_type=request_type,
        status=TableRequestStatus.OPEN,
    )
    broadcast_table_request_created(table_request=table_request)
    return table_request


def resolve_table_request(*, table_request, actor_staff):
    with transaction.atomic():
        locked_request = (
            TableRequest.objects.select_for_update()
            .select_related("restaurant", "table", "session")
            .get(pk=table_request.pk)
        )
        if locked_request.status == TableRequestStatus.RESOLVED:
            raise TableRequestValidationError("request already resolved")

        locked_request.status = TableRequestStatus.RESOLVED
        locked_request.resolved_by = actor_staff
        locked_request.resolved_at = timezone.now()
        locked_request.save(
            update_fields=[
                "status",
                "resolved_by",
                "resolved_at",
                "updated_at",
            ]
        )

    broadcast_table_request_resolved(table_request=locked_request)
    return locked_request
