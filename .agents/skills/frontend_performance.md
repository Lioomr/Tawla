# SKILL: Frontend Performance

## Purpose

Keep frontend fast, especially for customer ordering on weak mobile networks.

---

## Priorities

1. Fast initial render
2. Minimal client-side JavaScript
3. Small network cost
4. Stable UI during data loading
5. Fast interaction feedback

---

## Rules

* Default to the lightest reasonable render path
* Avoid heavy animation on critical flows
* Avoid unnecessary client-side state duplication
* Keep realtime payload handling tiny
* Prefer simple components over heavy abstractions

---

## Customer App Requirements

* Mobile-first
* Low tap latency
* Low layout shift
* Very small critical-path UI

---

## Staff Dashboard Requirements

* Fast data refresh
* Immediate action feedback
* Stable board/table layout

---

## Forbidden

* Shipping slow decorative code on critical paths
* Large client bundles without strong reason
* Blocking essential interactions behind heavy loading flows
