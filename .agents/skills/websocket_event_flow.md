# SKILL: WebSocket Event Flow

## Purpose

Handle real-time updates safely and consistently.

---

## Events

* `order_created`
* `order_updated`

---

## Flow

### On order creation

1. Send to customer session channel
2. Send to kitchen channel
3. Send to waiter channel

### On order status update

1. Send to customer session channel
2. Send to kitchen channel
3. Send to waiter channel

---

## Rules

* No sensitive data
* Keep payloads small
* Use public order token only
* Frontend must be able to resync via REST
