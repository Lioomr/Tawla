# ADMIN DASHBOARD DESIGN - TAWLAX

## Purpose

Define the frontend shape of the admin dashboard (Phase 4D).

This document describes the implemented MVP admin surface.

---

## Implementation Status

Current status:

* Backend admin APIs exist and are tested
* Frontend admin dashboard is IMPLEMENTED
* `/staff/admin` routes exist with 7 screens + overview

Current frontend behavior:

* Admin credentials authenticate and route to `/staff/admin`
* Dashboard overview shows live stat cards, recent orders, and quick actions
* All CRUD screens are functional with search, filter, and toast feedback

---

## MVP Admin Scope

The admin dashboard must cover:

* Category management
* Menu-item management
* Table management
* Staff management
* Orders list
* Analytics summary
* Audit log viewer

These surfaces must map to the admin endpoints documented in `.agents/context/api_design.md`.

---

## Surface Priorities

### Primary environment

* Desktop-first

### Required qualities

* Clear information hierarchy
* Serious operational tone
* Low ambiguity for destructive actions
* Strong readability at dense data levels

---

## Route Intent

Planned route:

* `/staff/admin`

Planned subviews may be implemented as:

* A single dashboard page with sections
* Nested admin routes if a task explicitly authorizes them

Until a task authorizes implementation details, route decomposition remains open.

---

## Data Sections

### Categories

Needs:

* List categories
* Create category
* Rename category
* Delete category with clear safety messaging

### Menu items

Needs:

* List menu items
* Create item
* Edit name, description, price, availability, category
* Delete item

### Tables

Needs:

* List tables
* Create table
* Rename table
* Delete table when allowed
* Show public token in an operationally safe way

### Staff

Needs:

* List staff
* Create staff user
* Edit display name and role
* Delete staff when allowed

### Orders

Needs:

* Read-only operational order view for MVP
* Clear payment and status visibility

### Analytics

Needs:

* Orders today
* Popular items summary

### Audit logs

Needs:

* Read-only audit trail
* Clear actor, action, target, and time visibility

---

## UX Rules

Admin flows must:

* Prefer clarity over visual flourish
* Make destructive actions obvious
* Keep forms short and explicit
* Avoid hiding critical operations behind deep navigation

Admin flows must not:

* Reuse customer UI patterns blindly
* Look like a generic SaaS template
* Hide operational state changes
