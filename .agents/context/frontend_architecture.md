# FRONTEND ARCHITECTURE - TAWLAX

## Purpose

Define the frontend source of truth during frontend implementation.

This document covers:

* App surfaces
* Actual route structure
* Data and auth boundaries
* Realtime integration
* State architecture
* Performance expectations

---

## Product Direction

Frontend must be:

* Modern
* Simple
* Extremely fast
* Visually impressive
* Creative without being confusing

The frontend must not look like a generic admin template or a copy-paste SaaS dashboard.

---

## Approved Tech Stack

The following core technologies are explicitly approved for the frontend implementation:

* **Framework**: Next.js (React)
* **Styling**: Tailwind CSS
* **Components**: shadcn/ui
* **Client State**: Zustand
* **Server State**: React Query (TanStack Query)
* **Animations**: Framer Motion
* **Smooth scroll**: Lenis — marketing site only (`/`), layered over native scroll for the scroll-driven experience; disabled on touch and under `prefers-reduced-motion`
* **Data Grids**: TanStack Table

---

## Frontend Surfaces

### 1. Customer Ordering App

Primary environment:

* Mobile browser
* QR/NFC entry

Core flow:

1. Start session from table token
2. Load menu
3. Add items
4. Place order
5. View order status updates

Required qualities:

* Very low friction
* Large touch targets
* Clear pricing
* Very fast first interaction

### 2. Kitchen Dashboard

Primary environment:

* Tablet or desktop display

Core flow:

1. Authenticate staff
2. View incoming orders
3. Change order status
4. Receive live updates

Required qualities:

* Dense but readable
* Fast scanning
* Strong order-state contrast

### 3. Waiter Dashboard

Primary environment:

* Mobile or tablet

Core flow:

1. Authenticate staff
2. View active tables
3. View order readiness
4. Mark served
5. Record payment

Required qualities:

* Speed over ornament
* Immediate table-state visibility
* Minimal tap count

### 4. Admin Dashboard

Primary environment:

* Desktop-first

Current status:

* Implemented

Implemented flow:

1. Authenticate admin via shared staff login
2. Sidebar layout with navigation to all admin sections
3. Category and menu item CRUD (with image upload support pending)
4. Table CRUD with token management
5. Staff CRUD with role assignment and password management
6. Read-only orders overview with status and payment badges
7. Analytics summary with orders-today and popular items
8. Audit log viewer with expandable metadata
9. Restaurant branding settings page (pending)

Required qualities:

* Operational clarity
* Strong information hierarchy
* Zero ambiguity in destructive actions

### 5. Cashier Dashboard

Primary environment:

* Tablet or desktop at front-of-house counter

Core flow:

1. Authenticate cashier via shared staff login
2. See full table grid with live status (EMPTY / ORDERING / PREPARING / SERVED)
3. Click a table to see its current order details and total
4. Record cash payment for a served order
5. Receive real-time table status changes via WebSocket

Required qualities:

* Extremely clear table-state visibility at a glance
* Large tap targets for quick table selection
* Order total prominently shown before payment
* Minimal steps to record payment
* Live without manual refresh

### 6. Super Admin Panel

Primary environment:

* Desktop (internal Tawlax team only)

Core flow:

1. Authenticate as Super Admin (Django `is_superuser` or dedicated role)
2. Create, view, and deactivate restaurants
3. Configure restaurant branding (logo, colors, banner)
4. Create initial staff accounts for a restaurant
5. View platform-level stats (total orders, active restaurants)

Required qualities:

* Simple and functional — not customer-facing
* Clear restaurant list with status indicators

---

## Data and Auth Boundaries

### Customer

Uses:

* `table_token` to start session
* `X-Session-Token` for customer API calls

Must never:

* Expose internal IDs as user-facing identifiers
* Depend on staff JWT flows

### Staff

Uses:

* JWT Bearer access token
* JWT refresh token

Current implementation:

* Access token and refresh token are persisted in client state
* Client-side auth currently checks token presence, not decoded expiry

Target support:

* Access expiry recovery
* Refresh flow without full re-login when valid

Current gap:

* Token refresh flow is not implemented yet in the frontend client

---

## Realtime Boundaries

Customer socket:

* `/ws/orders/?session_token=<session_token>`

Staff sockets:

* `/ws/kitchen/?access_token=<jwt_access_token>`
* `/ws/waiter/?access_token=<jwt_access_token>`

Frontend rule:

* Load initial state from REST
* Use WebSockets for deltas
* Recover from disconnects by refetching current REST state

Current implementation:

