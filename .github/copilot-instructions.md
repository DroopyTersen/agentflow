# AgentFlow Development Guide

## Project Identity

**AgentFlow** is a file-based Kanban workflow system for AI-assisted software development. This repository is the **source of truth** — everything in [project-files/](project-files/) gets copied into target projects. Changes here affect all projects that adopt AgentFlow.

## Architecture Overview

### Layered Structure (Tool-Agnostic Design)

```
.claude/                    # Thin wrappers (~10 lines) for Claude Code
  └── commands/af.md        # Dispatcher: detects backend, routes to .agentflow/
  └── agents/*.md           # References .agentflow/prompts/*.md

.agentflow/                 # Centralized, tool-agnostic content
  ├── core.md               # Shared concepts (columns, tags, priorities)
  ├── github/*.md           # GitHub Projects backend implementation
  ├── json/*.md             # Local JSON backend implementation
  ├── prompts/*.md          # Composable agent prompts (code-explorer, code-architect, etc.)
  ├── columns/*.md          # Phase-specific instructions (01_new.md ... 07_done.md)
  ├── loop.sh               # External bash loop (Ralph Wiggum pattern)
  └── RALPH_LOOP_PROMPT.md  # Instructions for each loop iteration
```

**Key principle:** Content lives in `.agentflow/` for portability across AI tools (Claude Code, Cursor, etc.). Tool-specific adapters stay minimal.

### The 7-Column Workflow

```
NEW → APPROVED → REFINEMENT → TECH-DESIGN → IMPLEMENTATION → FINAL-REVIEW → DONE
 👤      👤          🤖            🤖             🤖              👤          ✅
```

Human checkpoints at: **Approved**, **Tech Design** (selection), **Final Review**

### Three Specialized Agents

- **code-explorer**: Codebase reconnaissance in Refinement phase
- **code-architect**: Designs 3 approaches (Minimal/Idealistic/Pragmatic) in Tech Design
- **code-reviewer**: Reviews implementations, scores 0-100 before Final Review

## Development Workflows

### Runtime & Testing

```bash
# This project uses Bun (NOT Node.js)
bun <file>              # Execute TypeScript directly
bun test                # Run tests (no jest/vitest)
bun install             # Install dependencies
bun build <file>        # Build assets
```

**Convention:** Bun auto-loads `.env` — never use `dotenv` package.

### Editing AgentFlow

| What to Change | File Location |
|----------------|---------------|
| Backend commands | `project-files/.agentflow/{github,json}/*.md` |
| Agent prompts | `project-files/.agentflow/prompts/*.md` |
| Phase instructions | `project-files/.agentflow/columns/*.md` |
| Dispatcher logic | `project-files/.claude/commands/af.md` |
| Loop behavior | `project-files/.agentflow/RALPH_LOOP_PROMPT.md` |

**Critical:** All edits in [project-files/](project-files/) propagate to every project using AgentFlow. Test thoroughly.

## Key Patterns

### Backend Agnosticism

Commands must support both backends (GitHub Projects, local JSON):

1. `.claude/commands/af.md` detects backend via file presence:
   - `.agentflow/github.json` → GitHub backend
   - `.agentflow/board.json` → JSON backend
2. Routes to `.agentflow/{backend}/{command}.md`
3. Both backends reference `.agentflow/core.md` for shared concepts

### Progressive Disclosure

Only load files needed per command. Pattern:
```
core.md (shared context) + {backend}/{command}.md (specific implementation)
```

Avoid loading entire system into context.

### The Ralph Loop

External bash script ([loop.sh](project-files/.agentflow/loop.sh)) restarts Claude repeatedly:
- Each iteration: ONE card, ONE column, ONE phase
- Reads board state from files, not session memory
- Outputs `AGENTFLOW_ITERATION_COMPLETE` to signal completion
- Stops when `AGENTFLOW_NO_WORKABLE_CARDS` (all cards need human input)

**Philosophy:** "State via filesystem, not session memory" — files are the database.

### Git Workflow (In Progress)

See [specs/WORKTREE_PR_SPEC.md](specs/WORKTREE_PR_SPEC.md) for planned git worktree integration:
- Each card gets isolated worktree on branch `af/{id}-{title-slug}`
- Work happens in `../project-worktrees/{card-id}/`
- PRs created via `gh` CLI when implementation complete

## Project Conventions

### File Structure Standards

- **Markdown for all content:** Instructions, prompts, commands all use `.md`
- **JSON for state:** `board.json`, `github.json`, `cards/*.json` (worktree metadata)
- **Bash for automation:** `loop.sh` is the only script

### Naming Conventions

- **Columns:** Lowercase with hyphens (`tech-design`, `final-review`)
- **Card IDs:** Uppercase with hyphens (`AF-001`)
- **Branches:** `af/{id-lower}-{title-slug}` (e.g., `af/001-add-user-auth`)
- **Commits:** `{type}({scope}): {description}` (Conventional Commits)

### Writing Agent Prompts

Located in [.agentflow/prompts/](project-files/.agentflow/prompts/):
- **Be directive:** "CRITICAL: DO NOT SKIP" for non-negotiables
- **Provide context:** Reference specific files/phases
- **Show examples:** Include sample formats for consistency
- **Plan completion:** Agents must output specific signals (`AGENTFLOW_ITERATION_COMPLETE`)

## Testing Philosophy

- **TDD preferred:** Write tests before implementation (stated in workflow)
- **Code review required:** Score ≥70 to proceed from Implementation
- **Use `bun:test`:** Native Bun testing, not external frameworks

Example test:
```ts
import { test, expect } from "bun:test";

test("card moves through workflow", () => {
  // Test card state transitions
});
```

## External Dependencies

- **Claude Code CLI:** Required for loop execution
- **GitHub CLI (`gh`):** Required for GitHub Projects backend
- **Git:** Required for worktree-based workflow (future)
- **Bun:** Runtime and toolchain

## Common Pitfalls

1. **Don't duplicate content** between `.claude/` and `.agentflow/` — use references
2. **Don't skip columns** — even trivial bugs go through all 7 phases
3. **Don't use Node.js commands** — always use Bun equivalents
4. **Don't edit outside `project-files/`** unless working on AgentFlow meta-concerns

## Documentation Sources

- [CLAUDE.md](CLAUDE.md) — Comprehensive system guide
- [README.md](README.md) — Project overview and philosophy
- [specs/](specs/) — Design specs for planned features
- [docs/](docs/) — Additional documentation (compatibility, setup)

## When Blocked

Read the column-specific instructions in [.agentflow/columns/](project-files/.agentflow/columns/) — they detail exactly what should happen in each phase.
