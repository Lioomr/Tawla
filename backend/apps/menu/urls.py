from django.urls import path

from apps.menu.admin_views import AdminCategoryCollectionView, AdminMenuItemCollectionView
from apps.menu.views import MenuListView


urlpatterns = [
    path("menu/", MenuListView.as_view(), name="menu-list"),
    path("admin/categories/", AdminCategoryCollectionView.as_view(), name="admin-category-collection"),
    path("admin/menu-items/", AdminMenuItemCollectionView.as_view(), name="admin-menu-item-collection"),
]
