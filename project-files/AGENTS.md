# AgentFlow Project Instructions

This project uses AgentFlow for AI-assisted development with human checkpoints.

## Quick Start

```bash
# Check board status
codex exec "/prompts:af status"

# Create a card
codex exec "/prompts:af add 'Feature title'"

# Work on next card
codex exec "/prompts:af next"

# Run autonomous loop
.agentflow/loop.sh --codex
```

## Workflow

Cards move through 7 columns:

```
NEW → APPROVED → REFINEMENT → TECH-DESIGN → IMPLEMENTATION → FINAL-REVIEW → DONE
 👤      👤          🤖            🤖             🤖              👤          ✅
```

- **Human columns** (👤): NEW, APPROVED, FINAL-REVIEW
- **Agent columns** (🤖): REFINEMENT, TECH-DESIGN, IMPLEMENTATION

## Commands

All commands use `/prompts:af` prefix:

| Command | Description |
|---------|-------------|
| `/prompts:af add <title>` | Create new card |
| `/prompts:af list` | List all cards by column |
| `/prompts:af status` | Quick board overview |
| `/prompts:af show <id>` | Show card details |
| `/prompts:af move <id> <column>` | Move card to column |
| `/prompts:af work <id>` | Work on specific card |
| `/prompts:af next` | Work on next available card |
| `/prompts:af feedback <id>` | Respond to needs-feedback |
| `/prompts:af review <id>` | Run code review |

## Running the Loop

The autonomous loop processes cards until human input is needed:

```bash
.agentflow/loop.sh --codex       # Default: 20 iterations
.agentflow/loop.sh --codex 50    # Custom max iterations
```

Output files:
- `.agentflow/loop_status.txt` - Quick status
- `.agentflow/progress.txt` - Work log
- `.agentflow/iterations/` - Per-iteration details

## Key Files

| File | Purpose |
|------|---------|
| `.agentflow/board.json` or `.agentflow/github.json` | Board state |
| `.agentflow/cards/*.md` | Card context (JSON backend) |
| `.agentflow/columns/*.md` | Phase instructions |
| `.agentflow/progress.txt` | Session memory |
| `.agentflow/PROJECT_LOOP_PROMPT.md` | Project-specific config |

## Agents

Three specialized agents (invoke via skills):

- **code-explorer**: Codebase reconnaissance, pattern identification
- **code-architect**: Implementation design (3 approaches)
- **code-reviewer**: Code review with scoring

## Human Checkpoints

Cards pause with `needs-feedback` tag when:
- Agent has clarifying questions
- Multiple design approaches need selection
- Final review is ready

Use `/prompts:af feedback <id>` to respond and continue.

## Documentation

- `.agentflow/core.md` - Core concepts
- `.agentflow/columns/*.md` - Phase-specific instructions
- `.agentflow/prompts/*.md` - Agent prompts
