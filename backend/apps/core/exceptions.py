from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.views import exception_handler

from apps.core.responses import build_error_payload


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, Throttled):
        response.data = build_error_payload(
            code="rate_limit_exceeded",
            message="rate limit exceeded",
        )
        if exc.wait is not None:
            response.data["error"]["retry_after"] = int(exc.wait)
        return response

    if isinstance(exc, NotAuthenticated):
        response.data = build_error_payload(
            code="not_authenticated",
            message="authentication credentials were not provided",
        )
        return response

    if isinstance(exc, AuthenticationFailed):
        response.data = build_error_payload(
            code="authentication_failed",
            message="authentication failed",
        )
        return response

    if isinstance(exc, PermissionDenied):
        response.data = build_error_payload(
            code="forbidden",
            message="forbidden",
        )
        return response

    if isinstance(exc, NotFound):
        response.data = build_error_payload(
            code="not_found",
            message="resource not found",
        )
        return response

    if isinstance(exc, ValidationError):
        message = "invalid request"
        details = response.data
        if isinstance(details, dict) and "error" in details:
            raw_error = details["error"]
            if isinstance(raw_error, list) and raw_error:
                message = str(raw_error[0])
            elif isinstance(raw_error, str):
                message = raw_error
        response.status_code = response.status_code or status.HTTP_400_BAD_REQUEST
        response.data = build_error_payload(
            code="invalid_request",
            message=message,
            details=details,
        )
        return response

    return response
