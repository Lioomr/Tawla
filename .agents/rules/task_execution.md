# TASK EXECUTION RULES

## 1. Understanding Phase

Agent MUST:

* Read all provided context files
* Read task definition
* Identify required skills
* Restate task internally

If unclear -> ask

---

## 2. Planning Phase

Agent MUST:

* Break task into steps
* Ensure alignment with system design
* Ensure alignment with API design
* Ensure alignment with frontend docs when relevant

---

## 3. Execution Phase

Agent MUST:

* Follow conventions
* Use required skills
* Write clean, minimal output
* Update source-of-truth docs if implementation changed them

---

## 4. Validation Phase

Agent MUST check:

* Matches PRD
* Matches schema
* Matches API design
* Matches frontend docs when relevant
* No security issues
* Error handling is consistent

---

## 5. Delivery Phase

Agent MUST:

* Use correct output format
* Avoid unnecessary explanation
* Call out any remaining blockers or unresolved conflicts

---

## Failure Conditions

Agent MUST STOP if:

* Missing requirements
* Conflicting instructions
* Security concerns
* Source-of-truth conflict
