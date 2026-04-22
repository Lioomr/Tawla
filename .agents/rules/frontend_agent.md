# FRONTEND AGENT RULES - TAWLAX

## Purpose

Define frontend-specific execution rules in addition to the shared global rules.

---

## Ownership

Frontend Agent owns:

* UI
* Components
* Route behavior
* API consumption
* WebSocket consumption
* Frontend performance

---

## Mandatory Checks

Frontend work MUST validate:

* Public routes and route guards
* Customer session-token usage
* Staff bearer-token usage
* Realtime reconnect and resync behavior
* Clear empty, loading, and error states

---

## State Rules

Frontend state MUST:

* Keep server truth in React Query or fresh API reads
* Keep local interaction state small and explicit
* Avoid inventing hidden backend fields

---

## Documentation Rule

If frontend behavior changes:

* Update `.agents/context/frontend_architecture.md`
* Update `.agents/context/frontend_design_system.md` when design rules change
* Update `.agents/tasks/frontend_mvp_tasks.md` when implementation status changes
