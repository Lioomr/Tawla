# TESTING STRATEGY - TAWLAX

## Purpose

Describe what is currently tested, how to run tests, and the known testing gaps in the current repository.

This is a documentation snapshot of the current implementation state.

---

## Current Test Surface

### Backend

Current backend tests cover:

* Session start flow
* Menu retrieval and admin menu CRUD
* Order creation, listing, and detail
* Session and ownership validation
* Rate limiting for login, order creation, and payment creation
* Staff auth and profile access
* Kitchen status updates
* Waiter serve flow
* Payment creation
* Admin orders and analytics
* Realtime websocket event delivery

Primary locations:

* `backend/apps/sessions/tests.py`
* `backend/apps/menu/tests.py`
* `backend/apps/orders/tests.py`
* `backend/apps/orders/test_websocket.py`
* `backend/apps/restaurants/tests.py`

### Frontend

Current repository state:

* No automated frontend test suite is documented or committed yet

Frontend verification is currently manual.

---

## How To Run Backend Validation

From the repository root:

```powershell
docker compose exec backend python manage.py test --noinput
docker compose exec backend python manage.py check
```

For a focused orders pass:

```powershell
docker compose exec backend python manage.py test apps.orders --noinput
```

---

## Current Testing Philosophy

Backend testing currently emphasizes:

* API contract correctness
* Security and authorization checks
* Validation failures
* Realtime event behavior

This matches the current MVP priority:

* Safe ordering
* Correct restaurant scoping
* Reliable staff operations

---

## Known Gaps

Current gaps include:

* No documented frontend automated tests
* No browser E2E test suite in the repository
* No load or soak testing for realtime traffic
* No deployment smoke-test checklist

---

## Release Expectation

Before production rollout, validation should include:

* Full backend test pass
* Django system checks
* Manual verification of customer, kitchen, waiter, and admin critical flows
* Manual websocket reconnect verification
* Deployment smoke tests in the target environment
