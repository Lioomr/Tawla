from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response
from apps.restaurants.models import Table
from apps.sessions.exceptions import (
    ExpiredSessionError,
    GuestValidationError,
    InvalidGuestError,
    InvalidSessionError,
)
from apps.sessions.serializers import (
    GuestDisplayNameUpdateRequestSerializer,
    GuestDisplayNameUpdateResponseSerializer,
    SessionRosterResponseSerializer,
    SessionStartRequestSerializer,
    SessionStartResponseSerializer,
)
from apps.sessions.services import (
    get_required_guest_for_session_from_headers,
    get_session_mode,
    get_valid_session_from_headers,
    start_or_join_table_session,
    update_session_guest_display_name,
)


class SessionStartView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        request_serializer = SessionStartRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        table_token = request_serializer.validated_data["table_token"]

        try:
            table = Table.objects.select_related("restaurant").get(public_token=table_token)
        except Table.DoesNotExist:
            return error_response(code="table_not_found", message="table not found", status_code=status.HTTP_404_NOT_FOUND)

        result = start_or_join_table_session(table=table)
        response_serializer = SessionStartResponseSerializer(
            result,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SessionDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            session = get_valid_session_from_headers(headers=request.META)
            current_guest = get_required_guest_for_session_from_headers(
                session=session,
                headers=request.META,
            )
        except InvalidSessionError:
            return error_response(code="invalid_session", message="invalid session", status_code=status.HTTP_401_UNAUTHORIZED)
        except ExpiredSessionError:
            return error_response(code="expired_session", message="expired session", status_code=status.HTTP_403_FORBIDDEN)
        except InvalidGuestError:
            return error_response(code="invalid_guest", message="invalid guest", status_code=status.HTTP_401_UNAUTHORIZED)

        guests = session.guests.order_by("joined_at", "id")
        guest_count = guests.count()
        payload = {
            "mode": get_session_mode(guest_count=guest_count),
            "guest_count": guest_count,
            "current_guest": current_guest,
            "guests": guests,
        }
        response_serializer = SessionRosterResponseSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class SessionGuestView(APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request):
        try:
            session = get_valid_session_from_headers(headers=request.META)
            guest = get_required_guest_for_session_from_headers(
                session=session,
                headers=request.META,
            )
        except InvalidSessionError:
            return error_response(code="invalid_session", message="invalid session", status_code=status.HTTP_401_UNAUTHORIZED)
        except ExpiredSessionError:
            return error_response(code="expired_session", message="expired session", status_code=status.HTTP_403_FORBIDDEN)
        except InvalidGuestError:
            return error_response(code="invalid_guest", message="invalid guest", status_code=status.HTTP_401_UNAUTHORIZED)

        serializer = GuestDisplayNameUpdateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            result = update_session_guest_display_name(
                session=session,
                guest=guest,
                display_name=serializer.validated_data.get("display_name"),
            )
        except GuestValidationError:
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        response_serializer = GuestDisplayNameUpdateResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
