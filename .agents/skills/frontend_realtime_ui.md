# SKILL: Frontend Realtime UI

## Purpose

Consume WebSocket updates without breaking UI clarity.

---

## Core Rule

REST provides initial truth.

WebSockets provide live deltas.

---

## Required Flow

1. Load current state from REST
2. Open relevant socket
3. Apply `order_created` and `order_updated` events
4. On disconnect, reconnect
5. After reconnect, refetch current REST state

---

## Rules

* Never rely on socket-only state
* Deduplicate repeated events safely
* Keep event handling minimal and explicit
* Use status updates to drive UI state directly

---

## UI Behavior

* Kitchen and waiter views should reflect live updates immediately
* Customer view should surface clear order-state changes
* Reconnect behavior should not confuse users or duplicate orders
