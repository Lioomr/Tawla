# FRONTEND MVP TASKS - TAWLAX

## Status

Frontend implementation is COMPLETE.

Backend dependencies for MVP frontend are ready.

---

## Phase 4A - Customer App

Priority:

* HIGHEST

Tasks:

1. ~~Session entry flow~~ DONE
2. ~~Menu browsing UI~~ DONE
3. ~~Cart and order creation flow~~ DONE
4. ~~Live order-status screen~~ DONE
5. ~~Expired-session recovery flow~~ DONE

Current note:

* Session invalidity is partially handled through redirects and session validity checks
* A dedicated recovery or restart UX is still pending

Success criteria:

* Minimal taps
* Fast first paint
* Clean mobile UX

---

## Phase 4B - Kitchen Dashboard

Tasks:

1. ~~Staff login~~ DONE (shared login at `/staff/login`)
2. ~~Live order board~~ DONE
3. ~~Status update actions~~ DONE
4. ~~Realtime reconnect behavior~~ DONE

Success criteria:

* Scan-friendly
* High-contrast status visibility
* Very low action friction

---

## Phase 4C - Waiter Dashboard

Tasks:

1. ~~Staff login~~ DONE (shared login at `/staff/login`)
2. ~~Active table overview~~ DONE
3. ~~Serve-order action~~ DONE
4. ~~Payment recording flow~~ DONE

Success criteria:

* Fast table recognition
* Minimal action depth
* Clear order/payment states

---

## Phase 4D - Admin Dashboard

Tasks:

1. ~~Admin dashboard route and entry UX~~ DONE
2. ~~Category management~~ DONE
3. ~~Menu-item management~~ DONE
4. ~~Table management~~ DONE
5. ~~Staff management~~ DONE
6. ~~Orders list~~ DONE
7. ~~Analytics summary~~ DONE
8. ~~Audit log viewer~~ DONE

Success criteria:

* Clear information hierarchy
* Low ambiguity in admin actions
* Clean data density

---

## Rules

* Start with customer app before staff dashboards unless the task explicitly changes priority
* Frontend Agent must use frontend docs and frontend skills
* Do not begin implementation from this file alone without a valid task packet
