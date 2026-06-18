from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.restaurants.models import Restaurant, Table
from apps.sessions.models import SessionGuest, TableSession


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


def assert_public_guest_payload(testcase, payload, guest):
    testcase.assertEqual(
        payload,
        {
            "guest_token": guest.guest_token,
            "display_name": guest.display_name,
            "avatar_color": guest.avatar_color,
        },
    )


def assert_no_internal_ids(testcase, payload):
    forbidden_keys = {
        "id",
        "guest_id",
        "session_id",
        "table_id",
        "restaurant_id",
        "session_token",
    }

    if isinstance(payload, dict):
        for key, value in payload.items():
            testcase.assertNotIn(key, forbidden_keys)
            assert_no_internal_ids(testcase, value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_internal_ids(testcase, item)


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
        self.assertIn("guest_token", response.data)
        self.assertIn("expires_at", response.data)
        self.assertEqual(response.data["mode"], "solo")
        self.assertEqual(response.data["guest_count"], 1)
        self.assertNotIn("table_id", response.data)

        session = TableSession.objects.get(session_token=response.data["session_token"])
        self.assertEqual(session.table_id, self.table.id)
        self.assertGreater(session.expires_at, timezone.now() + timedelta(minutes=59))
        guest = SessionGuest.objects.get(guest_token=response.data["guest_token"])
        self.assertEqual(guest.session_id, session.id)
        self.assertEqual(guest.display_name, "Guest 1")

    def test_second_scan_joins_active_session_and_returns_lobby_mode(self):
        first = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )
        second = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.data["session_token"], first.data["session_token"])
        self.assertNotEqual(second.data["guest_token"], first.data["guest_token"])
        self.assertEqual(second.data["mode"], "lobby")
        self.assertEqual(second.data["guest_count"], 2)
        session = TableSession.objects.get(session_token=first.data["session_token"])
        self.assertEqual(session.guests.count(), 2)
        self.assertEqual(
            list(session.guests.order_by("joined_at", "id").values_list("display_name", flat=True)),
            ["Guest 1", "Guest 2"],
        )

    def test_expired_session_is_not_reused(self):
        expired_session = TableSession.objects.create(
            table=self.table,
            session_token="sess_expired_123",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        SessionGuest.objects.create(
            session=expired_session,
            guest_token="guest_expired_123",
            display_name="Guest 1",
        )

        response = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data["session_token"], expired_session.session_token)
        self.assertEqual(response.data["mode"], "solo")
        self.assertEqual(response.data["guest_count"], 1)
        self.assertEqual(
            TableSession.objects.filter(table=self.table, expires_at__gt=timezone.now()).count(),
            1,
        )

    def test_guest_tokens_are_random_and_non_guessable(self):
        first = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )
        second = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        first_token = first.data["guest_token"]
        second_token = second.data["guest_token"]
        self.assertTrue(first_token.startswith("guest_"))
        self.assertTrue(second_token.startswith("guest_"))
        self.assertGreaterEqual(len(first_token), 32)
        self.assertGreaterEqual(len(second_token), 32)
        self.assertNotEqual(first_token, second_token)
        self.assertNotIn("Guest", first_token)

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
        self.assertNotIn("session_id", response.data)
        self.assertNotIn("guest_id", response.data)
        self.assertNotIn("id", response.data["restaurant"])
        self.assertNotIn("restaurant_id", response.data["restaurant"])

    def test_guest_display_name_can_be_updated(self):
        start = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        response = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": "  Alice   Table  "},
            format="json",
            HTTP_X_SESSION_TOKEN=start.data["session_token"],
            HTTP_X_GUEST_TOKEN=start.data["guest_token"],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Alice Table")
        self.assertEqual(response.data["guest_token"], start.data["guest_token"])
        self.assertEqual(response.data["mode"], "solo")
        self.assertEqual(response.data["guest_count"], 1)
        self.assertNotIn("id", response.data)
        self.assertNotIn("session_id", response.data)
        self.assertNotIn("guest_id", response.data)

    def test_guest_display_name_blank_uses_default_name(self):
        start = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        response = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": ""},
            format="json",
            HTTP_X_SESSION_TOKEN=start.data["session_token"],
            HTTP_X_GUEST_TOKEN=start.data["guest_token"],
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Guest 1")

    def test_guest_display_name_rejects_unsafe_or_too_long_input(self):
        start = self.client.post(
            "/api/v1/table/session/start/",
            {"table_token": self.table.public_token},
            format="json",
        )

        unsafe = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": "<script>alert(1)</script>"},
            format="json",
            HTTP_X_SESSION_TOKEN=start.data["session_token"],
            HTTP_X_GUEST_TOKEN=start.data["guest_token"],
        )
        too_long = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": "A" * 41},
            format="json",
            HTTP_X_SESSION_TOKEN=start.data["session_token"],
            HTTP_X_GUEST_TOKEN=start.data["guest_token"],
        )
        control_character = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": "Alice\nBob"},
            format="json",
            HTTP_X_SESSION_TOKEN=start.data["session_token"],
            HTTP_X_GUEST_TOKEN=start.data["guest_token"],
        )

        self.assertEqual(unsafe.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, unsafe, code="invalid_request", message="invalid request")
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, too_long, code="invalid_request", message="invalid request")
        self.assertEqual(control_character.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, control_character, code="invalid_request", message="invalid request")

    def test_guest_display_name_update_rejects_expired_session(self):
        expired_session = TableSession.objects.create(
            table=self.table,
            session_token="sess_guest_expired",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        guest = SessionGuest.objects.create(
            session=expired_session,
            guest_token="guest_expired_name",
            display_name="Guest 1",
        )

        response = self.client.patch(
            "/api/v1/table/session/guest/",
            {"display_name": "Alice"},
            format="json",
            HTTP_X_SESSION_TOKEN=expired_session.session_token,
            HTTP_X_GUEST_TOKEN=guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        assert_error_payload(self, response, code="expired_session", message="expired session")

    def test_session_roster_returns_valid_lobby_response(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_lobby",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        current_guest = SessionGuest.objects.create(
            session=session,
            guest_token="guest_roster_current",
            display_name="Alice",
            avatar_color="#2563EB",
        )
        other_guest = SessionGuest.objects.create(
            session=session,
            guest_token="guest_roster_other",
            display_name="Bob",
            avatar_color="#DC2626",
        )
        old_seen = timezone.now() - timedelta(days=1)
        SessionGuest.objects.filter(pk=current_guest.pk).update(last_seen_at=old_seen)

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_SESSION_TOKEN=session.session_token,
            HTTP_X_GUEST_TOKEN=current_guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"mode", "guest_count", "current_guest", "guests"})
        self.assertEqual(response.data["mode"], "lobby")
        self.assertEqual(response.data["guest_count"], 2)
        assert_public_guest_payload(self, response.data["current_guest"], current_guest)
        self.assertEqual(len(response.data["guests"]), 2)
        assert_public_guest_payload(self, response.data["guests"][0], current_guest)
        assert_public_guest_payload(self, response.data["guests"][1], other_guest)
        assert_no_internal_ids(self, response.data)
        current_guest.refresh_from_db()
        self.assertGreater(current_guest.last_seen_at, old_seen)

    def test_session_roster_returns_solo_mode_for_one_guest(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_solo",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        guest = SessionGuest.objects.create(
            session=session,
            guest_token="guest_roster_solo",
            display_name="Guest 1",
            avatar_color="#2563EB",
        )

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_SESSION_TOKEN=session.session_token,
            HTTP_X_GUEST_TOKEN=guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["mode"], "solo")
        self.assertEqual(response.data["guest_count"], 1)
        assert_public_guest_payload(self, response.data["current_guest"], guest)
        self.assertEqual(len(response.data["guests"]), 1)

    def test_session_roster_rejects_missing_session_token(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_missing_session",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        guest = SessionGuest.objects.create(
            session=session,
            guest_token="guest_roster_missing_session",
            display_name="Guest 1",
        )

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_GUEST_TOKEN=guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        assert_error_payload(self, response, code="invalid_session", message="invalid session")

    def test_session_roster_rejects_missing_guest_token(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_missing_guest",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_SESSION_TOKEN=session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        assert_error_payload(self, response, code="invalid_guest", message="invalid guest")

    def test_session_roster_rejects_expired_session(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_expired",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        guest = SessionGuest.objects.create(
            session=session,
            guest_token="guest_roster_expired",
            display_name="Guest 1",
        )

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_SESSION_TOKEN=session.session_token,
            HTTP_X_GUEST_TOKEN=guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        assert_error_payload(self, response, code="expired_session", message="expired session")

    def test_session_roster_rejects_guest_from_another_session(self):
        session = TableSession.objects.create(
            table=self.table,
            session_token="sess_roster_primary",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        other_session = TableSession.objects.create(
            table=self.other_table,
            session_token="sess_roster_other",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        other_guest = SessionGuest.objects.create(
            session=other_session,
            guest_token="guest_roster_other_session",
            display_name="Other Guest",
        )

        response = self.client.get(
            "/api/v1/table/session/",
            HTTP_X_SESSION_TOKEN=session.session_token,
            HTTP_X_GUEST_TOKEN=other_guest.guest_token,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        assert_error_payload(self, response, code="invalid_guest", message="invalid guest")
