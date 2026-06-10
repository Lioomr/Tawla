from channels.routing import URLRouter
from django.urls import path

from apps.orders.consumers import CashierConsumer, KitchenConsumer, SessionOrdersConsumer, WaiterConsumer


websocket_urlpatterns = [
    path("ws/orders/", SessionOrdersConsumer.as_asgi()),
    path("ws/kitchen/", KitchenConsumer.as_asgi()),
    path("ws/waiter/", WaiterConsumer.as_asgi()),
    path("ws/cashier/", CashierConsumer.as_asgi()),
]


websocket_router = URLRouter(websocket_urlpatterns)
