from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from apps.orders.models import Order
from apps.orders.serializers import OrderGuestSerializer


class AdminOrderSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="public_token")
    table = serializers.CharField(source="table.name")
    payment_status = serializers.SerializerMethodField()
    guest = OrderGuestSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ["order_id", "table", "status", "total_price", "payment_status", "created_at", "guest"]

    def get_payment_status(self, obj):
        try:
            return obj.payment.status
        except ObjectDoesNotExist:
            return None


class AdminPopularItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    total_quantity = serializers.IntegerField()
