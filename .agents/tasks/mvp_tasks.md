# MVP TASKS - TAWLAX

## Current Status Snapshot

### Phase 1 - Core Backend

Status:

* COMPLETE

Delivered:

1. Table session start
2. Session creation
3. Menu API
4. Order creation API
5. Order list and detail APIs

---

### Phase 2 - Real-Time and Staff Operations

Status:

* COMPLETE

Delivered:

6. WebSocket setup
7. Kitchen live orders
8. Order status updates
9. Staff JWT auth
10. Waiter serve flow
11. Payment flow

---

### Phase 3 - Dashboard and Hardening

Status:

* COMPLETE

Delivered:

12. Admin category management
13. Admin menu item management
14. Admin table management
15. Admin staff management
16. Admin order list
17. Admin analytics summary
18. Audit logging
19. JWT hardening
20. Rate limiting
21. Unified API error handling

---

### Phase 4 - Frontend

Status:

* COMPLETE

Completed:

* Customer session entry, menu browsing, cart, order status tracking
* Session-expired recovery page
* Staff login flow
* Kitchen dashboard with live order board and status updates
* Waiter dashboard with active tables, serve actions, and payment recording
* Admin dashboard with menu/tables/staff CRUD, orders, analytics, and audit log

Remaining minor gap:

* Staff access-token refresh interceptor (API helper exists, interceptor not wired)

Frontend task planning lives in:

* `.agents/tasks/frontend_mvp_tasks.md`

---

## Rules

* Complete tasks in order unless explicitly re-prioritized
* Do not skip validation
* Keep docs aligned with real implementation
