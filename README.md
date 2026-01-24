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
| **7-column Kanban board** | New → Approved → Refinement → Tech Design → Implementation → Final Review → Done               |
| **3 specialized agents**  | `code-explorer`, `code-architect`, `code-reviewer`                                             |
| **External loop script**  | `loop.sh` runs Claude iteratively until blocked                                                |
| **File-based state**      | GitHub Projects or local `board.json` for cards                                                |
| **Human checkpoints**     | Approved, Tech Design, Final Review require human action                                       |
| **Project customization** | `PROJECT_LOOP_PROMPT.md` for project-specific instructions                                     |
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
│  │  │    .claude/commands/af.md (thin dispatcher)    │  │           │
│  │  │         routes to .agentflow/                  │  │           │
│  │  └────────────────────────────────────────────────┘  │           │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │           │
│  │  │ code-    │ │ code-    │ │ code-    │             │           │
│  │  │ explorer │ │ architect│ │ reviewer │             │           │
│  │  └──────────┘ └──────────┘ └──────────┘             │           │
│  └──────────────────────────────────────────────────────┘           │
│             │                                                       │
│             ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │              .agentflow/ (shared content)            │           │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │           │
│  │  │ core.md    │  │ github/    │  │ prompts/       │  │           │
│  │  │ (concepts) │  │ json/      │  │ (agents)       │  │           │
│  │  └────────────┘  └────────────┘  └────────────────┘  │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The 7-Phase Workflow