* `useOrderWebSocket` applies lightweight status updates into the customer order query cache,
  and also handles shared-table `guest_joined` / `guest_updated` events (dispatched into
  `useLobbyStore`). On reconnect and on order/guest events it invalidates the session-orders and
  session-roster queries so REST re-supplies authoritative truth. It also validates
  `table_request_resolved` payloads and dispatches a local browser event so the menu request
  control can mark the matching open request resolved. Mounted on both `/menu` (so a solo device
  flips to lobby live) and `/order/[order_id]`.
* `useKitchenWebSocket` invalidates kitchen orders on realtime events
* `useWaiterWebSocket` invalidates waiter tables on order events, invalidates waiter request alerts
  on `table_request_created`, and resyncs both queries on reconnect
* All three sockets retry connection after a short delay on close

---

## Route Structure

Current implemented routes:

### Customer

* `/` - landing message instructing customers to scan the table QR code
* `/t/[tableToken]` - session bootstrap from public table token (persists guest token, seeds lobby)
* `/menu` - menu browsing, cart flow, and the shared-table lobby surface
* `/order/[order_id]` - live order status
* `/session-expired` - session expiry recovery page with re-scan instruction

### Staff

* `/staff/login` - shared login for kitchen, waiter, admin, and cashier credentials
* `/staff/kitchen` - kitchen order board
* `/staff/waiter` - waiter table and payment board
* `/staff/cashier` - cashier table status and payment board (pending)

### Admin

* `/staff/admin` - redirects to `/staff/admin/menu`
* `/staff/admin/menu` - category and menu item management
* `/staff/admin/tables` - table management with token display
* `/staff/admin/staff` - staff member management
* `/staff/admin/orders` - read-only order overview
* `/staff/admin/analytics` - analytics summary
* `/staff/admin/audit-log` - audit log viewer
* `/staff/admin/settings` - restaurant branding settings (pending)

### Super Admin (pending)

* `/superadmin` - restaurant list and platform management
* `/superadmin/restaurants/new` - create a new restaurant
* `/superadmin/restaurants/[id]` - edit restaurant branding and settings

---

## State Architecture

Frontend state is split into:

* Server-fetched data
* Local interaction state
* Realtime deltas

### Zustand stores

Implemented stores:

