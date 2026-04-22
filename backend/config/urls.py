from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.restaurants.urls")),
    path("api/v1/", include("apps.sessions.urls")),
    path("api/v1/", include("apps.menu.urls")),
    path("api/v1/", include("apps.orders.urls")),
]
