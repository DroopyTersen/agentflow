# AgentFlow

A file-based Kanban workflow system for AI-assisted software development with Claude Code.

## This Repository

**This is the source of truth for AgentFlow.** Everything in `project-files/` gets copied into target project directories where AgentFlow is used.

When working here, you are developing/maintaining AgentFlow itself - not using it for a feature. Changes to files in `project-files/` affect all future projects that adopt AgentFlow.

## What AgentFlow Is

AgentFlow provides structured, multi-phase development workflows with human checkpoints. It combines:

- **Kanban board** (file-based): Cards move through columns representing phases
- **Specialized agents**: code-explorer, code-architect, code-reviewer
- **External loop** (Ralph Wiggum pattern): Fresh context per iteration
- **Human gates**: Critical decisions require human approval

The entire system lives in files that get copied into target projects.

## Project Structure

```
agentflow/
├── README.md                    # Project overview and philosophy
├── CLAUDE.md                    # This file
└── project-files/               # COPY THESE INTO TARGET PROJECTS
    ├── .agentflow/              # Workflow state and config
    │   ├── board.json           # Kanban board state (cards, columns)
    │   ├── cards/               # Card context files (*.md)
    │   ├── columns/             # Phase-specific instructions
    │   │   ├── 01_new.md
    │   │   ├── 02_refinement.md
    │   │   ├── 03_tech-design.md
    │   │   ├── 04_implementation.md
    │   │   ├── 05_human-review.md
    │   │   └── 06_done.md
    │   ├── loop.sh              # External bash loop script
    │   ├── RALPH_LOOP_PROMPT.md # Instructions for each loop iteration
    │   ├── PROJECT_LOOP_PROMPT.md # Project-specific customization
    │   ├── ralph.md             # Loop architecture documentation
    │   └── progress.txt         # Session memory (append-only log)
    └── claude/                  # Claude Code configuration
        ├── settings.json        # Tool permissions
        ├── agents/              # Specialized sub-agents
        │   ├── code-explorer.md
        │   ├── code-architect.md
        │   └── code-reviewer.md
        ├── commands/
        │   └── af.md            # /af command reference
        └── skills/
            └── agentflow/
                └── SKILL.md     # Natural language interface
```

## The 6-Column Workflow

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

### board.json
Kanban state. Cards array with id, title, type, column, priority, tags.

### cards/*.md
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
| Workflow logic | `project-files/claude/commands/af.md` |
| Loop behavior | `project-files/.agentflow/RALPH_LOOP_PROMPT.md` |
| Phase instructions | `project-files/.agentflow/columns/*.md` |
| Agent prompts | `project-files/claude/agents/*.md` |
| Board schema | `project-files/.agentflow/board.json` |
| Skill interface | `project-files/claude/skills/agentflow/SKILL.md` |

## Deploying to a Project

To use AgentFlow in another project:

1. Copy `project-files/` contents into the target project root
2. Customize `.agentflow/PROJECT_LOOP_PROMPT.md` for that project
3. Use `/af add "title"` to create cards
4. Run `.agentflow/loop.sh` for autonomous processing
5. Respond to `needs-feedback` tags when agents have questions

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

External bash script that runs Claude repeatedly:

```bash
.agentflow/loop.sh        # Default: 20 iterations
.agentflow/loop.sh 50     # Custom max
```

Each iteration:
1. Reads board.json, selects highest-priority workable card
2. Reads column instructions, executes one phase
3. Updates card, moves it, exits
4. Loop continues or stops if no workable cards

**Completion signal**: Agent outputs `AGENTFLOW_NO_WORKABLE_CARDS` when all cards need human input.

## Commands Reference

```
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
