from django.urls import path

from apps.sessions.views import SessionStartView


urlpatterns = [
    path("table/session/start/", SessionStartView.as_view(), name="table-session-start"),
]