```mermaid
flowchart TB
    %% ============================================================
    %% PHASE 1: NEW (Human creates and queues work)
    %% ============================================================
    subgraph NEW ["🧑 NEW — Human Creates Work Item"]
        direction TB
        new_create_card["Create card via /af add 'title'"]
        new_write_description["Write description with context for agent"]
        new_select_type["Select type: feature | bug | refactor"]
        new_set_priority["Set priority: critical | high | medium | low"]
        new_human_review["Human reviews card is ready"]
        new_move_to_approved["Move card to Approved column"]

        new_create_card --> new_write_description --> new_select_type --> new_set_priority --> new_human_review --> new_move_to_approved
    end

    %% ============================================================
    %% PHASE 2: APPROVED (Agent picks up, creates branch)
    %% ============================================================
    subgraph APPROVED ["🤖 APPROVED — Agent Picks Up Card"]
        direction TB
        approved_ralph_picks_up["Ralph Loop picks up highest-priority card"]
        approved_check_dependencies["Check if card has predecessor dependencies"]
        approved_decide_branch_base{Predecessors complete?}
        approved_branch_from_main["Create branch from main"]
        approved_branch_from_predecessor["Create branch from predecessor branch"]
        approved_record_branch["Record branch name in card context"]
        approved_checkout_branch["Checkout feature branch"]

        approved_ralph_picks_up --> approved_check_dependencies --> approved_decide_branch_base
        approved_decide_branch_base -->|"All in Done"| approved_branch_from_main
        approved_decide_branch_base -->|"Some incomplete"| approved_branch_from_predecessor
        approved_branch_from_main --> approved_record_branch
        approved_branch_from_predecessor --> approved_record_branch
        approved_record_branch --> approved_checkout_branch
    end

    %% ============================================================
    %% PHASE 3: REFINEMENT (code-explorer analyzes requirements)
    %% ============================================================
    subgraph REFINEMENT ["🤖 REFINEMENT — Understand What to Build"]
        direction TB
        refine_read_card["Read card title, description, type, priority"]
        refine_read_project_context["Read PROJECT_LOOP_PROMPT.md for project conventions"]

        subgraph REFINE_EXPLORER ["🟣 Spawn code-explorer Sub-Agent"]
            direction TB
            explorer_find_relevant_code["Find relevant existing code and patterns"]
            explorer_trace_execution["Trace execution paths for similar functionality"]
            explorer_identify_integration["Identify integration points and dependencies"]
            explorer_document_findings["Document codebase context for this work item"]

            explorer_find_relevant_code --> explorer_trace_execution --> explorer_identify_integration --> explorer_document_findings
        end

        subgraph REFINE_JUDGMENT ["🧠 Agent Uses Good Judgment"]
            direction TB
            refine_default_behavior["DEFAULT: Ask clarifying questions"]
            refine_skip_criteria["SKIP human input ONLY if ALL true:"]
            refine_criteria_1["✓ Description is highly specific (not vague)"]
            refine_criteria_2["✓ Only ONE reasonable interpretation"]
            refine_criteria_3["✓ HIGH confidence in understanding intent"]
            refine_criteria_4["✓ Small, scoped bug fix with obvious behavior"]
            refine_when_in_doubt["When in doubt → ASK"]

            refine_default_behavior --> refine_skip_criteria
            refine_skip_criteria --> refine_criteria_1 --> refine_criteria_2 --> refine_criteria_3 --> refine_criteria_4
            refine_criteria_4 --> refine_when_in_doubt
        end

        refine_evaluate_clarity{"All skip criteria met?<br/>(Default: NO → ask questions)"}
        refine_post_questions["Post clarifying questions to card discussion"]
        refine_add_needs_feedback["Add 'needs-feedback' tag — WAIT FOR HUMAN"]
        refine_human_answers["⏸️ Human answers questions in discussion"]
        refine_human_removes_tag["Human removes 'needs-feedback' tag"]
        refine_document_requirements["Document functional requirements"]
        refine_document_acceptance["Document acceptance criteria (measurable)"]
        refine_document_edge_cases["Document edge cases and error scenarios"]
        refine_document_verification["Document verification approach"]
        refine_move_to_techdesign["Move card to Tech Design column"]

        refine_read_card --> refine_read_project_context --> REFINE_EXPLORER
        REFINE_EXPLORER --> REFINE_JUDGMENT --> refine_evaluate_clarity
        refine_evaluate_clarity -->|"NO (default): Unclear/ambiguous"| refine_post_questions --> refine_add_needs_feedback
        refine_add_needs_feedback -.->|"Loop pauses"| refine_human_answers
        refine_human_answers --> refine_human_removes_tag
        refine_human_removes_tag -.->|"Next iteration"| refine_read_card
        refine_evaluate_clarity -->|"YES (rare): All criteria met"| refine_document_requirements
        refine_document_requirements --> refine_document_acceptance --> refine_document_edge_cases --> refine_document_verification --> refine_move_to_techdesign
    end

    %% ============================================================
    %% PHASE 4: TECH DESIGN (Dual design: Claude + Codex architects)
    %% ============================================================
    subgraph TECHDESIGN ["🤖 TECH DESIGN — Design How to Build It"]
        direction TB
        design_read_refinement["Read Refinement output: requirements, acceptance criteria, edge cases"]

        subgraph DESIGN_PARALLEL_AGENTS ["⚡ Spawn 4 Architecture Agents IN PARALLEL"]
            direction TB

            subgraph CLAUDE_ARCHITECTS ["🟣 3x Claude code-architect Agents"]
                direction LR
                architect_minimal["Agent 1: MINIMAL approach<br/>Smallest change, fast, may cut corners"]
                architect_clean["Agent 2: CLEAN ARCHITECTURE<br/>Ideal solution, elegant, may be over-engineered"]
                architect_pragmatic["Agent 3: PRAGMATIC approach<br/>Balanced: quality + reasonable scope"]
            end

            subgraph CODEX_ARCHITECT ["🟢 1x Codex Architect Agent"]
                direction LR
                architect_codex["Agent 4: INDEPENDENT DESIGN<br/>Novel perspective, may catch blind spots"]
            end
        end

        design_collect_outputs["Collect all 4 architecture proposals"]
        design_synthesize["Synthesize approaches: compare trade-offs, note unique insights"]

        subgraph DESIGN_JUDGMENT ["🧠 Agent Uses Good Judgment"]
            direction TB
            design_default_behavior["DEFAULT: Present approaches, get human approval"]
            design_skip_criteria["SKIP presenting ONLY if ALL true:"]
            design_criteria_1["✓ Trivial bug fix (single-line or <10 lines)"]
            design_criteria_2["✓ Genuinely only ONE way to fix it"]
            design_criteria_3["✓ Zero design decisions involved"]
            design_criteria_4["✓ Low risk, easily reversible"]
            design_when_in_doubt["When in doubt → PRESENT OPTIONS"]

            design_default_behavior --> design_skip_criteria
            design_skip_criteria --> design_criteria_1 --> design_criteria_2 --> design_criteria_3 --> design_criteria_4
            design_criteria_4 --> design_when_in_doubt
        end

        design_evaluate_trivial{"All skip criteria met?<br/>(Default: NO → present approaches)"}
        design_present_approaches["Present 4 approaches with recommendation to human"]
        design_add_needs_feedback["Add 'needs-feedback' tag — WAIT FOR HUMAN"]
        design_human_selects["⏸️ Human reviews approaches in discussion"]
        design_human_decides["Human selects approach (or blend) and removes tag"]
        design_finalize["Finalize selected approach in card body"]
        design_document_files["Document files to create/modify"]
        design_document_sequence["Document implementation sequence"]
        design_document_verification["Document verification steps (specific commands)"]
        design_create_spec_commit["Create spec commit: spec(type): title"]
        design_push_branch["Push branch to remote"]
        design_move_to_implementation["Move card to Implementation column"]

        design_read_refinement --> DESIGN_PARALLEL_AGENTS
        DESIGN_PARALLEL_AGENTS --> design_collect_outputs --> design_synthesize --> DESIGN_JUDGMENT --> design_evaluate_trivial
        design_evaluate_trivial -->|"NO (default): Needs human input"| design_present_approaches --> design_add_needs_feedback
        design_add_needs_feedback -.->|"Loop pauses"| design_human_selects
        design_human_selects --> design_human_decides
        design_human_decides -.->|"Next iteration"| design_finalize
        design_evaluate_trivial -->|"YES (rare): Trivial obvious fix"| design_finalize
        design_finalize --> design_document_files --> design_document_sequence --> design_document_verification
        design_document_verification --> design_create_spec_commit --> design_push_branch --> design_move_to_implementation
    end

    %% ============================================================
    %% PHASE 5: IMPLEMENTATION (TDD, build, dual code review)
    %% ============================================================
    subgraph IMPLEMENTATION ["🤖 IMPLEMENTATION — Build and Verify"]
        direction TB
        impl_read_design["Read Tech Design: files, sequence, verification steps"]
        impl_write_tests["Write tests FIRST (TDD): happy path, edge cases, bug reproduction"]
        impl_implement_solution["Implement solution following tech design sequence"]
        impl_cursory_verify["Cursory verification: typecheck, build, basic tests"]

        subgraph IMPL_PARALLEL_REVIEW ["⚡ Spawn 2 Code Review Agents IN PARALLEL"]
            direction TB

            subgraph CLAUDE_REVIEWER ["🟣 Claude code-reviewer Agent"]
                direction TB
                reviewer_claude_bugs["Find bugs and logic errors"]
                reviewer_claude_security["Check for security vulnerabilities"]
                reviewer_claude_quality["Assess code quality and patterns"]
                reviewer_claude_score["Score 0-100 with detailed feedback"]

                reviewer_claude_bugs --> reviewer_claude_security --> reviewer_claude_quality --> reviewer_claude_score
            end

            subgraph CODEX_REVIEWER ["🟢 Codex Code Review Agent"]
                direction TB
                reviewer_codex_bugs["Find bugs and logic errors"]
                reviewer_codex_security["Check for security vulnerabilities"]
                reviewer_codex_suggestions["Provide concrete before/after fixes"]

                reviewer_codex_bugs --> reviewer_codex_security --> reviewer_codex_suggestions
            end
        end

        impl_post_reviews["Post both reviews to GitHub issue discussion"]
        impl_synthesize_suggestions["Synthesize suggestions: categorize as 'Will Implement' vs 'Skipping'"]
        impl_evaluate_suggestions{Valid suggestions found?}
        impl_implement_fixes["Implement valid fixes (bugs, security issues)"]
        impl_document_skipped["Document skipped suggestions with rationale"]
        impl_full_verification["Full verification: all tests, typecheck, build, integration"]
        impl_create_impl_commit["Create implementation commit: feat|fix|refactor(scope): title"]
        impl_create_review_commit["Create review fixes commit: fix(scope): address code review"]
        impl_push_commits["Push all commits to remote"]
        impl_move_to_final["Move card to Final Review column"]

        impl_read_design --> impl_write_tests --> impl_implement_solution --> impl_cursory_verify
        impl_cursory_verify --> IMPL_PARALLEL_REVIEW
        IMPL_PARALLEL_REVIEW --> impl_post_reviews --> impl_synthesize_suggestions --> impl_evaluate_suggestions
        impl_evaluate_suggestions -->|"Yes"| impl_implement_fixes --> impl_document_skipped
        impl_evaluate_suggestions -->|"No valid issues"| impl_document_skipped
        impl_document_skipped --> impl_full_verification --> impl_create_impl_commit --> impl_create_review_commit --> impl_push_commits --> impl_move_to_final
    end

    %% ============================================================
    %% PHASE 6: FINAL REVIEW (Human approval gate)
    %% ============================================================
    subgraph FINALREVIEW ["🧑 FINAL REVIEW — Human Approval Gate"]
        direction TB
        final_review_card["Review complete card: requirements → design → implementation"]
        final_review_code["Review code changes and commits"]
        final_review_scores["Review dual code review findings and scores"]
        final_optional_verify["Optional: run additional manual verification"]
        final_decision{Human Decision}
        final_approve["✅ APPROVE: Mark acceptance criteria complete"]
        final_changes["🔄 CHANGES REQUESTED: Document specific fixes needed"]
        final_reject["❌ REJECT: Document why approach is fundamentally wrong"]
        final_move_done["Move card to Done"]
        final_move_impl["Move card back to Implementation"]
        final_move_design["Move card back to Tech Design"]
        final_move_refine["Move card back to Refinement"]

        final_review_card --> final_review_code --> final_review_scores --> final_optional_verify --> final_decision
        final_decision -->|"Work is complete"| final_approve --> final_move_done
        final_decision -->|"Minor fixes needed"| final_changes --> final_move_impl
        final_decision -->|"Wrong approach"| final_reject --> final_move_design
        final_decision -->|"Requirements wrong"| final_reject --> final_move_refine
    end

    %% ============================================================
    %% PHASE 7: DONE (Terminal state, card becomes documentation)
    %% ============================================================
    subgraph DONE ["✅ DONE — Complete"]
        direction TB
        done_work_complete["Work is complete and approved"]
        done_card_documentation["Card serves as permanent documentation"]
        done_commits_linked["Spec + Implementation commits linked"]
        done_notify_dependents["Notify any dependent cards they are unblocked"]
        done_archive_optional["Optional: archive card after retention period"]

        done_work_complete --> done_card_documentation --> done_commits_linked --> done_notify_dependents --> done_archive_optional
    end

    %% ============================================================
    %% MAIN FLOW: Phase transitions
    %% ============================================================
    new_move_to_approved --> APPROVED
    approved_checkout_branch --> REFINEMENT
    refine_move_to_techdesign --> TECHDESIGN
    design_move_to_implementation --> IMPLEMENTATION
    impl_move_to_final --> FINALREVIEW
    final_move_done --> DONE

    %% ============================================================
    %% FEEDBACK LOOPS: Cards moving backward
    %% ============================================================
    final_move_impl -.->|"Agent picks up, reads feedback, fixes"| impl_read_design
    final_move_design -.->|"Agent re-designs with new constraints"| design_read_refinement
    final_move_refine -.->|"Agent re-explores requirements"| refine_read_card

    %% ============================================================
    %% STYLING: Human phases green, Agent phases blue, Done gold
    %% ============================================================
    style NEW fill:#d4edda,stroke:#28a745,stroke-width:2px
    style APPROVED fill:#cce5ff,stroke:#004085,stroke-width:2px
    style REFINEMENT fill:#cce5ff,stroke:#004085,stroke-width:2px
    style TECHDESIGN fill:#cce5ff,stroke:#004085,stroke-width:2px
    style IMPLEMENTATION fill:#cce5ff,stroke:#004085,stroke-width:2px
    style FINALREVIEW fill:#d4edda,stroke:#28a745,stroke-width:2px
    style DONE fill:#fff3cd,stroke:#856404,stroke-width:2px

    style REFINE_EXPLORER fill:#e8d4f8,stroke:#6f42c1,stroke-width:1px
    style REFINE_JUDGMENT fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    style DESIGN_PARALLEL_AGENTS fill:#f0e6ff,stroke:#6f42c1,stroke-width:1px
    style DESIGN_JUDGMENT fill:#fff8e1,stroke:#f9a825,stroke-width:2px
    style CLAUDE_ARCHITECTS fill:#e8d4f8,stroke:#6f42c1,stroke-width:1px
    style CODEX_ARCHITECT fill:#d4f8e8,stroke:#28a745,stroke-width:1px
    style IMPL_PARALLEL_REVIEW fill:#f0e6ff,stroke:#6f42c1,stroke-width:1px
    style CLAUDE_REVIEWER fill:#e8d4f8,stroke:#6f42c1,stroke-width:1px
    style CODEX_REVIEWER fill:#d4f8e8,stroke:#28a745,stroke-width:1px
```

