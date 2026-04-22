# API DESIGN - TAWLAX

## Base URL

`/api/v1/`

---

## Authentication Strategy

### Customer

Uses:

* `table_token` to start a table session
* `X-Session-Token` for customer-protected endpoints

### Staff

Uses:

* JWT Bearer auth for protected staff/admin endpoints
* Access token lifetime: 30 minutes
* Refresh token lifetime: 1 day
* Refresh rotation: enabled
* Blacklist after rotation: enabled

---

## Error Format (MANDATORY)

All API errors MUST return:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "invalid request"
  }
}
```

Optional fields may appear inside `error`:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "rate limit exceeded",
    "retry_after": 60
  }
}
```

Common error codes:

* `invalid_request`
* `invalid_session`
* `expired_session`
* `authentication_failed`
* `not_authenticated`
* `forbidden`
* `table_not_found`
* `order_not_found`
* `rate_limit_exceeded`
* `order_validation_error`
* `payment_validation_error`
* `table_token_exists`
* `table_in_use`
* `staff_not_found`
* `username_exists`
* `category_exists`
* `category_not_found`
* `category_has_items`
* `menu_item_not_found`
* `menu_item_in_use`
* `image_upload_error`
* `restaurant_not_found`
* `invalid_color_format`

Canonical note:

* This file is the current source of truth for documented API error codes

---

## Customer Session APIs

### Start Session

`POST /table/session/start/`

Request:

```json
{
  "table_token": "ak9XfT2LmPqR"
}
```

Response:

```json
{
  "session_token": "sess_xxx",
  "expires_at": "2026-04-17T22:00:00Z"
}
```

Rules:

* Validate table token
* Create secure session
* Return session token only

---

## Menu API

### Get Menu

`GET /menu/`

Headers:

* `X-Session-Token: <session_token>`

Response:

```json
{
  "restaurant": {
    "name": "Café Noir",
    "tagline": "Where every cup tells a story",
    "welcome_message": "Welcome! Scan your table and enjoy.",
    "logo": "https://media.tawlax.com/logos/cafe-noir.png",
    "banner_image": "https://media.tawlax.com/banners/cafe-noir.jpg",
    "primary_color": "#C8963E",
    "secondary_color": "#1A1A1A"
  },
  "categories": [
    {
      "id": 1,
      "name": "Drinks",
      "image": "https://media.tawlax.com/categories/drinks.jpg",
      "sort_order": 0,
      "items": [
        {
          "id": 10,
          "name": "Cola",
          "description": "Ice cold classic",
          "price": "20.00",
          "is_available": true,
          "is_featured": false,
          "sort_order": 0,
          "image": null
        }
      ]
    }
  ]
}
```

Rules:

* Session required
* Only available items returned
* Menu is scoped to session restaurant
* Branding fields are always included (null values allowed for optional fields)

---

## Customer Order APIs

### Create Order

`POST /orders/`

Headers:

* `X-Session-Token: <session_token>`

Request:

```json
{
  "items": [
    {
      "menu_item_id": 10,
      "quantity": 2,
      "notes": "No ice"
    }
  ]
}
```

Response:

```json
{
  "order_id": "ord_x82k",
  "status": "NEW",
  "total_price": "40.00"
}
```

Rules:

* Validate session
* Validate expiration
* Validate item ownership and availability
* Validate quantity
* Never trust client price
* Broadcast `order_created`

### Get Session Orders

`GET /orders/`

Headers:

* `X-Session-Token: <session_token>`

### Get Order Detail

`GET /orders/{order_token}/`

Headers:

* `X-Session-Token: <session_token>`

Rules:

* Only public order token in URL
* Must be limited to current session

---

## Staff Auth APIs

### Login

`POST /staff/auth/login/`

Request:

```json
{
  "username": "kitchen_demo",
  "password": "Password123!"
}
```

Response:

