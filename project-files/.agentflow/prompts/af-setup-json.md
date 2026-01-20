# AgentFlow JSON Backend Setup

This guide helps you set up the local JSON file-based backend for AgentFlow.

The JSON backend stores all state in local files — no external services required. This is ideal for:
- Local development and experimentation
- Projects not using GitHub
- Offline work
- Simple single-developer workflows

## Setup

### Step 1: Create Board File

Create `.agentflow/board.json`:

```json
{
  "columns": [
    "new",
    "approved",
    "refinement",
    "tech-design",
    "implementation",
    "final-review",
    "done"
  ],
  "cards": []
}
```

### Step 2: Create Cards Directory

```bash
mkdir -p .agentflow/cards
```

Card context will be stored as markdown files in this directory.

### Step 3: Verify Setup

```bash
# Check board.json exists
cat .agentflow/board.json

# Check cards directory exists
ls -la .agentflow/cards/
```

---

## How It Works

### Board State

The `board.json` file tracks:
- Available columns
- All cards with their metadata

Card structure:
```json
{
  "id": "abc123",
  "title": "Add user authentication",
  "type": "feature",
  "column": "new",
  "priority": "high",
  "tags": [],
  "created": "2025-01-15T10:30:00Z",
  "updated": "2025-01-15T10:30:00Z"
}
```

### Card Context

Each card has a corresponding markdown file at `.agentflow/cards/{id}.md`:

```markdown
# Add user authentication

## Type
feature

## Priority
high

## Description
Implement user login and registration...

---

## History
| Date | Column | Actor | Notes |
|------|--------|-------|-------|
| 2025-01-15 | New | Human | Created |
```

### Discussion Log

Agent-human dialogue is stored in `.agentflow/cards/{id}/discussion.md`:

```markdown
# Discussion: Add user authentication

**Agent (2025-01-15):**
I have some questions about the auth requirements...

**Human (2025-01-15):**
We should use JWT tokens...
```

---

## File Structure

After setup, your `.agentflow/` directory looks like:

```
.agentflow/
├── board.json           # Board state (cards array)
├── cards/               # Card context files
│   ├── abc123.md        # Card context
│   └── abc123/
│       └── discussion.md  # Card discussion
├── columns/             # Phase instructions
├── loop.sh              # External loop script
├── PROJECT_LOOP_PROMPT.md
└── RALPH_LOOP_PROMPT.md
```

---

## Quick Reference

After setup, use these commands:
- `/af add <title>` — Create card (generates ID, creates files)
- `/af list` — List all cards by column
- `/af show <id>` — Show card details
- `/af move <id> <column>` — Move card
- `/af next` — Work on next available card

See `/af` for full command reference.

---

## Migrating to GitHub

If you later want to switch to GitHub Projects:

1. Run `/af-setup-github` to configure GitHub backend
2. For each card in `board.json`:
   - Create a GitHub issue with the card content
   - Add to the project
   - Set the status column

The JSON backend files can be kept as backup or deleted.
