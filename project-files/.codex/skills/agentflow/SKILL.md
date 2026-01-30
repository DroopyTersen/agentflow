---
name: agentflow
description: AgentFlow Kanban workflow for AI-assisted development. Use when the user mentions agentflow, cards, board, tasks, or wants to track work items, anything about a "Ralph Loop" etc. Translates informal requests into proper /prompts:af commands.
---

# AgentFlow Skill

A friendly interface to the AgentFlow Kanban workflow. Translates informal requests into `/prompts:af` commands.

## Documentation Structure

- `.codex/prompts/af.md` — Command dispatcher (start here)
- `.agentflow/core.md` — Shared concepts (columns, tags, agents)
- `.agentflow/github/` — GitHub Projects backend implementation
- `.agentflow/json/` — Local JSON backend implementation

The af.md dispatcher will guide you to read the appropriate backend-specific files based on which config exists (`.agentflow/github.json` or `.agentflow/board.json`).

## How This Works

Users can speak naturally about their workflow. This skill interprets intent and invokes the appropriate `/prompts:af` command.

## Common Requests → Commands

| User says... | Invoke |
|--------------|--------|
| "add a card for X" / "track X" / "I need to do X" | `/prompts:af add "X"` |
| "what's on my board?" / "show me my cards" | `/prompts:af list` |
| "what should I work on?" / "status" | `/prompts:af status` |
| "work on the next thing" / "keep going" | `/prompts:af next` |
| "show me card abc123" / "details on abc123" | `/prompts:af show abc123` |
| "I answered the questions on abc123" | `/prompts:af feedback abc123` |
| "move abc123 to done" | `/prompts:af move abc123 done` |
| "review the code on abc123" | `/prompts:af review abc123` |
| "start the loop" / "run autonomously" | Launch `.agentflow/loop.sh --codex` |
| "card X depends on Y" / "X is blocked by Y" | `/prompts:af depends X on Y` |

## Quick Reference

**Columns:** new → approved → refinement → tech-design → implementation → final-review → done

**Tags that block work:**
- `needs-feedback` — agent has questions for human
- `blocked` — waiting on external dependency

**Card priorities:** critical > high > medium > low

## When to Use Each Command

### Adding Work

```
/prompts:af add "Title of the work item"
```

Creates a card in the New column. Will prompt for type (feature/bug/refactor) and priority.

### Checking Status

```
/prompts:af status   # Quick overview: what's workable, what needs attention
/prompts:af list     # Full board view by column
/prompts:af show ID  # Deep dive on one card
```

### Doing Work

```
/prompts:af next     # Work on highest-priority workable card
/prompts:af work ID  # Work on a specific card
```

### Human Checkpoints

```
/prompts:af feedback ID           # Respond to agent questions
/prompts:af feedback ID "answer"  # Quick response in one command
```

### Manual Control

```
/prompts:af move ID COLUMN  # Move card to any column
/prompts:af review ID       # Run code review on a card
```

### Autonomous Mode (Ralph Loop)

**Run the loop from terminal:**
```bash
.agentflow/loop.sh --codex 50   # Codex with 50 iterations
```

**Loop output files:**
- `.agentflow/loop_status.txt` — Quick status summary
- `.agentflow/iterations/` — Per-iteration output files
- `.agentflow/progress.txt` — Accumulated progress log

## Full Command Reference

For complete command documentation:
1. Start with `.codex/prompts/af.md` (dispatcher)
2. Read `.agentflow/core.md` for shared concepts
3. Read backend-specific files as directed by af.md
