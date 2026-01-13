---
description: AgentFlow board management and workflow commands
allowed-tools: Read, Write, Glob, Bash, Agent
---

# AgentFlow Commands

Usage: `/af <command> [args]`

## Backend Detection

Check which backend is configured:

```
if .agentflow/github.json exists → GitHub Projects backend
if .agentflow/board.json exists → Local JSON backend
```

**No backend?** → "No AgentFlow backend configured. Create `.agentflow/board.json` or run `/af-setup-github`."

## Loading Instructions

1. **Read shared concepts:** `@.claude/skills/agentflow/core.md`
2. **Detect backend** and read its README:
   - GitHub: `@.claude/skills/agentflow/github/README.md`
   - JSON: `@.claude/skills/agentflow/json/README.md`
3. **Read command-specific file** based on command:

| Command | File |
|---------|------|
| `/af add` | `{backend}/add.md` |
| `/af list` | `{backend}/list.md` |
| `/af show` | `{backend}/show.md` |
| `/af move` | `{backend}/move.md` |
| `/af tag` | `{backend}/tag.md` |
| `/af context` | `{backend}/context.md` |
| `/af work` | `{backend}/workflow.md` |
| `/af next` | `{backend}/workflow.md` |
| `/af feedback` | `{backend}/workflow.md` |
| `/af depends` | `{backend}/workflow.md` |
| `/af review` | `{backend}/workflow.md` |
| `/af loop` | `{backend}/workflow.md` |
| `/af pr-feedback` | `{backend}/pr-feedback.md` (GitHub only) |
| `/af status` | Use `/af list` logic, summarize |

## Commands Quick Reference

| Command | Description |
|---------|-------------|
| `/af add <title>` | Create new card |
| `/af list [--workable]` | List cards by column |
| `/af status` | Quick board overview |
| `/af show <id>` | Show card details |
| `/af move <id> <column>` | Move card to column |
| `/af tag <id> <action> <tag>` | Add/remove tags |
| `/af context <id> <action> <content>` | Update card context |
| `/af work <id>` | Work on specific card |
| `/af next` | Work on next available card |
| `/af feedback <id>` | Respond to needs-feedback card |
| `/af depends <id> [on\|remove] <predecessor>` | Manage dependencies |
| `/af review <id>` | Run code review |
| `/af pr-feedback <pr>` | Address PR review comments |
| `/af loop` | Instructions for external loop |

## Execution Pattern

For any command:

1. Detect backend (github.json vs board.json)
2. Read `core.md` for shared concepts
3. Read `{backend}/README.md` for patterns
4. Read command-specific file
5. Execute the process described
6. Confirm with appropriate message

## Card Identification

- **GitHub backend:** Issue number (e.g., `123` or `#123`)
- **JSON backend:** 6-char alphanumeric ID (e.g., `abc123`)

## Valid Columns

`new` → `approved` → `refinement` → `tech-design` → `implementation` → `final-review` → `done`

## Common Errors

| Error | Response |
|-------|----------|
| No backend | "No AgentFlow backend configured." |
| Card not found | "Card {id} not found" |
| Invalid column | "Unknown column: {col}" |
| Has needs-feedback | "Card waiting for feedback. Use `/af feedback {id}`" |
| Has blocked tag | "Card is blocked. Check card for details." |
| Unfinished predecessors | "Card waiting on predecessors. Use `/af depends {id}`" |

## Agent Invocation

When phase requires an agent:

```
Agent("code-explorer")   # Refinement phase
Agent("code-architect")  # Tech Design phase
Agent("code-reviewer")   # Implementation phase
```

See `core.md` for details on when to invoke each agent.
