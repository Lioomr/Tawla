# Tawlax Documentation Audit

Full audit of all 22 documentation files against the actual codebase state.

---

## Summary

| Category | Issues Found |
|---|---|
| Stale / Outdated claims | 5 |
| Missing documentation | 7 |
| Doc ↔ Implementation mismatches | 4 |
| Agent system structural gaps | 3 |
| Frontend doc gaps | 4 |
| Cross-doc inconsistencies | 3 |
| **Total** | **26** |

---

## 1. Stale / Outdated Claims

> [!CAUTION]
> These docs claim things that are **factually wrong** given the current codebase state. They must be updated immediately to maintain source-of-truth integrity.

### 1.1 — `system_design.md` line 40: "Frontend implementation has NOT started yet"

**Reality:** Frontend exists with a full Next.js project containing:
- Customer session entry (`/t/[tableToken]`)
- Menu browsing (`/menu`)
- Cart system (Zustand store + CartWidget component)
- Order status page (`/order/[order_id]`)
- Staff login (`/staff/login`)
- Kitchen dashboard (`/staff/kitchen`)
- Waiter dashboard (`/staff/waiter`)
- API client, hooks, WebSocket hooks, providers

**Action:** Update to reflect actual implementation status per surface.

---

### 1.2 — `mvp_tasks.md` line 63: Phase 4 "NOT STARTED"

**Reality:** Phase 4A (Customer App), 4B (Kitchen), and 4C (Waiter) are substantially implemented. Only 4D (Admin Dashboard) is truly not started.

**Action:** Update each phase status. Recommend marking 4A/4B/4C as `IN PROGRESS` or `COMPLETE` depending on your quality bar, and 4D as `NOT STARTED`.

---

### 1.3 — `frontend_mvp_tasks.md` line 5: "Frontend implementation has NOT started"

Same issue as above. The entire file reads as a planning doc for something that has already been largely built.

**Action:** Update status and mark completed tasks.

---

### 1.4 — `README.md` line 32: "Frontend implementation has not started yet"

**Action:** Update README to reflect that the frontend exists and describe how to run it.

---

### 1.5 — `frontend_architecture.md` line 1: "Define the frontend source of truth before frontend implementation begins"

**Reality:** Implementation has begun and is well underway.

**Action:** Change purpose statement to reflect it is the active source-of-truth during implementation.

---

## 2. Missing Documentation

> [!IMPORTANT]
> These are docs that **should exist** based on the PRD and system design but are currently absent.

### 2.1 — No Admin Dashboard documentation

