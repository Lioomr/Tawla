from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.menu.models import Category, MenuItem
from apps.orders.services import create_order_for_session, update_order_status
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table
from apps.sessions.models import TableSession
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
        other_restaurant = Restaurant.objects.create(name="Other Realtime Restaurant")
        self.other_kitchen_token = self._create_staff_access_token(
            restaurant=other_restaurant,
            username="other_kitchen_ws_user",
            role=StaffRole.KITCHEN,
        )

    def test_order_created_event_reaches_customer_kitchen_and_waiter_channels(self):
        async_to_sync(self._assert_order_created_event_flow)()

    def test_order_updated_event_reaches_customer_kitchen_and_waiter_channels(self):
        async_to_sync(self._assert_order_updated_event_flow)()

    def test_staff_channels_require_access_token(self):
        async_to_sync(self._assert_staff_channels_require_access_token)()

    async def _assert_order_created_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )
        kitchen = WebsocketCommunicator(application, f"/ws/kitchen/?access_token={self.kitchen_token}")
        waiter = WebsocketCommunicator(application, f"/ws/waiter/?access_token={self.waiter_token}")
        other_kitchen = WebsocketCommunicator(
            application,
            f"/ws/kitchen/?access_token={self.other_kitchen_token}",
        )

        customer_connected, _ = await customer.connect()
        kitchen_connected, _ = await kitchen.connect()
        waiter_connected, _ = await waiter.connect()
        other_kitchen_connected, _ = await other_kitchen.connect()

        self.assertTrue(customer_connected)
        self.assertTrue(kitchen_connected)
        self.assertTrue(waiter_connected)
        self.assertTrue(other_kitchen_connected)

        await database_sync_to_async(create_order_for_session)(
            session=self.session,
            items_data=[{"menu_item_id": self.cola.id, "quantity": 1, "notes": ""}],
        )

        customer_event = await customer.receive_json_from()
        kitchen_event = await kitchen.receive_json_from()
        waiter_event = await waiter.receive_json_from()

        self.assertEqual(customer_event["type"], "order_created")
        self.assertEqual(customer_event["status"], "NEW")
        self.assertTrue(customer_event["order_id"].startswith("ord_"))

        self.assertEqual(kitchen_event["type"], "order_created")
        self.assertEqual(kitchen_event["table"], "Table 9")
        self.assertEqual(waiter_event["type"], "order_created")
        self.assertEqual(waiter_event["table"], "Table 9")
        self.assertTrue(await other_kitchen.receive_nothing())

        await customer.disconnect()
        await kitchen.disconnect()
        await waiter.disconnect()
        await other_kitchen.disconnect()

    async def _assert_order_updated_event_flow(self):
        customer = WebsocketCommunicator(
            application,
            "/ws/orders/?session_token=sess_ws_123",
        )
        kitchen = WebsocketCommunicator(application, f"/ws/kitchen/?access_token={self.kitchen_token}")
        waiter = WebsocketCommunicator(application, f"/ws/waiter/?access_token={self.waiter_token}")

        customer_connected, _ = await customer.connect()
        kitchen_connected, _ = await kitchen.connect()
        waiter_connected, _ = await waiter.connect()

        self.assertTrue(customer_connected)
        self.assertTrue(kitchen_connected)
        self.assertTrue(waiter_connected)

        order = await database_sync_to_async(create_order_for_session)(
            session=self.session,
            items_data=[{"menu_item_id": self.cola.id, "quantity": 1, "notes": ""}],
        )
        await customer.receive_json_from()
        await kitchen.receive_json_from()
        await waiter.receive_json_from()

        await database_sync_to_async(update_order_status)(order=order, new_status="PREPARING")

        customer_event = await customer.receive_json_from()
        kitchen_event = await kitchen.receive_json_from()
        waiter_event = await waiter.receive_json_from()

        self.assertEqual(customer_event["type"], "order_updated")
        self.assertEqual(customer_event["status"], "PREPARING")
        self.assertEqual(kitchen_event["type"], "order_updated")
        self.assertEqual(kitchen_event["status"], "PREPARING")
        self.assertEqual(waiter_event["type"], "order_updated")
        self.assertEqual(waiter_event["status"], "PREPARING")

        await customer.disconnect()
        await kitchen.disconnect()
        await waiter.disconnect()

    async def _assert_staff_channels_require_access_token(self):
        kitchen = WebsocketCommunicator(application, "/ws/kitchen/")
        waiter = WebsocketCommunicator(application, "/ws/waiter/")

        kitchen_connected, kitchen_close_code = await kitchen.connect()
        waiter_connected, waiter_close_code = await waiter.connect()

        self.assertFalse(kitchen_connected)
        self.assertFalse(waiter_connected)
        self.assertEqual(kitchen_close_code, 4401)
        self.assertEqual(waiter_close_code, 4401)

    def _create_staff_access_token(self, *, restaurant, username, role):
        user = User.objects.create_user(username=username, password="Password123!")
        Staff.objects.create(
            user=user,
            restaurant=restaurant,
            name=username,
            role=role,
        )
        return str(RefreshToken.for_user(user).access_token)
