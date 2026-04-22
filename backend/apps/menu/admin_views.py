from django.db.models.deletion import ProtectedError
from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.core.responses import error_response
from apps.core.services import create_audit_log
from apps.menu.admin_serializers import (
    AdminCategoryDeleteSerializer,
    AdminCategorySerializer,
    AdminCategoryWriteSerializer,
    AdminMenuItemDeleteSerializer,
    AdminMenuItemSerializer,
    AdminMenuItemWriteSerializer,
)
from apps.menu.models import Category, MenuItem
from apps.restaurants.permissions import IsAdminStaff


class AdminCategoryCollectionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        categories = Category.objects.filter(restaurant=restaurant).annotate(
            item_count=Count("items")
        )
        serializer = AdminCategorySerializer(categories, many=True)
        return Response({"categories": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminCategoryWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        if Category.objects.filter(restaurant=restaurant, name=serializer.validated_data["name"]).exists():
            return error_response(code="category_exists", message="category already exists", status_code=status.HTTP_400_BAD_REQUEST)

        category = Category.objects.create(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
        )
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.category_created",
            target_type="category",
            target_identifier=category.id,
            metadata={"name": category.name},
        )
        response_serializer = AdminCategorySerializer(category)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        serializer = AdminCategoryWriteSerializer(data=request.data)
        if not serializer.is_valid() or "category_id" not in serializer.validated_data:
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            category = Category.objects.get(
                id=serializer.validated_data["category_id"],
                restaurant=restaurant,
            )
        except Category.DoesNotExist:
            return error_response(code="category_not_found", message="category not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_name = category.name
        category.name = serializer.validated_data["name"]
        category.save(update_fields=["name", "updated_at"])
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.category_updated",
            target_type="category",
            target_identifier=category.id,
            metadata={"from_name": previous_name, "to_name": category.name},
        )
        response_serializer = AdminCategorySerializer(category)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        serializer = AdminCategoryDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            category = Category.objects.get(
                id=serializer.validated_data["category_id"],
                restaurant=restaurant,
            )
        except Category.DoesNotExist:
            return error_response(code="category_not_found", message="category not found", status_code=status.HTTP_404_NOT_FOUND)

        try:
            category.delete()
        except ProtectedError:
            return error_response(code="category_has_items", message="category has menu items", status_code=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.category_deleted",
            target_type="category",
            target_identifier=serializer.validated_data["category_id"],
            metadata={},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminMenuItemCollectionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminStaff]

    def get(self, request):
        restaurant = request.user.staff_profile.restaurant
        items = (
            MenuItem.objects.filter(restaurant=restaurant)
            .select_related("category")
            .order_by("category__name", "name")
        )
        serializer = AdminMenuItemSerializer(items, many=True)
        return Response({"items": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminMenuItemWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            category = Category.objects.get(
                id=serializer.validated_data["category_id"],
                restaurant=restaurant,
            )
        except Category.DoesNotExist:
            return error_response(code="category_not_found", message="category not found", status_code=status.HTTP_404_NOT_FOUND)

        item = MenuItem.objects.create(
            restaurant=restaurant,
            category=category,
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            price=serializer.validated_data["price"],
            is_available=serializer.validated_data.get("is_available", True),
        )
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.menu_item_created",
            target_type="menu_item",
            target_identifier=item.id,
            metadata={
                "name": item.name,
                "category_id": category.id,
                "price": str(item.price),
                "is_available": item.is_available,
            },
        )
        response_serializer = AdminMenuItemSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        serializer = AdminMenuItemWriteSerializer(data=request.data)
        if not serializer.is_valid() or "menu_item_id" not in serializer.validated_data:
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            item = MenuItem.objects.get(
                id=serializer.validated_data["menu_item_id"],
                restaurant=restaurant,
            )
        except MenuItem.DoesNotExist:
            return error_response(code="menu_item_not_found", message="menu item not found", status_code=status.HTTP_404_NOT_FOUND)

        try:
            category = Category.objects.get(
                id=serializer.validated_data["category_id"],
                restaurant=restaurant,
            )
        except Category.DoesNotExist:
            return error_response(code="category_not_found", message="category not found", status_code=status.HTTP_404_NOT_FOUND)

        previous_state = {
            "name": item.name,
            "category_id": item.category_id,
            "price": str(item.price),
            "is_available": item.is_available,
        }
        item.category = category
        item.name = serializer.validated_data["name"]
        item.description = serializer.validated_data.get("description", "")
        item.price = serializer.validated_data["price"]
        item.is_available = serializer.validated_data.get("is_available", True)
        item.save()
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.menu_item_updated",
            target_type="menu_item",
            target_identifier=item.id,
            metadata={
                "from": previous_state,
                "to": {
                    "name": item.name,
                    "category_id": item.category_id,
                    "price": str(item.price),
                    "is_available": item.is_available,
                },
            },
        )
        response_serializer = AdminMenuItemSerializer(item)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        serializer = AdminMenuItemDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(code="invalid_request", message="invalid request", status_code=status.HTTP_400_BAD_REQUEST)

        restaurant = request.user.staff_profile.restaurant
        try:
            item = MenuItem.objects.get(
                id=serializer.validated_data["menu_item_id"],
                restaurant=restaurant,
            )
        except MenuItem.DoesNotExist:
            return error_response(code="menu_item_not_found", message="menu item not found", status_code=status.HTTP_404_NOT_FOUND)

        try:
            item.delete()
        except ProtectedError:
            return error_response(code="menu_item_in_use", message="menu item is used by orders", status_code=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            restaurant=restaurant,
            actor_staff=request.user.staff_profile,
            action="admin.menu_item_deleted",
            target_type="menu_item",
            target_identifier=serializer.validated_data["menu_item_id"],
            metadata={},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
