# SKILL: Session Validation

## Purpose

Secure all customer actions.

---

## Steps

1. Extract `session_token` from `X-Session-Token`
2. Find `TableSession`
3. Check session exists
4. Check session is not expired
5. Attach session context to request logic

---

## Rules

* Reject if invalid
* Reject if expired
* Never infer table from client body

---

## Errors

* `401` -> `invalid_session`
* `403` -> `expired_session`
