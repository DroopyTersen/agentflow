# Spec: af.md Rearchitecture

## Goal

Restore backend-agnostic dispatcher pattern with progressive disclosure. Minimize tokens loaded per command while maintaining full functionality. **Centralize content in `.agentflow/` for tool-agnostic portability.**

## Design Principles

1. **Tool agnostic** - Content lives in `.agentflow/`, thin adapters per tool
2. **Backend agnostic** - Works with GitHub, JSON, or future backends (Azure DevOps, Linear)
3. **Progressive disclosure** - Only load files needed for current command
4. **Core always + command** - Load `core.md` for shared context, then command-specific file
5. **Reference, don't duplicate** - Backend files reference core.md, not copy it
6. **Suggest alternatives** - When command unavailable for backend, suggest workaround

---

## Why Centralize in .agentflow/?

Different AI coding tools have different skill/command locations:

| Tool | Location |
|------|----------|
| Claude Code | `.claude/commands/`, `.claude/skills/` |
| Cursor | `.cursor/rules/` |
| OpenAI Codex | TBD |
| OpenCode | TBD |

**Problem:** If content lives in `.claude/skills/agentflow/`, we'd duplicate it for every tool.

**Solution:**
- **Thin adapter per tool** (~50-100 lines) - Lives in tool-specific location
- **All content in `.agentflow/skills/`** - Shared across all tools

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Tool-Specific Adapters (THIN, ~10-50 lines)        │
│                                                                 │
│  .claude/                  .cursor/                 (others)    │
│  ├── commands/af.md        └── rules/af.mdc         ...         │
│  ├── commands/af-*.md                                           │
│  └── agents/code-*.md                                           │
│                                                                 │
│  Each adapter just says:                                        │
│  "Read and follow .agentflow/prompts/X.md"                      │
│  "Read and follow .agentflow/{backend}/X.md"                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        .agentflow/                              │
│                    (shared, tool-agnostic)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  README.md - System overview, backend detection, setup   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  core.md - Shared concepts (columns, tags, priorities)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                │                                │
│         ┌──────────────────────┼──────────────────────┐         │
│         ▼                      ▼                      ▼         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐  │
│  │  github/    │      │  json/      │      │  prompts/       │  │
│  │  (backend)  │      │  (backend)  │      │  (composable)   │  │
│  ├─────────────┤      ├─────────────┤      ├─────────────────┤  │
│  │ README.md   │      │ README.md   │      │ code-explorer   │  │
│  │ add.md      │      │ add.md      │      │ code-architect  │  │
│  │ list.md     │      │ list.md     │      │ code-reviewer   │  │
│  │ show.md     │      │ show.md     │      │ af-setup-github │  │
│  │ move.md     │      │ move.md     │      │ af-setup-json   │  │
│  │ workflow.md │      │ workflow.md │      │ af-final-review │  │
│  │ ...         │      │ ...         │      │ ...             │  │
│  └─────────────┘      └─────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Complete Folder Structure

```
.agentflow/
│
│  ─────────── DOCUMENTATION ───────────
├── README.md                       # System overview, backend detection
│
│  ─────────── STATE ───────────
├── github.json                     # GitHub backend config (if using GitHub)
├── board.json                      # JSON backend state (if using JSON)
├── cards/                          # JSON backend card files
│
│  ─────────── WORKFLOW ───────────
├── columns/
│   ├── 01_new.md
│   ├── 02_approved.md
│   ├── 03_refinement.md
│   ├── 04_tech-design.md
│   ├── 05_implementation.md
│   ├── 06_final-review.md
│   └── 07_done.md
│
│  ─────────── LOOP ───────────
├── loop.sh
├── RALPH_LOOP_PROMPT.md
├── PROJECT_LOOP_PROMPT.md
├── progress.txt
│
│  ─────────── SHARED CONCEPTS ───────────
├── core.md                         # Columns, tags, priorities, card model
│
│  ─────────── BACKEND: GITHUB ───────────
├── github/
│   ├── README.md                   # GitHub-specific patterns, auth
│   ├── add.md
│   ├── list.md
│   ├── show.md
│   ├── move.md
│   ├── tag.md
│   ├── context.md
│   ├── workflow.md
│   └── pr-feedback.md
│
│  ─────────── BACKEND: JSON ───────────
├── json/
│   ├── README.md
│   ├── add.md
│   ├── list.md
│   ├── show.md
│   ├── move.md
│   ├── tag.md
│   ├── context.md
│   └── workflow.md
│
│  ─────────── PROMPTS (composable) ───────────
└── prompts/
    ├── code-explorer.md            # Codebase exploration
    ├── code-architect.md           # Architecture design
    ├── code-reviewer.md            # Code review
    ├── af-setup-github.md          # GitHub backend setup
    ├── af-setup-json.md            # JSON backend setup
    └── af-final-review.md          # Final review workflow
```

