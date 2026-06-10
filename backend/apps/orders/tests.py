from django.contrib.auth import get_user_model
from django.core.cache import cache
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import AuditLog
from apps.core.throttling import OrderCreateRateThrottle, PaymentCreateRateThrottle
from apps.menu.models import Category, MenuItem
from apps.orders.models import Order, OrderItem, OrderStatus, Payment, PaymentStatus
from apps.restaurants.models import Restaurant, Staff, StaffRole, Table
from apps.sessions.models import TableSession

User = get_user_model()


def assert_error_payload(testcase, response, *, code, message):
    testcase.assertEqual(
        response.data,
        {"error": {"code": code, "message": message}},
    )


class OrderCreateApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        restaurant = Restaurant.objects.create(name="Order Test Restaurant")
        self.table = Table.objects.create(
            restaurant=restaurant,
            name="Table 3",
            public_token="order_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_order_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        drinks = Category.objects.create(restaurant=restaurant, name="Drinks")
        meals = Category.objects.create(restaurant=restaurant, name="Meals")
        self.cola = MenuItem.objects.create(
            restaurant=restaurant,
            category=drinks,
            name="Cola",
            price=Decimal("20.00"),
            is_available=True,
        )
        self.burger = MenuItem.objects.create(
            restaurant=restaurant,
            category=meals,
            name="Burger",
            price=Decimal("75.00"),
            is_available=True,
        )
        self.water = MenuItem.objects.create(
            restaurant=restaurant,
            category=drinks,
            name="Water",
            price=Decimal("10.00"),
            is_available=False,
        )
        other_restaurant = Restaurant.objects.create(name="Other")
        other_category = Category.objects.create(restaurant=other_restaurant, name="Other Category")
        self.other_item = MenuItem.objects.create(
            restaurant=other_restaurant,
            category=other_category,
            name="Hidden",
            price=Decimal("99.00"),
            is_available=True,
        )
        self.order = Order.objects.create(
            restaurant=restaurant,
            table=self.table,
            session=self.session,
            total_price=Decimal("40.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=self.cola,
            quantity=2,
            price_at_time=Decimal("20.00"),
            notes="No ice",
        )
        self.other_table = Table.objects.create(
            restaurant=restaurant,
            name="Table 4",
            public_token="other_table_token",
        )
        self.other_session = TableSession.objects.create(
            table=self.other_table,
            session_token="sess_order_other",
            expires_at=timezone.now() + timedelta(hours=2),
        )
    
    def create_fresh_session(self):
        return TableSession.objects.create(
            table=self.table,
            session_token=f"sess_fresh_{timezone.now().timestamp()}",
            expires_at=timezone.now() + timedelta(hours=2),
        )

    def test_create_order_returns_public_order_token(self):
        fresh_session = self.create_fresh_session()
        response = self.client.post(
            "/api/v1/orders/",
            {
                "items": [
                    {"menu_item_id": self.cola.id, "quantity": 2, "notes": "No ice"},
                    {"menu_item_id": self.burger.id, "quantity": 1},
                ]
            },
            format="json",
            HTTP_X_SESSION_TOKEN=fresh_session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["order_id"].startswith("ord_"))
        self.assertEqual(response.data["status"], "NEW")
        self.assertEqual(response.data["total_price"], "115.00")

        order = Order.objects.get(public_token=response.data["order_id"])
        self.assertEqual(order.table_id, self.table.id)
        self.assertEqual(order.session_id, fresh_session.id)
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            OrderItem.objects.get(order=order, menu_item=self.cola).price_at_time,
            Decimal("20.00"),
        )

    def test_create_order_rejects_invalid_session(self):
        response = self.client.post(
            "/api/v1/orders/",
            {"items": [{"menu_item_id": self.cola.id, "quantity": 1}]},
            format="json",
            HTTP_X_SESSION_TOKEN="bad_token",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        assert_error_payload(self, response, code="invalid_session", message="invalid session")

    def test_create_order_rejects_unavailable_or_foreign_item(self):
        fresh_session = self.create_fresh_session()
        response = self.client.post(
            "/api/v1/orders/",
            {"items": [{"menu_item_id": self.water.id, "quantity": 1}]},
            format="json",
            HTTP_X_SESSION_TOKEN=fresh_session.session_token,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="order_validation_error", message="one or more menu items are invalid or unavailable")

        response = self.client.post(
            "/api/v1/orders/",
            {"items": [{"menu_item_id": self.other_item.id, "quantity": 1}]},
            format="json",
            HTTP_X_SESSION_TOKEN=fresh_session.session_token,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="order_validation_error", message="one or more menu items are invalid or unavailable")

    def test_create_order_rejects_invalid_quantity(self):
        fresh_session = self.create_fresh_session()
        response = self.client.post(
            "/api/v1/orders/",
            {"items": [{"menu_item_id": self.cola.id, "quantity": 0}]},
            format="json",
            HTTP_X_SESSION_TOKEN=fresh_session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="invalid_request", message="invalid request")

    def test_get_current_session_orders_returns_only_session_orders(self):
        response = self.client.get(
            "/api/v1/orders/",
            HTTP_X_SESSION_TOKEN=self.session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["orders"]), 1)
        self.assertEqual(response.data["orders"][0]["order_id"], self.order.public_token)
        self.assertNotIn("id", response.data["orders"][0])

    def test_get_order_detail_returns_public_order_token_and_items(self):
        response = self.client.get(
            f"/api/v1/orders/{self.order.public_token}/",
            HTTP_X_SESSION_TOKEN=self.session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_id"], self.order.public_token)
        self.assertEqual(response.data["items"][0]["name"], "Cola")
        self.assertEqual(response.data["items"][0]["quantity"], 2)

    def test_get_order_detail_rejects_cross_session_access(self):
        response = self.client.get(
            f"/api/v1/orders/{self.order.public_token}/",
            HTTP_X_SESSION_TOKEN=self.other_session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="order_not_found", message="order not found")

    def test_create_order_is_rate_limited_per_session(self):
        with patch.object(OrderCreateRateThrottle, "rate", "1/minute"):
            fresh_session = self.create_fresh_session()
            first = self.client.post(
                "/api/v1/orders/",
                {"items": [{"menu_item_id": self.cola.id, "quantity": 1}]},
                format="json",
                HTTP_X_SESSION_TOKEN=fresh_session.session_token,
            )
            self.assertEqual(first.status_code, status.HTTP_201_CREATED)

            second = self.client.post(
                "/api/v1/orders/",
                {"items": [{"menu_item_id": self.burger.id, "quantity": 1}]},
                format="json",
                HTTP_X_SESSION_TOKEN=fresh_session.session_token,
            )
            self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertEqual(second.data["error"]["code"], "rate_limit_exceeded")
            self.assertEqual(second.data["error"]["message"], "rate limit exceeded")


class KitchenOrderApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Kitchen Restaurant")
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            name="Table K1",
            public_token="kitchen_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_kitchen_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        category = Category.objects.create(restaurant=self.restaurant, name="Meals")
        item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=category,
            name="Pasta",
            price=Decimal("60.00"),
            is_available=True,
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            total_price=Decimal("60.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=item,
            quantity=1,
            price_at_time=Decimal("60.00"),
            notes="Extra sauce",
        )
        kitchen_user = User.objects.create_user(username="kitchen_user", password="Password123!")
        self.kitchen_staff = Staff.objects.create(
            user=kitchen_user,
            restaurant=self.restaurant,
            name="Kitchen User",
            role=StaffRole.KITCHEN,
        )
        waiter_user = User.objects.create_user(username="waiter_user", password="Password123!")
        self.waiter_staff = Staff.objects.create(
            user=waiter_user,
            restaurant=self.restaurant,
            name="Waiter User",
            role=StaffRole.WAITER,
        )
        self.kitchen_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_user", "password": "Password123!"},
            format="json",
        ).data["access"]
        self.waiter_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "waiter_user", "password": "Password123!"},
            format="json",
        ).data["access"]

    def test_kitchen_can_list_orders(self):
        response = self.client.get(
            "/api/v1/kitchen/orders/",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["orders"]), 1)
        self.assertEqual(response.data["orders"][0]["order_id"], self.order.public_token)

    def test_waiter_cannot_access_kitchen_endpoints(self):
        response = self.client.get(
            "/api/v1/kitchen/orders/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_kitchen_can_update_order_status(self):
        response = self.client.patch(
            f"/api/v1/kitchen/orders/{self.order.public_token}/status/",
            {"status": "PREPARING"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PREPARING")
        self.assertEqual(response.data["order_id"], self.order.public_token)
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                actor_staff=self.kitchen_staff,
                action="kitchen.order_status_updated",
                target_identifier=self.order.public_token,
            ).exists()
        )

    def test_kitchen_cannot_mark_order_as_served_directly(self):
        response = self.client.patch(
            f"/api/v1/kitchen/orders/{self.order.public_token}/status/",
            {"status": "SERVED"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="invalid_request", message="invalid request")

    def test_kitchen_cannot_skip_from_new_to_ready(self):
        response = self.client.patch(
            f"/api/v1/kitchen/orders/{self.order.public_token}/status/",
            {"status": "READY"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(
            self,
            response,
            code="order_validation_error",
            message="invalid status transition from NEW to READY",
        )


class WaiterAndPaymentApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Waiter Restaurant")
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            name="Table W1",
            public_token="waiter_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_waiter_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        category = Category.objects.create(restaurant=self.restaurant, name="Meals")
        item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=category,
            name="Pizza",
            price=Decimal("95.00"),
            is_available=True,
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            status="READY",
            total_price=Decimal("95.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=item,
            quantity=1,
            price_at_time=Decimal("95.00"),
            notes="Extra cheese",
        )
        waiter_user = User.objects.create_user(username="waiter_payment_user", password="Password123!")
        self.waiter_staff = Staff.objects.create(
            user=waiter_user,
            restaurant=self.restaurant,
            name="Waiter Payment User",
            role=StaffRole.WAITER,
        )
        kitchen_user = User.objects.create_user(username="kitchen_payment_user", password="Password123!")
        self.kitchen_staff = Staff.objects.create(
            user=kitchen_user,
            restaurant=self.restaurant,
            name="Kitchen Payment User",
            role=StaffRole.KITCHEN,
        )
        self.waiter_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "waiter_payment_user", "password": "Password123!"},
            format="json",
        ).data["access"]
        self.kitchen_token = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "kitchen_payment_user", "password": "Password123!"},
            format="json",
        ).data["access"]

    def test_waiter_can_list_active_tables(self):
        response = self.client.get(
            "/api/v1/waiter/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["tables"]), 1)
        self.assertEqual(response.data["tables"][0]["table"], "Table W1")
        self.assertEqual(response.data["tables"][0]["orders"][0]["order_id"], self.order.public_token)

    def test_kitchen_cannot_access_waiter_tables(self):
        response = self.client.get(
            "/api/v1/waiter/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_waiter_can_mark_order_as_served(self):
        response = self.client.patch(
            f"/api/v1/waiter/orders/{self.order.public_token}/serve/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "SERVED")
        self.assertEqual(response.data["order_id"], self.order.public_token)
        self.assertTrue(
            AuditLog.objects.filter(
                restaurant=self.restaurant,
                actor_staff=self.waiter_staff,
                action="waiter.order_served",
                target_identifier=self.order.public_token,
            ).exists()
        )

    def test_waiter_cannot_serve_order_before_ready(self):
        self.order.status = "PREPARING"
        self.order.save(update_fields=["status", "updated_at"])

        response = self.client.patch(
            f"/api/v1/waiter/orders/{self.order.public_token}/serve/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(
            self,
            response,
            code="order_validation_error",
            message="invalid status transition from PREPARING to SERVED",
        )

    def test_customer_can_create_cash_payment_for_own_order(self):
        response = self.client.post(
            "/api/v1/payments/",
            {"order_id": self.order.public_token, "method": "CASH"},
            format="json",
            HTTP_X_SESSION_TOKEN=self.session.session_token,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, "PAID")
        self.assertEqual(payment.amount, Decimal("95.00"))
        self.assertEqual(response.data["order_id"], self.order.public_token)
        audit_log = AuditLog.objects.get(
            restaurant=self.restaurant,
            action="payment.recorded",
            target_identifier=self.order.public_token,
        )
        self.assertIsNone(audit_log.actor_staff)
        self.assertEqual(audit_log.metadata["actor_type"], "CUSTOMER_SESSION")

    def test_waiter_can_create_cash_payment_for_restaurant_order(self):
        response = self.client.post(
            "/api/v1/payments/",
            {"order_id": self.order.public_token, "method": "CASH"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "PAID")

    def test_payment_rejects_duplicate_payment(self):
        Payment.objects.create(
            order=self.order,
            method="CASH",
            status="PAID",
            amount=Decimal("95.00"),
        )

        response = self.client.post(
            "/api/v1/payments/",
            {"order_id": self.order.public_token, "method": "CASH"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        assert_error_payload(self, response, code="payment_validation_error", message="payment already recorded")

    def test_payment_is_rate_limited_for_customer_session(self):
        with patch.object(PaymentCreateRateThrottle, "rate", "1/minute"):
            first_order = Order.objects.create(
                restaurant=self.restaurant,
                table=self.table,
                session=self.session,
                status="SERVED",
                total_price=Decimal("50.00"),
            )
            first = self.client.post(
                "/api/v1/payments/",
                {"order_id": first_order.public_token, "method": "CASH"},
                format="json",
                HTTP_X_SESSION_TOKEN=self.session.session_token,
            )
            self.assertEqual(first.status_code, status.HTTP_201_CREATED)

            second_order = Order.objects.create(
                restaurant=self.restaurant,
                table=self.table,
                session=self.session,
                status="SERVED",
                total_price=Decimal("60.00"),
            )
            second = self.client.post(
                "/api/v1/payments/",
                {"order_id": second_order.public_token, "method": "CASH"},
                format="json",
                HTTP_X_SESSION_TOKEN=self.session.session_token,
            )
            self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertEqual(second.data["error"]["code"], "rate_limit_exceeded")
            self.assertEqual(second.data["error"]["message"], "rate limit exceeded")


class CashierApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Cashier Restaurant")
        self.other_restaurant = Restaurant.objects.create(name="Other Cashier Restaurant")
        self.category = Category.objects.create(restaurant=self.restaurant, name="Cashier Meals")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Cashier Pizza",
            price=Decimal("55.00"),
            is_available=True,
        )
        other_category = Category.objects.create(restaurant=self.other_restaurant, name="Other Meals")
        self.other_item = MenuItem.objects.create(
            restaurant=self.other_restaurant,
            category=other_category,
            name="Other Pizza",
            price=Decimal("66.00"),
            is_available=True,
        )

        self.empty_table = self.create_table("Empty Table", "cashier_empty_table")
        self.session_only_table = self.create_table("Session Only Table", "cashier_session_table")
        self.new_table = self.create_table("New Table", "cashier_new_table")
        self.preparing_table = self.create_table("Preparing Table", "cashier_preparing_table")
        self.ready_table = self.create_table("Ready Table", "cashier_ready_table")
        self.paid_table = self.create_table("Paid Table", "cashier_paid_table")
        self.other_table = Table.objects.create(
            restaurant=self.other_restaurant,
            name="Other Table",
            public_token="other_cashier_table",
        )

        TableSession.objects.create(
            table=self.session_only_table,
            session_token="sess_cashier_only",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        self.new_order = self.create_order(
            table=self.new_table,
            session_token="sess_cashier_new",
            status=OrderStatus.NEW,
            total_price=Decimal("55.00"),
        )
        self.preparing_order = self.create_order(
            table=self.preparing_table,
            session_token="sess_cashier_preparing",
            status=OrderStatus.PREPARING,
            total_price=Decimal("110.00"),
            quantity=2,
        )
        self.ready_order = self.create_order(
            table=self.ready_table,
            session_token="sess_cashier_ready",
            status=OrderStatus.READY,
            total_price=Decimal("55.00"),
        )
        self.paid_order = self.create_order(
            table=self.paid_table,
            session_token="sess_cashier_paid",
            status=OrderStatus.SERVED,
            total_price=Decimal("55.00"),
            expires_at=timezone.now() - timedelta(hours=1),
        )
        Payment.objects.create(
            order=self.paid_order,
            method="CASH",
            status=PaymentStatus.PAID,
            amount=Decimal("55.00"),
        )
        self.other_order = self.create_order(
            table=self.other_table,
            item=self.other_item,
            session_token="sess_other_cashier",
            status=OrderStatus.READY,
            total_price=Decimal("66.00"),
        )

        self.cashier_staff = self.create_staff(
            username="cashier_user",
            role=StaffRole.CASHIER,
        )
        self.admin_staff = self.create_staff(
            username="cashier_admin_user",
            role=StaffRole.ADMIN,
        )
        self.waiter_staff = self.create_staff(
            username="cashier_waiter_user",
            role=StaffRole.WAITER,
        )
        self.kitchen_staff = self.create_staff(
            username="cashier_kitchen_user",
            role=StaffRole.KITCHEN,
        )

        self.cashier_token = self.login("cashier_user")
        self.admin_token = self.login("cashier_admin_user")
        self.waiter_token = self.login("cashier_waiter_user")
        self.kitchen_token = self.login("cashier_kitchen_user")

    def create_table(self, name, public_token):
        return Table.objects.create(
            restaurant=self.restaurant,
            name=name,
            public_token=public_token,
        )

    def create_order(
        self,
        *,
        table,
        session_token,
        status,
        total_price,
        item=None,
        quantity=1,
        expires_at=None,
    ):
        session = TableSession.objects.create(
            table=table,
            session_token=session_token,
            expires_at=expires_at or timezone.now() + timedelta(hours=2),
        )
        order = Order.objects.create(
            restaurant=table.restaurant,
            table=table,
            session=session,
            status=status,
            total_price=total_price,
        )
        OrderItem.objects.create(
            order=order,
            menu_item=item or self.item,
            quantity=quantity,
            price_at_time=(item or self.item).price,
            notes="Cashier note",
        )
        return order

    def create_staff(self, *, username, role):
        user = User.objects.create_user(username=username, password="Password123!")
        return Staff.objects.create(
            user=user,
            restaurant=self.restaurant,
            name=username,
            role=role,
        )

    def login(self, username):
        return self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": username, "password": "Password123!"},
            format="json",
        ).data["access"]

    def test_cashier_and_admin_can_list_restaurant_tables(self):
        response = self.client.get(
            "/api/v1/cashier/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        admin_response = self.client.get(
            "/api/v1/cashier/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        tables = {table["table_name"]: table for table in response.data}

        self.assertEqual(set(tables), {
            "Empty Table",
            "Session Only Table",
            "New Table",
            "Preparing Table",
            "Ready Table",
            "Paid Table",
        })
        self.assertEqual(tables["Empty Table"]["status"], "EMPTY")
        self.assertEqual(tables["Session Only Table"]["status"], "ORDERING")
        self.assertEqual(tables["New Table"]["status"], "ORDERING")
        self.assertEqual(tables["Preparing Table"]["status"], "PREPARING")
        self.assertEqual(tables["Ready Table"]["status"], "SERVED")
        self.assertEqual(tables["Paid Table"]["status"], "EMPTY")
        self.assertEqual(tables["Ready Table"]["order_id"], self.ready_order.public_token)
        self.assertEqual(tables["Ready Table"]["total_price"], "55.00")
        self.assertEqual(tables["Ready Table"]["payment_status"], "PENDING")
        self.assertNotIn("table_id", tables["Ready Table"])
        self.assertNotIn("id", tables["Ready Table"])

    def test_waiter_and_kitchen_cannot_access_cashier_tables(self):
        waiter_response = self.client.get(
            "/api/v1/cashier/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
        )
        kitchen_response = self.client.get(
            "/api/v1/cashier/tables/",
            HTTP_AUTHORIZATION=f"Bearer {self.kitchen_token}",
        )

        self.assertEqual(waiter_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(kitchen_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_table_order_detail_is_restaurant_scoped_and_public_only(self):
        response = self.client.get(
            f"/api/v1/cashier/tables/{self.ready_table.public_token}/order/",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        other_response = self.client.get(
            f"/api/v1/cashier/tables/{self.other_table.public_token}/order/",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["table_token"], self.ready_table.public_token)
        self.assertEqual(response.data["order_id"], self.ready_order.public_token)
        self.assertEqual(response.data["order_status"], OrderStatus.READY)
        self.assertEqual(response.data["items"][0]["name"], "Cashier Pizza")
        self.assertNotIn("table_id", response.data)
        self.assertNotIn("id", response.data)
        self.assertEqual(other_response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, other_response, code="table_not_found", message="table not found")

    def test_cashier_cannot_update_order_status_or_modify_admin_resources(self):
        kitchen_response = self.client.patch(
            f"/api/v1/kitchen/orders/{self.new_order.public_token}/status/",
            {"status": "PREPARING"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        waiter_response = self.client.patch(
            f"/api/v1/waiter/orders/{self.ready_order.public_token}/serve/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        table_response = self.client.post(
            "/api/v1/admin/tables/",
            {"name": "Cashier Created Table"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        staff_response = self.client.post(
            "/api/v1/admin/staff/",
            {
                "username": "cashier_created_staff",
                "password": "Password123!",
                "name": "Cashier Created Staff",
                "role": "WAITER",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )
        menu_response = self.client.post(
            "/api/v1/admin/menu-items/",
            {
                "category_id": self.category.id,
                "name": "Cashier Burger",
                "price": "44.00",
                "is_available": True,
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )

        self.assertEqual(kitchen_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(waiter_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(table_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(staff_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(menu_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_can_record_cash_payment_for_restaurant_order(self):
        response = self.client.post(
            "/api/v1/payments/",
            {"order_id": self.ready_order.public_token, "method": "CASH"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["order_id"], self.ready_order.public_token)
        self.assertEqual(response.data["status"], PaymentStatus.PAID)
        payment = Payment.objects.get(order=self.ready_order)
        self.assertEqual(payment.amount, Decimal("55.00"))
        audit_log = AuditLog.objects.get(
            restaurant=self.restaurant,
            actor_staff=self.cashier_staff,
            action="payment.recorded",
            target_identifier=self.ready_order.public_token,
        )
        self.assertEqual(audit_log.metadata["actor_type"], StaffRole.CASHIER)

    def test_cashier_payment_is_restaurant_scoped(self):
        response = self.client.post(
            "/api/v1/payments/",
            {"order_id": self.other_order.public_token, "method": "CASH"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.cashier_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        assert_error_payload(self, response, code="order_not_found", message="order not found")


class AdminOrderDashboardApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Admin Orders Restaurant")
        self.table = Table.objects.create(
            restaurant=self.restaurant,
            name="Table A1",
            public_token="admin_table_token",
        )
        self.session = TableSession.objects.create(
            table=self.table,
            session_token="sess_admin_123",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        category = Category.objects.create(restaurant=self.restaurant, name="Main")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=category,
            name="Steak",
            price=Decimal("150.00"),
            is_available=True,
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            status="SERVED",
            total_price=Decimal("300.00"),
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=self.item,
            quantity=2,
            price_at_time=Decimal("150.00"),
        )
        Payment.objects.create(
            order=self.order,
            method="CASH",
            status="PAID",
            amount=Decimal("300.00"),
        )
        admin_user = User.objects.create_user(username="admin_orders", password="Password123!")
        Staff.objects.create(
            user=admin_user,
            restaurant=self.restaurant,
            name="Admin Orders",
            role=StaffRole.ADMIN,
        )
        login = self.client.post(
            "/api/v1/staff/auth/login/",
            {"username": "admin_orders", "password": "Password123!"},
            format="json",
        )
        self.admin_token = login.data["access"]

    def test_admin_can_list_orders(self):
        response = self.client.get(
            "/api/v1/admin/orders/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["orders"]), 1)
        self.assertEqual(response.data["orders"][0]["order_id"], self.order.public_token)
        self.assertEqual(response.data["orders"][0]["payment_status"], "PAID")

    def test_admin_can_get_analytics_summary(self):
        response = self.client.get(
            "/api/v1/admin/analytics/summary/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["orders_today"], 1)
        self.assertEqual(response.data["totalRevenue"], 300.0)
        self.assertEqual(response.data["popular_items"][0]["name"], "Steak")
        self.assertEqual(response.data["popular_items"][0]["total_quantity"], 2)

    def test_admin_analytics_total_revenue_only_counts_served_paid_restaurant_orders(self):
        unpaid_order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            status=OrderStatus.SERVED,
            total_price=Decimal("125.00"),
        )
        cancelled_paid_order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            status=OrderStatus.CANCELLED,
            total_price=Decimal("80.00"),
        )
        Payment.objects.create(
            order=cancelled_paid_order,
            method="CASH",
            status=PaymentStatus.PAID,
            amount=Decimal("80.00"),
        )
        failed_payment_order = Order.objects.create(
            restaurant=self.restaurant,
            table=self.table,
            session=self.session,
            status=OrderStatus.SERVED,
            total_price=Decimal("90.00"),
        )
        Payment.objects.create(
            order=failed_payment_order,
            method="CASH",
            status=PaymentStatus.FAILED,
            amount=Decimal("90.00"),
        )
        other_restaurant = Restaurant.objects.create(name="Other Admin Analytics Restaurant")
        other_table = Table.objects.create(
            restaurant=other_restaurant,
            name="Other Table",
            public_token="other_admin_analytics_table_token",
        )
        other_session = TableSession.objects.create(
            table=other_table,
            session_token="sess_other_admin_analytics",
            expires_at=timezone.now() + timedelta(hours=2),
        )
        other_order = Order.objects.create(
            restaurant=other_restaurant,
            table=other_table,
            session=other_session,
            status=OrderStatus.SERVED,
            total_price=Decimal("999.00"),
        )
        Payment.objects.create(
            order=other_order,
            method="CASH",
            status=PaymentStatus.PAID,
            amount=Decimal("999.00"),
        )

        response = self.client.get(
            "/api/v1/admin/analytics/summary/",
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totalRevenue"], 300.0)
        self.assertFalse(Payment.objects.filter(order=unpaid_order).exists())
