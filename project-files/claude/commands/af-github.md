---
description: AgentFlow board management using GitHub Projects
allowed-tools: Read, Write, Glob, Bash, Agent
---

# AgentFlow Commands (GitHub Backend)

Usage: `/af <command> [args]`

This backend uses GitHub Projects as the board and GitHub Issues as cards. Requires:
- `gh` CLI installed and authenticated
- `.agentflow/github.json` with project number
- `gh auth refresh -s project` (for project scope)

## Configuration

Create `.agentflow/github.json`:
```json
{
  "project": 42
}
```

The owner and repo are derived from `git remote get-url origin`.

## Commands Overview

| Command | Description |
|---------|-------------|
| `/af add <title>` | Create issue and add to project |
| `/af list` | List all cards by column |
| `/af status` | Quick board overview |
| `/af show <id>` | Show card details |
| `/af move <id> <column>` | Move card to column |
| `/af tag <id> <action> <tag>` | Add or remove labels |
| `/af context <id> <action> <content>` | Update issue body |
| `/af work <id>` | Work on specific card |
| `/af next` | Work on next available card |
| `/af loop` | Continuous work mode |
| `/af review <id>` | Run code review on card |
| `/af feedback <id>` | Respond to needs-feedback card |

---

## Helper: Get Project Info

Before running commands, get project info:

```bash
# Get owner/repo from git remote
REMOTE=$(git remote get-url origin)
# Extract owner and repo (handles both HTTPS and SSH URLs)
OWNER=$(echo "$REMOTE" | sed -E 's#.*(github\.com[:/])([^/]+)/.*#\2#')
REPO=$(echo "$REMOTE" | sed -E 's#.*(github\.com[:/][^/]+/)([^.]+)(\.git)?#\2#')

# Get project number from config
PROJECT=$(jq -r '.project' .agentflow/github.json)
```

---

## `/af add <title>` — Create Card

Create a new GitHub issue and add it to the project.

**Process:**
1. Read `.agentflow/github.json` for project number
2. Ask user for description and type (feature, bug, or refactor)
3. Create issue with type label:
   ```bash
   # Map type to label: feature→enhancement, bug→bug, refactor→refactor
   gh issue create \
     --title "{title}" \
     --body-file /tmp/issue-body.md \
     --label "{type_label}"
   ```
4. Add issue to project:
   ```bash
   gh project item-add {PROJECT} --owner {OWNER} --url {ISSUE_URL}
   ```
5. Move to "New" column:
   ```bash
   # Get item ID
   ITEM_ID=$(gh project item-list {PROJECT} --owner {OWNER} --format json | \
     jq -r '.items[] | select(.content.url == "{ISSUE_URL}") | .id')

   # Get Status field ID and New option ID
   gh project item-edit --project-id {PROJECT_ID} --id {ITEM_ID} \
     --field-id {STATUS_FIELD_ID} --single-select-option-id {NEW_OPTION_ID}
   ```
6. Confirm: "✅ Created issue #{number}: {title}"

**Issue Body Template:**
```markdown
## Type
{feature | bug | refactor}

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

---

## `/af list` — List All Cards

Show cards grouped by column (Status field).

**Flags:**
- `--workable` — Only show cards in agent columns without blocking tags

**Process:**
```bash
# Get all project items with their status
gh project item-list {PROJECT} --owner {OWNER} --format json
```

**Output format:**
```
## New (2)
- #123 Add OAuth login [high]
- #124 Fix navbar bug [medium]

## Refinement (1) 🤖
- #125 Implement search [high]

## Tech Design (1) 🤖
- #126 Add dark mode [medium]

## Implementation (1) 🤖
- #127 Update dashboard [medium]

## Final Review (1) 👀
- #128 Add caching [low] — score: 85/100

## Done (3) ✅
- #129 Initial setup
- ...
```

**For `--workable` flag:**
Filter to only show items where:
- Status is: Approved, Refinement, Tech Design, or Implementation
- Issue does NOT have `needs-feedback` label
- Issue does NOT have `blocked` label

Items are returned in board order (position = priority).

---

## `/af status` — Quick Board Overview

**Process:**
```bash
# Get project items
gh project item-list {PROJECT} --owner {OWNER} --format json

# For each issue, check labels
gh issue view {NUMBER} --json labels
```

**Output format:**
```
AgentFlow Status
================
Total cards: 12

🟢 Workable now: 3
   #123 Add OAuth (Refinement) [high]
   #124 Search feature (Tech Design) [high]
   #125 Dashboard update (Implementation) [medium]

⏸️ Needs feedback: 2
   #126 Dark mode (Refinement) — needs-feedbacks pending
   #127 API refactor (Tech Design) — awaiting approval

👀 Final review: 2
   #128 Caching (Final Review) — score: 85/100
   #129 Auth fix (Final Review) — score: 72/100

