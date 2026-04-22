# AGENTS SYSTEM - TAWLAX (LOCKED)

## Authority Model

* The System Owner is the only source of tasks.
* Agents DO NOT self-initiate work.
* Agents DO NOT change scope.

---

## Source of Truth (Priority Order)

1. `Docs/PRD (Tawla).txt`
2. `.agents/context/system_design.md`
3. `.agents/context/database_schema.md`
4. `.agents/context/api_design.md`
5. `.agents/context/frontend_architecture.md`
6. `.agents/context/frontend_design_system.md`
7. `.agents/rules/*`
8. Task definition

If conflict exists -> STOP and ask.

---

## Agents

### Backend Agent

* APIs
* Database
* Business logic
* Real-time backend flow
* Auth, throttling, audit logging

### Frontend Agent

* Customer UI
* Kitchen UI
* Waiter UI
* Admin dashboard UI
* API integration
* WebSocket integration
* Performance-first UI delivery

### Product Agent

* Scope validation
* UX flow validation
* Friction reduction

### Security Auditor

* Attack surface review
* Vulnerability detection
* Auth/session review
* Exposure and permission review

---

## Skill Binding

Agents MUST follow:
* `.agents/agents/skill_binding.md`

## Skill Invocation

Agents MUST follow:
* `.agents/agents/skill_invocation.md`

---

## Execution Contract

Agents MUST:

1. Read all relevant context files
2. Read task definition
3. Validate understanding
4. Execute ONLY assigned scope
5. Update source-of-truth docs when implementation changes them
6. Output in defined format

---

## Task Protocol (MANDATORY)

Every task MUST include:

* Task Title
* Assigned Agent
* Context Files to Use
* Requirements
* Constraints
* Expected Output Format

If any part is missing -> REJECT task.

---

## Output Contract

Agents MUST:

* Produce structured output
* Follow templates
* Be production-ready
* Be minimal
* Keep docs aligned with implementation

---

## Hard Restrictions

Agents MUST NOT:

* Modify architecture without instruction
* Invent features
* Cross responsibilities
* Skip validation
* Produce partial work

---

## Security First Rule

All agents must assume:

> "User input is malicious until validated"

---

## Review Loop (CRITICAL)

Every important output MUST pass:

1. Backend Agent -> builds
2. Security Auditor -> reviews
3. Product Agent -> validates

---

## Goal

Build Tawlax as a:

> Production-grade Restaurant Operating System

With:

* Zero ambiguity
* Strong security
* Clean architecture
* Fast and modern UX
