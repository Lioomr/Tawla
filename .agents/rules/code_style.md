# CODE STYLE - TAWLAX

## General

* Clean, readable code
* No unnecessary comments
* No dead code
* Prefer explicit, simple logic

---

## Naming

* `snake_case` -> backend
* `camelCase` -> frontend
* Public API tokens must remain clearly named as tokens

---

## Functions

* Single responsibility
* Keep logic focused
* Split when readability drops

---

## Files

* One responsibility per file
* Avoid oversized files when practical
* Group files by domain, not by randomness

---

## Backend

* Use serializers correctly
* Keep views thin
* Put reusable business logic in services/helpers
* Reuse shared response and exception helpers

---

## Frontend

* Prefer clear component boundaries
* Default to simple data flow
* Keep client-side JavaScript minimal
* Use design tokens, not scattered magic values
* Favor fast render paths over flashy but expensive UI

---

## Forbidden

* Spaghetti logic
* Hardcoded values without justification
* Duplicate code
* Generic dashboard boilerplate
