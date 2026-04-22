# SKILL BINDING - TAWLAX

## Purpose

Define which agent uses which skill and when.

Skills are not optional.

---

## Backend Agent Bindings

### Session handling

MUST use:

* `session_validation.md`

### Menu retrieval

MUST use:

* `session_validation.md`
* `menu_fetching.md`

### Customer order creation

MUST use:

* `session_validation.md`
* `order_flow.md`
* `order_security.md`
* `api_error_handling.md`

### Customer order retrieval

MUST use:

* `session_validation.md`
* `api_error_handling.md`

### Staff auth and protected staff endpoints

MUST use:

* `api_error_handling.md`

### Real-time backend work

MUST use:

* `websocket_event_flow.md`

---

## Frontend Agent Bindings

### Any UI implementation task

MUST use:

* `frontend_ui_direction.md`

### API integration

MUST use:

* `frontend_api_integration.md`
* `api_error_handling.md`

### Real-time UI

MUST use:

* `frontend_realtime_ui.md`
* `websocket_event_flow.md`

### Performance-sensitive UI work

MUST use:

* `frontend_performance.md`
* `frontend_ui_direction.md`

---

## Product Agent Bindings

### Feature validation

MUST use:

* `order_flow.md`
* `order_security.md`
* `frontend_ui_direction.md` when UX is involved

### UX review

MUST ensure:

* Minimal steps
* No unnecessary friction
* Clear system states
* Mobile-first customer usability

---

## Security Auditor Bindings

MUST use:

* `session_validation.md`
* `order_security.md`
* `api_error_handling.md`

Must check:

* IDOR vulnerabilities
* Token misuse
* Missing validation
* Missing rate limiting
* Missing audit logging

---

## Execution Rule

For every task:

1. Identify task type
2. Load required skills
3. Execute using skill steps
4. Validate using skill rules

---

## Goal

Ensure:

* Consistency
* Security
* Predictable outputs
* Strong frontend and backend discipline
