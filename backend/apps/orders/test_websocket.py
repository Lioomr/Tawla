from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.menu.models import Category, MenuItem
from apps.orders.models import TableRequestType
from apps.orders.services import (
    create_order_for_session,
    create_table_request_for_session,
    resolve_table_request,
    update_order_status,
)
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table
from apps.sessions.models import SessionGuest, TableSession
from apps.sessions.services import start_or_join_table_session
from config.asgi import application

User = get_user_model()


class OrderWebsocketTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        restaurant = Restaurant.objects.create(name="Realtime Restaurant")
        self.table = Table.objects.create(
            restaurant=restaurant,
            name="Table 9",
            public_token="ws_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_ws_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        SessionGuest.objects.create(
            session=self.session,
            guest_token="guest_ws_first",
            display_name="Guest 1",
            avatar_color="#2563EB",
        )
        category = Category.objects.create(restaurant=restaurant, name="Drinks")
        self.cola = MenuItem.objects.create(
            restaurant=restaurant,
            category=category,
            name="Cola",
            price="20.00",
            is_available=True,
        )
        self.kitchen_token = self._create_staff_access_token(
            restaurant=restaurant,
            username="kitchen_ws_user",
            role=StaffRole.KITCHEN,
        )
        self.waiter_token = self._create_staff_access_token(
            restaurant=restaurant,
            username="waiter_ws_user",
            role=StaffRole.WAITER,
        )
        self.waiter_staff = Staff.objects.get(user__username="waiter_ws_user")
        self.cashier_token = self._create_staff_access_token(
            restaurant=restaurant,
            username="cashier_ws_user",
            role=StaffRole.CASHIER,
        )
        other_restaurant = Restaurant.objects.create(name="Other Realtime Restaurant")
        self.other_kitchen_token = self._create_staff_access_token(
            restaurant=other_restaurant,
            username="other_kitchen_ws_user",
            role=StaffRole.KITCHEN,
        )
        self.other_waiter_token = self._create_staff_access_token(
            restaurant=other_restaurant,
            username="other_waiter_ws_user",
            role=StaffRole.WAITER,
        )
        self.other_cashier_token = self._create_staff_access_token(
            restaurant=other_restaurant,
            username="other_cashier_ws_user",
            role=StaffRole.CASHIER,
        )

    def test_order_created_event_reaches_customer_kitchen_and_waiter_channels(self):
        async_to_sync(self._assert_order_created_event_flow)()

    def test_order_updated_event_reaches_customer_kitchen_and_waiter_channels(self):
        async_to_sync(self._assert_order_updated_event_flow)()

    def test_staff_channels_require_access_token(self):
        async_to_sync(self._assert_staff_channels_require_access_token)()

    def test_guest_joined_event_reaches_existing_customer_session_channel(self):
        async_to_sync(self._assert_guest_joined_event_flow)()

    def test_table_request_created_event_reaches_waiter_channel(self):
        async_to_sync(self._assert_table_request_created_event_flow)()

    def test_table_request_resolved_event_reaches_customer_session_channel(self):
        async_to_sync(self._assert_table_request_resolved_event_flow)()

    async def _assert_order_created_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )
        kitchen = WebsocketCommunicator(application, f"/ws/kitchen/?access_token={self.kitchen_token}")
        waiter = WebsocketCommunicator(application, f"/ws/waiter/?access_token={self.waiter_token}")
        cashier = WebsocketCommunicator(application, f"/ws/cashier/?access_token={self.cashier_token}")
        other_kitchen = WebsocketCommunicator(
            application,
            f"/ws/kitchen/?access_token={self.other_kitchen_token}",
        )
        other_cashier = WebsocketCommunicator(
            application,
            f"/ws/cashier/?access_token={self.other_cashier_token}",
        )

        customer_connected, _ = await customer.connect()
        kitchen_connected, _ = await kitchen.connect()
        waiter_connected, _ = await waiter.connect()
        cashier_connected, _ = await cashier.connect()
        other_kitchen_connected, _ = await other_kitchen.connect()
        other_cashier_connected, _ = await other_cashier.connect()

        self.assertTrue(customer_connected)
        self.assertTrue(kitchen_connected)
        self.assertTrue(waiter_connected)
        self.assertTrue(cashier_connected)
        self.assertTrue(other_kitchen_connected)
        self.assertTrue(other_cashier_connected)

        await database_sync_to_async(create_order_for_session)(
            session=self.session,
            items_data=[{"menu_item_id": self.cola.id, "quantity": 1, "notes": ""}],
        )

        customer_event = await customer.receive_json_from()
        kitchen_event = await kitchen.receive_json_from()
        waiter_event = await waiter.receive_json_from()
        cashier_event = await cashier.receive_json_from()

        self.assertEqual(customer_event["type"], "order_created")
        self.assertEqual(customer_event["status"], "NEW")
        self.assertTrue(customer_event["order_id"].startswith("ord_"))

        self.assertEqual(kitchen_event["type"], "order_created")
        self.assertEqual(kitchen_event["table"], "Table 9")
        self.assertEqual(waiter_event["type"], "order_created")
        self.assertEqual(waiter_event["table"], "Table 9")
        self.assertEqual(cashier_event["type"], "order_created")
        self.assertEqual(cashier_event["table"], "Table 9")
        self.assertTrue(await other_kitchen.receive_nothing())
        self.assertTrue(await other_cashier.receive_nothing())

        await customer.disconnect()
        await kitchen.disconnect()
        await waiter.disconnect()
        await cashier.disconnect()
        await other_kitchen.disconnect()
        await other_cashier.disconnect()

    async def _assert_order_updated_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )
        kitchen = WebsocketCommunicator(application, f"/ws/kitchen/?access_token={self.kitchen_token}")
        waiter = WebsocketCommunicator(application, f"/ws/waiter/?access_token={self.waiter_token}")
        cashier = WebsocketCommunicator(application, f"/ws/cashier/?access_token={self.cashier_token}")

        customer_connected, _ = await customer.connect()
        kitchen_connected, _ = await kitchen.connect()
        waiter_connected, _ = await waiter.connect()
        cashier_connected, _ = await cashier.connect()

        self.assertTrue(customer_connected)
        self.assertTrue(kitchen_connected)
        self.assertTrue(waiter_connected)
        self.assertTrue(cashier_connected)

        order = await database_sync_to_async(create_order_for_session)(
            session=self.session,
            items_data=[{"menu_item_id": self.cola.id, "quantity": 1, "notes": ""}],
        )
        await customer.receive_json_from()
        await kitchen.receive_json_from()
        await waiter.receive_json_from()
        await cashier.receive_json_from()

        await database_sync_to_async(update_order_status)(order=order, new_status="PREPARING")

        customer_event = await customer.receive_json_from()
        kitchen_event = await kitchen.receive_json_from()
        waiter_event = await waiter.receive_json_from()
        cashier_event = await cashier.receive_json_from()

        self.assertEqual(customer_event["type"], "order_updated")
        self.assertEqual(customer_event["status"], "PREPARING")
        self.assertEqual(kitchen_event["type"], "order_updated")
        self.assertEqual(kitchen_event["status"], "PREPARING")
        self.assertEqual(waiter_event["type"], "order_updated")
        self.assertEqual(waiter_event["status"], "PREPARING")
        self.assertEqual(cashier_event["type"], "order_updated")
        self.assertEqual(cashier_event["status"], "PREPARING")

        await customer.disconnect()
        await kitchen.disconnect()
        await waiter.disconnect()
        await cashier.disconnect()

    async def _assert_staff_channels_require_access_token(self):
        kitchen = WebsocketCommunicator(application, "/ws/kitchen/")
        waiter = WebsocketCommunicator(application, "/ws/waiter/")
        cashier = WebsocketCommunicator(application, "/ws/cashier/")

        kitchen_connected, kitchen_close_code = await kitchen.connect()
        waiter_connected, waiter_close_code = await waiter.connect()
        cashier_connected, cashier_close_code = await cashier.connect()

        self.assertFalse(kitchen_connected)
        self.assertFalse(waiter_connected)
        self.assertFalse(cashier_connected)
        self.assertEqual(kitchen_close_code, 4401)
        self.assertEqual(waiter_close_code, 4401)
        self.assertEqual(cashier_close_code, 4401)

    async def _assert_guest_joined_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )
        customer_connected, _ = await customer.connect()
        self.assertTrue(customer_connected)

        result = await database_sync_to_async(start_or_join_table_session)(table=self.table)

        event = await customer.receive_json_from()
        self.assertEqual(event["type"], "guest_joined")
        self.assertEqual(event["guest_token"], result.guest.guest_token)
        self.assertEqual(event["display_name"], "Guest 2")
        self.assertEqual(event["avatar_color"], "#DC2626")
        self.assertEqual(event["guest_count"], 2)
        self.assertEqual(event["mode"], "lobby")
        self.assertNotIn("id", event)
        self.assertNotIn("session_id", event)
        self.assertNotIn("table_id", event)

        await customer.disconnect()

    async def _assert_table_request_created_event_flow(self):
        waiter = WebsocketCommunicator(application, f"/ws/waiter/?access_token={self.waiter_token}")
        other_waiter = WebsocketCommunicator(
            application,
            f"/ws/waiter/?access_token={self.other_waiter_token}",
        )

        waiter_connected, _ = await waiter.connect()
        other_waiter_connected, _ = await other_waiter.connect()
        self.assertTrue(waiter_connected)
        self.assertTrue(other_waiter_connected)

        table_request = await database_sync_to_async(create_table_request_for_session)(
            session=self.session,
            request_type=TableRequestType.CALL_WAITER,
        )

        waiter_event = await waiter.receive_json_from()
        self.assertEqual(waiter_event["type"], "table_request_created")
        self.assertEqual(waiter_event["request_token"], table_request.request_token)
        self.assertEqual(waiter_event["request_type"], TableRequestType.CALL_WAITER)
        self.assertEqual(waiter_event["table"], "Table 9")
        self.assertEqual(waiter_event["status"], "OPEN")
        self.assertNotIn("id", waiter_event)
        self.assertNotIn("table_id", waiter_event)
        self.assertNotIn("session_id", waiter_event)
        self.assertTrue(await other_waiter.receive_nothing())

        await waiter.disconnect()
        await other_waiter.disconnect()

    async def _assert_table_request_resolved_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )

        customer_connected, _ = await customer.connect()
        self.assertTrue(customer_connected)

        table_request = await database_sync_to_async(create_table_request_for_session)(
            session=self.session,
            request_type=TableRequestType.REQUEST_BILL,
        )
        await database_sync_to_async(resolve_table_request)(
            table_request=table_request,
            actor_staff=self.waiter_staff,
        )

        customer_event = await customer.receive_json_from()
        self.assertEqual(customer_event["type"], "table_request_resolved")
        self.assertEqual(customer_event["request_token"], table_request.request_token)
        self.assertEqual(customer_event["request_type"], TableRequestType.REQUEST_BILL)
        self.assertEqual(customer_event["status"], "RESOLVED")
        self.assertNotIn("id", customer_event)
        self.assertNotIn("table_id", customer_event)
        self.assertNotIn("session_id", customer_event)

        await customer.disconnect()

    def _create_staff_access_token(self, *, restaurant, username, role):
        user = User.objects.create_user(username=username, password="Password123!")
        Staff.objects.create(
            user=user,
            restaurant=restaurant,
            name=username,
            role=role,
        )
        return str(RefreshToken.for_user(user).access_token)