📋 New: 3
✅ Done: 2
```

---

## `/af show <id>` — Show Card Details

Display full card information. The `<id>` is the issue number.

**Process:**
```bash
# Get issue details
gh issue view {NUMBER} --json number,title,body,labels,state,comments

# Get project item status
gh project item-list {PROJECT} --owner {OWNER} --format json | \
  jq '.items[] | select(.content.number == {NUMBER})'
```

**Display:**
- Issue number, title, state
- Current column (from project Status field)
- Labels (type, priority, tags)
- Full issue body (card context)
- Recent comments (conversation log)

---

## `/af move <id> <column>` — Move Card

Move a card to a different column by updating the project item's Status field.

**Valid columns:** new, approved, refinement, tech-design, implementation, final-review, done

**Process:**
```bash
# Get project item ID for this issue
ITEM_ID=$(gh project item-list {PROJECT} --owner {OWNER} --format json | \
  jq -r '.items[] | select(.content.number == {NUMBER}) | .id')

# Get project field IDs (need project node ID first)
PROJECT_ID=$(gh project view {PROJECT} --owner {OWNER} --format json | jq -r '.id')

# Get Status field ID and option IDs
FIELDS=$(gh project field-list {PROJECT} --owner {OWNER} --format json)
STATUS_FIELD_ID=$(echo "$FIELDS" | jq -r '.fields[] | select(.name == "Status") | .id')
OPTION_ID=$(echo "$FIELDS" | jq -r '.fields[] | select(.name == "Status") | .options[] | select(.name == "{Column}") | .id')

# Update the item's status
gh project item-edit --project-id {PROJECT_ID} --id {ITEM_ID} \
  --field-id {STATUS_FIELD_ID} --single-select-option-id {OPTION_ID}
```

**Confirm:** "✅ Moved #{number} to {column}"

**Warn if:**
- Moving to agent-workable column (agent will pick it up)
- Moving backward (might lose work)

---

## `/af tag <id> <action> <tag>` — Manage Labels

Add or remove labels from an issue.

**Actions:**
- `add` — Add a label to the issue
- `remove` — Remove a label from the issue

**Common tags (as labels):**
- `needs-feedback` — Card is waiting for human input
- `blocked` — Card is blocked by external dependency

**Process:**
```bash
# Add label
gh issue edit {NUMBER} --add-label "{tag}"

# Remove label
gh issue edit {NUMBER} --remove-label "{tag}"
```

**Confirm:** "✅ Label `{tag}` {added to|removed from} #{number}"

**Examples:**
```
/af tag 123 add needs-feedback
/af tag 123 remove blocked
```

---

## `/af context <id> <action> <content>` — Update Issue Body

Append content or add history entries to the issue body.

**Actions:**
- `append` — Append markdown content to the issue body
- `history` — Add an entry to the History table in the issue body

**Process for `append`:**
1. Get current issue body:
   ```bash
   gh issue view {NUMBER} --json body -q '.body' > /tmp/issue-body.md
   ```
2. Append new content to file
3. Update issue:
   ```bash
   gh issue edit {NUMBER} --body-file /tmp/issue-body.md
   ```

**Process for `history`:**
1. Get current issue body
2. Find the History table and add a new row:
   `| {date} | {column} | Agent | {content} |`
3. Update issue body

**Examples:**
```
/af context 123 append "
## Refinement
**Date:** 2026-01-11
**Status:** Complete

### Requirements
- User can log in with Google OAuth
- Session persists for 7 days
"

