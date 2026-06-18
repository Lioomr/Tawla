import secrets

from django.db import models

from apps.core.models import TimeStampedModel
from apps.menu.models import MenuItem
from apps.restaurants.models import Restaurant, Staff, Table
from apps.sessions.models import SessionGuest, TableSession


def generate_order_public_token() -> str:
    return f"ord_{secrets.token_urlsafe(12)}"


def generate_table_request_token() -> str:
    return f"treq_{secrets.token_urlsafe(12)}"


class OrderStatus(models.TextChoices):
    NEW = "NEW", "New"
    PREPARING = "PREPARING", "Preparing"
    READY = "READY", "Ready"
    SERVED = "SERVED", "Served"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    ONLINE = "ONLINE", "Online"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"


class TableRequestType(models.TextChoices):
    CALL_WAITER = "CALL_WAITER", "Call waiter"
    REQUEST_BILL = "REQUEST_BILL", "Request bill"
    NEED_HELP = "NEED_HELP", "Need help"


class TableRequestStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    RESOLVED = "RESOLVED", "Resolved"


class Order(TimeStampedModel):
    public_token = models.CharField(
        max_length=64,
        unique=True,
        default=generate_order_public_token,
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    table = models.ForeignKey(
        Table,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    session = models.ForeignKey(
        TableSession,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    guest = models.ForeignKey(
        SessionGuest,
        on_delete=models.PROTECT,
        related_name="orders",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.NEW,
        db_index=True,
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return self.public_token

    def save(self, *args, **kwargs):
        if not self.public_token:
            self.public_token = generate_order_public_token()
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="items",
    )
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    quantity = models.PositiveIntegerField()
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.menu_item.name} x {self.quantity}"


class Payment(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.PROTECT,
        related_name="payment",
    )
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Payment for order {self.order_id}"


class TableRequest(TimeStampedModel):
    request_token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_table_request_token,
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="table_requests",
    )
    table = models.ForeignKey(
        Table,
        on_delete=models.PROTECT,
        related_name="table_requests",
    )
    session = models.ForeignKey(
        TableSession,
        on_delete=models.PROTECT,
        related_name="table_requests",
    )
    guest = models.ForeignKey(
        SessionGuest,
        on_delete=models.PROTECT,
        related_name="table_requests",
        null=True,
        blank=True,
    )
    request_type = models.CharField(max_length=20, choices=TableRequestType.choices)
    status = models.CharField(
        max_length=20,
        choices=TableRequestStatus.choices,
        default=TableRequestStatus.OPEN,
        db_index=True,
    )
    resolved_by = models.ForeignKey(
        Staff,
        on_delete=models.PROTECT,
        related_name="resolved_table_requests",
        null=True,
        blank=True,
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["session", "status"]),
        ]

    def __str__(self) -> str:
        return self.request_token
