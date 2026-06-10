from datetime import timedelta
from decimal import Decimal
import os
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import AuditLog
from apps.menu.models import Category, MenuItem
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table
from apps.sessions.models import TableSession

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_RENDERER_CLASSES": [
            "rest_framework.renderers.JSONRenderer",
        ],
        "DEFAULT_PARSER_CLASSES": [
            "rest_framework.parsers.JSONParser",
        ],
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
        "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
        "DEFAULT_THROTTLE_RATES": {
            "staff_login": "100/minute",
            "order_create": "10/minute",
            "payment_create": "5/minute",
        },
    }
)
class UnthrottledMenuTestCase(APITestCase):
    pass


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


def access_token_for(user):
    return str(RefreshToken.for_user(user).access_token)


class MenuApiTests(UnthrottledMenuTestCase):
    def setUp(self):
        restaurant = Restaurant.objects.create(
            name="Menu Test Restaurant",
            tagline="Fresh and fast",
            welcome_message="Welcome to your table.",
            primary_color="#FF0000",
            secondary_color="#00AAFF",
        )
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

        drinks = Category.objects.create(
            restaurant=restaurant,
            name="Drinks",
            image="categories/drinks.png",
        )
        meals = Category.objects.create(restaurant=restaurant, name="Meals")

        MenuItem.objects.create(
            restaurant=restaurant,
            category=drinks,
            name="Cola",
            price=Decimal("20.00"),
            is_available=True,
            image="menu-items/cola.webp",
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
        self.assertEqual(
            response.data["restaurant"],
            {
                "name": "Menu Test Restaurant",
                "slug": "menu-test-restaurant",
                "tagline": "Fresh and fast",
                "welcome_message": "Welcome to your table.",
                "logo": None,
                "banner_image": None,
                "primary_color": "#FF0000",
                "secondary_color": "#00AAFF",
            },
        )
        self.assertIn("categories", response.data)
        self.assertEqual(len(response.data["categories"]), 2)

        drinks = next(category for category in response.data["categories"] if category["name"] == "Drinks")
        meals = next(category for category in response.data["categories"] if category["name"] == "Meals")

        self.assertEqual(len(drinks["items"]), 1)
        self.assertEqual(drinks["items"][0]["name"], "Cola")
        self.assertEqual(drinks["items"][0]["price"], "20.00")
        self.assertEqual(drinks["image"], "http://testserver/media/categories/drinks.png")
        self.assertEqual(drinks["items"][0]["image"], "http://testserver/media/menu-items/cola.webp")
        self.assertEqual(len(meals["items"]), 1)
        self.assertEqual(meals["items"][0]["name"], "Burger")
        self.assertIsNone(meals["image"])
        self.assertIsNone(meals["items"][0]["image"])

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


class MenuImageModelTests(UnthrottledMenuTestCase):
    def test_category_and_menu_item_image_fields_are_optional(self):
        restaurant = Restaurant.objects.create(name="Image Model Restaurant")
        category = Category.objects.create(restaurant=restaurant, name="Images")
        item = MenuItem.objects.create(
            restaurant=restaurant,
            category=category,
            name="Photo Item",
            price=Decimal("12.00"),
        )

        self.assertFalse(category.image)
        self.assertFalse(item.image)

        category.image = "categories/category.png"
        item.image = "menu-items/item.png"
        category.save(update_fields=["image"])
        item.save(update_fields=["image"])

        category.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(category.image.name, "categories/category.png")
        self.assertEqual(item.image.name, "menu-items/item.png")


class AdminMenuApiTests(UnthrottledMenuTestCase):
    def setUp(self):
        self.media_root = tempfile.TemporaryDirectory()
        self.override_settings = override_settings(MEDIA_ROOT=self.media_root.name)
        self.override_settings.enable()
        self.addCleanup(self.media_root.cleanup)
        self.addCleanup(self.override_settings.disable)

        self.restaurant = Restaurant.objects.create(name="Admin Menu Restaurant")
        self.admin_user = User.objects.create_user(username="admin_menu", password="Password123!")
        Staff.objects.create(
            user=self.admin_user,
            restaurant=self.restaurant,
            name="Admin Menu",
            role=StaffRole.ADMIN,
        )
        self.admin_token = access_token_for(self.admin_user)
        self.waiter_user = User.objects.create_user(username="waiter_menu", password="Password123!")
        Staff.objects.create(
            user=self.waiter_user,
            restaurant=self.restaurant,
            name="Waiter Menu",
            role=StaffRole.WAITER,
        )
        self.waiter_token = access_token_for(self.waiter_user)
        self.category = Category.objects.create(restaurant=self.restaurant, name="Desserts")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Cake",
            description="Chocolate",
            price=Decimal("30.00"),
            is_available=True,
        )
        self.other_restaurant = Restaurant.objects.create(name="Other Menu Restaurant")
        self.other_category = Category.objects.create(
            restaurant=self.other_restaurant,
            name="Other Desserts",
        )
        self.other_item = MenuItem.objects.create(
            restaurant=self.other_restaurant,
            category=self.other_category,
            name="Other Cake",
            price=Decimal("33.00"),
            is_available=True,
        )

    def image_file(self, name="image.png", content_type="image/png", size=16):
        return SimpleUploadedFile(name, b"x" * size, content_type=content_type)

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
        self.assertIn("image", list_response.data["categories"][0])

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
        self.assertIn("image", create_response.data)

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

    def test_admin_can_upload_category_image(self):
        response = self.client.post(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            {"image": self.image_file("category.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("/media/categories/category", response.data["image"])
        self.category.refresh_from_db()
        self.assertTrue(self.category.image.name.startswith("categories/category"))

    def test_admin_can_remove_category_image(self):
        upload_response = self.client.post(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            {"image": self.image_file("category.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_200_OK)
        self.category.refresh_from_db()
        image_path = self.category.image.path
        self.assertTrue(os.path.exists(image_path))

        response = self.client.delete(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["image"])
        self.category.refresh_from_db()
        self.assertFalse(self.category.image)
        self.assertFalse(os.path.exists(image_path))
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                action="admin.category_image_removed",
                target_identifier=str(self.category.id),
            ).exists()
        )

    def test_repeated_category_image_removal_is_safe(self):
        first_response = self.client.delete(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        second_response = self.client.delete(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(second_response.data["image"])

    def test_admin_can_upload_menu_item_image(self):
        response = self.client.post(
            f"/api/v1/admin/menu-items/{self.item.id}/image/",
            {"image": self.image_file("item.webp", content_type="image/webp")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("/media/menu-items/item", response.data["image"])
        self.item.refresh_from_db()
        self.assertTrue(self.item.image.name.startswith("menu-items/item"))

    def test_admin_can_remove_menu_item_image(self):
        upload_response = self.client.post(
            f"/api/v1/admin/menu-items/{self.item.id}/image/",
            {"image": self.image_file("item.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        image_path = self.item.image.path
        self.assertTrue(os.path.exists(image_path))

        response = self.client.delete(
            f"/api/v1/admin/menu-items/{self.item.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["image"])
        self.item.refresh_from_db()
        self.assertFalse(self.item.image)
        self.assertFalse(os.path.exists(image_path))
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                action="admin.menu_item_image_removed",
                target_identifier=str(self.item.id),
            ).exists()
        )

    def test_non_admin_cannot_upload_category_image(self):
        response = self.client.post(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            {"image": self.image_file("category.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_remove_category_image(self):
        response = self.client.delete(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_file_type_is_rejected(self):
        response = self.client.post(
            f"/api/v1/admin/categories/{self.category.id}/image/",
            {"image": self.image_file("category.txt", content_type="text/plain")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="image_upload_error", message="image upload error")

    def test_oversized_file_is_rejected(self):
        response = self.client.post(
            f"/api/v1/admin/menu-items/{self.item.id}/image/",
            {"image": self.image_file("large.png", size=(5 * 1024 * 1024) + 1)},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="image_upload_error", message="image upload error")

    def test_cross_restaurant_category_image_upload_is_rejected(self):
        response = self.client.post(
            f"/api/v1/admin/categories/{self.other_category.id}/image/",
            {"image": self.image_file("other.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="category_not_found", message="category not found")

    def test_cross_restaurant_category_image_removal_is_rejected(self):
        response = self.client.delete(
            f"/api/v1/admin/categories/{self.other_category.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="category_not_found", message="category not found")

    def test_cross_restaurant_menu_item_image_upload_is_rejected(self):
        response = self.client.post(
            f"/api/v1/admin/menu-items/{self.other_item.id}/image/",
            {"image": self.image_file("other.png")},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="menu_item_not_found", message="menu item not found")

    def test_cross_restaurant_menu_item_image_removal_is_rejected(self):
        response = self.client.delete(
            f"/api/v1/admin/menu-items/{self.other_item.id}/image/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="menu_item_not_found", message="menu item not found")
