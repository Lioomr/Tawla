from rest_framework import serializers

from apps.orders.models import Order, OrderItem, Payment, PaymentMethod, PaymentStatus


class OrderItemRequestSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class OrderCreateRequestSerializer(serializers.Serializer):
    items = OrderItemRequestSerializer(many=True, allow_empty=False)


class OrderCreateResponseSerializer(serializers.Serializer):
    order_id = serializers.CharField(source="public_token")
    status = serializers.CharField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderItemResponseSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="menu_item.name")

    class Meta:
        model = OrderItem
        fields = ["name", "quantity", "notes"]


class OrderSummarySerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")

    class Meta:
        model = Order
        fields = ["order_id", "status", "total_price", "created_at"]


class OrderDetailSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    items = OrderItemResponseSerializer(many=True)

    class Meta:
        model = Order
        fields = ["order_id", "status", "total_price", "created_at", "items"]


class PaymentCreateRequestSerializer(serializers.Serializer):
    order_id = serializers.CharField(max_length=64)
    method = serializers.ChoiceField(choices=PaymentMethod.choices)


class PaymentResponseSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="order.public_token")

    class Meta:
        model = Payment
        fields = ["order_id", "method", "status", "amount", "created_at"]


class OrderWithPaymentSerializer(OrderDetailSerializer):
    payment = serializers.SerializerMethodField()

    class Meta(OrderDetailSerializer.Meta):
        fields = OrderDetailSerializer.Meta.fields + ["payment"]

    def get_payment(self, obj):
        try:
            payment = obj.payment
        except Payment.DoesNotExist:
            return None

        return {
            "method": payment.method,
            "status": payment.status,
            "amount": str(payment.amount),
            "created_at": payment.created_at,
        }
