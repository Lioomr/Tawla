# API CONVENTIONS - TAWLAX

## URL Design

Use stable resource-oriented paths:

* `/orders/`
* `/menu/`
* `/table/session/start/`
* `/kitchen/orders/`
* `/waiter/tables/`
* `/admin/...`

---

## Methods

* `GET` -> retrieve
* `POST` -> create
* `PATCH` -> partial update
* `DELETE` -> remove

---

## Success Responses

Success responses return the resource payload directly.

Examples:

```json
{
  "session_token": "sess_xxx",
  "expires_at": "2026-04-17T22:00:00Z"
}
```

```json
{
  "order_id": "ord_xxx",
  "status": "NEW",
  "total_price": "115.00"
}
```

Do NOT wrap successful payloads in a generic `data` envelope unless the task explicitly requires it.

---

## Error Responses

All errors MUST use:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "invalid request"
  }
}
```

Optional fields can live inside `error`.

---

## Status Codes

* `200` -> OK
* `201` -> Created
* `400` -> Bad Request
* `401` -> Unauthorized
* `403` -> Forbidden
* `404` -> Not Found
* `429` -> Too Many Requests

---

## Authentication

Customer auth:

* `X-Session-Token`

Staff auth:

* `Authorization: Bearer <jwt>`

Rules:

* Never expose internal IDs in URLs
* Use public tokens for customer-facing resources

---

## Response Rules

* Keep responses minimal
* Keep payload names stable
* No stack traces
* No internal database identifiers in public flows
