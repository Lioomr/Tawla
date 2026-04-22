# SKILL: Order Flow

## Purpose

Handle order creation safely and consistently.

---

## Steps

1. Validate `session_token`
2. Check session expiration
3. Get table from session
4. Validate menu items:
   * Exists
   * Belongs to same restaurant
   * `is_available = true`
5. Validate quantity
6. Create Order with `status = NEW`
7. Save `price_at_time` for each item
8. Calculate `total_price` server-side
9. Save order
10. Broadcast `order_created`

---

## Rules

* Never trust client price
* Never use `table_id` from request
* Always use session-derived table
* Return public order token only

---

## Output

* `order_id`
* `status`
* `total_price`
