# SKILL: Order Security

## Purpose

Prevent malicious ordering and unsafe writes.

---

## Checks

* `session.table == order.table`
* `menu_item.restaurant == session.restaurant`
* `quantity > 0`
* no duplicate abuse

---

## Protection

* Rate limit order creation
* Optional cooldown is allowed
* Never trust public input for pricing or ownership

---

## Rules

* Never trust request IDs blindly
* Never expose internal order identifiers
