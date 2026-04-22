# FRONTEND DESIGN SYSTEM - TAWLAX

## Design North Star

Tawlax frontend must feel:

* Modern
* Clean
* Fast
* Confident
* Slightly bold

The UI should impress through clarity, typography, spacing, motion discipline, and one memorable visual signature per surface.

---

## Global Principles

1. Speed is part of the design.
2. Simplicity beats decoration.
3. Every screen must communicate state immediately.
4. Creative direction must stay functional.
5. No generic dashboard template feel.

---

## Surface-Specific Direction

### Customer App

Target feel:

* Minimalist / refined
* Warm, premium, and calm

Qualities:

* Strong food imagery potential later
* Clear category rhythm
* Fast cart interactions
* Soft but intentional motion

### Kitchen Dashboard

Target feel:

* Industrial / utilitarian

Qualities:

* Dense information
* Strong status contrast
* Zero decorative clutter
* Readable from distance

### Waiter Dashboard

Target feel:

* Minimal operational control panel

Qualities:

* Fast table scanning
* Clear urgency
* Simple action affordances

### Admin Dashboard

Target feel:

* Refined operational workspace

Qualities:

* Strong hierarchy
* Calm density
* Serious, trustworthy appearance

---

## Typography Rules

* Avoid generic default stacks as the final design direction
* Establish clear display, section, body, and meta levels
* Use typography to drive hierarchy before adding extra UI chrome

---

## Color Rules

* Use a dominant neutral foundation
* Use a small number of intentional accent colors
* Map order and payment states consistently across staff surfaces
* Avoid default purple-gradient aesthetics

---

## Motion Rules

* Motion must communicate state, not decorate emptiness
* Keep customer interactions fast and lightweight
* Use stagger and emphasis sparingly
* Staff dashboards prioritize immediacy over animation

---

## Layout Rules

* Customer views: mobile-first and thumb-friendly
* Staff dashboards: scan-friendly and status-first
* Admin views: structured and data-clear
* Whitespace should clarify, not waste space

---

## UI Anti-Patterns

Do NOT ship:

* Generic card-grid SaaS layouts by default
* Overbuilt side panels everywhere
* Heavy glassmorphism without purpose
* Busy gradients that reduce clarity
* Tiny action buttons on mobile
* Excessive modals for simple actions

---

## Required Frontend Skills

When implementation begins, the Frontend Agent must use:

* `.agents/skills/frontend_ui_direction.md`
* `.agents/skills/frontend_api_integration.md`
* `.agents/skills/frontend_realtime_ui.md`
* `.agents/skills/frontend_performance.md`

If external Codex skills are available, they may complement these repo-local frontend skills but must not replace them as the local source of truth.

---

## Success Criteria

Frontend work is only acceptable if it feels:

* Fast on first use
* Easy under pressure
* Distinctive enough to feel crafted
* Operationally obvious for staff
