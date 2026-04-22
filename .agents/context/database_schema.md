# DATABASE SCHEMA - TAWLAX

## Overview

This schema is designed for:

* Security
* Real-time operations
* Operational traceability
* Minimal exposure of internal identifiers

Database:

* PostgreSQL

---

## Core Security Concept

We NEVER expose:

* `table_id`
* `order.id`

We expose:

* `table.public_token`
* `table_session.session_token`
* `order.public_token`

---

## Restaurant

Fields:

* `id`
* `name`
* `slug` — url-friendly unique identifier (e.g. `cafe-noir`)
* `tagline` — short description shown in customer app
* `welcome_message` — shown to customer on table entry
* `logo` — uploaded image file path / URL
* `banner_image` — hero image shown at top of customer menu page
* `primary_color` — hex string (e.g. `#FF5733`) used for buttons and accents
* `secondary_color` — hex string used for backgrounds and card borders
* `created_at`
* `updated_at`

Model notes:

* The backend is multi-tenant by restaurant
* Operational data is scoped through foreign keys to `Restaurant`
* Restaurant creation and bootstrap are performed by Super Admin only
* Branding fields are returned in the customer-facing `/menu/` API so the customer app can theme itself dynamically
* `slug` must be unique across all restaurants

## Image Storage Strategy

* **Development**: Local file storage via Django's `MEDIA_ROOT` / `MEDIA_URL`
* **Production**: Cloud object storage (AWS S3 or Cloudflare R2) via `django-storages`
* Images are stored for: `Restaurant.logo`, `Restaurant.banner_image`, `MenuItem.image`, `Category.image`
* All images must be served via the API media URL, never raw filesystem paths
* Image uploads are accepted only via Admin API endpoints (requires `ADMIN` role)

---

## Table

Fields:

* `id`
* `restaurant_id`
* `name`
* `public_token`
* `created_at`
* `updated_at`

Rules:

* `public_token` must be random and non-sequential
* `(restaurant_id, name)` must be unique

---

## TableSession

Represents a secure customer session.

Fields:

* `id`
* `table_id`
* `session_token`
* `created_at`
* `updated_at`
* `expires_at`

Rules:

* `session_token` must be random
* Session duration is currently 60 minutes
* Expired sessions must be rejected by API and WebSocket auth

---

## Category

Fields:

* `id`
* `restaurant_id`
* `name`
* `image` — optional category image
* `sort_order` — integer controlling display order (default: 0)
* `created_at`
* `updated_at`

---

## MenuItem

Fields:

* `id`
* `restaurant_id`
* `category_id`
* `name`
* `description`
* `price`
* `is_available`
* `image` — optional item image (local dev: filesystem path; production: cloud URL)
* `is_featured` — boolean; marks item as Best Seller / Chef's Pick badge
* `sort_order` — integer controlling display order within category (default: 0)
* `created_at`
* `updated_at`

Indexes:

* `(restaurant_id, category_id)`

---

## Order

Fields:

* `id`
* `public_token`
* `restaurant_id`
* `table_id`
* `session_id`
* `status`
* `total_price`
* `created_at`
* `updated_at`

Rules:

* Must be linked to `session_id`
* Must match `session.table_id`
* `public_token` must be random and non-sequential

Indexes:

* `session_id`
* `status`

---

## OrderItem

Fields:

* `id`
* `order_id`
* `menu_item_id`
* `quantity`
* `price_at_time`
* `notes`

Rules:

* `price_at_time` is server-side only
* Quantity must be positive

---

## Payment

Fields:

* `id`
* `order_id`
* `method`
* `status`
* `amount`
* `created_at`

Rules:

* One payment record per order in current MVP
* Amount must come from server-side order total

---

## Staff

Fields:

* `id`
* `user_id`
* `restaurant_id`
* `name`
* `role`
* `created_at`
* `updated_at`

Rules:

* Staff authentication uses username/password + JWT
* Role controls access to staff endpoints
* Staff realtime access must be restricted to the same `restaurant_id`

---

## AuditLog

Fields:

* `id`
* `restaurant_id`
* `actor_staff_id`
* `action`
* `target_type`
* `target_identifier`
* `metadata`
* `created_at`
* `updated_at`

Purpose:

* Track sensitive operational actions
* Preserve actor, target, and metadata for accountability

---

## Enums

### OrderStatus

* NEW
* PREPARING
* READY
* SERVED
* CANCELLED

### PaymentMethod

* CASH
* ONLINE

### PaymentStatus

* PENDING
* PAID
* FAILED

### StaffRole

* WAITER
* ADMIN
* KITCHEN
* CASHIER

Cashier note:

* CASHIER is a dedicated role for front-of-house payment and table status management
* CASHIER can view all tables, all order statuses, and record payments
* CASHIER cannot modify menu items, staff, or system settings
* CASHIER has read-only access to orders across all tables in their restaurant

Canonical note:

* Enum definitions live here
* Transition behavior lives in `.agents/context/system_design.md`

---

## Relationships

* Restaurant -> Tables (1:N)
* Restaurant -> Categories (1:N)
* Restaurant -> MenuItems (1:N)
* Restaurant -> Staff (1:N)
* Restaurant -> Orders (1:N)
* Restaurant -> AuditLogs (1:N)
* Table -> TableSessions (1:N)
* TableSession -> Orders (1:N)
* Order -> OrderItems (1:N)
* Order -> Payment (1:1)

---

## Security Rules

1. Orders MUST use `session_id`
2. `session.table_id` MUST match `order.table_id`
3. Expired sessions MUST be rejected
4. `table_id` MUST NEVER be exposed in APIs
5. `order.id` MUST NEVER be exposed in APIs
6. Public tokens MUST be random and non-guessable

---

## Operational Constraints

* No cascade delete on orders
* Preserve historical data
* Preserve audit history
* No guessable identifiers
