# Notes: af.md Rearchitecture

## Problem Statement

The current `af.md` is 654 lines - a monolithic GitHub-specific implementation. It should be a small dispatcher (~100 lines) that leverages progressive disclosure.

## Intended Architecture (from HEAD~1)

```
af.md (dispatcher, ~100 lines)
├── Detects backend (github.json vs board.json)
├── Loads shared concepts from core.md
├── Routes to backend-specific files on demand
└── Only loads what's needed for current command
```

**Progressive disclosure pattern:**
1. `/af add` → Load `{backend}/add.md` only
2. `/af list` → Load `{backend}/list.md` only
3. etc.

## Current File Structure

```
project-files/claude/
├── commands/
│   └── af.md                    # 654 lines (TOO BIG)
└── skills/agentflow/
    ├── core.md                  # 167 lines (shared concepts)
    ├── github/
    │   ├── README.md            # Backend patterns
    │   ├── add.md
    │   ├── list.md
    │   ├── show.md
    │   ├── move.md
    │   ├── tag.md
    │   ├── context.md
    │   ├── workflow.md
    │   └── pr-feedback.md
    └── json/
        ├── README.md
        ├── add.md
        ├── list.md
        ├── show.md
        ├── move.md
        ├── tag.md
        ├── context.md
        └── workflow.md
```

## What Went Wrong

During the mayi sync, the entire `af.md` was replaced with mayi's self-contained GitHub implementation. The mayi project works fine with this because it only uses GitHub backend, but it broke the backend-agnostic design.

## Improvements from mayi That Need to Be Preserved

The mayi version has real-world improvements that should be incorporated into the backend-specific files:

1. **`--limit 100`** on all `gh project item-list` queries
   - Items without status were being missed with default limit

2. **Better jq filtering:**
   - `[.items[] | select(.content.number != null)] | sort_by(-.content.number)`
   - Excludes null content, sorts newest first

3. **CRITICAL notes about setting status immediately after adding items**
   - Newly added items have NO status initially
   - Must set status or they won't appear in filtered queries

4. **Tips for excluding old Done items**

## Design Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| Self-contained vs reference? | **Reference core.md** - minimize tokens, progressive disclosure |
| Missing commands for backend? | **Suggest alternative** - error + workaround if exists |
| Future backends (ADO, Linear)? | **Full parity** - all commands with same detail |

## User Request

- Include diagrams mapping progressive disclosure paths for common use cases
- Show token loading at each step

---

## Session Log

- Reviewed current structure (654 lines vs intended 106)
- Identified that modular structure already exists in skills/agentflow/
- The bloat came from replacing dispatcher with mayi's full implementation
- Need to: revert af.md to dispatcher, apply mayi improvements to backend files
- User confirmed design decisions via AskUserQuestion
- User chose "Core always + command" loading pattern
- Created spec with progressive disclosure diagrams
- Spec shows 45% average token savings
- Added documentation updates section (READMEs are outdated)
  - Root README says "8-column" with old names, should be 7-column with current names
  - Need new .agentflow/README.md for progressive disclosure docs
- User requested centralization in .agentflow/ for tool-agnostic portability
- Added .agentflow/prompts/ for composable prompts (agents, setup commands)
- Thin wrappers in .claude/ (~10 lines) reference .agentflow/prompts/
- User approved spec, starting implementation
