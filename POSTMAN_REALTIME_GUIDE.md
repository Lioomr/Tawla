# Tawlax Realtime Testing In Postman

## Why the imported websocket request fails

Postman imports the websocket entries from the collection as normal HTTP requests.
That is why you see:

`Error: Invalid protocol: ws`

The fix is to use the collection for HTTP setup, then create real WebSocket requests manually inside Postman.

---

## Import order

1. Import [Tawlax.postman_collection.json](d:/Tawlax/Tawlax.postman_collection.json)
2. Import [Tawlax.realtime.postman_collection.json](d:/Tawlax/Tawlax.realtime.postman_collection.json)
3. Import [Tawlax.postman_environment.json](d:/Tawlax/Tawlax.postman_environment.json)
4. Select the `Tawlax Local` environment in Postman

---

## HTTP setup flow

Run these requests first from the collection:

1. `Start Session - Success`
2. `Get Menu - Success`
3. `Create Order - Success`
4. `Staff Login`
5. `Waiter Login` when you want waiter actions

These requests fill:

* `session_token`
* `cola_item_id`
* `burger_item_id`
* `order_id`
* `staff_access_token`
* `staff_refresh_token`

---

## Create real WebSocket requests manually

In Postman:

1. Click `New`
2. Choose `WebSocket Request`
3. Paste one of the URLs below
4. Click `Connect`

### Customer orders socket

```text
ws://localhost:8000/ws/orders/?session_token={{session_token}}
```

### Kitchen socket

```text
ws://localhost:8000/ws/kitchen/
```

### Waiter socket

```text
ws://localhost:8000/ws/waiter/
```

---

## Recommended test order

1. Open `Kitchen socket`
2. Open `Waiter socket`
3. Run `Start Session - Success`
4. Open `Customer orders socket` using the saved `session_token`
5. Run `Get Menu - Success`
6. Run `Create Order - Success`
7. Run `Staff Login`
8. Run `Kitchen Update Order Status`
9. Run `Waiter Login`
10. Run `Waiter Tables`
11. Run `Waiter Serve Order`
12. Run `Waiter Record Payment`

Expected event:

Customer socket:

```json
{
  "type": "order_created",
  "order_id": "ord_xxx",
  "status": "NEW"
}
```

Kitchen and waiter sockets:

```json
{
  "type": "order_created",
  "order_id": "ord_xxx",
  "table": "Table 1",
  "status": "NEW"
}
```

Update event on all sockets after kitchen status change:

```json
{
  "type": "order_updated",
  "order_id": "ord_xxx",
  "status": "READY"
}
```

Waiter serve should return the same order with:

```json
{
  "order_id": "ord_xxx",
  "status": "SERVED"
}
```

Payment response should return:

```json
{
  "order_id": "ord_xxx",
  "method": "CASH",
  "status": "PAID",
  "amount": "95.00"
}
```

---

## Important note

Do not use the imported `GET` websocket requests as normal HTTP requests.
They are reference placeholders only.
Always create a real `WebSocket Request` tab in Postman for `ws://` URLs.

---

## Demo staff credentials

Seeded local credentials:

* username: `kitchen_demo`
* password: `Password123!`

Also available:

* `waiter_demo`
* `admin_demo`

---

## Admin flow

Use `Admin Login` with:

* username: `admin_demo`
* password: `Password123!`

Then run:

1. `Admin Categories`
2. `Admin Create Category`
3. `Admin Create Menu Item`
4. `Admin Create Table`
5. `Admin Create Staff`
6. `Admin Orders`
7. `Admin Analytics Summary`

Expected:

* category creation returns a numeric `id`
* menu item creation returns a numeric `id`
* table creation returns `table_token`
* staff creation returns a numeric `id`
* orders list returns public `order_id` values
* analytics returns `orders_today` and `popular_items`
