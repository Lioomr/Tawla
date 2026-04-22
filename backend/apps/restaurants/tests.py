from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
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


class AdminManagementApiTests(APITestCase):
    def setUp(self):
        cache.clear()
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
