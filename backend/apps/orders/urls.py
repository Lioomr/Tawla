from django.urls import path

from apps.orders.staff_views import (
    AdminAnalyticsSummaryView,
    AdminOrderListView,
    CashierTableListView,
    CashierTableOrderDetailView,
    KitchenOrderListView,
    KitchenOrderStatusUpdateView,
    PaymentCreateView,
    WaiterOrderServeView,
    WaiterTableListView,
    WaiterTableRequestListView,
    WaiterTableRequestResolveView,
)
from apps.orders.views import OrderCollectionView, OrderDetailView, TableRequestCreateView


urlpatterns = [
    path("orders/", OrderCollectionView.as_view(), name="order-collection"),
    path("orders/<str:order_token>/", OrderDetailView.as_view(), name="order-detail"),
    path("table/requests/", TableRequestCreateView.as_view(), name="table-request-create"),
    path("kitchen/orders/", KitchenOrderListView.as_view(), name="kitchen-order-list"),
    path(
        "kitchen/orders/<str:order_token>/status/",
        KitchenOrderStatusUpdateView.as_view(),
        name="kitchen-order-status-update",
    ),
    path("waiter/tables/", WaiterTableListView.as_view(), name="waiter-table-list"),
    path("waiter/requests/", WaiterTableRequestListView.as_view(), name="waiter-table-request-list"),
    path(
        "waiter/requests/<str:request_token>/resolve/",
        WaiterTableRequestResolveView.as_view(),
        name="waiter-table-request-resolve",
    ),
    path(
        "waiter/orders/<str:order_token>/serve/",
        WaiterOrderServeView.as_view(),
        name="waiter-order-serve",
    ),
    path("cashier/tables/", CashierTableListView.as_view(), name="cashier-table-list"),
    path(
        "cashier/tables/<str:table_token>/order/",
        CashierTableOrderDetailView.as_view(),
        name="cashier-table-order-detail",
    ),
    path("payments/", PaymentCreateView.as_view(), name="payment-create"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/analytics/summary/", AdminAnalyticsSummaryView.as_view(), name="admin-analytics-summary"),
]
