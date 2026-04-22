# SKILL: API Error Handling

## Purpose

Standardize all API errors.

---

## Mandatory Format

```json
{
  "error": {
    "code": "invalid_request",
    "message": "invalid request"
  }
}
```

Optional fields can be added inside `error`.

Example:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "rate limit exceeded",
    "retry_after": 60
  }
}
```

---

## Rules

* No stack traces
* No internal details
* Use stable error codes
* Messages must be short and clear

---

## Common Cases

* Invalid session -> `401` + `invalid_session`
* Expired session -> `403` + `expired_session`
* Bad input -> `400` + `invalid_request`
* Missing auth -> `401` + `not_authenticated`
* Forbidden action -> `403` + `forbidden`
* Throttled -> `429` + `rate_limit_exceeded`