```
.claude/                            # THIN WRAPPERS ONLY (~10 lines each)
├── commands/
│   ├── af.md                       # Dispatcher → .agentflow/{backend}/
│   ├── af-setup-github.md          # → .agentflow/prompts/af-setup-github.md
│   ├── af-setup-json.md            # → .agentflow/prompts/af-setup-json.md
│   └── af-final-review.md          # → .agentflow/prompts/af-final-review.md
├── agents/
│   ├── code-explorer.md            # → .agentflow/prompts/code-explorer.md
│   ├── code-architect.md           # → .agentflow/prompts/code-architect.md
│   └── code-reviewer.md            # → .agentflow/prompts/code-reviewer.md
└── settings.json
```

## Thin Wrapper Examples

### Agent Wrapper (~10 lines)

`.claude/agents/code-reviewer.md`:
```markdown
---
name: code-reviewer
model: opus
description: Code review agent. Reviews implementations for bugs, security, and quality.
---

Read and follow the instructions in `.agentflow/prompts/code-reviewer.md`
```

### Command Wrapper (~10 lines)

`.claude/commands/af-setup-github.md`:
```markdown
---
description: Set up GitHub Projects backend for AgentFlow
allowed-tools: Read, Bash, Write
---

Read and follow the instructions in `.agentflow/prompts/af-setup-github.md`
```

### Dispatcher Wrapper (~50 lines)

`.claude/commands/af.md`:
```markdown
---
description: AgentFlow board management
allowed-tools: Read, Bash, Write, Agent
---

# /af - AgentFlow Commands

## Backend Detection

1. If `.agentflow/github.json` exists → GitHub backend
2. If `.agentflow/board.json` exists → JSON backend
3. Neither → Error: "Run `/af-setup-github` or `/af-setup-json`"

## Execution

1. Read `.agentflow/core.md`
2. Read `.agentflow/{backend}/{command}.md`
3. Execute the process described

## Command Routing

| Command | File |
|---------|------|
| add | {backend}/add.md |
| list | {backend}/list.md |
| show | {backend}/show.md |
| move | {backend}/move.md |
| tag | {backend}/tag.md |
| context | {backend}/context.md |
| work, next, loop, feedback, depends, review | {backend}/workflow.md |
| pr-feedback | github/pr-feedback.md (GitHub only) |
```

## Composability

The same prompt can be used by multiple tools:

| Prompt | Claude Code | Cursor | Codex |
|--------|-------------|--------|-------|
| `code-reviewer.md` | `.claude/agents/code-reviewer.md` | `.cursor/agents/code-reviewer.mdc` | TBD |
| `code-architect.md` | `.claude/agents/code-architect.md` | `.cursor/agents/code-architect.mdc` | TBD |
| `af-setup-github.md` | `.claude/commands/af-setup-github.md` | `.cursor/commands/af-setup-github.mdc` | TBD |

All reference the same `.agentflow/prompts/` files.

---

## Progressive Disclosure Flows

### Flow 1: `/af add "New feature"` (GitHub backend)

```
User runs: /af add "New feature"
                │
                ▼
┌───────────────────────────────────────┐
│ .claude/commands/af.md (~50 lines)    │
│ 1. Detect backend: github.json exists │
│ 2. Parse command: "add"               │
│ 3. Route to: .agentflow/github/add.md │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/core.md (~170 lines)       │
│ • Column definitions                  │
│ • Tag meanings                        │
│ • Card types (feature/bug/refactor)   │
│ • Priority order                      │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/github/add.md (~70 lines)  │
│ • gh issue create                     │
│ • gh project item-add                 │
│ • Set status field                    │
│ • Verification steps                  │
└───────────────────────────────────────┘

TOTAL LOADED: 50 + 170 + 70 = 290 lines
vs CURRENT: 654 lines (monolithic)
```

