from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.restaurants.models import Restaurant, Table
from apps.sessions.models import TableSession


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


class SessionStartApiTests(APITestCase):
    def setUp(self):
        restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            tagline="Fast bites",
            welcome_message="Welcome to Table 7.",
            primary_color="#FF0000",
            secondary_color="#00AAFF",
        )
        self.table = Table.objects.create(
            restaurant=restaurant,
            name="Table 7",
            public_token="table_token_123",
        )
        other_restaurant = Restaurant.objects.create(
            name="Other Restaurant",
            tagline="Hidden tagline",
            welcome_message="Hidden welcome",
            primary_color="#111111",
            secondary_color="#222222",
        )
        self.other_table = Table.objects.create(
            restaurant=other_restaurant,
            name="Table 1",
            public_token="other_table_token_123",
        )

    def test_start_session_creates_session_for_valid_table_token(self):
        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("session_token", response.data)
        self.assertIn("expires_at", response.data)
        self.assertNotIn("table_id", response.data)

        session = TableSession.objects.get(session_token=response.data["session_token"])
        self.assertEqual(session.table_id, self.table.id)
        self.assertGreater(session.expires_at, timezone.now() + timedelta(minutes=59))

    def test_start_session_returns_restaurant_branding(self):
        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["restaurant"],
            {
                "name": "Test Restaurant",
                "slug": "test-restaurant",
                "tagline": "Fast bites",
                "welcome_message": "Welcome to Table 7.",
                "logo": None,
                "banner_image": None,
                "primary_color": "#FF0000",
                "secondary_color": "#00AAFF",
            },
        )

    def test_start_session_branding_is_scoped_to_scanned_table_restaurant(self):
        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.other_table.public_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["restaurant"]["name"], "Other Restaurant")
        self.assertEqual(response.data["restaurant"]["tagline"], "Hidden tagline")
        self.assertEqual(response.data["restaurant"]["slug"], "other-restaurant")

    def test_start_session_rejects_missing_table_token(self):
        response = self.client.post("/api/v1/table/session/start/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="invalid_request", message="invalid request")

    def test_start_session_rejects_unknown_table_token(self):
        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": "missing_token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="table_not_found", message="table not found")

    def test_start_session_does_not_expose_internal_ids(self):
        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("table_id", response.data)
        self.assertNotIn("restaurant_id", response.data)
        self.assertNotIn("id", response.data["restaurant"])
        self.assertNotIn("restaurant_id", response.data["restaurant"])
