# AgentFlow

**A file-based Kanban workflow for AI-assisted software development.**

AgentFlow combines the best ideas from three pioneering tools into a lightweight, file-based system that works with Claude Code. It brings structure and human oversight to AI coding without requiring a separate application.

---

## The Problem

AI coding assistants are powerful but chaotic. Without structure:

- Tasks blur together in long conversations
- Context gets lost or bloated
- There's no clear handoff between AI work and human review
- It's hard to parallelize or track progress

Existing solutions either require heavy infrastructure (databases, web apps) or lack the sophistication needed for real software development (single-prompt loops).

---

## The Solution

AgentFlow is a **file-based Kanban system** that:

- Lives entirely in your project directory (`.agentflow/` and `.claude/`)
- Coordinates specialized AI agents through structured phases
- Enforces human checkpoints at critical decision points
- Runs via a simple bash script—no server, no database

**Core principle:** Files are the database. Markdown is the interface. The filesystem is the source of truth.

---

## Inspirations

AgentFlow synthesizes patterns from three tools:

### 1. [Feature Dev Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev)

_Anthropic's official Claude Code plugin for structured feature development_

**What we borrowed:**

- 7-phase workflow with human checkpoints
- Specialized sub-agents (code-explorer, code-architect, code-reviewer)
- Three-approach architecture design (Minimal, Clean, Pragmatic)
- Confidence scoring for code reviews (0-100)
- "CRITICAL: DO NOT SKIP" emphasis for clarifying questions
- TodoWrite pattern for drift prevention

### 2. [Vibe Kanban](https://github.com/BloopAI/vibe-kanban)

_BloopAI's visual Kanban board for AI coding agents_

**What we borrowed:**

- Kanban board mental model (columns, cards, movement)
- Card-based task tracking with context accumulation
- Priority-based card selection algorithm
- Human-required vs agent-workable column types
- Card history tracking

**What we deferred:**

- Git worktrees for parallel execution (future enhancement)
- Web UI (future enhancement)
- Multi-agent parallelism (future enhancement)

### 3. [Ralph Wiggum Pattern](https://ghuntley.com/ralph/)

_Geoffrey Huntley's autonomous loop pattern for Claude Code_

**What we borrowed:**

- External bash loop that restarts Claude between tasks
- "State via filesystem, not session memory" philosophy
- One task per iteration for fresh context
- Completion promises for loop termination
- Max iteration safety limits

**The key insight:** The prompt stays constant; the codebase changes. Claude picks up where it left off by reading modified files.

---

## MVP Scope

### What's Included

| Component                 | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **8-column Kanban board** | Backlog → Recon → Questions → Architecture → Arch Review → Implementation → Code Review → Done |
| **3 specialized agents**  | `code-explorer`, `code-architect`, `code-reviewer`                                             |
| **External loop script**  | `loop.sh` runs Claude iteratively until blocked                                                |
| **File-based state**      | `board.json` for cards, `cards/*.md` for context                                               |
| **Human checkpoints**     | Questions, Architecture Review, Code Review require human action                               |
| **Project customization** | `CLAUDE.md` for project-specific instructions                                                  |
| **CLI commands**          | `/af add`, `/af list`, `/af status`, `/af work`, etc.                                          |

### What's NOT Included (Future Work)

