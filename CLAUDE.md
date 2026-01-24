# AgentFlow

A file-based Kanban workflow system for AI-assisted software development. Supports Claude Code and Codex CLI.

## Quick Start for Agents

| Task | Read First |
|------|------------|
| Understanding AgentFlow | This file, then `README.md` |
| Setting up in a new project | `docs/setup-new-project.md` |
| Modifying a phase | `project-files/.agentflow/columns/` |
| Changing agent behavior | `project-files/.agentflow/prompts/` |
| Backend-specific changes | `project-files/.agentflow/github/` or `json/` |
| Codex CLI compatibility | `docs/codex-compatibility.md` |

## This Repository

**This is the source of truth for AgentFlow.** Everything in `project-files/` gets copied into target project directories where AgentFlow is used.

When working here, you are developing/maintaining AgentFlow itself - not using it for a feature. Changes to files in `project-files/` affect all future projects that adopt AgentFlow.

## What AgentFlow Is

AgentFlow provides structured, multi-phase development workflows with human checkpoints. It combines:

- **Kanban board** (file-based): Cards move through columns representing phases
- **Specialized agents**: code-explorer, code-architect, code-reviewer
- **External loop** (Ralph Wiggum pattern): Fresh context per iteration
- **Human gates**: Critical decisions require human approval
- **Multi-agent support**: Works with Claude Code (`/af`) and Codex CLI (`/prompts:af`)

The entire system lives in files that get copied into target projects.

## Project Structure

