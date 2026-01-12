# Branch-Per-Work-Item Feature Plan

**Date:** 2026-01-12
**Status:** Ready for implementation

---

## Overview

Implement branch-per-work-item workflow where each card/issue gets its own git branch. Branches are created when work begins, commits push to remote automatically, and branches persist after completion.

---

## Requirements

### Confirmed Decisions

| Decision | Choice |
|----------|--------|
| Base branch | `main` |
| Rework flow | Keep same branch through cycles |
| Slug format | Kebab-case from full title |
| Branch cleanup | Keep branches (no auto-delete) |
| Worktrees | Not used (simple branch switching) |
| PR creation | Not now (future: at final-review) |

### Branch Naming Convention

```
{type}/{id}-{slug}
```

**Examples:**
- `feature/123-add-user-authentication`
- `bug/456-fix-pagination-offset`
- `refactor/789-extract-validation-utils`

**Slug generation:**
1. Take full card title
2. Convert to lowercase
3. Replace spaces and special chars with hyphens
4. Remove consecutive hyphens
5. Trim to reasonable length (~50 chars max)

---

## Files to Modify

| File | Changes |
|------|---------|
| `project-files/.agentflow/RALPH_LOOP_PROMPT.md` | Add branch strategy summary section |
| `project-files/.agentflow/columns/01b_approved.md` | Add branch creation step |
| `project-files/.agentflow/columns/03_tech-design.md` | Add push after spec commit |
| `project-files/.agentflow/columns/04_implementation.md` | Add push after implementation commit |
| `project-files/.agentflow/columns/05_final-review.md` | Document branch, note future PR |
| `project-files/.agentflow/columns/06_done.md` | Include branch in final summary |

---

## Detailed Changes

### 0. `RALPH_LOOP_PROMPT.md` — Branch Strategy Summary

**Location:** After "About progress.txt" section (end of file), add new section

**Add new section:**

```markdown
---

## Branch Strategy

Each card gets its own git branch. This isolates work and enables clean commits.

### Branch Naming
```
{type}/{id}-{slug}
```
- `feature/123-add-user-authentication`
- `bug/456-fix-pagination-offset`
- `refactor/789-extract-validation-utils`

### Workflow

| Phase | Git Action |
|-------|------------|
| `approved` | Create branch from `main`, checkout |
| `tech-design` | Spec commit + push |
| `implementation` | Implementation commit + push |
| `done` | Branch persists for reference |

### Key Rules

- **One branch per card** — Created when card enters `approved`
- **Always push** — Every commit pushes to remote
- **Check branch first** — Before working, ensure correct branch is checked out
- **Reuse on rework** — If card returns from rejection, checkout existing branch (don't create new)

### Branch Detection

The card context contains the branch name:
```markdown
## Branch
`feature/123-add-user-authentication`
```

If this section exists, the branch was already created. Just checkout:
```bash
git checkout feature/123-add-user-authentication
```

If it doesn't exist, create the branch (see `01b_approved.md`).
```

---

### 1. `01b_approved.md` — Branch Creation

**Location:** After "Agent Pickup" section

**Add new section:**

```markdown
### Branch Creation

When picking up a card from `approved`, create a dedicated branch:

**Step 1: Generate branch name**
```bash
# Format: {type}/{id}-{slug}
# Example: feature/123-add-user-authentication