* `useCustomerStore` - session token, **guest token**, and session expiry persistence
* `useCartStore` - cart items, notes, quantities, and subtotal helpers
* `useStaffStore` - access token, refresh token, and staff profile persistence
* `useLobbyStore` - shared-table lobby state (mode, guest_count, self identity,
  known participants, this device's own order ids, one-time name-prompt flag).
  Session-scoped: it resets when a different `session_token` is bootstrapped, so a
  re-scan of another table never leaks the previous table's guests.

Rules:

* Customer session validity is checked from stored expiry time
* Cart state is local UI state and not a copy of server truth
* Staff auth state must not invent backend fields that are not returned by the API

### React Query

Implemented query usage:

* `useMenu` - customer menu fetch
* `useOrderQuery` - customer order detail fetch
* Kitchen dashboard query - kitchen order list
* Waiter dashboard queries - waiter tables list and open table requests list

Provider behavior:

* `QueryProvider` creates a single app-wide QueryClient
* Default query config disables `refetchOnWindowFocus`

### Realtime strategy

Rules:

* Do not duplicate server truth unnecessarily
* Prefer simple, explicit state transitions
* Avoid deeply nested state unless the task requires it

Current implementation note:

* Kitchen and waiter dashboards refetch from REST after realtime events instead of doing complex local merges
* Customer order detail applies only the status delta from the customer socket
* Customer table requests are created through `POST /table/requests/`; resolved state comes from the
  validated `table_request_resolved` socket event because there is no customer-side request-list API
* Cashier dashboard will follow the same pattern as waiter: refetch on realtime event

---

## Branding Theming System

The customer app dynamically applies restaurant branding using CSS variables.

Flow:

1. Customer scans QR → session starts
2. `/menu/` API returns branding fields alongside menu data
3. Frontend injects CSS variables on the root element:

```css
:root {
  --brand-primary: #FF5733;
  --brand-secondary: #2C2C2C;
}
```

4. All customer-facing components consume `--brand-primary` and `--brand-secondary` instead of hardcoded colors
5. Restaurant logo is displayed in the menu page header
6. Banner image is shown as a hero at the top of the menu

Rules:

* CSS variables are the only mechanism for branding — no inline styles
* Branding is loaded once per session, not re-fetched on every route change
* Fallback to sensible defaults if branding fields are empty

---

## Shared Table Lobby System

The customer app supports a shared-table lobby on top of the single-device flow.

Flow:

1. `POST /table/session/start/` returns `mode` (`solo` | `lobby`), `guest_count`, and a
   `guest_token`. The first device gets `solo` and goes straight to the menu — no lobby UI,
   no name prompt.
2. When a second device scans the same table, the backend broadcasts `guest_joined` on the
   customer session socket. A device already in `solo` flips to `lobby` live, shows a small
   "guest joined" toast, and only then surfaces a skippable display-name prompt.
3. The participant list is hydrated from the authoritative roster endpoint
   `GET /table/session/` (`{ mode, guest_count, current_guest, guests[] }`), fetched on
   menu/lobby load, after session start, on socket reconnect, and after guest events.
   Realtime `guest_joined` / `guest_updated` supply live deltas between fetches. The lobby bar
   shows the participants (self + others) and the total count.
4. Display names are optional and edited via `PATCH /table/session/guest/`. Validation mirrors
   the backend (trim, collapse whitespace, max 40, reject control chars and `<>`).
5. In lobby mode the cart shows an editable "your items" section plus a read-only "ordered at
   this table" list from `GET /orders/`, with each order labelled by guest.

Order guest attribution:

* `GET /orders/` and `GET /orders/{token}/` return a nullable `guest` object
  (`{ guest_token, display_name, avatar_color }` or `null`). Types live in `src/lib/api.ts`
  (`OrderGuest`, on `OrderSummary` and `OrderDetailsResponse`).
* The lobby table-orders list labels each order with the guest's avatar + name. The current
  user's orders are marked "you" via `isOwnOrder` — preferring the server's `guest_token`
  match, falling back to this device's own order ids for un-attributed orders.
* `guest` is validated defensively (`normalizeOrderGuest`) and `guest: null` renders gracefully
  as the table's order (view-only, neutral placeholder) — solo flow is unaffected.

Roster hydration (`useSessionRoster`):

* `GET /table/session/` requires both `X-Session-Token` and `X-Guest-Token` and returns the full
  participant list plus `current_guest`. The response is validated defensively
  (`normalizeRoster`) before it touches the store; `applyRoster` then replaces the participant
  map and adopts the server's authoritative self identity (name/colour/guest number).
* Errors map to recovery via the stable error code (`classifyRosterError`):
  `invalid_session` / `expired_session` → session-expired page; `invalid_guest` → clear the
  guest token and reset lobby (graceful fallback; session ordering still works).

Honest-data rules:

* `solo` vs `lobby` is always taken from the backend; the frontend never recomputes it.
* All server data (roster, guests, order attribution) is validated before storing/rendering.
* No invented flows: no heartbeat, leave flow, split bill, host mode, or payment sharing.

Pure, unit-tested lobby logic (validation, default name/colour, roster, ownership) lives in
`src/lib/lobby.ts` with specs in `src/lib/lobby.test.ts` (run via `node --test`).

---

## API Client Pattern

`src/lib/api.ts` is the canonical frontend transport layer.

Responsibilities:

* Set `X-Session-Token` for customer APIs
* Set `X-Guest-Token` for guest-scoped customer actions (guest update, order attribution)
* Set `Authorization: Bearer <access_token>` for staff APIs
* Parse the unified backend error payload
* Throw `ApiError` with stable `code` and `status`
* Expose explicit methods for session, menu, order, auth, kitchen, waiter, and payment flows,
  including `updateGuestDisplayName` (`PATCH /table/session/guest/`), `getSessionRoster`
  (`GET /table/session/`), `getSessionOrders` (`GET /orders/`) for the shared-table lobby, customer
  table-request creation, waiter request listing, and waiter request resolution

Rules:

* UI code should call explicit API helpers rather than constructing fetch calls inline
* Error branching should prefer stable codes and status values over fragile message matching

---

## Performance Requirements

Customer experience is the highest priority.

Frontend must optimize for:

* Fast first load on weak internet
* Minimal JavaScript on customer pages
* Quick tap-to-feedback latency
* Stable layouts with minimal jitter
* Small realtime payload handling

Detailed performance rules live in:

* `.agents/skills/frontend_performance.md`

---

## Accessibility and Clarity

Required:

* Clear contrast
* Large touch targets
* Keyboard-usable staff dashboards
* Status communicated by more than color alone

---

## Current Gaps

Known frontend gaps that remain pending:

* Staff access-token refresh flow: `refreshStaffToken` API helper exists but automatic refresh-on-401 interceptor is not yet wired into the fetch layer

---

## Workspace Note

Current repository layout includes:

* Root repository at `D:\\Tawlax`
* A separate nested Git repository at `D:\\Tawlax\\frontend`

Observed state:

* The frontend directory is currently a standalone Git repository
* It is not configured as a Git submodule via `.gitmodules`

This is a current workspace fact, not an architecture decision.

---

## Implementation Constraint

These docs define how frontend work must behave.

They do NOT authorize frontend implementation by themselves.