/af context 123 history "Requirements documented, ready for tech design"
```

---

## `/af work <id>` — Work on Specific Card

Work on a specific card regardless of priority.

**Process:**
1. Get issue details: `gh issue view {NUMBER} --json ...`
2. Get project item status (current column)
3. Check for `needs-feedback` or `blocked` labels — if present, explain what's needed and stop
4. Read project context: `.agentflow/PROJECT_LOOP_PROMPT.md`
5. Read column instructions: `.agentflow/columns/{column}.md`
6. Execute phase based on column (see column docs for full details)

### If column = `approved`:
```
1. Move card to `refinement`: /af move {id} refinement
2. Update history: /af context {id} history "Picked up, starting exploration"
3. Continue with refinement phase
```

### If column = `refinement`:
```
1. Invoke Agent("code-explorer") with task details
2. Process explorer output
3. If CLEAR: Document requirements, move to tech-design
4. If UNCLEAR: Document needs-feedbacks, add needs-feedback label
5. Use /af context to append Refinement section
6. Use /af move to transition (or /af tag to add needs-feedback)
```

### If column = `tech-design`:
```
1. Read refinement findings from issue body
2. Invoke Agent("code-architect") for design options
3. Present approaches, add needs-feedback for human selection
4. Once approved: finalize design, create spec commit
5. Use /af context to append Tech Design section
6. Use /af move to transition to implementation
```

### If column = `implementation`:
```
1. Read tech design from issue body
2. Write tests, implement solution
3. Run verification, invoke Agent("code-reviewer")
4. If score >= 70: commit, move to final-review
5. Use /af context to append Implementation and Code Review sections
```

---

## `/af next` — Work on Next Available Card

Work on highest priority workable card.

**Process:**
1. Run `/af list --workable` to get workable cards
2. If none: "No workable cards. All waiting on human input."
3. Cards are in priority order (board position)
4. Select first card
5. Announce: "Working on: #{number} {title} ({column})"
6. Execute `/af work {number}` logic

---

## `/af feedback <id>` — Respond to Needs-Feedback Card

Provide human feedback to a card waiting on input.

**Process:**
1. Check issue has `needs-feedback` label
2. If not: "Issue #{number} is not waiting for feedback."
3. Get issue body and recent comments
4. Display pending needs-feedbacks from Conversation Log
5. Prompt human for responses
6. Add comment with human's response:
   ```bash
   gh issue comment {NUMBER} --body "**Human ({date}):** {response}"
   ```
7. Remove `needs-feedback` label:
   ```bash
   gh issue edit {NUMBER} --remove-label "needs-feedback"
   ```
8. Confirm: "✅ Feedback recorded. Issue #{number} is now workable."

---

## `/af loop` — Continuous Work Mode (External Script)

**Important:** The loop runs via an external bash script, not within Claude.

**To start the loop, run in your terminal:**
```bash
.agentflow/loop.sh              # Default: 20 iterations max
.agentflow/loop.sh 50           # Custom: 50 iterations max
```

The script:
1. Pipes `.agentflow/RALPH_LOOP_PROMPT.md` to Claude Code
2. Claude runs `/af list --workable`, selects a card, executes one phase
3. Claude updates the card via `/af` commands, then exits
4. Script checks for completion or continues to next iteration

**Exit conditions:**
- No workable cards remain (output contains `AGENTFLOW_NO_WORKABLE_CARDS`)
- Max iterations reached
- User interrupts (Ctrl+C)

---

## `/af review <id>` — Run Code Review

Invoke code-reviewer agent on a card's implementation.

**Process:**
1. Get issue, verify Status is Implementation or Final Review
2. Read issue body for implementation details and tech design
3. Invoke Agent("code-reviewer") with context
4. Output review markdown directly

---

## Error Handling

| Error | Response |
|-------|----------|
| github.json missing | "GitHub backend not configured. Create `.agentflow/github.json` with project number" |
| gh not authenticated | "Run `gh auth login` to authenticate" |
| Project scope missing | "Run `gh auth refresh -s project` to add project scope" |
| Issue not found | "Issue #{number} not found" |
| Issue not in project | "Issue #{number} is not in the AgentFlow project" |
| Invalid column | "Unknown column: {col}. Valid: new, approved, refinement, tech-design, implementation, final-review, done" |
| Has needs-feedback | "Issue #{number} is waiting for feedback. Use `/af feedback {number}` to respond." |
| Has blocked label | "Issue #{number} is blocked: check issue for details" |

---

## Label Setup

Use GitHub's default labels where possible:

**Type labels (map to AgentFlow types):**
- `enhancement` — feature (default label)
- `bug` — bug (default label)
- `refactor` — refactor (create this one)

**Tag labels:**
- `needs-feedback` — waiting for human input (create this one, critical for agent)
- `blocked` — blocked by external dependency (create this one)

**Create the missing labels:**
```bash
gh label create "refactor" --color "1D76DB" --description "Code refactor"
gh label create "needs-feedback" --color "FBCA04" --description "Waiting for human input"
gh label create "blocked" --color "B60205" --description "Blocked by external dependency"
```

---

## Project Setup

1. Create a GitHub Project (new Projects, not classic)
2. Add a "Status" field with these options:
   - New
   - Approved
   - Refinement
   - Tech Design
   - Implementation
   - Final Review
   - Done
3. Note the project number from the URL
4. Create `.agentflow/github.json`:
   ```json
   {
     "project": YOUR_PROJECT_NUMBER
   }
   ```
5. Run `gh auth refresh -s project` to add project scope

---

## Agent Invocation Reference

```
# Codebase exploration (Refinement phase)
Agent("code-explorer")
> {task description and context from issue body}

# Technical design (Tech Design phase)
Agent("code-architect")
> {task + refinement findings from issue body}

# Code review (Implementation phase)
Agent("code-reviewer")
> {implementation summary + tech design from issue body}
```

---

## Conversation Log via Comments

Instead of a Conversation Log section in the issue body, use GitHub issue comments for agent-human dialogue:

**Agent asking needs-feedbacks:**
```bash
gh issue comment {NUMBER} --body "**Agent ({date}):** I have some needs-feedbacks:

1. Should we support both OAuth providers or just Google?
2. Where should user sessions be stored?"
```

**Human responding:**
Reply directly in GitHub UI, or:
```bash
gh issue comment {NUMBER} --body "**Human ({date}):**
1. Start with Google only
2. Use Redis for sessions"
```

The `/af show` command displays recent comments as part of card context.
