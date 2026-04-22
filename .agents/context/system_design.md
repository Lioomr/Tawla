# SYSTEM DESIGN - TAWLAX

## Overview

Tawlax is a real-time Restaurant Operating System that connects:

* Customers placing table orders
* Kitchen staff preparing orders
* Waiters coordinating service and payment
* Cashiers managing table status and payments at a central point
* Admin users managing operations

The system is designed for:

* Low latency
* Operational clarity
* Real-time updates
* Strong security
* Simple staff workflows

---

## Current Implementation Snapshot

Backend MVP is implemented for:

* Customer session start
* Menu retrieval
* Order creation
* Order list and detail
* Staff JWT auth
* Kitchen order status updates
* Waiter serve flow
* Payment creation
* Admin menu, table, staff, orders, analytics, and audit log APIs
* WebSocket order events
* Rate limiting
* Audit logging
* Unified API error responses

Frontend implementation is IN PROGRESS.

Implemented surfaces:

* Customer session entry, menu browsing, cart, and order status tracking
* Staff login
* Kitchen dashboard with live order board
* Waiter dashboard with table overview and payment recording
* Admin dashboard with menu/tables/staff CRUD, orders, analytics, and audit log

Pending implementation:

* Restaurant branding fields (backend model + API + frontend theming)
* MenuItem image upload
* Cashier dashboard
* Super Admin panel (platform-level restaurant management)
* Staff access-token refresh interceptor
* Image storage migration to cloud (production only)

---

## High-Level Architecture

### Frontend Layer

Planned frontend surfaces:

* Customer ordering app
* Kitchen dashboard
* Waiter dashboard
* Cashier dashboard
* Admin dashboard
* Super Admin panel (platform-level)

Frontend stack must remain inside the PRD boundary:

* Next.js
* React
* Tailwind CSS
* shadcn/ui
* Zustand (Client State)
* React Query (Server State)
* Framer Motion (Animations)
* TanStack Table (Data Grids)
* Browser-based delivery
* Mobile-first for customer flows

Additional libraries require explicit task approval.

### Backend Layer

* Django REST Framework for HTTP APIs
* Django Channels for WebSockets
* JWT for staff auth
* Session-token flow for customers

### Communication Layer

* REST APIs for standard operations
* WebSockets for live updates

### Database Layer

* PostgreSQL

### Current Runtime Notes

Current MVP runtime uses:

* In-memory channel layer
* Local memory cache
* Fixed local CORS allowlist for `localhost:3000` and `127.0.0.1:3000`

Production upgrade path:

* Redis for channel layer
* Shared cache
* Multi-instance deployment
* Explicit production CORS origin configuration

---

## Core System Flow

1. Customer scans QR or taps NFC
2. Backend validates table public token
3. Backend creates secure table session
4. Customer loads menu using session token
5. Customer creates order
6. Backend validates session, items, availability, and pricing
7. Backend creates order and broadcasts `order_created`
8. Kitchen updates order status
9. Backend broadcasts `order_updated`
10. Waiter serves order and records payment
11. Admin monitors operations, analytics, and audit history

---

## Core Modules

### 1. Table Access and Session Module

Responsibilities:

* Secure table lookup using `public_token`
* Temporary customer session creation using `session_token`
* Session expiry enforcement

Rules:

* Internal `table_id` is never exposed
* Session duration is currently 60 minutes

### 2. Menu Module

Responsibilities:

* Return restaurant-scoped categories and items
* Only show available items to customers
* Support admin CRUD for categories and menu items

### 3. Order Module

Responsibilities:

* Create secure table-scoped orders
* Expose current session orders
* Expose individual order detail by public order token

Order status flow:

* NEW
* PREPARING
* READY
* SERVED
* CANCELLED

Valid transitions:

* `NEW -> PREPARING`
* `NEW -> CANCELLED`
* `PREPARING -> READY`
* `PREPARING -> CANCELLED`
* `READY -> SERVED`
* `READY -> CANCELLED`

Rules:

* Kitchen and admin users may move orders to `PREPARING`, `READY`, or `CANCELLED`
* Waiter and admin users may move orders to `SERVED` using the serve flow
* `SERVED` and `CANCELLED` are terminal states
* Invalid transitions must be rejected

### 4. Kitchen Module

Responsibilities:

* View incoming orders
* Update status using staff JWT
* Trigger real-time customer/waiter updates

### 5. Waiter Module

Responsibilities:

* Track active tables
* Mark orders served
* Record payment

### 6. Payment Module

Responsibilities:

* Create payment records
* Prioritize cash flow for MVP
* Support customer session payment and waiter/admin payment flow