### Flow 2: Agent invocation (code-reviewer)

```
Agent("code-reviewer") invoked
                │
                ▼
┌───────────────────────────────────────┐
│ .claude/agents/code-reviewer.md       │
│ (~10 lines)                           │
│ "Read .agentflow/prompts/code-        │
│  reviewer.md"                         │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/prompts/code-reviewer.md   │
│ (~200 lines)                          │
│ • Review criteria                     │
│ • Scoring rubric                      │
│ • Output format                       │
│ • SOLID principles                    │
└───────────────────────────────────────┘

TOTAL LOADED: 10 + 200 = 210 lines
(only what's needed for code review)
```

### Flow 3: `/af work 123` (GitHub backend)

```
User runs: /af work 123
                │
                ▼
┌───────────────────────────────────────┐
│ .claude/commands/af.md (~50 lines)    │
│ 1. Detect backend: github.json exists │
│ 2. Parse command: "work"              │
│ 3. Route to: .agentflow/github/       │
│    workflow.md                        │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/core.md (~170 lines)       │
│ • Phase execution                     │
│ • Agent invocation                    │
│ • Column transitions                  │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/github/workflow.md         │
│ (~220 lines)                          │
│ • Phase-specific logic                │
│ • GitHub API calls                    │
│ • Comment/label management            │
└───────────────────────────────────────┘

TOTAL LOADED: 50 + 170 + 220 = 440 lines
```

### Flow 4: `/af-setup-github` (setup command)

```
User runs: /af-setup-github
                │
                ▼
┌───────────────────────────────────────┐
│ .claude/commands/af-setup-github.md   │
│ (~10 lines)                           │
│ "Read .agentflow/prompts/             │
│  af-setup-github.md"                  │
└───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ .agentflow/prompts/af-setup-github.md │
│ (~150 lines)                          │
│ • Prerequisites                       │
│ • gh auth setup                       │
│ • Project creation/linking            │
│ • github.json generation              │
└───────────────────────────────────────┘

TOTAL LOADED: 10 + 150 = 160 lines
(setup is self-contained, no core.md needed)
```

### Flow 5: `/af pr-feedback 456` (JSON backend - unavailable)

```
User runs: /af pr-feedback 456
                │
                ▼
┌───────────────────────────────────────┐
│ .claude/commands/af.md (~50 lines)    │
│ 1. Detect backend: board.json exists  │
│ 2. Parse command: "pr-feedback"       │
│ 3. Check: available for JSON? NO      │
│ 4. Return error with alternative      │
└───────────────────────────────────────┘
                │
                ▼
ERROR: "Command `/af pr-feedback` is not available
for JSON backend. PR feedback requires GitHub
integration. Alternative: manually review PR
comments and use `/af feedback <id>` to record
responses on the card."

TOTAL LOADED: 50 lines (no further loading needed)
```

---

## Token Comparison Summary

| Action | Current (monolithic) | New (progressive) | Savings |
|--------|---------------------|-------------------|---------|
| `/af add` | 654 | 290 | 56% |
| `/af list` | 654 | 280 | 57% |
| `/af work` | 654 | 440 | 33% |
| Agent (code-reviewer) | 654 | 210 | 68% |
| `/af-setup-github` | 654 | 160 | 76% |
| Error case | 654 | 50 | 92% |

Average savings: ~55% fewer tokens per action.

---

## File Changes Required

### Phase 1: Create new structure in .agentflow/

```bash
# Create new directories
mkdir -p .agentflow/prompts
mkdir -p .agentflow/github
mkdir -p .agentflow/json
```

### Phase 2: Move skills content to .agentflow/

| From | To |
|------|-----|
| `.claude/skills/agentflow/core.md` | `.agentflow/core.md` |
| `.claude/skills/agentflow/github/*` | `.agentflow/github/*` |
| `.claude/skills/agentflow/json/*` | `.agentflow/json/*` |

### Phase 3: Create prompts from agents/commands

