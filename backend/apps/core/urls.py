from django.urls import path

from apps.core.views import AdminAuditLogListView


urlpatterns = [
    path("admin/audit-logs/", AdminAuditLogListView.as_view(), name="admin-audit-log-list"),
]
