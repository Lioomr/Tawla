# SKILL: Menu Fetching

## Purpose

Return clean, fast menu structure.

---

## Steps

1. Get restaurant from session
2. Fetch categories
3. Prefetch menu items
4. Filter is_available = true

---

## Rules

* Avoid N+1 queries
* Use select_related / prefetch_related
* Keep response minimal

---

## Output

* categories
* items inside each category