### Phase Summary

| Phase | Actor | Sub-Agents Spawned | Key Activities |
|-------|-------|-------------------|----------------|
| **New** | 🧑 Human | — | Create card via `/af add`, write description, set type & priority, review and approve |
| **Approved** | 🤖 Agent | — | Check predecessor dependencies, create feature branch (from main or predecessor), record branch in card |
| **Refinement** | 🤖 Agent | 🟣 1x `code-explorer` | Explore codebase, find relevant files & patterns, document functional requirements, acceptance criteria, edge cases. May pause for human clarification. |
| **Tech Design** | 🤖 Agent | 🟣 3x `code-architect` + 🟢 1x Codex | **Parallel spawn**: Minimal, Clean Architecture, Pragmatic (Claude) + Independent Design (Codex). Synthesize 4 approaches, present trade-offs, get human approval, create spec commit. |
| **Implementation** | 🤖 Agent | 🟣 1x `code-reviewer` + 🟢 1x Codex | Write tests (TDD), implement solution, cursory verification. **Parallel spawn**: dual code review. Synthesize suggestions, implement valid fixes, full verification, commit. |
| **Final Review** | 🧑 Human | — | Review complete journey (requirements → design → implementation → code review). Approve, request changes, or reject. |
| **Done** | — | — | Terminal state. Card becomes permanent documentation. Notify dependent cards they are unblocked. |