```json
{
  "access": "<jwt>",
  "refresh": "<jwt>",
  "staff": {
    "username": "kitchen_demo",
    "name": "Kitchen Demo",
    "role": "KITCHEN",
    "restaurant_id": 1
  }
}
```

Valid roles returned in login response:

* `KITCHEN`
* `WAITER`
* `ADMIN`
* `CASHIER`

Frontend login redirect rules:

* `KITCHEN` → `/staff/kitchen`
* `WAITER` → `/staff/waiter`
* `ADMIN` → `/staff/admin`
* `CASHIER` → `/staff/cashier`

### Refresh

`POST /staff/auth/refresh/`

Request:

```json
{
  "refresh": "<jwt>"
}
```

### Current Staff Profile

`GET /staff/me/`

Headers:

* `Authorization: Bearer <access_token>`

---

## Kitchen APIs

### Get Incoming Orders

`GET /kitchen/orders/`

Headers:

* `Authorization: Bearer <access_token>`

### Update Order Status

`PATCH /kitchen/orders/{order_token}/status/`

Headers:

* `Authorization: Bearer <access_token>`

Request:

```json
{
  "status": "READY"
}
```

Valid statuses:

* PREPARING
* READY
* CANCELLED

Rules:

* Kitchen or admin role required
* Allowed transitions:
  * `NEW -> PREPARING`
  * `NEW -> CANCELLED`
  * `PREPARING -> READY`
  * `PREPARING -> CANCELLED`
  * `READY -> CANCELLED`
* Kitchen endpoint must reject `SERVED`
* Broadcast `order_updated`
* Audit log required

---

## Waiter APIs

### Get Active Tables

`GET /waiter/tables/`

Headers:

* `Authorization: Bearer <access_token>`

### Mark Order as Served

`PATCH /waiter/orders/{order_token}/serve/`

Headers:

* `Authorization: Bearer <access_token>`

Rules:

* Waiter or admin role required
* Only valid when the current order status is `READY`
* Audit log required

---

## Payment API

### Create Payment

`POST /payments/`

Headers:

Either:

* `Authorization: Bearer <access_token>`
* `X-Session-Token: <session_token>`

Request:

```json
{
  "order_id": "ord_x82k",
  "method": "CASH"
}
```

Rules:

* Amount comes from server-side order total
* Customer session payments are limited to orders owned by the current session
* Staff payments are limited to orders in the authenticated staff member's restaurant
* Payment write is auditable for staff actions

---

## WebSockets

### Channels

* `/ws/orders/?session_token=<session_token>` — customer order updates
* `/ws/kitchen/?access_token=<jwt_access_token>` — kitchen live orders
* `/ws/waiter/?access_token=<jwt_access_token>` — waiter table updates
* `/ws/cashier/?access_token=<jwt_access_token>` — cashier table status updates

### Events

Customer `order_created` payload:

```json
{
  "type": "order_created",
  "order_id": "ord_x82k",
  "status": "NEW"
}
```

Kitchen/Waiter `order_created` payload:

```json
{
  "type": "order_created",
  "order_id": "ord_x82k",
  "table": "Table 5",
  "status": "NEW"
}
```

Shared `order_updated` payload:

```json
{
  "type": "order_updated",
  "order_id": "ord_x82k",
  "status": "READY"
}
```

Rules:

* Payloads must stay small
* No internal IDs
* Kitchen and waiter sockets require a valid staff JWT in the query string
* Staff socket subscriptions are scoped to the authenticated staff member's restaurant
* Frontend must support reconnect and resync

---

## Admin APIs

All admin endpoints require:

* `Authorization: Bearer <access_token>`
* `ADMIN` role

Endpoints:

