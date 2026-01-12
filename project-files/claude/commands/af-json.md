---
description: AgentFlow board management and workflow commands
allowed-tools: Read, Write, Glob, Bash, Agent
---

# AgentFlow Commands

Usage: `/af <command> [args]`

## Commands Overview

| Command | Description |
|---------|-------------|
| `/af add <title>` | Add new card to New column |
| `/af list` | List all cards by column |
| `/af status` | Quick board overview |
| `/af show <id>` | Show card details |
| `/af move <id> <column>` | Move card manually |
| `/af tag <id> <action> <tag>` | Add or remove tags |
| `/af context <id> <action> <content>` | Update card context |
| `/af work <id>` | Work on specific card |
| `/af next` | Work on next available card |
| `/af loop` | Continuous work mode |
| `/af review <id>` | Run code review on card |
| `/af feedback <id>` | Respond to needs-feedback card |

---

## `/af add <title>` — Add Card to New Column

Create a new card in the New column.

**Process:**
1. Read `.agentflow/board.json`
2. Generate 6-char alphanumeric ID
3. Ask user for description (or use title if simple)
4. Ask user for type: Feature, Bug, or Refactor
5. Ask user for priority (default: medium)
6. Create card object:
   ```json
   {
     "id": "{generated}",
     "title": "{title}",
     "type": "{feature|bug|refactor}",
     "column": "new",
     "priority": "{priority}",
     "tags": [],
     "createdAt": "{now}",
     "updatedAt": "{now}"
   }
   ```
7. Create context file `.agentflow/cards/{id}.md`:
   ```markdown
   # {title}

   ## Type
   {Feature | Bug | Refactor}

   ## Priority
   {critical | high | medium | low}

   ## Description
   {description}

   ---

   ## History
   | Date | Column | Actor | Notes |
   |------|--------|-------|-------|
   | {date} | New | Human | Created |
   ```
8. Save board.json
9. Confirm: "✅ Created card `{id}`: {title}"

---

## `/af list` — List All Cards

Show cards grouped by column.

**Flags:**
- `--workable` — Only show cards that can be worked on (in agent columns, not tagged `needs-feedback` or `blocked`)

**Output format:**
```
## New (2)
- `abc123` Add OAuth login [high]
- `def456` Fix navbar bug [medium]

## Refinement (1) 🤖
- `ghi789` Implement search [high]

## Tech Design (1) 🤖
- `jkl012` Add dark mode [medium]

## Implementation (1) 🤖
- `pqr678` Update dashboard [medium]

## Human Review (1) 👀
- `stu901` Add caching [low] — score: 85/100

## Done (3) ✅
- `vwx234` Initial setup
- ...
```

**Indicators:**
- 🤖 = Agent-workable column
- ⏸️ = Has `needs-feedback` tag (waiting on human)
- 👀 = Awaiting human review
- 🚫 = Has `blocked` tag

---

## `/af status` — Quick Board Overview

**Output format:**
```
AgentFlow Status
================
Total cards: 12

🟢 Workable now: 3
   `abc123` Add OAuth (refinement) [high]
   `def456` Search feature (tech-design) [high]
   `ghi789` Dashboard update (implementation) [medium]

⏸️ Needs feedback: 2
   `jkl012` Dark mode (refinement) — questions pending
   `mno345` API refactor (tech-design) — awaiting approval

👀 Human review: 2
   `pqr678` Caching (final-review) — score: 85/100
   `stu901` Auth fix (final-review) — score: 72/100

📋 New: 3
✅ Done: 2
```

---

## `/af show <id>` — Show Card Details

Display full card information.

**Process:**
1. Find card in board.json
2. Read context file
3. Display:
   - Metadata (title, column, priority, tags, blocked)
   - Full context file content (rendered)
   - History timeline

---

## `/af move <id> <column>` — Move Card Manually

Move a card to any column.

**Process:**
1. Find card, validate column exists
2. Update card:
   - `column`: new column
   - `updatedAt`: now
   - Append to `history`
3. Save board.json
4. Confirm: "✅ Moved `{id}` to {column}"

**Warn if:**
- Moving to agent-workable column (agent will pick it up)
- Moving backward (might lose work)

---

## `/af tag <id> <action> <tag>` — Manage Card Tags

Add or remove tags from a card.

**Actions:**
- `add` — Add a tag to the card
- `remove` — Remove a tag from the card

**Common tags:**
- `needs-feedback` — Card is waiting for human input
- `blocked` — Card is blocked by external dependency

**Process:**
1. Find card in board.json
2. Update card's `tags` array:
   - `add`: Append tag if not present
   - `remove`: Remove tag if present
