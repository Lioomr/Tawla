from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.core.models import AuditLog
from apps.core.serializers import AuditLogSerializer
from apps.restaurants.permissions import IsAdminStaff


class AdminAuditLogListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        logs = (
            AuditLog.objects.filter(restaurant=request.user.staff_profile.restaurant)
            .select_related("actor_staff")
            .order_by("-created_at")[:100]
        )
        serializer = AuditLogSerializer(logs, many=True)
        return Response({"audit_logs": serializer.data}, status=status.HTTP_200_OK)
