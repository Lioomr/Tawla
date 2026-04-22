from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table
from apps.sessions.models import TableSession

User = get_user_model()


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


class MenuApiTests(APITestCase):
    def setUp(self):
        restaurant = Restaurant.objects.create(name="Menu Test Restaurant")
        self.table = Table.objects.create(
            restaurant=restaurant,
            name="Table 1",
            public_token="menu_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_menu_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )

        drinks = Category.objects.create(restaurant=restaurant, name="Drinks")
        meals = Category.objects.create(restaurant=restaurant, name="Meals")

        MenuItem.objects.create(
            restaurant=restaurant,
            category=drinks,
            name="Cola",
            price=Decimal("20.00"),
            is_available=True,
        )
        MenuItem.objects.create(
            restaurant=restaurant,
            category=drinks,
            name="Water",
            price=Decimal("10.00"),
            is_available=False,
        )
        MenuItem.objects.create(
            restaurant=restaurant,
            category=meals,
            name="Burger",
            price=Decimal("75.00"),
            is_available=True,
        )

        other_restaurant = Restaurant.objects.create(name="Other Restaurant")
        other_category = Category.objects.create(restaurant=other_restaurant, name="Hidden")
        MenuItem.objects.create(
            restaurant=other_restaurant,
            category=other_category,
            name="Hidden Item",
            price=Decimal("99.00"),
            is_available=True,
        )

    def test_get_menu_returns_available_items_for_session_restaurant(self):
        response = self.client.get(
            "/api/v1/menu/",
            HTTP_X_SESSION_TOKEN=self.session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("categories", response.data)
        self.assertEqual(len(response.data["categories"]), 2)

        drinks = next(category for category in response.data["categories"] if category["name"] == "Drinks")
        meals = next(category for category in response.data["categories"] if category["name"] == "Meals")

        self.assertEqual(len(drinks["items"]), 1)
        self.assertEqual(drinks["items"][0]["name"], "Cola")
        self.assertEqual(drinks["items"][0]["price"], "20.00")
        self.assertEqual(len(meals["items"]), 1)
        self.assertEqual(meals["items"][0]["name"], "Burger")

    def test_get_menu_rejects_invalid_session(self):
        response = self.client.get("/api/v1/menu/", HTTP_X_SESSION_TOKEN="bad_token")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        assert_error_payload(self, response, code="invalid_session", message="invalid session")

    def test_get_menu_rejects_expired_session(self):
        self.session.expires_at = timezone.now() - timedelta(minutes=1)
        self.session.save(update_fields=["expires_at"])

        response = self.client.get(
            "/api/v1/menu/",
            HTTP_X_SESSION_TOKEN=self.session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        assert_error_payload(self, response, code="expired_session", message="expired session")


class AdminMenuApiTests(APITestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Admin Menu Restaurant")
        self.admin_user = User.objects.create_user(username="admin_menu", password="Password123!")
        Staff.objects.create(
            user=self.admin_user,
            restaurant=self.restaurant,
            name="Admin Menu",
            role=StaffRole.ADMIN,
        )
        login = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "admin_menu", "password": "Password123!"},
            format="json",
        )
        self.admin_token = login.data["access"]
        self.category = Category.objects.create(restaurant=self.restaurant, name="Desserts")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Cake",
            description="Chocolate",
            price=Decimal("30.00"),
            is_available=True,
        )

    def test_admin_can_manage_categories(self):
        create_response = self.client.post(
            "/api/v1/admin/categories/",
            {"name": "Drinks"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        category_id = create_response.data["id"]

        list_response = self.client.get(
            "/api/v1/admin/categories/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["categories"]), 2)

        update_response = self.client.patch(
            "/api/v1/admin/categories/",
            {"category_id": category_id, "name": "Cold Drinks"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["name"], "Cold Drinks")

        delete_response = self.client.delete(
            "/api/v1/admin/categories/",
            {"category_id": category_id},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_manage_menu_items(self):
        create_response = self.client.post(
            "/api/v1/admin/menu-items/",
            {
                "category_id": self.category.id,
                "name": "Brownie",
                "description": "Warm",
                "price": "35.00",
                "is_available": True,
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        menu_item_id = create_response.data["id"]

        update_response = self.client.patch(
            "/api/v1/admin/menu-items/",
            {
                "menu_item_id": menu_item_id,
                "category_id": self.category.id,
                "name": "Brownie Deluxe",
                "description": "Warm and rich",
                "price": "40.00",
                "is_available": False,
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["name"], "Brownie Deluxe")
        self.assertEqual(update_response.data["is_available"], False)

        delete_response = self.client.delete(
            "/api/v1/admin/menu-items/",
            {"menu_item_id": menu_item_id},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