3. Update `updatedAt` timestamp
4. Save board.json
5. Confirm: "✅ Tag `{tag}` {added to|removed from} card `{id}`"

**Examples:**
```
/af tag abc123 add needs-feedback
/af tag abc123 remove blocked
```

---

## `/af context <id> <action> <content>` — Update Card Context

Append content or add history entries to a card's context.

**Actions:**
- `append` — Append markdown content to the card context
- `history` — Add an entry to the History table

**Process for `append`:**
1. Find card in board.json
2. Read context file `.agentflow/cards/{id}.md`
3. Append the provided content
4. Save context file
5. Update `updatedAt` in board.json

**Process for `history`:**
1. Find card in board.json
2. Read context file
3. Add row to History table: `| {date} | {column} | Agent | {content} |`
4. Save context file
5. Update `updatedAt` in board.json

**Examples:**
```
/af context abc123 append "
## Refinement
**Date:** 2026-01-11
**Status:** Complete

### Requirements
- User can log in with Google OAuth
- Session persists for 7 days
"

/af context abc123 history "Requirements documented, ready for tech design"
```

---

## `/af work <id>` — Work on Specific Card

Work on a specific card regardless of priority.

**Process:**
1. Find card, verify it's in an agent-workable column (approved, refinement, tech-design, implementation)
2. Check for `needs-feedback` or `blocked` tags — if present, explain what's needed and stop
3. Read project context: `.agentflow/PROJECT_LOOP_PROMPT.md`
4. Read card context: `.agentflow/cards/{id}.md`
5. Read column instructions: `.agentflow/columns/{column}.md` for detailed phase instructions
6. Execute phase based on column (summary below, see column docs for full details):

### If column = `approved`:
```
1. IMMEDIATELY move card to `refinement` column (update board.json now)
2. Update card History: "Picked up, starting exploration"
3. Continue with refinement phase below
```
This ensures the card shows as "in progress" while exploration happens.

### If column = `refinement`:
```
1. Invoke Agent("code-explorer") with:
   - Task: card title + description
   - Acceptance criteria from context
   - Project context summary

2. Process explorer output:
   - Extract relevant files and patterns
   - Extract clarifying questions (if any)

3. Evaluate if requirements are clear:
   - If CLEAR: Document full functional requirements, move to tech-design
   - If UNCLEAR: Document questions, add `needs-feedback` tag, stay in refinement

4. Append to card context:
   ---
   ## Refinement
   **Date:** {YYYY-MM-DD}
   **Agent:** code-explorer
   **Status:** {Awaiting feedback | Complete}

   ### Relevant Files
   {Table of relevant files}

   ### Functional Requirements
   {If complete: full requirements}

   ### Acceptance Criteria
   {Measurable criteria}

5. Update Conversation Log with any questions
6. If needs-feedback: "⏸️ Questions added. Waiting for human feedback."
7. If complete: Move to `tech-design`, summarize: "Requirements complete."
```

### If column = `tech-design`:
```
1. Read refinement findings from context
2. Check for unanswered questions — if found with needs-feedback tag, stop

3. Invoke Agent("code-architect") with:
   - Task description
   - Requirements from refinement
   - Answered questions (from Conversation Log)
   - Project context

4. Evaluate approach complexity:
   - If SIMPLE/OBVIOUS: Document approach, proceed to finalize
   - If MULTIPLE OPTIONS or SIGNIFICANT: Document approaches, add `needs-feedback` tag

5. If proceeding (simple or human approved):
   - Create spec commit: `git commit -m "spec({type}): {title}"`
   - Move card to `implementation`

6. Append to card context:
   ---
   ## Tech Design
   **Date:** {YYYY-MM-DD}
   **Agent:** code-architect
   **Status:** {Awaiting feedback | Complete}

   ### Decision
   {If finalized: Approaches considered, selection, rationale}

   ### Technical Design
   {Comprehensive design}

   ### Files to Create/Modify
   {Tables}

   ### Verification Steps
   {Specific commands}

   ### Spec Commit
   **SHA:** `{sha}`

7. Summarize: "Tech design complete. Spec committed."
```