| Feature               | Why Deferred                                    |
| --------------------- | ----------------------------------------------- |
| Web UI                | MVP is file-based; UI is a separate project     |
| Git worktrees         | Adds complexity; manual branching works for now |
| Parallel agents       | Requires orchestration layer                    |
| Database storage      | Files are sufficient for MVP                    |
| CI/CD integration     | Manual verification is fine initially           |
| Multi-project support | One project at a time for now                   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User's Terminal                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  $ ./loop.sh                    $ claude                            │
│  ┌─────────────────────┐        ┌─────────────────────┐             │
│  │   External Loop     │        │   Interactive Use   │             │
│  │   (autonomous)      │        │   (manual commands) │             │
│  └──────────┬──────────┘        └──────────┬──────────┘             │
│             │                              │                        │
│             ▼                              ▼                        │
│  ┌──────────────────────────────────────────────────────┐           │
│  │                   Claude Code                         │           │
│  │  ┌────────────────────────────────────────────────┐  │           │
│  │  │              AgentFlow Skill                   │  │           │
│  │  │         (.claude/skills/agentflow/)            │  │           │
│  │  └────────────────────────────────────────────────┘  │           │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │           │
│  │  │ code-    │ │ code-    │ │ code-    │             │           │
│  │  │ explorer │ │ architect│ │ reviewer │             │           │
│  │  └──────────┘ └──────────┘ └──────────┘             │           │
│  └──────────────────────────────────────────────────────┘           │
│             │                                                       │
│             ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              .agentflow/ (File System)               │           │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │           │
│  │  │ board.json │  │ CLAUDE.md  │  │ cards/*.md     │  │           │
│  │  │ (state)    │  │ (config)   │  │ (context)      │  │           │
│  │  └────────────┘  └────────────┘  └────────────────┘  │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The 7-Phase Workflow

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ BACKLOG │──▶│  RECON  │──▶│QUESTIONS│──▶│  ARCH   │
│  Human  │   │  🤖 AI  │   │  Human  │   │  🤖 AI  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
                                               │
┌─────────┐   ┌─────────┐   ┌─────────┐        │
│  DONE   │◀──│CODE REV │◀──│  IMPL   │◀──┬────┘
│    ✅   │   │  Human  │   │  🤖 AI  │   │
└─────────┘   └─────────┘   └─────────┘   │
                                          │
                            ┌─────────┐   │
                            │ARCH REV │◀──┘
                            │  Human  │
                            └─────────┘
```

| Phase                    | Type  | Agent            | Purpose                                             |
| ------------------------ | ----- | ---------------- | --------------------------------------------------- |
| **Backlog**              | Human | —                | Add and prioritize cards                            |
| **Reconnaissance**       | Agent | `code-explorer`  | Analyze codebase, find patterns, generate questions |
| **Clarifying Questions** | Human | —                | Answer questions to remove ambiguity                |
| **Architecture**         | Agent | `code-architect` | Design 3 approaches, recommend one                  |
| **Architecture Review**  | Human | —                | Approve approach or request changes                 |
| **Implementation**       | Agent | Claude           | Write code following approved design                |
| **Code Review**          | Human | `code-reviewer`  | Pre-review by AI, final approval by human           |
| **Done**                 | —     | —                | Ship it!                                            |

---

## Key Design Decisions

### Why File-Based?

- **No infrastructure** — Works in any project, just copy files
- **Git-friendly** — Board state and card context are versioned
- **Inspectable** — Everything is readable markdown/JSON
- **Portable** — Move projects between machines trivially
- **Debuggable** — Edit files directly when needed

### Why External Loop?

- **Fresh context** — Each iteration starts clean, no context bloat
- **Easy control** — Ctrl+C stops cleanly between iterations
- **Clear boundaries** — One card, one phase, one Claude session
- **Resilient** — Errors in one iteration don't break others

### Why Human Checkpoints?

- **Clarifying Questions** — AI can't read minds; humans clarify intent
- **Architecture Review** — Humans approve the approach before coding
- **Code Review** — AI pre-reviews, humans make final call

These aren't bureaucracy—they're where human judgment adds the most value.

### Why Three Agents?

| Agent            | Specialty          | Why Separate?                                        |
| ---------------- | ------------------ | ---------------------------------------------------- |
| `code-explorer`  | Codebase analysis  | Deep exploration benefits from focused prompting     |
| `code-architect` | Design decisions   | Architecture requires different thinking than coding |
| `code-reviewer`  | Quality assessment | Review mindset differs from creation mindset         |

Separation also allows standalone use: `Agent("code-explorer")` works outside the workflow.

---

## Comparison to Inspirations

| Feature            | Feature Dev | Vibe Kanban | Ralph Wiggum | **AgentFlow** |
| ------------------ | ----------- | ----------- | ------------ | ------------- |
| Workflow phases    | ✅ 7 phases | ❌          | ❌           | ✅ 7 phases   |
| Specialized agents | ✅ 3 agents | ❌          | ❌           | ✅ 3 agents   |
| Kanban board       | ❌          | ✅ Visual   | ❌           | ✅ File-based |
| External loop      | ❌ Hooks    | ❌ Built-in | ✅ Bash      | ✅ Bash       |
| Git worktrees      | ❌          | ✅          | ❌           | ❌ (future)   |
| Web UI             | ❌          | ✅          | ❌           | ❌ (future)   |
| Human checkpoints  | ✅          | ✅          | ❌           | ✅            |
| File-based state   | ❌          | ❌          | ✅           | ✅            |
| 3-approach arch    | ✅          | ❌          | ❌           | ✅            |
| Confidence scores  | ✅          | ❌          | ❌           | ✅            |

---

## Getting Started

```bash
# 1. Copy AgentFlow files to your project
cp -r agentflow-mvp/.* agentflow-mvp/* your-project/

# 2. Make the loop executable
chmod +x your-project/loop.sh

# 3. Customize for your project
vim your-project/.agentflow/CLAUDE.md

# 4. Add cards
cd your-project && claude
> /af add "Implement user authentication"
> /af add "Add search feature"
> exit

# 5. Run the loop
./loop.sh
```

---

## Links

- **Feature Dev Plugin:** https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev
- **Vibe Kanban:** https://github.com/BloopAI/vibe-kanban
- **Ralph Wiggum (original):** https://ghuntley.com/ralph/
- **Ralph Wiggum (community fork):** https://github.com/frankbria/ralph-claude-code
- **Anthropic Ralph Plugin:** https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum

---

## License

MIT — Use it, modify it, share it.

---

## Philosophy

> "Ralph is deterministically bad in an undeterministic world. It's better to fail predictably than succeed unpredictably."
> — Geoffrey Huntley

AgentFlow embraces this. Simple file-based state. External loops for control. Human checkpoints for judgment. Specialized agents for depth.

The goal isn't to remove humans from coding—it's to put AI work on rails so humans can focus on what they're best at: making decisions, answering questions, and reviewing results.
