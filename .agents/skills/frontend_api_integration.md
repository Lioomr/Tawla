# SKILL: Frontend API Integration

## Purpose

Integrate frontend surfaces with the backend safely and consistently.

---

## Customer Auth Rules

Customer APIs use:

* `X-Session-Token`

Frontend must:

* Start session first
* Reuse the returned session token for customer requests
* Treat session expiry as a recoverable flow

---

## Staff Auth Rules

Staff APIs use:

* `Authorization: Bearer <access_token>`

Frontend must:

* Use access token for protected requests
* Use refresh token when access expires
* Handle refresh failure by returning to login

---

## Error Handling

All frontend API layers must read:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "invalid request"
  }
}
```

Frontend must branch on:

* `error.code`
* HTTP status

Not on fragile free-text matching alone.

---

## Rules

* Never assume hidden backend fields
* Use public tokens exactly as returned
* Keep API client layer small and explicit
* Separate transport errors from UI-state errors