### If column = `implementation`:
```
1. Find approved tech design in context
2. If no design found, stop and explain

3. Execute implementation (TDD preferred):
   - Write tests first
   - Create/modify files as planned
   - For bugs: write failing test first

4. Run cursory verification:
   - Type check, build, basic tests

5. Complete implementation until tests pass

6. Invoke Agent("code-reviewer") for review
   - If score < 70: Fix issues, re-review
   - If score >= 70: Proceed

7. Run full verification:
   - All tests, integration tests
   - UI testing if applicable

8. Create implementation commit:
   `git commit -m "{type}({scope}): {title}"`

9. Move card to `final-review`

10. Append to card context:
    ---
    ## Implementation
    **Date:** {YYYY-MM-DD}

    ### Tests Written
    {Table}

    ### Changes Made
    {Table}

    ### Verification Results
    {Cursory and full verification}

    ---

    ## Code Review
    **Date:** {YYYY-MM-DD}
    **Agent:** code-reviewer
    **Score:** {XX}/100
    **Verdict:** {PASS | NEEDS WORK}

    ### Breakdown
    | Category | Score | Notes |
    |----------|-------|-------|
    | Functionality | /40 | |
    | Architecture Compliance | /20 | |
    | Code Quality | /20 | |
    | Safety/Security | /20 | |

    ### Implementation Commit
    **SHA:** `{sha}`

11. Summarize: "Implementation complete. Score: {score}/100. Ready for human review."
```

---

## `/af next` — Work on Next Available Card

Work on highest priority workable card.

**Process:**
1. Read board.json
2. Find workable cards:
   - Column is `approved`, `refinement`, `tech-design`, or `implementation`
   - No `needs-feedback` tag
   - No `blocked` tag
3. If none: "No workable cards. All waiting on human input."
4. Sort by priority (critical→low), then createdAt (oldest first)
5. Select first card
6. Announce: "Working on: `{id}` {title} ({column})"
7. Execute `/af work {id}` logic

---

## `/af feedback <id>` — Respond to Needs-Feedback Card

Provide human feedback to a card waiting on input.

**Process:**
1. Find card, verify it has `needs-feedback` tag
2. If not tagged: "Card `{id}` is not waiting for feedback."
3. Read card context file
4. Display the Conversation Log section with pending questions
5. Prompt human for responses
6. Update Conversation Log with human answers:
   ```markdown
   **Human ({date}):** {response}
   ```
7. Remove `needs-feedback` tag from card
8. Update `updatedAt` timestamp
9. Confirm: "✅ Feedback recorded. Card `{id}` is now workable."

**Quick form:**
```
/af feedback abc123 "Use Redis for sessions, not in-memory"
```
Opens card, appends answer, removes tag in one step.

---

## `/af loop` — Continuous Work Mode (External Script)

**Important:** The loop runs via an external bash script, not within Claude.

**To start the loop, run in your terminal:**
```bash
.agentflow/loop.sh              # Default: 20 iterations max
.agentflow/loop.sh 50           # Custom: 50 iterations max
.agentflow/loop.sh 50 "DONE"    # Custom completion promise
```

The script:
1. Reads `.agentflow/board.json` to find workable cards
2. Pipes `.agentflow/RALPH_LOOP_PROMPT.md` to Claude Code
3. Claude processes ONE card, moves it, exits
4. Script checks for completion or continues to next iteration
5. Repeats until no workable cards or max iterations reached

**Exit conditions:**
- No workable cards remain (all in human-required columns)
- Max iterations reached
- Completion promise found in output (`AGENTFLOW_NO_WORKABLE_CARDS`)
- User interrupts (Ctrl+C)

**Why external loop?**
- Fresh context each iteration (no context window bloat)
- Easy to stop with Ctrl+C
- Clear state boundaries between cards
- Can monitor progress in terminal

---

## `/af review <id>` — Run Code Review

Invoke code-reviewer agent on a card's implementation.

**Process:**
1. Find card, verify it's in `implementation` or `final-review`
2. Read card context for implementation details
3. Invoke Agent("code-reviewer") with:
   - Implementation summary
   - Tech design
   - Files to review
4. Output review markdown directly (for standalone use)

Can be used standalone to review any implementation, even outside the workflow.

---

## Error Handling

| Error | Response |
|-------|----------|
| board.json missing | "AgentFlow not initialized. Create `.agentflow/board.json`" |
| Card not found | "Card `{id}` not found" |
| Invalid column | "Unknown column: {col}. Valid: new, approved, refinement, tech-design, implementation, final-review, done" |
| Card has needs-feedback | "Card `{id}` is waiting for feedback. Use `/af feedback {id}` to respond." |
| Card blocked | "Card `{id}` is blocked: {reason}" |
| Not in agent column | "Card `{id}` is in {col} (human-required). Cannot auto-work." |
| No tech design | "No tech design found. Complete tech-design phase first." |

---

## Agent Invocation Reference

```
# Codebase exploration (Refinement phase)
Agent("code-explorer")
> {task description and context}

# Technical design (Tech Design phase)
Agent("code-architect")
> {task + refinement findings + answered questions}

# Code review (Implementation phase)
Agent("code-reviewer")
> {implementation summary + tech design}
```

Each agent returns markdown that can be:
- Displayed directly to human (standalone)
- Processed and added to card context (workflow)