### Sub-Agent Spawning Pattern

| Phase | Pattern | Agents | Purpose |
|-------|---------|--------|---------|
| **Refinement** | Sequential | 🟣 `code-explorer` | Deep codebase analysis before requirements |
| **Tech Design** | ⚡ **Parallel** | 🟣 `code-architect` ×3 + 🟢 Codex ×1 | 4 independent architecture proposals for comparison |
| **Implementation** | ⚡ **Parallel** | 🟣 `code-reviewer` + 🟢 Codex | Dual code review catches more issues than single reviewer |

### Feedback Loops (Cards Moving Backward)

| Trigger | From → To | What Happens |
|---------|-----------|--------------|
| `needs-feedback` tag | Refinement ↩️ Refinement | Human answers clarifying questions in discussion, removes tag. Next iteration continues. |
| `needs-feedback` tag | Tech Design ↩️ Tech Design | Human selects approach (or blend) in discussion, removes tag. Next iteration finalizes. |
| **Changes Requested** | Final Review → Implementation | Human documents specific fixes. Agent reads feedback, implements fixes, re-runs verification. |
| **Rejected: Wrong Approach** | Final Review → Tech Design | Human explains why approach failed. Agent re-designs with new constraints. |
| **Rejected: Wrong Requirements** | Final Review → Refinement | Human explains misunderstanding. Agent re-explores and re-documents requirements. |

