from django.urls import path

from apps.restaurants.auth_views import StaffLoginView, StaffMeView, StaffRefreshView
from apps.restaurants.views import AdminStaffCollectionView, AdminTableCollectionView


urlpatterns = [
    path("staff/auth/login/", StaffLoginView.as_view(), name="staff-login"),
    path("staff/auth/refresh/", StaffRefreshView.as_view(), name="staff-refresh"),
    path("staff/me/", StaffMeView.as_view(), name="staff-me"),
    path("admin/tables/", AdminTableCollectionView.as_view(), name="admin-table-collection"),
    path("admin/staff/", AdminStaffCollectionView.as_view(), name="admin-staff-collection"),
]
