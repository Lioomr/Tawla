from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.core.responses import error_response
from apps.core.services import create_audit_log
from apps.restaurants.admin_serializers import (
    AdminStaffCreateSerializer,
    AdminStaffDeleteSerializer,
    AdminStaffSerializer,
    AdminStaffUpdateSerializer,
    AdminTableDeleteSerializer,
    AdminTableSerializer,
    AdminTableWriteSerializer,
    generate_table_token,
)
from apps.restaurants.models import Staff, Table
from apps.restaurants.permissions import IsAdminStaff

User = get_user_model()


class AdminTableCollectionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        tables = Table.objects.filter(restaurant=restaurant).order_by("name")
        serializer = AdminTableSerializer(tables, many=True)
        return Response({"tables": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminTableWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        public_token = serializer.validated_data.get("table_token") or generate_table_token()
        if Table.objects.filter(public_token=public_token).exists():
            return error_response(code="table_token_exists", message="table token already exists", status_code=status.HTTP_400_BAD_REQUEST)

        table = Table.objects.create(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
            public_token=public_token,
        )
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.table_created",
            target_type="table",
            target_identifier=table.public_token,
            metadata={"name": table.name},
        )
        response_serializer = AdminTableSerializer(table)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        serializer = AdminTableWriteSerializer(data=request.data)
        if not serializer.is_valid() or "table_token" not in serializer.validated_data:
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            table = Table.objects.get(
                public_token=serializer.validated_data["table_token"],
                restaurant=restaurant,
            )
        except Table.DoesNotExist:
            return error_response(code="table_not_found", message="table not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_name = table.name
        table.name = serializer.validated_data["name"]
        table.save(update_fields=["name", "updated_at"])
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.table_updated",
            target_type="table",
            target_identifier=table.public_token,
            metadata={"from_name": previous_name, "to_name": table.name},
        )
        response_serializer = AdminTableSerializer(table)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        serializer = AdminTableDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            table = Table.objects.get(
                public_token=serializer.validated_data["table_token"],
                restaurant=restaurant,
            )
        except Table.DoesNotExist:
            return error_response(code="table_not_found", message="table not found", status_code=status.HTTP_404_NOT_FOUND)

        try:
            table.delete()
        except ProtectedError:
            return error_response(code="table_in_use", message="table is in use", status_code=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.table_deleted",
            target_type="table",
            target_identifier=serializer.validated_data["table_token"],
            metadata={},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminStaffCollectionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        staff_members = (
            Staff.objects.filter(restaurant=restaurant)
            .select_related("user")
            .order_by("name")
        )
        serializer = AdminStaffSerializer(staff_members, many=True)
        return Response({"staff": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminStaffCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=serializer.validated_data["username"]).exists():
            return error_response(code="username_exists", message="username already exists", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = User.objects.create_user(
                username=serializer.validated_data["username"],
                password=serializer.validated_data["password"],
            )
            staff = Staff.objects.create(
                user=user,
                restaurant=request.user.staff_profile.restaurant,
                name=serializer.validated_data["name"],
                role=serializer.validated_data["role"],
            )

        create_audit_log(
            restaurant=request.user.staff_profile.restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.staff_created",
            target_type="staff",
            target_identifier=staff.id,
            metadata={
                "username": user.username,
                "name": staff.name,
                "role": staff.role,
            },
        )
        response_serializer = AdminStaffSerializer(staff)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        serializer = AdminStaffUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            staff = Staff.objects.select_related("user").get(
                id=serializer.validated_data["staff_id"],
                restaurant=restaurant,
            )
        except Staff.DoesNotExist:
            return error_response(code="staff_not_found", message="staff not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_state = {"name": staff.name, "role": staff.role}
        if "name" in serializer.validated_data:
            staff.name = serializer.validated_data["name"]
        if "role" in serializer.validated_data:
            staff.role = serializer.validated_data["role"]
        staff.save()

        if "password" in serializer.validated_data:
            staff.user.set_password(serializer.validated_data["password"])
            staff.user.save(update_fields=["password"])

        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.staff_updated",
            target_type="staff",
            target_identifier=staff.id,
            metadata={
                "from": previous_state,
                "to": {"name": staff.name, "role": staff.role},
                "password_changed": "password" in serializer.validated_data,
            },
        )
        response_serializer = AdminStaffSerializer(staff)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        serializer = AdminStaffDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            staff = Staff.objects.select_related("user").get(
                id=serializer.validated_data["staff_id"],
                restaurant=restaurant,
            )
        except Staff.DoesNotExist:
            return error_response(code="staff_not_found", message="staff not found", status_code=status.HTTP_404_NOT_FOUND)

        deleted_snapshot = {
            "id": staff.id,
            "username": staff.user.username,
            "name": staff.name,
            "role": staff.role,
        }
        user = staff.user
        staff.delete()
        user.delete()
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.staff_deleted",
            target_type="staff",
            target_identifier=deleted_snapshot["id"],
            metadata=deleted_snapshot,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
