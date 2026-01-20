# AgentFlow System

A file-based Kanban workflow for AI-assisted software development.

## Architecture

AgentFlow uses **progressive disclosure** to minimize token usage. Content is centralized in `.agentflow/` for portability across different AI coding tools.

```
┌─────────────────────────────────────────────────────────────────┐
│              Tool-Specific Adapters (thin, ~10-50 lines)        │
│                                                                 │
│  .claude/commands/af.md     .cursor/rules/af.mdc    (others)    │
│  Each adapter routes to .agentflow/                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        .agentflow/                              │
│                                                                 │
│  core.md ─────────────── Shared concepts (always loaded)        │
│                                                                 │
│  github/  ────────────── GitHub Projects backend commands       │
│  json/    ────────────── Local JSON file backend commands       │
│  prompts/ ────────────── Composable agent/command prompts       │
│                                                                 │
│  columns/ ────────────── Phase-specific workflow instructions   │
│  loop.sh  ────────────── External bash loop script              │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Detection

AgentFlow supports multiple backends. Detection is based on which config file exists:

| Backend | Config File | Setup Command |
|---------|-------------|---------------|
| GitHub Projects | `.agentflow/github.json` | `/af-setup-github` |
| Local JSON | `.agentflow/board.json` | `/af-setup-json` |

## File Structure

```
.agentflow/
├── README.md               # This file
├── core.md                 # Shared concepts (columns, tags, priorities)
│
├── github/                 # GitHub backend commands
│   ├── README.md           # GitHub patterns and auth
│   ├── add.md              # Create issue + add to project
│   ├── list.md             # List items by column
│   ├── show.md             # Display issue details
│   ├── move.md             # Change item status
│   ├── tag.md              # Manage labels
│   ├── context.md          # Update issue body
│   ├── workflow.md         # Work/next/loop/feedback/depends/review
│   └── pr-feedback.md      # Address PR review comments
│
├── json/                   # JSON backend commands
│   ├── README.md           # JSON backend overview
│   ├── add.md              # Create card + update board.json
│   ├── list.md             # List cards by column
│   ├── show.md             # Display card details
│   ├── move.md             # Move card to column
│   ├── tag.md              # Manage tags
│   ├── context.md          # Update card markdown
│   └── workflow.md         # Work/next/loop/feedback/depends/review
│
├── prompts/                # Composable prompts
│   ├── code-explorer.md    # Codebase analysis agent
│   ├── code-architect.md   # Architecture design agent
│   ├── code-reviewer.md    # Code review agent
│   ├── af-setup-github.md  # GitHub setup instructions
│   ├── af-setup-json.md    # JSON setup instructions
│   └── af-final-review.md  # Final review workflow
│
├── columns/                # Phase instructions
│   ├── 01_new.md
│   ├── 02_approved.md
│   ├── 03_refinement.md
│   ├── 04_tech-design.md
│   ├── 05_implementation.md
│   ├── 06_final-review.md
│   └── 07_done.md
│
├── loop.sh                 # External bash loop
├── RALPH_LOOP_PROMPT.md    # Loop iteration prompt
└── PROJECT_LOOP_PROMPT.md  # Project-specific customization
```

## The 7-Column Workflow

```
NEW → APPROVED → REFINEMENT → TECH-DESIGN → IMPLEMENTATION → FINAL-REVIEW → DONE
 👤      👤          🤖            🤖             🤖              👤          ✅
```

| Column | Actor | Agent | Purpose |
|--------|-------|-------|---------|
| New | Human | - | Create cards, add context |
| Approved | Human | - | Human approves card for work |
| Refinement | Agent | code-explorer | Document requirements, ask clarifying questions |
| Tech Design | Agent | code-architect | Design approaches, get approval |
| Implementation | Agent | code-reviewer | Write tests, implement, verify, code review |
| Final Review | Human | - | Final approval, changes requested, or reject |
| Done | - | - | Complete |

## Progressive Disclosure

When you run `/af add`:
1. Load `af.md` (~50 lines) - Backend detection + routing
2. Load `core.md` (~170 lines) - Shared concepts
3. Load `github/add.md` (~80 lines) - GitHub-specific implementation

**Total: ~300 lines** vs loading everything upfront.

## Adding a New Backend

To add support for a new backend (e.g., Azure DevOps):

1. Create `.agentflow/azure-devops/` directory
2. Add command files: `add.md`, `list.md`, `show.md`, `move.md`, etc.
3. Add setup prompt: `.agentflow/prompts/af-setup-azure-devops.md`
4. Update `af.md` dispatcher to detect the new config file
5. Create thin wrapper: `.claude/commands/af-setup-azure-devops.md`

Each command file should:
- Reference `core.md` for shared concepts
- Focus on backend-specific implementation
- Include verification/confirmation steps

## Tool Adapters

The same prompts work with different AI coding tools:

| Tool | Adapter Location |
|------|------------------|
| Claude Code | `.claude/commands/`, `.claude/agents/` |
| Cursor | `.cursor/rules/` |
| Others | TBD |

Each adapter is a thin wrapper (~10 lines) that says:
```
Read and follow the instructions in `.agentflow/prompts/X.md`
```

This allows AgentFlow to work with any tool that supports custom prompts.
