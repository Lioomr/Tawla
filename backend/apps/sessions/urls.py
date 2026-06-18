from django.urls import path

from apps.sessions.views import SessionDetailView, SessionGuestView, SessionStartView


urlpatterns = [
    path("table/session/", SessionDetailView.as_view(), name="table-session-detail"),
    path("table/session/start/", SessionStartView.as_view(), name="table-session-start"),
    path("table/session/guest/", SessionGuestView.as_view(), name="table-session-guest"),
]
