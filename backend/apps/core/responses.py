from rest_framework.response import Response


def build_error_payload(*, code, message, **extra):
    payload = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if extra:
        payload["error"].update(extra)
    return payload


def error_response(*, code, message, status_code, **extra):
    return Response(
        build_error_payload(code=code, message=message, **extra),
        status=status_code,
    )
