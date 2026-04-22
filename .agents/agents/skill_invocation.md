# SKILL INVOCATION SYSTEM - TAWLAX

## Purpose

Define how agents automatically detect and invoke skills.

Agents MUST follow deterministic invocation rules.

---

## Invocation Flow

For every task:

1. Identify task type
2. Match task pattern
3. Load required skills
4. Execute using skills
5. Validate output

---

## Task Pattern Detection

### 1. Session Task

Keywords:

* session
* auth
* token
* scan table

Must invoke:

* `session_validation.md`

### 2. Menu Task

Keywords:

* menu
* categories
* fetch items

Must invoke:

* `session_validation.md`
* `menu_fetching.md`

### 3. Order Task

Keywords:

* order
* create order
* place order

Must invoke:

* `session_validation.md`
* `order_flow.md`
* `order_security.md`
* `api_error_handling.md`

### 4. API Response or Error Task

Keywords:

* response
* error
* status code

Must invoke:

* `api_error_handling.md`

### 5. Security Task

Keywords:

* security
* validation
* vulnerability
* auth
* permission

Must invoke:

* `session_validation.md`
* `order_security.md`
* `api_error_handling.md`

### 6. Real-Time Task

Keywords:

* websocket
* realtime
* real-time
* event

Must invoke:

* `websocket_event_flow.md`

### 7. Frontend UI Task

Keywords:

* frontend
* ui
* ux
* dashboard
* page
* component
* design

Must invoke:

* `frontend_ui_direction.md`

### 8. Frontend API Integration Task

Keywords:

* integrate api
* fetch data
* session token
* bearer token
* error states

Must invoke:

* `frontend_api_integration.md`
* `api_error_handling.md`

### 9. Frontend Realtime Task

Keywords:

* socket ui
* live orders
* live status
* websocket ui

Must invoke:

* `frontend_realtime_ui.md`
* `websocket_event_flow.md`

### 10. Frontend Performance Task

Keywords:

* performance
* fast
* optimize loading
* hydration
* mobile speed

Must invoke:

* `frontend_performance.md`
* `frontend_ui_direction.md`

---

## Skill Priority Order

When multiple skills are used:

1. Validation and security
2. Core domain logic
3. Frontend direction and UX
4. Performance and realtime specifics
5. Error formatting

---

## Auto-Validation

After execution, the agent MUST check:

* All required skills were used
* No validation was skipped
* Output matches schema and API design
* Frontend output matches frontend docs when relevant

If not -> fix before responding

---

## Forbidden Behavior

* Skipping skill invocation
* Using partial skill logic
* Replacing skills with assumptions

---

## Goal

Agents must be:

* Predictable
* Secure
* Consistent
* Frontend-aware
* Independent of prompt quality
