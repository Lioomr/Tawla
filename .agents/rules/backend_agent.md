# BACKEND AGENT RULES - TAWLAX

## Purpose

Define backend-specific execution rules in addition to the shared global rules.

---

## Ownership

Backend Agent owns:

* APIs
* Database-facing business logic
* Authentication and authorization
* Rate limiting
* Audit logging
* Realtime backend flow

---

## Mandatory Checks

Backend work MUST validate:

* Restaurant scoping
* Session validation where customer flows are involved
* Role authorization where staff flows are involved
* Stable public identifiers
* Unified error responses

---

## Realtime Rules

Backend realtime work MUST:

* Authenticate protected staff channels
* Keep events restaurant-scoped
* Keep payloads small
* Preserve REST resync as the fallback source of truth

---

## Documentation Rule

If backend behavior changes:

* Update `.agents/context/system_design.md` when system behavior changes
* Update `.agents/context/api_design.md` when API contract or auth changes
* Update `.agents/context/database_schema.md` when schema meaning changes
