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

* `useOrderWebSocket` applies lightweight status updates into the customer order query cache
* `useKitchenWebSocket` invalidates kitchen orders on realtime events
* `useWaiterWebSocket` invalidates waiter tables on realtime events
* All three sockets retry connection after a short delay on close

---

## Route Structure

Current implemented routes:

### Customer

* `/` - landing message instructing customers to scan the table QR code
* `/t/[tableToken]` - session bootstrap from public table token
* `/menu` - menu browsing and cart flow
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

* `useCustomerStore` - session token and session expiry persistence
* `useCartStore` - cart items, notes, quantities, and subtotal helpers
* `useStaffStore` - access token, refresh token, and staff profile persistence

Rules:

* Customer session validity is checked from stored expiry time
* Cart state is local UI state and not a copy of server truth
* Staff auth state must not invent backend fields that are not returned by the API

### React Query

Implemented query usage:

* `useMenu` - customer menu fetch
* `useOrderQuery` - customer order detail fetch
* Kitchen dashboard query - kitchen order list
* Waiter dashboard query - waiter tables list

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

## API Client Pattern

`src/lib/api.ts` is the canonical frontend transport layer.

Responsibilities:

* Set `X-Session-Token` for customer APIs
* Set `Authorization: Bearer <access_token>` for staff APIs
* Parse the unified backend error payload
* Throw `ApiError` with stable `code` and `status`
* Expose explicit methods for session, menu, order, auth, kitchen, waiter, and payment flows

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
