---
description: AgentFlow board management and workflow commands
allowed-tools: Read, Write, Bash, Agent
---

# /af - AgentFlow Commands

Usage: `/af <command> [args]`

## Backend Detection

1. If `.agentflow/azure-devops.json` exists → Azure DevOps backend
2. If `.agentflow/github.json` exists → GitHub Projects backend
3. If `.agentflow/board.json` exists → Local JSON backend
4. None → Error: "No AgentFlow backend configured. Run `/af-setup-github`, `/af-setup-azure-devops`, or `/af-setup-json`"

## Execution

1. Read `.agentflow/core.md` (shared concepts)
2. Read `.agentflow/{backend}/{command}.md`
3. Execute the process described

## Command Routing

| Command | File | Notes |
|---------|------|-------|
| `add` | `{backend}/add.md` | Create new card |
| `list` | `{backend}/list.md` | List cards by column |
| `show` | `{backend}/show.md` | Show card details |
| `move` | `{backend}/move.md` | Move card to column |
| `tag` | `{backend}/tag.md` | Add/remove tags |
| `context` | `{backend}/context.md` | Update card context |
| `work` | `{backend}/workflow.md` | Work on specific card |
| `next` | `{backend}/workflow.md` | Work on next available |
| `loop` | `{backend}/workflow.md` | Continuous work mode |
| `feedback` | `{backend}/workflow.md` | Respond to needs-feedback |
| `depends` | `{backend}/workflow.md` | Manage dependencies |
| `review` | `{backend}/workflow.md` | Run code review |
| `status` | `{backend}/list.md` | Quick board overview |
| `pr-feedback` | `github/pr-feedback.md` | GitHub only |

## Quick Reference

| Command | Description |
|---------|-------------|
| `/af add <title>` | Create new card |
| `/af list [--workable]` | List cards by column |
| `/af status` | Quick board overview |
| `/af show <id>` | Show card details |
| `/af move <id> <column>` | Move card to column |
| `/af tag <id> <action> <tag>` | Add/remove tags |
| `/af work <id>` | Work on specific card |
| `/af next` | Work on next available card |
| `/af feedback <id>` | Respond to needs-feedback |
| `/af review <id>` | Run code review |

## Error Handling

| Condition | Response |
|-----------|----------|
| No backend | "No AgentFlow backend configured. Run `/af-setup-github`, `/af-setup-azure-devops`, or `/af-setup-json`" |
| Card not found | "Card {id} not found" |
| Invalid column | "Unknown column: {col}" |
| Has needs-feedback | "Card waiting for feedback. Use `/af feedback {id}`" |
| Has blocked tag | "Card is blocked. Check card for details." |
| Command unavailable | "Command `/af {cmd}` not available for {backend} backend. {alternative}" |
