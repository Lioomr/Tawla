from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
import os
import tempfile
from unittest.mock import patch

from apps.core.models import AuditLog
from apps.core.throttling import StaffLoginRateThrottle
from apps.restaurants.models import Restaurant, Staff, StaffRole

User = get_user_model()


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


class StaffAuthApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Auth Restaurant")
        self.user = User.objects.create_user(
            username="kitchen_auth",
            password="Password123!",
        )
        self.staff = Staff.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            name="Kitchen Auth",
            role=StaffRole.KITCHEN,
        )

    def test_staff_login_returns_jwt_pair_and_staff_profile(self):
        response = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_auth", "password": "Password123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["staff"]["role"], StaffRole.KITCHEN)

    def test_staff_me_requires_valid_jwt(self):
        login = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_auth", "password": "Password123!"},
            format="json",
        )
        access_token = login.data["access"]

        response = self.client.get(
            "/api/v1/staff/me/",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "kitchen_auth")
        self.assertEqual(response.data["role"], StaffRole.KITCHEN)

    def test_staff_login_rejects_user_without_staff_profile(self):
        User.objects.create_user(username="plain_user", password="Password123!")

        response = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "plain_user", "password": "Password123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_refresh_rotates_and_blacklists_old_refresh_token(self):
        login = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_auth", "password": "Password123!"},
            format="json",
        )
        old_refresh = login.data["refresh"]
        old_refresh_jti = RefreshToken(old_refresh)["jti"]

        refresh_response = self.client.post(
            "/api/v1/staff/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", refresh_response.data)
        self.assertNotEqual(refresh_response.data["refresh"], old_refresh)

        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=old_refresh_jti).exists()
        )

    def test_blacklisted_refresh_token_cannot_be_reused(self):
        login = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_auth", "password": "Password123!"},
            format="json",
        )
        old_refresh = login.data["refresh"]

        first_refresh = self.client.post(
            "/api/v1/staff/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(first_refresh.status_code, status.HTTP_200_OK)

        second_refresh = self.client.post(
            "/api/v1/staff/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(second_refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_login_updates_last_login(self):
        self.assertIsNone(self.user.last_login)

        response = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_auth", "password": "Password123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_staff_login_is_rate_limited(self):
        with patch.object(StaffLoginRateThrottle, "rate", "1/minute"):
            first = self.client.post(
                "/api/v1/staff/auth/login/",
                {"username": "kitchen_auth", "password": "Password123!"},
                format="json",
            )
            self.assertEqual(first.status_code, status.HTTP_200_OK)

            second = self.client.post(
                "/api/v1/staff/auth/login/",
                {"username": "kitchen_auth", "password": "Password123!"},
                format="json",
            )
            self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertEqual(second.data["error"]["code"], "rate_limit_exceeded")
            self.assertEqual(second.data["error"]["message"], "rate limit exceeded")


class RestaurantBrandingModelTests(APITestCase):
    def test_restaurant_branding_fields_and_unique_slug_are_created(self):
        first = Restaurant.objects.create(
            name="Cafe Noir!",
            tagline="Where every cup tells a story",
            welcome_message="Welcome!",
            primary_color="#FF0000",
            secondary_color="#1A1A1A",
        )
        second = Restaurant.objects.create(name="Cafe Noir!")

        self.assertEqual(first.slug, "cafe-noir")
        self.assertEqual(second.slug, "cafe-noir-2")
        self.assertFalse(first.logo)
        self.assertFalse(first.banner_image)
        self.assertEqual(first.primary_color, "#FF0000")
        self.assertEqual(first.secondary_color, "#1A1A1A")

        first.slug = "changed-slug"
        first.save()
        first.refresh_from_db()
        self.assertEqual(first.slug, "cafe-noir")

        custom = Restaurant.objects.create(name="Custom", slug="Unsafe Slug!")
        self.assertEqual(custom.slug, "unsafe-slug")


class AdminManagementApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.media_root = tempfile.TemporaryDirectory()
        self.override_settings = override_settings(MEDIA_ROOT=self.media_root.name)
        self.override_settings.enable()
        self.addCleanup(self.media_root.cleanup)
        self.addCleanup(self.override_settings.disable)

        self.restaurant = Restaurant.objects.create(name="Admin Restaurant")
        self.admin_user = User.objects.create_user(
            username="admin_auth",
            password="Password123!",
        )
        self.admin_staff = Staff.objects.create(
            user=self.admin_user,
            restaurant=self.restaurant,
            name="Admin Auth",
            role=StaffRole.ADMIN,
        )
        self.waiter_user = User.objects.create_user(
            username="waiter_auth",
            password="Password123!",
        )
        Staff.objects.create(
            user=self.waiter_user,
            restaurant=self.restaurant,
            name="Waiter Auth",
            role=StaffRole.WAITER,
        )
        self.admin_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "admin_auth", "password": "Password123!"},
            format="json",
        ).data["access"]
        self.waiter_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "waiter_auth", "password": "Password123!"},
            format="json",
        ).data["access"]

    def test_admin_can_create_list_update_and_delete_table(self):
        create_response = self.client.post(
            "/api/v1/admin/tables/",
            {"name": "Table A"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        table_token = create_response.data["table_token"]

        list_response = self.client.get(
            "/api/v1/admin/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["tables"]), 1)

        update_response = self.client.patch(
            "/api/v1/admin/tables/",
            {"table_token": table_token, "name": "Table AX"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["name"], "Table AX")

        delete_response = self.client.delete(
            "/api/v1/admin/tables/",
            {"table_token": table_token},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_non_admin_cannot_access_admin_tables(self):
        response = self.client.get(
            "/api/v1/admin/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_update_and_delete_staff(self):
        create_response = self.client.post(
            "/api/v1/admin/staff/",
            {
                "username": "kitchen_created",
                "password": "Password123!",
                "name": "Kitchen Created",
                "role": "KITCHEN",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        staff_id = create_response.data["id"]

        update_response = self.client.patch(
            "/api/v1/admin/staff/",
            {"staff_id": staff_id, "role": "WAITER", "name": "Updated Staff"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["role"], "WAITER")

        delete_response = self.client.delete(
            "/api/v1/admin/staff/",
            {"staff_id": staff_id},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_create_cashier_staff_and_cashier_can_login(self):
        create_response = self.client.post(
            "/api/v1/admin/staff/",
            {
                "username": "cashier_created",
                "password": "Password123!",
                "name": "Cashier Created",
                "role": "CASHIER",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["role"], StaffRole.CASHIER)

        login_response = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "cashier_created", "password": "Password123!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data["staff"]["role"], StaffRole.CASHIER)

    def test_admin_actions_are_logged_and_admin_can_read_audit_logs(self):
        create_response = self.client.post(
            "/api/v1/admin/tables/",
            {"name": "Audit Table"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                actor_staff=self.admin_staff,
                action="admin.table_created",
                target_identifier=create_response.data["table_token"],
            ).exists()
        )

        log_response = self.client.get(
            "/api/v1/admin/audit-logs/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(log_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(log_response.data["audit_logs"]), 1)
        self.assertEqual(log_response.data["audit_logs"][0]["action"], "admin.table_created")

    def test_admin_can_read_restaurant_branding(self):
        self.restaurant.tagline = "Original tagline"
        self.restaurant.welcome_message = "Original welcome"
        self.restaurant.primary_color = "#112233"
        self.restaurant.secondary_color = "#AABBCC"
        self.restaurant.save()

        response = self.client.get(
            "/api/v1/admin/restaurant/branding/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "name": "Admin Restaurant",
                "slug": "admin-restaurant",
                "tagline": "Original tagline",
                "welcome_message": "Original welcome",
                "logo": None,
                "banner_image": None,
                "primary_color": "#112233",
                "secondary_color": "#AABBCC",
            },
        )
        self.assertNotIn("id", response.data)

    def test_admin_can_update_allowed_branding_fields(self):
        original_slug = self.restaurant.slug

        response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {
                "slug": "malicious-slug",
                "name": "Malicious Name",
                "tagline": "New tagline",
                "welcome_message": "New welcome",
                "primary_color": "#FF5733",
                "secondary_color": "#101010",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Admin Restaurant")
        self.assertEqual(response.data["slug"], original_slug)
        self.assertEqual(response.data["tagline"], "New tagline")
        self.assertEqual(response.data["welcome_message"], "New welcome")
        self.assertEqual(response.data["primary_color"], "#FF5733")
        self.assertEqual(response.data["secondary_color"], "#101010")

        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.name, "Admin Restaurant")
        self.assertEqual(self.restaurant.slug, original_slug)
        self.assertEqual(self.restaurant.tagline, "New tagline")
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                actor_staff=self.admin_staff,
                action="admin.restaurant_branding_updated",
                target_identifier=original_slug,
            ).exists()
        )

    def test_non_admin_cannot_update_restaurant_branding(self):
        response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {"tagline": "Not allowed"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_branding_color_values_are_rejected(self):
        response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {"primary_color": "red"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(
            self,
            response,
            code="invalid_color_format",
            message="invalid color format",
        )

    def test_invalid_branding_image_uploads_are_rejected(self):
        response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {
                "logo": SimpleUploadedFile(
                    "logo.txt",
                    b"not an image",
                    content_type="text/plain",
                )
            },
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(
            self,
            response,
            code="image_upload_error",
            message="image upload error",
        )

    def test_admin_can_remove_restaurant_logo_and_banner(self):
        upload_response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {
                "logo": SimpleUploadedFile(
                    "logo.png",
                    b"logo",
                    content_type="image/png",
                ),
                "banner_image": SimpleUploadedFile(
                    "banner.webp",
                    b"banner",
                    content_type="image/webp",
                ),
            },
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_200_OK)
        self.restaurant.refresh_from_db()
        logo_path = self.restaurant.logo.path
        banner_path = self.restaurant.banner_image.path
        self.assertTrue(os.path.exists(logo_path))
        self.assertTrue(os.path.exists(banner_path))

        logo_response = self.client.delete(
            "/api/v1/admin/restaurant/branding/logo/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        banner_response = self.client.delete(
            "/api/v1/admin/restaurant/branding/banner/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(logo_response.status_code, status.HTTP_200_OK)
        self.assertEqual(banner_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(logo_response.data["logo"])
        self.assertIsNone(banner_response.data["banner_image"])
        self.restaurant.refresh_from_db()
        self.assertFalse(self.restaurant.logo)
        self.assertFalse(self.restaurant.banner_image)
        self.assertFalse(os.path.exists(logo_path))
        self.assertFalse(os.path.exists(banner_path))
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                action="admin.restaurant_logo_removed",
                target_identifier=self.restaurant.slug,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                action="admin.restaurant_banner_image_removed",
                target_identifier=self.restaurant.slug,
            ).exists()
        )

    def test_repeated_restaurant_logo_removal_is_safe(self):
        first_response = self.client.delete(
            "/api/v1/admin/restaurant/branding/logo/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        second_response = self.client.delete(
            "/api/v1/admin/restaurant/branding/logo/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(second_response.data["logo"])

    def test_non_admin_cannot_remove_restaurant_logo(self):
        response = self.client.delete(
            "/api/v1/admin/restaurant/branding/logo/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_branding_updates_are_scoped_to_authenticated_admin_restaurant(self):
        other_restaurant = Restaurant.objects.create(
            name="Other Admin Restaurant",
            tagline="Other tagline",
            primary_color="#000000",
        )
        other_user = User.objects.create_user(
            username="other_admin_auth",
            password="Password123!",
        )
        Staff.objects.create(
            user=other_user,
            restaurant=other_restaurant,
            name="Other Admin",
            role=StaffRole.ADMIN,
        )
        other_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "other_admin_auth", "password": "Password123!"},
            format="json",
        ).data["access"]

        response = self.client.patch(
            "/api/v1/admin/restaurant/branding/",
            {"tagline": "Scoped tagline"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {other_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Other Admin Restaurant")
        self.assertEqual(response.data["tagline"], "Scoped tagline")

        self.restaurant.refresh_from_db()
        other_restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.tagline, "")
        self.assertEqual(other_restaurant.tagline, "Scoped tagline")
        self.assertFalse(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                action="admin.restaurant_branding_updated",
            ).exists()
        )
