from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response
from apps.restaurants.models import Table
from apps.sessions.serializers import (
    SessionStartRequestSerializer,
    SessionStartResponseSerializer,
)
from apps.sessions.services import create_table_session


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

        session = create_table_session(table=table)
        response_serializer = SessionStartResponseSerializer(session)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