MVP payment clarification:

* Customer sessions may record payment for their own order using `X-Session-Token`
* Waiter and admin users may record payment using staff JWT
* Waiter UI is the primary staff-facing payment surface in the current frontend
* The current implementation records a single payment per order

### 7. Admin Module

Responsibilities:

* Manage categories
* Manage menu items
* Manage tables
* Manage staff
* View orders
* View analytics summary
* View audit logs

### 8. Cashier Module

Responsibilities:

* Display all tables and their live status (EMPTY, ORDERING, PREPARING, SERVED)
* Show outstanding order totals per table
* Record cash payments for served orders
* View full order breakdown per table before collecting payment

Rules:

* Requires `CASHIER` or `ADMIN` role
* Read-only on orders — cannot change order status
* Payment recording triggers audit log
* Real-time table status updates via WebSocket

### 9. Audit Module

Responsibilities:

* Record sensitive staff actions
* Provide accountability for operational changes

Current logged actions include:

* Kitchen status updates
* Waiter serve actions
* Payment recording
* Admin category, menu, table, and staff CRUD

---

## Image Storage

### Development

* Django local file storage (`MEDIA_ROOT` / `MEDIA_URL`)
* Images served from backend container

### Production

* Cloud object storage: AWS S3 or Cloudflare R2
* Configured via `django-storages` library
* `DEFAULT_FILE_STORAGE` switched via environment variable
* All image URLs must be absolute and publicly accessible

Affected fields:

* `Restaurant.logo`
* `Restaurant.banner_image`
* `Category.image`
* `MenuItem.image`

---

## Restaurant Branding System

Each restaurant has a unique brand identity applied dynamically to the customer app.

Branding fields (stored on `Restaurant` model):

* `logo` — shown in customer app header
* `banner_image` — hero image at top of menu page
* `primary_color` — applied to buttons, highlights, active states
* `secondary_color` — applied to backgrounds, card borders
* `tagline` — short line shown below restaurant name
* `welcome_message` — displayed on table session entry page

Frontend theming mechanism:

* Branding data is returned from the menu API response
* CSS variables are injected dynamically on the customer app root element
* Restaurant admin can update branding via the admin dashboard settings page

---

## Real-Time Architecture

WebSockets are REQUIRED for:

* New order notifications
* Order status updates
* Kitchen live updates
* Waiter live updates
* Customer order-state updates

Channels:

* `/ws/orders/` — customer order updates
* `/ws/kitchen/` — kitchen incoming orders
* `/ws/waiter/` — waiter table updates
* `/ws/cashier/` — cashier table status updates

Authentication:

* Customer order socket uses `session_token` query auth
* Kitchen and waiter sockets use `access_token` query auth with staff JWT
* Staff sockets are restaurant-scoped and must not receive cross-restaurant events

Current events:

* `order_created`
* `order_updated`

---

## Security Architecture

### Customer Security Model

* No customer login required
* Secure table entry via `table public_token`
* Secure ordering via `session_token`
* Expired sessions are rejected

### Staff Security Model

* Username/password login
* JWT access token
* JWT refresh token
* Rotating refresh tokens
* Refresh token blacklist after rotation

### Protection Layers

* Input validation
* Role-based authorization
* Rate limiting on sensitive endpoints
* Audit logging on sensitive staff actions
* Unified error handling
* Restaurant-scoped realtime authorization for staff sockets

---

## Failure Handling

### API Failures

* Unified error shape
* Clear status codes
* No stack traces or internal details

### WebSocket Failures

Frontend must plan for:

* Reconnect behavior
* State resync after reconnect
* Graceful stale-state handling

---

## Frontend Target State

The frontend must be:

* Modern
* Simple
* Fast
* Visually impressive
* Creative without harming clarity

Detailed frontend source of truth lives in:

* `.agents/context/frontend_architecture.md`
* `.agents/context/frontend_design_system.md`

---

## Constraints

* Must support low-tech environments
* Must work on weak internet
* Must prioritize cash payments
* Must be easy for staff to learn
* Must keep customer order flow minimal

---

## Multi-Tenancy Model

Tawlax currently runs as a multi-tenant backend at the data model and API layer.

Rules:

* Every core operational record is scoped to one `Restaurant`
* Staff access is limited to the authenticated staff member's restaurant
* Customer sessions inherit restaurant scope from the scanned table
* Realtime staff updates must stay inside the same restaurant boundary

Canonical references:

* Data structure: `.agents/context/database_schema.md`
* Endpoint behavior: `.agents/context/api_design.md`
