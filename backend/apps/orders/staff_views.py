from collections import defaultdict
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.core.responses import error_response
from apps.core.services import create_audit_log
from apps.core.throttling import PaymentCreateRateThrottle
from apps.orders.admin_serializers import AdminOrderSerializer
from apps.orders.models import Order, OrderStatus, PaymentStatus
from apps.orders.serializers import OrderDetailSerializer, PaymentCreateRequestSerializer, PaymentResponseSerializer
from apps.orders.services import OrderValidationError, create_payment_for_order, update_order_status
from apps.orders.staff_serializers import (
    KitchenOrderStatusUpdateSerializer,
    KitchenOrderSummarySerializer,
    WaiterTableSummarySerializer,
)
from apps.restaurants.models import StaffRole
from apps.restaurants.permissions import IsAdminStaff, IsKitchenOrAdmin, IsWaiterOrAdmin
from apps.sessions.exceptions import ExpiredSessionError, InvalidSessionError
from apps.sessions.services import get_valid_session_by_token


class KitchenOrderListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsKitchenOrAdmin]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        orders = (
            Order.objects.filter(restaurant=restaurant)
            .select_related("table")
            .prefetch_related("items__menu_item")
            .order_by("-created_at")
        )
        serializer = KitchenOrderSummarySerializer(orders, many=True)
        return Response({"orders": serializer.data}, status=status.HTTP_200_OK)


class KitchenOrderStatusUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsKitchenOrAdmin]
    allowed_statuses = {OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLED}

    def patch(self, request, order_token):
        serializer = KitchenOrderStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data["status"]
        if new_status not in self.allowed_statuses:
            return error_response(
                code="invalid_request",
                message="invalid request",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.select_related("restaurant", "table", "session").get(
                public_token=order_token,
                restaurant=request.user.staff_profile.restaurant,
            )
        except Order.DoesNotExist:
            return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_status = order.status
        try:
            order = update_order_status(order=order, new_status=new_status)
        except OrderValidationError as exc:
            return error_response(
                code="order_validation_error",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        create_audit_log(
            restaurant=order.restaurant,
            actor_staff=request.user.staff_profile,
            action="kitchen.order_status_updated",
            target_type="order",
            target_identifier=order.public_token,
            metadata={
                "from_status": previous_status,
                "to_status": order.status,
                "table": order.table.name,
            },
        )
        response_serializer = OrderDetailSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class WaiterTableListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsWaiterOrAdmin]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        orders = (
            Order.objects.filter(restaurant=restaurant)
            .select_related("table", "payment")
            .order_by("table__name", "-created_at")
        )

        grouped_orders = defaultdict(list)
        for order in orders:
            grouped_orders[order.table].append(order)

        table_summaries = []
        for table, table_orders in grouped_orders.items():
            latest_order = table_orders[0]
            try:
                payment = latest_order.payment
            except ObjectDoesNotExist:
                payment = None
            table_summaries.append(
                {
                    "table": table.name,
                    "active_order_count": len(table_orders),
                    "latest_status": latest_order.status,
                    "payment_status": payment.status if payment else None,
                    "orders": table_orders,
                }
            )

        serializer = WaiterTableSummarySerializer(table_summaries, many=True)
        return Response({"tables": serializer.data}, status=status.HTTP_200_OK)


class WaiterOrderServeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsWaiterOrAdmin]

    def patch(self, request, order_token):
        try:
            order = Order.objects.select_related("restaurant", "table", "session").get(
                public_token=order_token,
                restaurant=request.user.staff_profile.restaurant,
            )
        except Order.DoesNotExist:
            return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_status = order.status
        try:
            order = update_order_status(order=order, new_status=OrderStatus.SERVED)
        except OrderValidationError as exc:
            return error_response(
                code="order_validation_error",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        create_audit_log(
            restaurant=order.restaurant,
            actor_staff=request.user.staff_profile,
            action="waiter.order_served",
            target_type="order",
            target_identifier=order.public_token,
            metadata={
                "from_status": previous_status,
                "to_status": order.status,
                "table": order.table.name,
            },
        )
        response_serializer = OrderDetailSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class PaymentCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    throttle_classes = [PaymentCreateRateThrottle]

    def post(self, request):
        serializer = PaymentCreateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        order_token = serializer.validated_data["order_id"]
        order = None

        if request.user and request.user.is_authenticated and hasattr(request.user, "staff_profile"):
            if request.user.staff_profile.role not in {StaffRole.WAITER, StaffRole.ADMIN}:
                return error_response(code="forbidden", message="forbidden", status_code=status.HTTP_403_FORBIDDEN)

            try:
                order = Order.objects.select_related("restaurant").get(
                    public_token=order_token,
                    restaurant=request.user.staff_profile.restaurant,
                )
            except Order.DoesNotExist:
                return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)
        else:
            session_token = request.headers.get("X-Session-Token", "")
            try:
                session = get_valid_session_by_token(session_token=session_token)
            except InvalidSessionError as exc:
                return error_response(code="invalid_session", message=str(exc), status_code=status.HTTP_401_UNAUTHORIZED)
            except ExpiredSessionError as exc:
                return error_response(code="expired_session", message=str(exc), status_code=status.HTTP_403_FORBIDDEN)

            try:
                order = Order.objects.select_related("session").get(
                    public_token=order_token,
                    session=session,
                )
            except Order.DoesNotExist:
                return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)

        try:
            payment = create_payment_for_order(
                order=order,
                method=serializer.validated_data["method"],
            )
        except OrderValidationError as exc:
            return error_response(code="payment_validation_error", message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        actor_staff = request.user.staff_profile if request.user and request.user.is_authenticated and hasattr(request.user, "staff_profile") else None
        create_audit_log(
            restaurant=order.restaurant,
            actor_staff=actor_staff,
            action="payment.recorded",
            target_type="order",
            target_identifier=order.public_token,
            metadata={
                "method": payment.method,
                "amount": str(payment.amount),
                "payment_status": payment.status,
                "actor_type": actor_staff.role if actor_staff else "CUSTOMER_SESSION",
            },
        )
        response_serializer = PaymentResponseSerializer(payment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AdminOrderListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        orders = (
            Order.objects.filter(restaurant=restaurant)
            .select_related("table", "payment")
            .order_by("-created_at")
        )
        serializer = AdminOrderSerializer(orders, many=True)
        return Response({"orders": serializer.data}, status=status.HTTP_200_OK)


class AdminAnalyticsSummaryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        today = timezone.localdate()
        orders_today = Order.objects.filter(
            restaurant=restaurant,
            created_at__date=today,
        ).count()
        popular_items = list(
            Order.objects.filter(restaurant=restaurant)
            .values("items__menu_item__name")
            .annotate(total_quantity=Sum("items__quantity"))
            .order_by("-total_quantity", "items__menu_item__name")[:5]
        )
        total_revenue = (
            Order.objects.filter(
                restaurant=restaurant,
                status=OrderStatus.SERVED,
                payment__status=PaymentStatus.PAID,
            ).aggregate(total=Sum("total_price"))["total"]
            or 0
        )
        response = {
            "orders_today": orders_today,
            "totalRevenue": float(total_revenue),
            "popular_items": [
                {
                    "name": item["items__menu_item__name"],
                    "total_quantity": item["total_quantity"] or 0,
                }
                for item in popular_items
                if item["items__menu_item__name"]
            ],
        }
        return Response(response, status=status.HTTP_200_OK)
