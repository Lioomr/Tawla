from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response
from apps.core.throttling import OrderCreateRateThrottle
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderCreateRequestSerializer,
    OrderCreateResponseSerializer,
    OrderDetailSerializer,
    OrderSummarySerializer,
)
from apps.orders.services import OrderValidationError, create_order_for_session
from apps.sessions.exceptions import ExpiredSessionError, InvalidSessionError
from apps.sessions.services import get_valid_session_from_headers


class SessionOrderMixin:
    authentication_classes = []
    permission_classes = []

    def get_session(self, request):
        try:
            return get_valid_session_from_headers(headers=request.META)
        except InvalidSessionError:
            return error_response(code="invalid_session", message="invalid session", status_code=status.HTTP_401_UNAUTHORIZED)
        except ExpiredSessionError:
            return error_response(code="expired_session", message="expired session", status_code=status.HTTP_403_FORBIDDEN)


class OrderCollectionView(SessionOrderMixin, APIView):
    throttle_classes = [OrderCreateRateThrottle]

    def get_throttles(self):
        if self.request.method != "POST":
            return []
        return super().get_throttles()

    def get(self, request):
        session = self.get_session(request)
        if isinstance(session, Response):
            return session

        orders = (
            session.orders.select_related("table")
            .prefetch_related("items__menu_item")
            .order_by("-created_at")
        )
        serializer = OrderSummarySerializer(orders, many=True)
        return Response({"orders": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        session = self.get_session(request)
        if isinstance(session, Response):
            return session

        serializer = OrderCreateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            order = create_order_for_session(
                session=session,
                items_data=serializer.validated_data["items"],
            )
        except OrderValidationError as exc:
            return error_response(code="order_validation_error", message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)

        response_serializer = OrderCreateResponseSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class OrderDetailView(SessionOrderMixin, APIView):
    def get(self, request, order_token):
        session = self.get_session(request)
        if isinstance(session, Response):
            return session

        try:
            order = (
                Order.objects.filter(session=session)
                .prefetch_related("items__menu_item")
                .get(public_token=order_token)
            )
        except Order.DoesNotExist:
            return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)

        serializer = OrderDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
