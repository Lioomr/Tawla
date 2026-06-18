from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response
from apps.core.throttling import OrderCreateRateThrottle, TableRequestCreateRateThrottle
from apps.orders.models import Order
from apps.orders.serializers import (
    OrderCreateRequestSerializer,
    OrderCreateResponseSerializer,
    OrderDetailSerializer,
    OrderSummarySerializer,
    CustomerTableRequestSerializer,
    TableRequestCreateRequestSerializer,
    TableRequestSerializer,
)
from apps.orders.services import (
    OrderValidationError,
    TableRequestValidationError,
    create_order_for_session,
    create_table_request_for_session,
)
from apps.sessions.exceptions import ExpiredSessionError, InvalidGuestError, InvalidSessionError
from apps.sessions.services import get_guest_for_session_from_headers, get_valid_session_from_headers


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
            session.orders.select_related("table", "guest")
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
            guest = get_guest_for_session_from_headers(
                session=session,
                headers=request.META,
            )
        except InvalidGuestError:
            return error_response(code="invalid_guest", message="invalid guest", status_code=status.HTTP_401_UNAUTHORIZED)

        try:
            order = create_order_for_session(
                session=session,
                items_data=serializer.validated_data["items"],
                guest=guest,
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
                .select_related("guest")
                .prefetch_related("items__menu_item")
                .get(public_token=order_token)
            )
        except Order.DoesNotExist:
            return error_response(code="order_not_found", message="order not found", status_code=status.HTTP_404_NOT_FOUND)

        serializer = OrderDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TableRequestCreateView(SessionOrderMixin, APIView):
    throttle_classes = [TableRequestCreateRateThrottle]

    def get_throttles(self):
        if self.request.method != "POST":
            return []
        return super().get_throttles()

    def get(self, request):
        session = self.get_session(request)
        if isinstance(session, Response):
            return session

        table_requests = (
            session.table_requests.select_related("guest")
            .order_by("-created_at")
        )
        serializer = CustomerTableRequestSerializer(table_requests, many=True)
        return Response({"requests": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        session = self.get_session(request)
        if isinstance(session, Response):
            return session

        serializer = TableRequestCreateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            guest = get_guest_for_session_from_headers(
                session=session,
                headers=request.META,
            )
        except InvalidGuestError:
            return error_response(code="invalid_guest", message="invalid guest", status_code=status.HTTP_401_UNAUTHORIZED)

        try:
            table_request = create_table_request_for_session(
                session=session,
                request_type=serializer.validated_data["type"],
                guest=guest,
            )
        except TableRequestValidationError as exc:
            return error_response(
                code="table_request_validation_error",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = TableRequestSerializer(table_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
