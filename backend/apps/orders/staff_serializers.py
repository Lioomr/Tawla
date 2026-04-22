from rest_framework import serializers

from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import OrderItemResponseSerializer


class KitchenOrderSummarySerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    table = serializers.CharField(source="table.name")
    items = OrderItemResponseSerializer(many=True)

    class Meta:
        model = Order
        fields = ["order_id", "table", "status", "created_at", "items"]


class KitchenOrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)


class WaiterOrderServeSerializer(serializers.Serializer):
    pass


class WaiterTableOrderSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["order_id", "status", "total_price", "created_at", "payment_status"]

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