* `GET/POST/PATCH/DELETE /admin/categories/`
* `GET/POST/PATCH/DELETE /admin/menu-items/`
* `GET/POST/PATCH/DELETE /admin/tables/`
* `GET/POST/PATCH/DELETE /admin/staff/`
* `GET /admin/orders/`
* `GET /admin/analytics/summary/`
* `GET /admin/audit-logs/`
* `GET/PATCH /admin/restaurant/branding/` — get and update restaurant branding fields
* `POST /admin/restaurant/branding/logo/` — upload logo image (multipart/form-data)
* `POST /admin/restaurant/branding/banner/` — upload banner image (multipart/form-data)
* `POST /admin/menu-items/{id}/image/` — upload menu item image (multipart/form-data)
* `POST /admin/categories/{id}/image/` — upload category image (multipart/form-data)

Rules:

* Admin writes must be audited
* Public tokens must remain public-facing identifiers where applicable
* Image uploads accept `multipart/form-data` with a single `image` field
* Image uploads must validate file type (JPEG, PNG, WebP only) and max size (5MB)

### Admin Branding

`GET /admin/restaurant/branding/`

Response:

```json
{
  "name": "Café Noir",
  "slug": "cafe-noir",
  "tagline": "Where every cup tells a story",
  "welcome_message": "Welcome!",
  "logo": "https://media.tawlax.com/logos/cafe-noir.png",
  "banner_image": null,
  "primary_color": "#C8963E",
  "secondary_color": "#1A1A1A"
}
```

`PATCH /admin/restaurant/branding/`

Request:

```json
{
  "tagline": "New tagline here",
  "primary_color": "#FF5733"
}
```

Rules:

* Partial updates only (PATCH)
* `primary_color` and `secondary_color` must be valid hex strings
* `slug` is read-only after creation (set by Super Admin)

### Admin Analytics Summary

`GET /admin/analytics/summary/`

Headers:

* `Authorization: Bearer <access_token>`

Response:

```json
{
  "orders_today": 12,
  "totalRevenue": 300.0,
  "popular_items": [
    {
      "name": "Steak",
      "total_quantity": 2
    }
  ]
}
```

Rules:

* Admin role required
* Response is scoped to the authenticated staff member's restaurant
* `totalRevenue` is calculated from `Order.total_price` for orders with `status = SERVED` and `payment.status = PAID`
* Cancelled, unpaid, failed-payment, and cross-restaurant orders are excluded from `totalRevenue`

## Cashier APIs

All cashier endpoints require:

* `Authorization: Bearer <access_token>`
* `CASHIER` or `ADMIN` role

Endpoints:

* `GET /cashier/tables/` — all tables with current status and active order summary
* `GET /cashier/tables/{table_token}/order/` — full order details for a specific table
* `POST /payments/` — record cash payment (shared with waiter)

### Get Cashier Tables

`GET /cashier/tables/`

Response:

```json
[
  {
    "table_name": "Table 3",
    "table_token": "pub_tok_xxxx",
    "status": "SERVED",
    "order_id": "ord_x82k",
    "total_price": "85.00",
    "payment_status": "PENDING"
  }
]
```

Table status values:

* `EMPTY` — no active session or order
* `ORDERING` — session active, order NEW
* `PREPARING` — order in PREPARING state
* `SERVED` — order READY or SERVED, awaiting payment

Rules:

* Scoped to authenticated cashier's restaurant
* Only tables with active sessions or recent orders are shown as non-EMPTY

---

## Rate Limiting

Current protected endpoints:

* Staff login
* Order creation
* Payment creation

Current default limits:

* Staff login: `5/minute`
* Order creation: `10/minute`
* Payment creation: `5/minute`

---

## Validation Rules

* Reject expired `session_token`
* Ensure `session.table_id` matches `order.table_id`
* Validate menu item availability
* Reject invalid order status transitions
* Prevent duplicate order abuse
* Reject unauthorized role access

---

## Result

* Secure table-based ordering
* Real-time system ready
* JWT-protected staff operations
* Auditable operational changes
* Consistent error handling
* Per-restaurant branding via API
* Cashier-facing payment and table management