```
agentflow/
├── README.md                    # Project overview and philosophy
├── CLAUDE.md                    # This file
├── docs/                        # Setup and reference documentation
│   ├── setup-new-project.md     # How to add AgentFlow to a project
│   ├── codex-compatibility.md   # Codex CLI setup and differences
│   └── github-backlog.md        # GitHub Projects backend details
├── prompts/                     # User-level prompts (not copied to projects)
│   └── solution-review.md       # Code review from first principles
└── project-files/               # COPY THESE INTO TARGET PROJECTS
    ├── .agentflow/              # Centralized workflow content (tool-agnostic)
    │   ├── core.md              # Shared concepts (columns, tags, priorities)
    │   ├── github/              # GitHub Projects backend commands
    │   │   ├── add.md, list.md, show.md, move.md, etc.
    │   │   └── README.md
    │   ├── json/                # Local JSON backend commands
    │   │   ├── add.md, list.md, show.md, move.md, etc.
    │   │   └── README.md
    │   ├── prompts/             # Composable agent prompts
    │   │   ├── code-explorer.md
    │   │   ├── code-architect.md
    │   │   ├── code-reviewer.md
    │   │   ├── af-setup-github.md
    │   │   ├── af-setup-json.md
    │   │   └── af-final-review.md
    │   ├── columns/             # Phase-specific instructions
    │   │   ├── 01_new.md
    │   │   ├── 01b_approved.md
    │   │   ├── 02_refinement.md
    │   │   ├── 03_tech-design.md
    │   │   ├── 04_implementation.md
    │   │   ├── 05_final-review.md
    │   │   └── 06_done.md
    │   ├── loop.sh              # External bash loop script (Claude)
    │   ├── loop-codex.sh        # External bash loop script (Codex)
    │   ├── ralph.md             # Ralph agent instructions
    │   ├── RALPH_LOOP_PROMPT.md # Instructions for each loop iteration
    │   └── PROJECT_LOOP_PROMPT.md # Project-specific customization
    └── .claude/                 # Claude Code thin wrappers
        ├── settings.json        # Tool permissions
        ├── agents/              # ~9-line wrappers referencing .agentflow/prompts/
        │   ├── code-explorer.md
        │   ├── code-architect.md
        │   └── code-reviewer.md
        ├── commands/
        │   ├── af.md            # /af dispatcher command
        │   ├── af-setup-github.md
        │   ├── af-setup-json.md
        │   └── af-final-review.md
        └── skills/
            └── agentflow/       # AgentFlow skill (auto-loaded when relevant)
                └── SKILL.md
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
| Tech Design | Agent | code-architect | Design 3 approaches (Minimal/Idealistic/Pragmatic), get approval |
| Implementation | Agent | code-reviewer | Write tests, implement, verify, code review |
| Final Review | Human | - | Final approval, changes requested, or reject |
| Done | - | - | Terminal state, card becomes documentation |

## Key Files

### board.json (JSON backend) / github.json (GitHub backend)
Kanban state. Cards array with id, title, type, column, priority, tags.

### cards/*.md (JSON backend only)
Accumulated context per card. Grows as card moves through phases. Contains:
- Original description
- Refinement findings and requirements
- Tech design decisions
- Implementation summary
- Code review scores
- Conversation log (human ↔ agent dialogue)
- History table

### columns/*.md
Detailed instructions for each phase. Read the appropriate column file before executing.

### progress.txt
Session memory across loop iterations. Append-only log of completed work, decisions, files changed. Helps future iterations skip exploration.

## Working in This Repository

All edits here are to AgentFlow itself. Key areas:

| What to Change | Where |
|----------------|-------|
| Dispatcher logic | `project-files/.claude/commands/af.md` |
| Backend commands | `project-files/.agentflow/github/*.md` or `json/*.md` |
| Shared concepts | `project-files/.agentflow/core.md` |
| Agent prompts | `project-files/.agentflow/prompts/*.md` |
| Phase instructions | `project-files/.agentflow/columns/*.md` |
| Loop behavior | `project-files/.agentflow/RALPH_LOOP_PROMPT.md` |
| Setup documentation | `docs/setup-new-project.md` |

## Deploying to a Project

See `docs/setup-new-project.md` for detailed setup instructions. Quick overview:

1. Choose your coding agent (Claude Code or Codex CLI)
2. Choose your backend (Local JSON or GitHub Projects)
3. Copy appropriate files from `project-files/`
4. Run setup command (`/af-setup-json` or `/af-setup-github`)
5. Customize `.agentflow/PROJECT_LOOP_PROMPT.md` for that project
6. Use `/af add "title"` to create cards
7. Run `.agentflow/loop.sh` for autonomous processing

## The Specialized Agents

### code-explorer
Codebase reconnaissance. Finds relevant files, traces patterns, identifies integration points. Used in Refinement phase.

### code-architect
Designs implementation approaches. Generates 3 options (Minimal/Idealistic/Pragmatic) with trade-off analysis. Used in Tech Design phase.

### code-reviewer
Reviews implementations against designs. Scores 0-100 across functionality, architecture compliance, code quality, security. Used before Final Review.

## Human Checkpoints

Cards pause when agents add `needs-feedback` tag:

| Phase | Why Paused | Human Action |
|-------|------------|--------------|
| Refinement | Unclear requirements | Answer questions in Conversation Log |
| Tech Design | Multiple approaches | Select approach or provide guidance |
| Final Review | Review complete | Approve, request changes, or reject |

Remove the `needs-feedback` tag to allow agent to continue.

## The Ralph Loop

External bash script that runs the agent repeatedly:

```bash
# Claude Code
.agentflow/loop.sh        # Default: 20 iterations
.agentflow/loop.sh 50     # Custom max

# Codex CLI
.agentflow/loop-codex.sh
.agentflow/loop-codex.sh 50
```

Each iteration:
1. Reads board state, selects highest-priority workable card
2. Reads column instructions, executes one phase
3. Updates card, moves it, exits
4. Loop continues or stops if no workable cards

**Completion signal**: Agent outputs `AGENTFLOW_NO_WORKABLE_CARDS` when all cards need human input.

## Commands Reference

```
# Claude Code uses /af, Codex CLI uses /prompts:af

/af add <title>      # Create new card
/af list             # List all cards by column
/af status           # Quick board overview
/af show <id>        # Show card details
/af move <id> <col>  # Move card manually
/af work <id>        # Work on specific card
/af next             # Work on next available card
/af feedback <id>    # Respond to needs-feedback card
/af review <id>      # Run code review on card
/af pr-feedback <pr> # Address PR review comments (GitHub only)
/af loop             # Instructions for running loop
```

## Default Behaviors

### In Refinement
- Default: Ask clarifying questions
- Skip questions only if: specific description, single interpretation, high confidence

### In Tech Design
- Default: Present 3 approaches, ask for selection
- Skip only for: trivial single-line bug fixes with obvious single solution

### In Implementation
- TDD preferred: write tests before implementation
- Code review required: score >= 70 to proceed
- Commits: `spec({type}): {title}` then `{type}({scope}): {title}`

## Use Bun instead of Node.js

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Testing

Use `bun test` to run tests.

```ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
