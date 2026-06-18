# API DESIGN - TAWLAX

## Base URL

`/api/v1/`

---

## Authentication Strategy

### Customer

Uses:

* `table_token` to start a table session
* `X-Session-Token` for customer-protected endpoints
* `X-Guest-Token` for guest-specific customer actions when applicable

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
* `invalid_guest`
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
* `table_request_not_found`
* `table_request_validation_error`
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
  "guest_token": "guest_xxx",
  "mode": "solo",
  "guest_count": 1,
  "expires_at": "2026-04-17T22:00:00Z",
  "restaurant": {
    "name": "Café Noir",
    "slug": "cafe-noir",
    "tagline": "Where every cup tells a story",
    "welcome_message": "Welcome! Scan your table and enjoy.",
    "logo": "https://media.tawlax.com/logos/cafe-noir.png",
    "banner_image": "https://media.tawlax.com/banners/cafe-noir.jpg",
    "primary_color": "#C8963E",
    "secondary_color": "#1A1A1A"
  }
}
```

Rules:

* Validate table token
* Create a secure session when no valid active session exists for the table
* Join the existing valid active session when another device scans the same table token
* Silently create a default guest/device record for every scan
* Return `mode = solo` when guest count is 1 and `mode = lobby` when guest count is 2 or more
* Return restaurant branding for the scanned table's restaurant
* Do not expose internal `restaurant_id`, `table_id`, `session.id`, or `guest.id`

### Get Current Session Roster

`GET /table/session/`

Headers:

* `X-Session-Token: <session_token>`
* `X-Guest-Token: <guest_token>`

Response:

```json
{
  "mode": "lobby",
  "guest_count": 2,
  "current_guest": {
    "guest_token": "guest_xxx",
    "display_name": "Guest 1",
    "avatar_color": "#2563EB"
  },
  "guests": [
    {
      "guest_token": "guest_xxx",
      "display_name": "Guest 1",
      "avatar_color": "#2563EB"
    },
    {
      "guest_token": "guest_yyy",
      "display_name": "Guest 2",
      "avatar_color": "#DC2626"
    }
  ]
}
```

Rules:

* Session must be valid and unexpired
* Guest token must belong to the current session
* The current guest `last_seen_at` may be refreshed during validation
* Return `mode = solo` when guest count is 1 and `mode = lobby` when guest count is 2 or more
* Guest objects expose only `guest_token`, `display_name`, and `avatar_color`
* Do not expose `session_token`, internal `session.id`, `guest.id`, `table_id`, or other database identifiers

### Update Current Guest

`PATCH /table/session/guest/`

Headers:

* `X-Session-Token: <session_token>`
* `X-Guest-Token: <guest_token>`

Request:

```json
{
  "display_name": "Alice"
}
```

Response:

```json
{
  "guest_token": "guest_xxx",
  "display_name": "Alice",
  "avatar_color": "#2563EB",
  "mode": "lobby",
  "guest_count": 2
}
```

Rules:

* Session must be valid and unexpired
* Guest token must belong to the current session
* Display name is optional; blank or missing input restores the generated `Guest N` name
* Display name is trimmed, length-limited, and rejects unsafe control or HTML delimiter characters
* Do not expose internal `session.id` or `guest.id`

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
* Optional `X-Guest-Token: <guest_token>`

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
* If `X-Guest-Token` is provided, associate the order with that guest only after verifying it belongs to the same session
* Broadcast `order_created`

### Get Session Orders

`GET /orders/`

Headers:

* `X-Session-Token: <session_token>`

Response:

```json
{
  "orders": [
    {
      "order_id": "ord_x82k",
      "status": "NEW",
      "total_price": "40.00",
      "created_at": "2026-04-17T21:10:00Z",
      "guest": {
        "guest_token": "guest_xxx",
        "display_name": "Guest 1",
        "avatar_color": "#2563EB"
      }
    }
  ]
}
```

### Get Order Detail

`GET /orders/{order_token}/`

Headers:

* `X-Session-Token: <session_token>`

Response:

```json
{
  "order_id": "ord_x82k",
  "status": "NEW",
  "total_price": "40.00",
  "created_at": "2026-04-17T21:10:00Z",
  "items": [
    {
      "name": "Cola",
      "quantity": 2,
      "notes": "No ice"
    }
  ],
  "guest": null
}
```

Rules:

* Only public order token in URL
* Must be limited to current session
* `guest` is either `null` or an object containing only `guest_token`, `display_name`, and `avatar_color`

---

## Customer Table Request APIs

### Create Table Request

`POST /table/requests/`

Headers:

* `X-Session-Token: <session_token>`
* Optional `X-Guest-Token: <guest_token>`

Request:

```json
{
  "type": "CALL_WAITER"
}
```

Valid types:

* `CALL_WAITER`
* `REQUEST_BILL`
* `NEED_HELP`

Response:

```json
{
  "request_token": "treq_x82k",
  "type": "CALL_WAITER",
  "status": "OPEN",
  "created_at": "2026-04-17T21:10:00Z"
}
```

Rules:

* Session must be valid and unexpired
* If `X-Guest-Token` is provided, it must belong to the same session
* Request is scoped to the session-derived restaurant and table
* Custom free-text messages are not accepted
* Internal `table_request.id`, `table_id`, `session_id`, and `guest_id` are never returned
* Broadcast `table_request_created` to the waiter channel

### Get Session Table Requests

`GET /table/requests/`

Headers:

* `X-Session-Token: <session_token>`

Response:

```json
{
  "requests": [
    {
      "request_token": "treq_x82k",
      "request_type": "REQUEST_BILL",
      "status": "RESOLVED",
      "created_at": "2026-04-17T21:10:00Z",
      "resolved_at": "2026-04-17T21:12:00Z",
      "guest": {
        "guest_token": "guest_xxx",
        "display_name": "Guest 1",
        "avatar_color": "#2563EB"
      }
    }
  ]
}
```

Rules:

* Session must be valid and unexpired
* Response is limited to the current session only
* Requests are ordered newest first
* `guest` is either `null` or public guest attribution only
* Internal `table_request.id`, `table_id`, `session_id`, `guest_id`, and staff IDs are never returned

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

Response:

```json
{
  "orders": [
    {
      "order_id": "ord_x82k",
      "table": "Table 5",
      "status": "NEW",
      "created_at": "2026-04-17T21:10:00Z",
      "items": [
        {
          "name": "Cola",
          "quantity": 2,
          "notes": "No ice"
        }
      ],
      "guest": {
        "guest_token": "guest_xxx",
        "display_name": "Guest 1",
        "avatar_color": "#2563EB"
      }
    }
  ]
}
```

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
* Order responses include `guest: null` or public guest attribution only

---

## Waiter APIs

### Get Active Tables

`GET /waiter/tables/`

Headers:

* `Authorization: Bearer <access_token>`

Response:

```json
{
  "tables": [
    {
      "table": "Table 5",
      "active_order_count": 1,
      "latest_status": "NEW",
      "payment_status": null,
      "orders": [
        {
          "order_id": "ord_x82k",
          "status": "NEW",
          "total_price": "40.00",
          "created_at": "2026-04-17T21:10:00Z",
          "payment_status": null,
          "guest": null
        }
      ]
    }
  ]
}
```

### Get Open Table Requests

`GET /waiter/requests/`

Headers:

* `Authorization: Bearer <access_token>`

Response:

```json
{
  "requests": [
    {
      "request_token": "treq_x82k",
      "type": "NEED_HELP",
      "status": "OPEN",
      "table": "Table 5",
      "created_at": "2026-04-17T21:10:00Z",
      "resolved_at": null,
      "guest": {
        "guest_token": "guest_xxx",
        "display_name": "Guest 1",
        "avatar_color": "#2563EB"
      }
    }
  ]
}
```

Rules:

* Waiter or admin role required
* Response is scoped to the authenticated staff member's restaurant
* Only `OPEN` requests for active customer sessions are returned
* Request identity uses only `request_token`
* Internal `table_request.id`, `table_id`, `session_id`, `guest_id`, and staff IDs are never returned

### Resolve Table Request

`PATCH /waiter/requests/{request_token}/resolve/`

Headers:

* `Authorization: Bearer <access_token>`

Response:

```json
{
  "request_token": "treq_x82k",
  "type": "NEED_HELP",
  "status": "RESOLVED",
  "table": "Table 5",
  "created_at": "2026-04-17T21:10:00Z",
  "resolved_at": "2026-04-17T21:12:00Z",
  "guest": null
}
```

Rules:

* Waiter or admin role required
* Request must belong to the authenticated staff member's restaurant
* Already resolved requests are rejected
* Resolution creates an audit log
* Broadcast `table_request_resolved` to the customer session channel
* Internal IDs are never returned

### Mark Order as Served

`PATCH /waiter/orders/{order_token}/serve/`

Headers:

* `Authorization: Bearer <access_token>`

Rules:

* Waiter or admin role required
* Only valid when the current order status is `READY`
* Audit log required
* Order responses include `guest: null` or public guest attribution only

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
* Staff payment creation is allowed for `WAITER`, `CASHIER`, and `ADMIN`
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

Customer `guest_joined` payload:

```json
{
  "type": "guest_joined",
  "guest_token": "guest_xxx",
  "display_name": "Guest 2",
  "avatar_color": "#DC2626",
  "guest_count": 2,
  "mode": "lobby"
}
```

Customer `guest_updated` payload:

```json
{
  "type": "guest_updated",
  "guest_token": "guest_xxx",
  "display_name": "Alice",
  "avatar_color": "#DC2626",
  "guest_count": 2,
  "mode": "lobby"
}
```

Waiter `table_request_created` payload:

```json
{
  "type": "table_request_created",
  "request_token": "treq_x82k",
  "request_type": "CALL_WAITER",
  "table": "Table 5",
  "status": "OPEN"
}
```

Customer `table_request_resolved` payload:

```json
{
  "type": "table_request_resolved",
  "request_token": "treq_x82k",
  "request_type": "CALL_WAITER",
  "status": "RESOLVED"
}
```

Rules:

* Payloads must stay small
* No internal IDs
* Guest events are sent only to the customer session channel
* Table request created events are sent only to the waiter channel
* Table request resolved events are sent only to the customer session channel
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

### Admin Orders

`GET /admin/orders/`

Response:

```json
{
  "orders": [
    {
      "order_id": "ord_x82k",
      "table": "Table 5",
      "status": "SERVED",
      "total_price": "40.00",
      "payment_status": "PAID",
      "created_at": "2026-04-17T21:10:00Z",
      "guest": {
        "guest_token": "guest_xxx",
        "display_name": "Guest 1",
        "avatar_color": "#2563EB"
      }
    }
  ]
}
```

Rules:

* Admin order responses include `guest: null` or public guest attribution only

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
* `POST /payments/` — record cash payment using the shared payment endpoint

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
    "payment_status": "PENDING",
    "guest": {
      "guest_token": "guest_xxx",
      "display_name": "Guest 1",
      "avatar_color": "#2563EB"
    }
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
* Only tables with active sessions or unpaid, non-cancelled orders are shown as non-EMPTY
* Paid or cancelled historical orders do not keep a table active

### Get Cashier Table Order Detail

`GET /cashier/tables/{table_token}/order/`

Response:

```json
{
  "table_name": "Table 3",
  "table_token": "pub_tok_xxxx",
  "status": "SERVED",
  "order_id": "ord_x82k",
  "order_status": "READY",
  "total_price": "85.00",
  "payment_status": "PENDING",
  "guest": null,
  "items": [
    {
      "name": "Cola",
      "quantity": 2,
      "notes": "No ice"
    }
  ]
}
```

Rules:

* Scoped to authenticated cashier's restaurant
* `table_token` is the public table token
* `order_id` is the public order token
* `guest` is either `null` or public guest attribution only
* Internal `table_id` and `order.id` are never returned

---

## Rate Limiting

Current protected endpoints:

* Staff login
* Order creation
* Table request creation
* Payment creation

Current default limits:

* Staff login: `5/minute`
* Order creation: `10/minute`
* Table request creation: `10/minute`
* Payment creation: `5/minute`

---

## Validation Rules

* Reject expired `session_token`
* Reject guest tokens that do not belong to the current session
* Ensure `session.table_id` matches `order.table_id`
* Ensure `session.table_id` matches `table_request.table_id`
* Validate menu item availability
* Validate table request type against the allowed enum
* Reject invalid order status transitions
* Reject already resolved table requests
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

---

## Image Removal APIs

All image removal endpoints require:

* `Authorization: Bearer <access_token>`
* `ADMIN` role

Endpoints:

* `DELETE /admin/restaurant/branding/logo/`
* `DELETE /admin/restaurant/branding/banner/`
* `DELETE /admin/categories/{id}/image/`
* `DELETE /admin/menu-items/{id}/image/`

Rules:

* Requests are scoped to the authenticated admin's restaurant
* Removal clears the model image field
* Local files are deleted from storage when present
* Repeated removal is safe and returns the updated resource
* Removal actions are audit logged