TYPE={card.type}  # feature, bug, or refactor
ID={card.id}      # Issue number or card ID
SLUG=$(echo "{card.title}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50)

BRANCH="${TYPE}/${ID}-${SLUG}"
```

**Step 2: Create and checkout branch**
```bash
# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b "$BRANCH"
```

**Step 3: Record branch in card context**

Add to card context:
```markdown
## Branch
`{branch-name}`
```

**Note:** If branch already exists (card returning from rejection), just checkout:
```bash
git checkout "$BRANCH"
```
```

**Update "What Happens" section** to include branch creation in the flow.

---

### 2. `03_tech-design.md` — Push After Spec Commit

**Location:** Step 6 (Create Spec Commit), after the commit command

**Current (line ~178-182):**
```markdown
### Step 6: Create Spec Commit

```bash
git commit -m "spec({type}): {title}"
```
```

**Change to:**
```markdown
### Step 6: Create Spec Commit and Push

```bash
git add .
git commit -m "spec({type}): {title}"
git push -u origin HEAD
```

The `-u` flag sets upstream tracking for the branch.
```

**Update Card Context template** to include branch info in Spec Commit section:
```markdown
### Spec Commit
**SHA:** `{sha}`
**Branch:** `{branch-name}`
**Date:** {YYYY-MM-DD}
```

---

### 3. `04_implementation.md` — Push After Implementation Commit

**Location:** Step 8 (Create Implementation Commit)

**Current (line ~124-129):**
```markdown
### Step 8: Create Implementation Commit

```bash
git add .
git commit -m "{type}({scope}): {title}"
```
```

**Change to:**
```markdown
### Step 8: Create Implementation Commit and Push

```bash
git add .
git commit -m "{type}({scope}): {title}"
git push origin HEAD
```

This pushes to the feature branch established in the Approved phase.
```

**Update Card Context template** to include branch:
```markdown
### Implementation Commit
**SHA:** `{sha}`
**Branch:** `{branch-name}`
**Date:** {YYYY-MM-DD}
```

---

### 4. `05_final-review.md` — Document Branch Info

**Location:** Review Checklist section

**Add to checklist:**
```markdown
- [ ] Branch pushed with all commits
```

**Update "If Approved" card context template:**
```markdown
### Git Info
**Branch:** `{branch-name}`
**Spec Commit:** `{sha}`
**Implementation Commit:** `{sha}`
```

**Add new section for future PR creation:**
```markdown
---

## Future: Pull Request Creation

When PR workflow is enabled, Final Review will:
1. Create PR from feature branch to main
2. Add PR link to card context
3. Human reviews PR alongside card

For now, branches remain without PRs. Code is reviewed via the card's Code Review section.
```

---

### 5. `06_done.md` — Branch in Final Summary

**Location:** Card Final State template

**Update the Summary table:**
```markdown
### Summary
| Field | Value |
|-------|-------|
| Type | {feature / bug / refactor} |
| Branch | `{branch-name}` |
| Spec Commit | `{sha}` |
| Implementation Commit | `{sha}` |
| Code Review Score | {XX}/100 |
| Duration | {days from created to done} |
```

**Add to "Card remains as permanent documentation of" list:**
```markdown
- Branch name for future reference
```

---

## Edge Cases

### Card Returning from Rejection

When a card is rejected from Final Review and returns to Tech Design or Refinement:

1. Branch already exists
2. Agent should checkout existing branch (not create new)
3. Continue working on same branch

**Detection:** Check if `## Branch` section exists in card context.

### Card Returning from "Changes Requested"

When a card returns to Implementation from Final Review:

1. Branch already exists and is checked out
2. Agent makes changes on same branch
3. New commits push to same branch

### Multiple Cards in Progress

If multiple cards are being worked on (not in Ralph Loop):

1. Each card has its own branch
2. Agent must checkout correct branch before working
3. Branch name is stored in card context

**Recommendation:** In Ralph Loop, only one card is active at a time, so this is handled naturally.

---

## Implementation Sequence

1. Update `RALPH_LOOP_PROMPT.md` with branch strategy summary
2. Update `01b_approved.md` with branch creation
3. Update `03_tech-design.md` with push after commit
4. Update `04_implementation.md` with push after commit
5. Update `05_final-review.md` with branch documentation
6. Update `06_done.md` with branch in summary
7. Sync to mayi project

---

## Verification

After implementation:

1. Create a test card via `/af add "Test branch workflow"`
2. Move to approved
3. Verify branch created: `git branch -a | grep test-branch`
4. Complete tech design, verify push: `git log origin/{branch}`
5. Complete implementation, verify push
6. Move to done, verify branch info in card

---

## Future Enhancements

- **PR Creation:** Add `/af pr <id>` command or auto-create at final-review
- **Branch Cleanup:** Optional cleanup of merged branches
- **Worktrees:** Support parallel card work with git worktrees
- **Rebase/Merge:** Options for keeping branches up to date with main
