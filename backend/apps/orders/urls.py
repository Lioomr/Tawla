from django.urls import path

from apps.orders.staff_views import (
    AdminAnalyticsSummaryView,
    AdminOrderListView,
    KitchenOrderListView,
    KitchenOrderStatusUpdateView,
    PaymentCreateView,
    WaiterOrderServeView,
    WaiterTableListView,
)
from apps.orders.views import OrderCollectionView, OrderDetailView


urlpatterns = [
    path("orders/", OrderCollectionView.as_view(), name="order-collection"),
    path("orders/<str:order_token>/", OrderDetailView.as_view(), name="order-detail"),
    path("kitchen/orders/", KitchenOrderListView.as_view(), name="kitchen-order-list"),
    path(
        "kitchen/orders/<str:order_token>/status/",
        KitchenOrderStatusUpdateView.as_view(),
        name="kitchen-order-status-update",
    ),
    path("waiter/tables/", WaiterTableListView.as_view(), name="waiter-table-list"),
    path(
        "waiter/orders/<str:order_token>/serve/",
        WaiterOrderServeView.as_view(),
        name="waiter-order-serve",
    ),
    path("payments/", PaymentCreateView.as_view(), name="payment-create"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/analytics/summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
]
