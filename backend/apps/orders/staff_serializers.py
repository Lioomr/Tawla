from rest_framework import serializers

from apps.orders.models import Order, OrderStatus, Payment, PaymentStatus, TableRequest
from apps.orders.serializers import OrderGuestSerializer, OrderItemResponseSerializer


class CashierTableStatus:
    EMPTY = "EMPTY"
    ORDERING = "ORDERING"
    PREPARING = "PREPARING"
    SERVED = "SERVED"


CASHIER_TABLE_STATUS_BY_ORDER_STATUS = {
    OrderStatus.NEW: CashierTableStatus.ORDERING,
    OrderStatus.PREPARING: CashierTableStatus.PREPARING,
    OrderStatus.READY: CashierTableStatus.SERVED,
    OrderStatus.SERVED: CashierTableStatus.SERVED,
}


class KitchenOrderSummarySerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    table = serializers.CharField(source="table.name")
    items = OrderItemResponseSerializer(many=True)
    guest = OrderGuestSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ["order_id", "table", "status", "created_at", "items", "guest"]


class KitchenOrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)


class WaiterOrderServeSerializer(serializers.Serializer):
    pass


class WaiterTableOrderSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    payment_status = serializers.SerializerMethodField()
    guest = OrderGuestSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ["order_id", "status", "total_price", "created_at", "payment_status", "guest"]

    def get_payment_status(self, obj):
        try:
            return obj.payment.status
        except Exception:
            return None


class WaiterTableSummarySerializer(serializers.Serializer):
    table = serializers.CharField()
    active_order_count = serializers.IntegerField()
    latest_status = serializers.CharField(allow_null=True)
    payment_status = serializers.CharField(allow_null=True)
    orders = WaiterTableOrderSerializer(many=True)


def get_cashier_payment_status(order):
    try:
        return order.payment.status
    except Payment.DoesNotExist:
        return PaymentStatus.PENDING


class CashierTableSummarySerializer(serializers.Serializer):
    table_name = serializers.CharField()
    table_token = serializers.CharField()
    status = serializers.ChoiceField(
        choices=[
            CashierTableStatus.EMPTY,
            CashierTableStatus.ORDERING,
            CashierTableStatus.PREPARING,
            CashierTableStatus.SERVED,
        ]
    )
    order_id = serializers.CharField(allow_null=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    payment_status = serializers.CharField(allow_null=True)
    guest = OrderGuestSerializer(allow_null=True)


class CashierTableOrderDetailSerializer(CashierTableSummarySerializer):
    order_status = serializers.CharField(allow_null=True)
    items = OrderItemResponseSerializer(many=True)


class WaiterTableRequestSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="request_type")
    table = serializers.CharField(source="table.name")
    guest = OrderGuestSerializer(read_only=True)

    class Meta:
        model = TableRequest
        fields = [
            "request_token",
            "type",
            "status",
            "table",
            "created_at",
            "resolved_at",
            "guest",
        ]