| Source | New Prompt |
|--------|------------|
| `.claude/agents/code-explorer.md` | `.agentflow/prompts/code-explorer.md` |
| `.claude/agents/code-architect.md` | `.agentflow/prompts/code-architect.md` |
| `.claude/agents/code-reviewer.md` | `.agentflow/prompts/code-reviewer.md` |
| `.claude/commands/af-setup-github.md` | `.agentflow/prompts/af-setup-github.md` |
| `.claude/commands/af-final-review.md` | `.agentflow/prompts/af-final-review.md` |
| (new) | `.agentflow/prompts/af-setup-json.md` |

### Phase 4: Replace .claude/ files with thin wrappers

| File | Content |
|------|---------|
| `.claude/commands/af.md` | Dispatcher (~50 lines) |
| `.claude/commands/af-setup-github.md` | → `.agentflow/prompts/af-setup-github.md` |
| `.claude/commands/af-setup-json.md` | → `.agentflow/prompts/af-setup-json.md` |
| `.claude/commands/af-final-review.md` | → `.agentflow/prompts/af-final-review.md` |
| `.claude/agents/code-explorer.md` | → `.agentflow/prompts/code-explorer.md` |
| `.claude/agents/code-architect.md` | → `.agentflow/prompts/code-architect.md` |
| `.claude/agents/code-reviewer.md` | → `.agentflow/prompts/code-reviewer.md` |

### Phase 5: Apply mayi improvements to .agentflow/github/

- `--limit 100` on all `gh project item-list` queries
- Better jq filtering: `[.items[] | select(.content.number != null)] | sort_by(-.content.number)`
- Notes about status field being required immediately after adding
- Tips for filtering Done items

### Phase 6: Clean up old structure

```bash
# Remove old skills directory (content moved to .agentflow/)
rm -rf .claude/skills/agentflow/
```

---

## Future Backend Template

When adding new backend (e.g., Azure DevOps):

```
.agentflow/azure-devops/
├── README.md          # Backend-specific patterns, auth, API basics
├── add.md             # Work item creation
├── list.md            # Query work items
├── show.md            # Display work item details
├── move.md            # Change state/column
├── tag.md             # Manage tags
├── context.md         # Update description/comments
└── workflow.md        # Phase execution logic
```

Each file should:
1. Reference `.agentflow/core.md` for shared concepts
2. Focus on backend-specific implementation
3. Include verification/confirmation steps
4. Handle errors gracefully

Also add setup prompt:
```
.agentflow/prompts/af-setup-azure-devops.md
```

And thin wrapper:
```
.claude/commands/af-setup-azure-devops.md
```

---

---

## Documentation Updates Required

### 1. Root README.md

**Current (outdated):**
```
8-column Kanban board: Backlog → Recon → Questions → Architecture →
                       Arch Review → Implementation → Code Review → Done
```

**Should be:**
```
7-column Kanban board: New → Approved → Refinement → Tech Design →
                       Implementation → Final Review → Done
```

Also update:
- Phase diagram to match actual columns
- Phase table with correct names
- Architecture diagram showing new structure
- Getting started section

### 2. .agentflow/README.md (NEW)

Create comprehensive documentation:
- System overview and backend detection
- Progressive disclosure architecture
- How to add a new backend
- File structure explanation

### 3. .agentflow/github/README.md

Add the mayi improvements:
- Note about `--limit 100` for queries
- jq filtering patterns for null content
- Warning about status field required after adding items

### 4. .agentflow/json/README.md

Verify it matches current JSON backend implementation.

---

## Acceptance Criteria

- [ ] `.claude/commands/af.md` is under 60 lines (thin dispatcher)
- [ ] `.claude/agents/*.md` are under 15 lines each (thin wrappers)
- [ ] `.claude/commands/af-*.md` are under 15 lines each (thin wrappers)
- [ ] All content moved to `.agentflow/` (skills, prompts)
- [ ] `.agentflow/prompts/` contains all composable prompts
- [ ] `.agentflow/github/` contains all GitHub backend commands
- [ ] `.agentflow/json/` contains all JSON backend commands
- [ ] GitHub-specific improvements from mayi are preserved
- [ ] Unavailable commands return helpful error with alternative
- [ ] All existing functionality preserved
- [ ] Root README.md reflects actual 7-column workflow
- [ ] `.agentflow/README.md` documents the architecture
- [ ] Old `.claude/skills/agentflow/` directory removed
