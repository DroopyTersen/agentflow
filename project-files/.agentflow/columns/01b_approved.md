# Column: Approved

**Actor:** Agent (Ralph Loop)
**Agent:** None
**Commit:** None

---

## Summary

Holding area for human-approved cards ready for agent work. Cards enter this column when a human moves them from `new`, signaling they are ready to be processed.

The Ralph Loop picks up cards from this column and immediately moves them to Refinement.

---

## Definition of Done

Card has been moved to `refinement` column.

---

## What Happens

### Agent Pickup

The next Ralph Loop iteration:
1. Picks up the card from `approved`
2. Moves it to `refinement`
3. Continues with refinement phase

This is an automatic transition—no additional work happens in this column.

---

## Entry Criteria

- Card exists in `new` column
- Human has reviewed the card
- Human moved card to `approved`

---

## Exit Criteria

- Card moved to `refinement` by Ralph Loop

---

## Next Column

> **Refinement** (picked up by Ralph Loop)
