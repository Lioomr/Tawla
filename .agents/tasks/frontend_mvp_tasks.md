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
6. ~~Customer table request actions (call waiter / request bill / need help)~~ DONE

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
5. ~~Open table request alerts and resolve action~~ DONE

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

## Phase 4E - Shared Table Lobby (Customer App)

Tasks:

1. ~~Persist `guest_token`; consume `mode` / `guest_count` from session start~~ DONE
2. ~~Preserve solo flow (no lobby UI, no name prompt for a single device)~~ DONE
3. ~~Lobby bar: participant avatars, guest count, self identity~~ DONE
4. ~~Realtime solo→lobby switch on `guest_joined` + join toast~~ DONE
5. ~~Optional guest display-name UI with client+API validation~~ DONE
6. ~~Lobby cart: editable "your items" + read-only "table orders"~~ DONE
7. ~~`guest_joined` / `guest_updated` realtime handling~~ DONE
8. ~~Display server-provided guest attribution on table orders (avatar + name,
   "you" for self, null-safe)~~ DONE
9. ~~Hydrate participants from the authoritative roster endpoint
   `GET /table/session/` (load / reconnect / guest events), with defensive
   validation and session/guest error recovery~~ DONE

Constraints honored:

* No backend changes; no split-bill / host-mode / payment-sharing UI; no heartbeat
  or leave flow invented
* Order payloads return nullable `guest` attribution, so table orders are labelled
  by guest; the current user's are marked "you" (server `guest_token` match, with a
  local-order-id fallback), and `guest: null` renders gracefully
* The participant list now comes from the `GET /table/session/` roster (authoritative),
  with realtime `guest_joined` / `guest_updated` supplying deltas between fetches

Success criteria:

* Invisible for single-device tables
* Delightful and clear for 2–6 device tables

---

## Rules

* Start with customer app before staff dashboards unless the task explicitly changes priority
* Frontend Agent must use frontend docs and frontend skills
* Do not begin implementation from this file alone without a valid task packet