### Human Checkpoints (Where Work Pauses)

| Checkpoint | Phase | Why It Pauses | Human Action Required |
|------------|-------|---------------|----------------------|
| Card Approval | New → Approved | Human must explicitly approve work to start | Move card to Approved column |
| Clarifying Questions | Refinement | Requirements unclear, agent needs answers | Answer questions in discussion, remove `needs-feedback` |
| Approach Selection | Tech Design | Multiple valid approaches, agent needs direction | Select approach in discussion, remove `needs-feedback` |
| Final Approval | Final Review | Work complete, needs human sign-off | Approve → Done, Changes → Implementation, Reject → earlier phase |

### Agent Judgment: When to Skip Human Input

The agent uses good judgment to decide whether to pause for human input. **The default is always to ask.**

#### Refinement: Skip clarifying questions ONLY if ALL true:
| Criterion | What It Means |
|-----------|---------------|
| Description is highly specific | Not vague or open-ended |
| Only ONE reasonable interpretation | No ambiguity in what's being asked |
| HIGH confidence in understanding | Agent is certain about user intent |
| Small, scoped bug fix | Obvious expected behavior |

**When in doubt → ASK.** Better to pause for clarification than build the wrong thing.

#### Tech Design: Skip presenting approaches ONLY if ALL true:
| Criterion | What It Means |
|-----------|---------------|
| Trivial bug fix | Single-line or <10 lines changed |
| Only ONE way to fix it | No alternative approaches exist |
| Zero design decisions | No architectural choices involved |
| Low risk, easily reversible | Can be undone if wrong |

**When in doubt → PRESENT OPTIONS.** A 5-minute pause beats hours of rework.

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
