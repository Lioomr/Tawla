from django.urls import path

from apps.menu.admin_views import (
    AdminCategoryCollectionView,
    AdminCategoryImageUploadView,
    AdminMenuItemCollectionView,
    AdminMenuItemImageUploadView,
)
from apps.menu.views import MenuListView


urlpatterns = [
    path("menu/", MenuListView.as_view(), name="menu-list"),
    path("admin/categories/", AdminCategoryCollectionView.as_view(), name="admin-category-collection"),
    path("admin/categories/<int:category_id>/image/", AdminCategoryImageUploadView.as_view(), name="admin-category-image-upload"),
    path("admin/menu-items/", AdminMenuItemCollectionView.as_view(), name="admin-menu-item-collection"),
    path("admin/menu-items/<int:menu_item_id>/image/", AdminMenuItemImageUploadView.as_view(), name="admin-menu-item-image-upload"),
]