The PRD defines Admin Dashboard features (menu management, table management, staff management, orders, analytics, audit logs). The [api_design.md](file:///d:/tawlax/.agents/context/api_design.md) lists all `GET/POST/PATCH/DELETE /admin/*` endpoints. But there is **zero** frontend admin implementation and no specific admin UI design doc beyond brief mentions in `frontend_architecture.md` and `frontend_design_system.md`.

**Action:** Create `.agents/context/admin_dashboard_design.md` or add detail to existing frontend docs before building Phase 4D.

---

### 2.2 — No Deployment / Infrastructure documentation

The project has:
- `docker-compose.yml` (dev)
- `docker-compose.prod.yml` (prod)
- `.env.example` / `.env.production.example`
- Dockerfiles for backend and frontend

But no docs covering:
- Deployment strategy
- Environment variable inventory
- Production Redis requirement (noted in `system_design.md` line 96 but undocumented)
- CORS configuration
- Domain / SSL setup

**Action:** Create `.agents/context/deployment.md`.

---

### 2.3 — No Testing documentation

No doc describing:
- Backend test strategy and coverage
- Frontend test strategy
- How to run tests
- What is tested vs what is not

The `README.md` shows a test command but that's it.

**Action:** Create `.agents/context/testing_strategy.md`.

---

### 2.4 — No WebSocket authentication documentation for staff

The [api_design.md](file:///d:/tawlax/.agents/context/api_design.md) documents:
- Customer WS: `/ws/orders/?session_token=<token>` ✅ clear
- Kitchen WS: `/ws/kitchen/` … with no auth info
- Waiter WS: `/ws/waiter/` … with no auth info

**Reality:** The frontend hooks ([useKitchenWebSocket.ts](file:///d:/tawlax/frontend/src/hooks/useKitchenWebSocket.ts), [useWaiterWebSocket.ts](file:///d:/tawlax/frontend/src/hooks/useWaiterWebSocket.ts)) connect to these sockets, but it's undocumented whether they require JWT tokens in query params, headers, or are unauthenticated.

**Action:** Document staff WebSocket authentication in `api_design.md`.

---

### 2.5 — No Error Code inventory

`api_design.md` lists 6 error codes. `api_error_handling.md` lists the same 6. But there's no comprehensive inventory of all error codes used across the backend (including validation-specific ones like `item_unavailable`, `table_not_found`, `order_not_found` etc.).

**Action:** Create a complete error code registry or expand `api_error_handling.md`.

---

### 2.6 — No Order status transition rules documentation

The system defines 5 order statuses: `NEW → PREPARING → READY → SERVED → CANCELLED`. But **no doc defines the valid transition rules**:
- Can an order go from `NEW` directly to `CANCELLED`?
- Can a `SERVED` order go back to `PREPARING`?
- Can kitchen set `SERVED` or is that waiter-only?

This is critical business logic that exists only in backend code and is not documented.

**Action:** Add status transition matrix to `system_design.md` or `order_flow.md`.

---

### 2.7 — No `MenuItem.image` field documentation

The PRD mentions "Strong food imagery potential later" in [frontend_design_system.md](file:///d:/tawlax/.agents/context/frontend_design_system.md). But the database schema has no `image` field on MenuItem. The frontend menu page renders items without images. If images are planned, the schema needs updating; if not, this should be explicitly stated as out of MVP scope.

**Action:** Clarify in `database_schema.md` whether `MenuItem.image` is absent by design for MVP.

---

## 3. Doc ↔ Implementation Mismatches

> [!WARNING]
> The docs say one thing, the code does another. These create confusion for any agent or developer reading the docs.

### 3.1 — Order status page uses `KITCHEN` status that doesn't exist

In [order/[order_id]/page.tsx](file:///d:/tawlax/frontend/src/app/order/%5Border_id%5D/page.tsx#L14), the STATUS_STEPS array uses `{ id: 'KITCHEN' }` but the backend enum in `database_schema.md` defines `PREPARING`, not `KITCHEN`. The status page also includes a `PAID` step which is not an order status — it's a payment status.

**Action:** Fix frontend to use `PREPARING` instead of `KITCHEN`. Decide whether `PAID` should be shown as a visual step or removed.

---

### 3.2 — Frontend has its own `.git` directory

The frontend at `d:\tawlax\frontend\.git` has a separate git repository from the root `d:\tawlax\.git`. This is not documented and could cause confusion with version control.

**Action:** Decide whether frontend should be a submodule or merged into the monorepo. Document the decision.

---

### 3.3 — `frontend_design_system.md` references non-existent skill

Line 134: `frontend-design` skill is referenced as required, but this skill does not exist in `.agents/skills/`. The skills directory contains 10 `.md` files — none named `frontend-design`.

**Action:** Either create the `frontend-design` skill or update references to point to `frontend_ui_direction.md` which appears to serve the same purpose.

---

### 3.4 — `frontend_architecture.md` references wrong skill path

Line 240: References `.agents/skills/frontend_performance.md` — this path is correct. But line 134 of `frontend_design_system.md` references a `frontend-design` skill that doesn't exist. The `skill_binding.md` and `skill_invocation.md` also reference this phantom skill.

**Action:** Audit all skill references and fix dangling pointers.

---

## 4. Agent System Structural Gaps

### 4.1 — No Product Agent rules file

AGENTS.md defines a **Product Agent** with responsibilities (scope validation, UX flow validation, friction reduction). But there is no `.agents/rules/product_agent.md` file. Only `security_auditor.md` has a dedicated rules file among the non-backend/frontend agents.

**Action:** Create `.agents/rules/product_agent.md`.

---

### 4.2 — No Backend Agent rules file

AGENTS.md defines a **Backend Agent** but there is no `.agents/rules/backend_agent.md`. The backend behavior is governed by global rules, code style, and API conventions — but these are shared across agents, not backend-specific.

**Action:** Create `.agents/rules/backend_agent.md` or explicitly document that global rules + code style + API conventions govern the Backend Agent.

---

### 4.3 — No Frontend Agent rules file

Same gap. The Frontend Agent has no dedicated rules file. Frontend behavior is governed by `global_rules.md` (rule 14) and the context/skills docs, but there's no explicit `.agents/rules/frontend_agent.md`.

**Action:** Create or document explicitly.

---

## 5. Frontend-Specific Doc Gaps

### 5.1 — No documentation of actual route structure

`frontend_architecture.md` says "Exact route naming can be finalized during implementation." Routes have now been finalized:
- `/` — landing / redirect
- `/t/[tableToken]` — session entry
- `/menu` — menu browsing
- `/order/[order_id]` — order status
- `/staff/login` — staff login
- `/staff/kitchen` — kitchen dashboard
- `/staff/waiter` — waiter dashboard

This should be documented.

**Action:** Update `frontend_architecture.md` with the actual route table.

---

### 5.2 — No documentation of state management implementation

Docs prescribe Zustand + React Query + WebSocket deltas. The implementation follows this with:
- `useCustomerStore` — session token management
- `useCartStore` — cart items
- `useStaffStore` — JWT tokens
- `useMenu`, `useOrders` — React Query hooks
- `useKitchenWebSocket`, `useWaiterWebSocket`, `useOrderWebSocket` — WS hooks

None of this is documented anywhere. New agents have no reference for what state exists.

**Action:** Add state management section to `frontend_architecture.md` mapping store names → responsibilities.

---

### 5.3 — No documentation of the API client (`lib/api.ts`)

The frontend has a 6KB API client at `src/lib/api.ts` implementing all API calls with error handling. This is the core integration layer and is completely undocumented.

**Action:** Document the API client pattern in `frontend_architecture.md` or a new `frontend_api_client.md`.

---

### 5.4 — No expired-session recovery flow implemented

`frontend_mvp_tasks.md` Phase 4A task 5 lists "Expired-session recovery flow" as required. This does not appear to be implemented — the session entry page creates a session but there is no visible flow for recovering when a session expires mid-use.

**Action:** Document whether this is done or still pending. Update task list accordingly.

---

## 6. Cross-Doc Inconsistencies

### 6.1 — Duplicated content across docs

The same error format JSON block appears in:
- `api_design.md`
- `api_conventions.md`
- `api_error_handling.md`

The same order status enum appears in:
- `database_schema.md`
- `api_design.md`
- `system_design.md`
- `order_flow.md`

This creates maintenance risk — if one is updated, the others may fall out of sync.

**Action:** Consider making one doc the canonical source and having others reference it.

---

### 6.2 — Restaurant model is underdocumented

`database_schema.md` defines Restaurant with only `id`, `name`, `created_at`, `updated_at`. But there's no documentation on:
- How restaurants are created (not in API design)
- Whether the system is multi-tenant or single-restaurant
- How staff are scoped to restaurants

The backend `apps/restaurants/` directory exists but its capabilities aren't documented.

**Action:** Document restaurant lifecycle and multi-tenancy model.

---

### 6.3 — Payment flow unclear for customer vs staff

`api_design.md` says Payment creation accepts **either** `Authorization: Bearer` or `X-Session-Token`. But the waiter dashboard page implements payment recording via staff JWT. It's unclear:
- Can customers actually pay through the customer app in MVP?
- If not, why does the API accept `X-Session-Token` for payments?

**Action:** Clarify the MVP payment flow in `system_design.md` and `api_design.md`.

---

## Recommended Priority

| Priority | Action |
|---|---|
| ✅ ~~P0~~ | ~~Fix the 5 stale "frontend not started" claims (§1)~~ FIXED |
| ✅ ~~P0~~ | ~~Fix `KITCHEN` → `PREPARING` status mismatch in order page (§3.1)~~ FIXED |
| 🟠 **P1** | Document order status transition rules (§2.6) |
| 🟠 **P1** | Document staff WebSocket auth (§2.4) |
| 🟠 **P1** | Fix phantom `frontend-design` skill references (§3.3, §3.4) |
| 🟠 **P1** | Document actual route structure (§5.1) |
| 🟡 **P2** | Document state management implementation (§5.2) |
| 🟡 **P2** | Document API client pattern (§5.3) |
| 🟡 **P2** | Create deployment docs (§2.2) |
| 🟡 **P2** | Clarify payment flow for customer vs staff (§6.3) |
| 🟡 **P2** | Document restaurant multi-tenancy model (§6.2) |
| ⚪ **P3** | Create missing agent rules files (§4) |
| ⚪ **P3** | Create testing strategy doc (§2.3) |
| ⚪ **P3** | Create error code registry (§2.5) |
| ⚪ **P3** | Resolve git repository structure (§3.2) |
| ⚪ **P3** | Clarify `MenuItem.image` scope (§2.7) |
| ⚪ **P3** | Reduce duplicated content across docs (§6.1) |
| ⚪ **P3** | Document expired-session recovery status (§5.4) |
