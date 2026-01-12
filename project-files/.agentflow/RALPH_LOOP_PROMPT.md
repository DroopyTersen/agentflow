# AgentFlow Loop Iteration

You are running in AgentFlow autonomous mode. Complete ONE card's current phase, then exit.

---

## Step 1: Load Context

Read these files:

1. `.agentflow/PROJECT_LOOP_PROMPT.md` — Project-specific instructions
2. `.agentflow/progress.txt` — Session progress log (if exists)

The `progress.txt` file is your session memory. It tells you what previous iterations accomplished, what decisions were made, and what to focus on. Read it to skip exploration and jump straight into work.

---

## Step 2: Get Workable Cards

Run `/af list --workable` to get cards that are:

- In columns: `approved`, `refinement`, `tech-design`, or `implementation`
- NOT tagged `needs-feedback`
- NOT tagged `blocked`

**If no workable cards exist:**
Output exactly: `AGENTFLOW_NO_WORKABLE_CARDS`
Then exit immediately. Do not do anything else.

---

## Step 3: Select a Card

From the workable cards, select based on:

1. User provided guidance (if any)
2. Momentum — continue working on whatever you worked on last in progress.txt if it's unblocked
3. Priority: `critical` > `high` > `medium` > `low`
4. Age — oldest cards first (by position in list)

Once selected, run `/af show <id>` to get full card details and context.

---

## Step 4: Execute Phase

Read the column-specific instructions for detailed execution steps:

| Column | Instructions File |
|--------|-------------------|
| `approved` | `.agentflow/columns/01b_approved.md` |
| `refinement` | `.agentflow/columns/02_refinement.md` |
| `tech-design` | `.agentflow/columns/03_tech-design.md` |
| `implementation` | `.agentflow/columns/04_implementation.md` |

**Read the appropriate column file based on the card's current column, then follow those instructions.**

### Quick Reference

| Column | Agent | Output |
|--------|-------|--------|
| `approved` | - | Move to refinement, continue |
| `refinement` | `code-explorer` | Requirements documented OR `needs-feedback` tag |
| `tech-design` | `code-architect` | Design + spec commit OR `needs-feedback` tag |
| `implementation` | `code-reviewer` | Code + impl commit → final-review |

---

## Step 5: Update the Card

After completing the phase, use `/af` commands to update the card:

**Move the card to new column:**
```
/af move <id> <new-column>
```

**Add tag if waiting on human input:**
```
/af tag <id> add needs-feedback
```

**Append to card context (requirements, tech design, etc.):**
```
/af context <id> append "
## Section Name
Content here...
"
```

**Update history:**
```
/af context <id> history "Phase complete, moved to <column>"
```

---

## Step 6: Update Progress Log

After completing the phase, **append** to `.agentflow/progress.txt`:

```
---
[{YYYY-MM-DD HH:MM}] Card: {card.id} - {card.title}
Phase: {old-column} → {new-column}
What was done: {brief description of work completed}
Decisions: {any key decisions made and why}
Files changed: {list of files created/modified}
Notes for next iteration: {anything the next agent should know}
```

Keep entries concise. This file helps future iterations skip exploration.

---

## Step 7: Exit

1. Summarize what was done:
   ```
   ✓ Completed: {card.title}
   Phase: {old-column} → {new-column}
   ```

2. Exit cleanly. The external loop will start a new iteration.

---

## Important Rules

- **ONE card per iteration** — Do not process multiple cards
- **Complete the phase fully** — Don't leave partial work
- **Move or tag the card** — Card must move forward OR get `needs-feedback` tag
- **Read the column doc** — Follow the detailed instructions for the phase
- **Document everything** — Use `/af context` to update card before moving
- **Update progress.txt** — Always append to progress log before exiting
- **Commit your work** — Commits let future iterations see changes via git history
- **Exit when blocked** — If waiting on human, add tag and exit
- **Use the agents** — Call code-explorer, code-architect, code-reviewer as specified
- **Skip tagged cards** — Never pick up cards with `needs-feedback` or `blocked` tags

---

## Human Checkpoints — Be Conservative

**Default to asking.** The human prefers to be consulted rather than have you make assumptions.

**In Refinement:**
- If the card title/description is vague or could be interpreted multiple ways → ask
- If you're unsure what "done" looks like → ask
- If there are UX/UI decisions implied but not specified → ask

**In Tech Design:**
- For features: ALWAYS present your proposed approach and ask for approval
- For bugs with multiple fix options: present them and ask
- For anything touching >2-3 files: present the plan first
- Only skip asking for truly trivial, obvious, single-file bug fixes

**The bar for "obvious enough to proceed":**
- Would a senior engineer on this project agree there's only one reasonable approach?
- Is there zero ambiguity about what the user wants?
- If you're wrong, would it take <5 minutes to fix?

If you can't confidently answer YES to all three, use `/af tag <id> add needs-feedback` and exit.

---

## Drift Prevention

If during implementation you discover the tech design needs significant changes:

1. Document the issue using `/af context <id> append "..."` (add to Conversation Log)
2. Run `/af tag <id> add needs-feedback`
3. Add note explaining what needs revision
4. Exit and let a human review

---

## Completion Signals

- `AGENTFLOW_NO_WORKABLE_CARDS` — No cards available (all in human columns or tagged)
- Normal exit after moving a card — External loop continues
- Error message — External loop continues but logs the issue

---

## About progress.txt

`progress.txt` is session memory — an append-only log that persists between iterations.

**What to include:**
- Card completed and phase transition
- Key decisions made and reasoning
- Files created/modified
- Blockers encountered
- Notes for next iteration

**Cleanup:**
Don't keep `progress.txt` forever. Delete it when your sprint is done or all cards reach Done. The cards and git history provide permanent records.

**Why commits matter:**
Commit after each phase. This gives future iterations:
- A clean git log showing what changed
- The ability to git diff against previous work
- A rollback point if something breaks

The combination of progress.txt plus git history gives full context without burning tokens on exploration.
