from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.throttling import StaffLoginRateThrottle
from apps.restaurants.auth_serializers import (
    StaffProfileSerializer,
    StaffTokenObtainPairSerializer,
)
from apps.restaurants.permissions import IsStaffAuthenticated


class StaffLoginView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer
    throttle_classes = [StaffLoginRateThrottle]


class StaffRefreshView(TokenRefreshView):
    pass


class StaffMeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsStaffAuthenticated]

    def get(self, request):
        serializer = StaffProfileSerializer(request.user.staff_profile)
        return Response(serializer.data)
