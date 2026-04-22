import os

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class StaffLoginRateThrottle(AnonRateThrottle):
    scope = "staff_login"
    rate = None

    def get_rate(self):
        return self.rate or os.getenv("RATE_LIMIT_STAFF_LOGIN", "5/minute")

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


class SessionTokenRateThrottle(SimpleRateThrottle):
    session_header = "HTTP_X_SESSION_TOKEN"

    def get_cache_key(self, request, view):
        session_token = request.META.get(self.session_header, "").strip()
        ident = session_token or self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


class OrderCreateRateThrottle(SessionTokenRateThrottle):
    scope = "order_create"
    rate = None

    def get_rate(self):
        return self.rate or os.getenv("RATE_LIMIT_ORDER_CREATE", "10/minute")


class PaymentCreateRateThrottle(SimpleRateThrottle):
    scope = "payment_create"
    session_header = "HTTP_X_SESSION_TOKEN"
    rate = None

    def get_rate(self):
        return self.rate or os.getenv("RATE_LIMIT_PAYMENT_CREATE", "5/minute")

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"staff:{request.user.pk}"
        else:
            session_token = request.META.get(self.session_header, "").strip()
            ident = session_token or self.get_ident(request)

        if not ident:
            return None

        return self.cache_format % {"scope": self.scope, "ident": ident}
