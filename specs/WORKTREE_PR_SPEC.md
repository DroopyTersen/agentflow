# Git Worktree & PR Workflow Specification

> **Status:** Draft
> **Author:** Claude
> **Date:** 2026-01-11
> **Inspiration:** [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) worktree implementation

## Overview

This specification defines how AgentFlow will use git worktrees to isolate work on each card into separate branches and directories, enabling parallel development and clean PR-based code review workflows.

### Goals

1. **Isolation**: Each card works in its own git worktree on a dedicated branch
2. **Parallel Work**: Multiple cards can be worked on simultaneously without conflicts
3. **PR Integration**: Cards submit work via GitHub PRs using `gh` CLI
4. **Clean Lifecycle**: Automated cleanup of worktrees when cards complete
5. **File-Based**: All state remains in files (no database required)

### Non-Goals (MVP)

- Multi-repo support (single repo per project for now)
- Automated merge conflict resolution
- PR review comments integration
- Automated PR status polling (manual check for now)

---

## Architecture

### Directory Structure

```
my-project/                      # Main repository (always on base branch)
├── .git/                        # Git directory
├── .agentflow/                  # AgentFlow state
│   ├── board.json               # Card state including git info
│   ├── cards/                   # Card context files
│   ├── worktrees/               # Worktree metadata (not the actual worktrees)
│   │   └── AF-001.json          # Worktree state for card AF-001
│   └── ...
├── .claude/                     # Claude Code config
└── src/                         # Project source code

../my-project-worktrees/         # Worktrees directory (sibling to main repo)
├── AF-001/                      # Full repo checkout on branch af/001-...
│   ├── .git                     # File pointing to main repo's .git/worktrees/AF-001
│   ├── .agentflow/              # Shared with main repo
│   └── src/                     # Working copy of source
├── AF-002/
└── ...
```

### Why Sibling Directory for Worktrees?

- Keeps main repo clean
- Avoids `.gitignore` complexity
- Clear separation of concerns
- Easy cleanup (just delete directory)
- Follows Vibe Kanban's pattern (`vibe-kanban_temp_dir/worktrees/`)

---

## Data Model Changes

### board.json Card Schema

**Current:**
```json
{
  "id": "AF-001",
  "title": "Add user authentication",
  "type": "feature",
  "column": "implementation",
  "priority": 1,
  "tags": []
}
```

**Extended:**
```json
{
  "id": "AF-001",
  "title": "Add user authentication",
  "type": "feature",
  "column": "implementation",
  "priority": 1,
  "tags": [],
  "git": {
    "branch": "af/001-add-user-authentication",
    "baseBranch": "main",
    "worktreePath": "../my-project-worktrees/AF-001",
    "worktreeCreatedAt": "2026-01-11T10:30:00Z",
    "pr": {
      "number": 42,
      "url": "https://github.com/owner/repo/pull/42",
      "status": "open",
      "createdAt": "2026-01-11T14:00:00Z"
    }
  }
}
```

### New File: .agentflow/worktrees/{card-id}.json

Tracks detailed worktree state:

```json
{
  "cardId": "AF-001",
  "branch": "af/001-add-user-authentication",
  "baseBranch": "main",
  "baseCommit": "abc123def456",
  "worktreePath": "../my-project-worktrees/AF-001",
  "status": "active",
  "createdAt": "2026-01-11T10:30:00Z",
  "lastAccessedAt": "2026-01-11T12:45:00Z",
  "commits": [
    {
      "sha": "def789",
      "message": "feat(auth): add login endpoint",
      "timestamp": "2026-01-11T11:00:00Z"
    }
  ],
  "pr": {
    "number": 42,
    "url": "https://github.com/owner/repo/pull/42",
    "status": "open",
    "createdAt": "2026-01-11T14:00:00Z",
    "mergedAt": null,
    "mergeCommit": null
  }
}
```

**Status values:**
- `active` - Worktree exists and is in use
- `stale` - Worktree exists but card is blocked/paused
- `submitted` - PR created, awaiting review
- `merged` - PR merged, pending cleanup
- `cleaned` - Worktree removed, branch deleted

---

## Branch Naming Convention

```
af/{card-id-lower}-{title-slug}
```

**Examples:**
- `af/001-add-user-authentication`
- `af/002-fix-login-bug`
- `af/003-refactor-database-layer`

**Rules:**
- Prefix: `af/` (configurable via `PROJECT_LOOP_PROMPT.md`)
- Card ID: lowercase, zero-padded to 3 digits
- Title slug: lowercase, spaces to hyphens, max 50 chars, alphanumeric only
- Total branch name max: 100 characters

**Generation function:**
```typescript
function branchName(cardId: string, title: string): string {
  const id = cardId.toLowerCase();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `af/${id}-${slug}`;
}
```

---

## Commands

### `/af add <title>` (Enhanced)

Creates a new card with an associated worktree.

**Flow:**
1. Generate card ID (e.g., `AF-001`)
2. Generate branch name: `af/001-{title-slug}`
3. Detect current branch as base branch (or use configured default)
4. Create branch from base: `git branch af/001-... main`
5. Create worktree: `git worktree add ../my-project-worktrees/AF-001 af/001-...`
6. Update `board.json` with git info
7. Create `.agentflow/worktrees/AF-001.json`
8. Create `cards/AF-001.md` with initial context

**Options:**
```
/af add "Title" --no-worktree    # Create card without worktree (for planning)
/af add "Title" --base develop   # Use specific base branch
```

**Output:**
```
Created card AF-001: "Add user authentication"
  Branch: af/001-add-user-authentication
  Worktree: ../my-project-worktrees/AF-001
  Base: main

To work on this card:
  cd ../my-project-worktrees/AF-001
  # or
  /af work AF-001
```

---

### `/af work <card-id>` (Enhanced)

Switches to working on a specific card in its worktree.

**Flow:**
1. Validate card exists and has worktree
2. Ensure worktree exists (recreate if missing)
3. Change directory to worktree path
4. Update `lastAccessedAt` in worktree state
5. Display card context and status

**If worktree missing:**
```
Worktree for AF-001 not found. Recreating...
  Branch af/001-add-user-authentication exists at commit abc123
  Created worktree at ../my-project-worktrees/AF-001
```

**Output:**
```
Now working on AF-001: "Add user authentication"
  Directory: ../my-project-worktrees/AF-001
  Branch: af/001-add-user-authentication
  Base: main (3 commits behind)
  Status: implementation phase

Recent commits:
  def789 - feat(auth): add login endpoint (2 hours ago)

Card context loaded. Run `/af show AF-001` for full details.
```

---

### `/af submit <card-id>` (New)

Submits the card's work as a GitHub PR.

**Prerequisites:**
- Card must be in `implementation` or later column
- Working directory must be clean (all changes committed)
- `gh` CLI must be authenticated
- Branch must be pushed to origin

**Flow:**
1. Validate prerequisites
2. Commit any uncommitted changes (with confirmation)
3. Push branch to origin: `git push -u origin af/001-...`
4. Generate PR title and body from card context
5. Create PR: `gh pr create --base main --head af/001-... --title "..." --body "..."`
6. Update card with PR info
7. Move card to `human-review` column
8. Add `pr-open` tag

**PR Body Template:**
```markdown
## Summary

{Card title and description from AF-001.md}

## Changes

{Summary of commits on this branch}

## Card Reference

AgentFlow Card: `AF-001`
Phase: Implementation → Human Review

---
*Submitted via AgentFlow*
```

**Options:**
```
/af submit AF-001 --draft        # Create as draft PR
/af submit AF-001 --no-move      # Don't move card column
```

**Output:**
```
Submitting AF-001 for review...

  Pushed branch af/001-add-user-authentication to origin
  Created PR #42: https://github.com/owner/repo/pull/42

  Moved card to Human Review column
  Added tag: pr-open

Next steps:
  - Review PR at https://github.com/owner/repo/pull/42
  - After merge, run `/af sync` to update card status
  - Or manually: `/af done AF-001`
```

---

### `/af sync` (New)

Syncs PR status for all open PRs and updates cards accordingly.

**Flow:**
1. Find all cards with `pr.status === 'open'`
2. For each, check PR status via `gh pr view`
3. Update card PR status (open/merged/closed)
4. If merged:
   - Move card to `done` column
   - Schedule worktree cleanup
5. If closed (not merged):
   - Add `pr-closed` tag
   - Keep card in current column for rework

**Output:**
```
Syncing PR status for 3 cards...

  AF-001: PR #42 - merged ✓
    → Moved to Done, worktree cleanup scheduled

  AF-002: PR #45 - still open
    → No changes

  AF-003: PR #48 - closed (not merged)
    → Added tag: pr-closed

Run `/af cleanup` to remove merged worktrees.
```

---

### `/af cleanup` (New)

Cleans up worktrees for completed cards.

**Flow:**
1. Find cards in `done` column with status `merged`
2. For each:
   - Remove worktree: `git worktree remove ../my-project-worktrees/AF-001`
   - Delete remote branch: `git push origin --delete af/001-...`
   - Delete local branch: `git branch -D af/001-...`
   - Update worktree state to `cleaned`
3. Optionally prune stale worktree metadata: `git worktree prune`

**Options:**
```
/af cleanup --dry-run            # Show what would be cleaned
/af cleanup --keep-branches      # Don't delete branches
/af cleanup --all                # Include stale/abandoned worktrees
```

**Output:**
```
Cleaning up completed cards...

  AF-001:
    ✓ Removed worktree ../my-project-worktrees/AF-001
    ✓ Deleted remote branch origin/af/001-add-user-authentication
    ✓ Deleted local branch af/001-add-user-authentication

  AF-005:
    ✓ Removed worktree ../my-project-worktrees/AF-005
    ✓ Deleted remote branch origin/af/005-update-readme
    ✓ Deleted local branch af/005-update-readme

Cleaned 2 worktrees. Run `git worktree prune` if needed.
```

---

### `/af pr <card-id>` (New)

Shows PR status and actions for a card.

**Output:**
```
PR Status for AF-001

  PR #42: Add user authentication
  URL: https://github.com/owner/repo/pull/42
  Status: open

  Base: main ← Head: af/001-add-user-authentication
  +142 -23 across 5 files

  Checks:
    ✓ CI / build (passed)
    ✓ CI / test (passed)
    ○ Review required (0/1 approvals)

Actions:
  /af pr AF-001 --open           # Open PR in browser
  /af pr AF-001 --merge          # Merge PR (if approved)
  /af pr AF-001 --close          # Close PR without merging
```

---

## Loop Integration

### Modified loop.sh Behavior

The loop should be aware of worktrees and operate within the correct context.

**Before processing a card:**
```bash
# Determine if card has a worktree
WORKTREE_PATH=$(jq -r ".cards[] | select(.id == \"$CARD_ID\") | .git.worktreePath // empty" .agentflow/board.json)

if [ -n "$WORKTREE_PATH" ] && [ -d "$WORKTREE_PATH" ]; then
  cd "$WORKTREE_PATH"
  echo "Working in worktree: $WORKTREE_PATH"
fi
```

**RALPH_LOOP_PROMPT.md additions:**
```markdown
## Worktree Context

When working on a card with an associated worktree:
1. You are operating in an isolated git worktree
2. Changes only affect this card's branch
3. The main repo remains on the base branch
4. Commit frequently to preserve work

Before completing implementation:
1. Ensure all changes are committed
2. Run tests in the worktree context
3. Use `/af submit <card-id>` to create a PR
```

### Auto-Sync on Loop Start

```bash
# At start of each loop iteration
if command -v gh &> /dev/null; then
  echo "Syncing PR status..."
  # Check for merged PRs and update cards
  for card in $(jq -r '.cards[] | select(.git.pr.status == "open") | .id' .agentflow/board.json); do
    PR_URL=$(jq -r ".cards[] | select(.id == \"$card\") | .git.pr.url" .agentflow/board.json)
    PR_STATE=$(gh pr view "$PR_URL" --json state -q .state 2>/dev/null || echo "unknown")

    if [ "$PR_STATE" = "MERGED" ]; then
      echo "PR merged for $card, moving to done"
      # Update board.json...
    fi
  done
fi
```

---

## Git Operations Reference

### Worktree Creation
```bash
# Create branch from base
git branch af/001-add-user-auth main

# Create worktree
git worktree add ../my-project-worktrees/AF-001 af/001-add-user-auth

# Verify
git worktree list
```

### Working in Worktree
```bash
cd ../my-project-worktrees/AF-001

# Normal git operations work
git status
git add .
git commit -m "feat(auth): add login endpoint"

# Push to remote
git push -u origin af/001-add-user-auth
```

### PR Creation
```bash
# Create PR with gh CLI
gh pr create \
  --base main \
  --head af/001-add-user-auth \
  --title "AF-001: Add user authentication" \
  --body-file /tmp/pr-body.md

# Or interactively
gh pr create --base main
```

### PR Status Check
```bash
# Get PR status
gh pr view https://github.com/owner/repo/pull/42 --json state,mergedAt,mergeCommit

# List PRs for a branch
gh pr list --head af/001-add-user-auth --state all --json number,state,url
```

### Worktree Cleanup
```bash
# Remove worktree
git worktree remove ../my-project-worktrees/AF-001

# If worktree has uncommitted changes, force remove
git worktree remove --force ../my-project-worktrees/AF-001

# Delete branches
git push origin --delete af/001-add-user-auth
git branch -D af/001-add-user-auth

# Prune stale worktree metadata
git worktree prune
```

### Handling Stale Worktrees
```bash
# List all worktrees including stale
git worktree list

# If worktree directory was deleted manually
git worktree prune

# Repair worktree if .git file is corrupted
git worktree repair ../my-project-worktrees/AF-001
```

---

## Error Handling

### Worktree Already Exists
```
Error: Worktree for branch 'af/001-...' already exists at '../my-project-worktrees/AF-001'

Resolution:
  - Use existing worktree: /af work AF-001
  - Remove and recreate: git worktree remove ../my-project-worktrees/AF-001
```

### Branch Already Exists
```
Error: Branch 'af/001-add-user-auth' already exists

Resolution:
  - Use existing branch (may have previous work)
  - Choose different card ID
  - Delete branch if abandoned: git branch -D af/001-...
```

### Uncommitted Changes on Submit
```
Error: Cannot submit AF-001 - uncommitted changes detected

Files with changes:
  M src/auth.ts
  ? src/auth.test.ts

Resolution:
  - Commit changes: git add . && git commit -m "..."
  - Stash changes: git stash
  - Discard changes: git checkout .
```

### PR Creation Failed
```
Error: Failed to create PR for AF-001

Cause: gh CLI not authenticated

Resolution:
  - Run: gh auth login
  - Then retry: /af submit AF-001
```

### Base Branch Ahead
```
Warning: Base branch 'main' is 5 commits ahead of 'af/001-...'

Options:
  - Rebase onto main: git rebase main
  - Merge main into branch: git merge main
  - Continue anyway (PR may have conflicts)
```

---

## Configuration

### .agentflow/config.json (New)

```json
{
  "worktrees": {
    "enabled": true,
    "basePath": "../{project-name}-worktrees",
    "branchPrefix": "af",
    "autoCleanup": true,
    "cleanupAfterDays": 7
  },
  "git": {
    "defaultBaseBranch": "main",
    "pushOnSubmit": true,
    "deleteRemoteBranchOnCleanup": true
  },
  "pr": {
    "defaultDraft": false,
    "autoSync": true,
    "syncIntervalMinutes": 60,
    "bodyTemplate": ".agentflow/templates/pr-body.md"
  }
}
```

### Environment Variables

```bash
# Override worktree base path
AGENTFLOW_WORKTREE_PATH="../custom-worktrees"

# Disable worktrees entirely
AGENTFLOW_NO_WORKTREES=1

# GitHub token for gh CLI (if not using gh auth)
GH_TOKEN=ghp_xxx
```

---

## Implementation Phases

### Phase 1: Core Worktree Support
- [ ] Extend board.json schema with git fields
- [ ] Implement branch name generation
- [ ] Add worktree creation to `/af add`
- [ ] Add worktree context to `/af work`
- [ ] Create `.agentflow/worktrees/` state files

### Phase 2: PR Integration
- [ ] Implement `/af submit` command
- [ ] Generate PR body from card context
- [ ] Store PR info in card state
- [ ] Move card on PR creation

### Phase 3: Sync & Cleanup
- [ ] Implement `/af sync` for PR status
- [ ] Implement `/af cleanup` for worktree removal
- [ ] Auto-move cards when PR merged
- [ ] Add cleanup scheduling

### Phase 4: Loop Integration
- [ ] Modify loop.sh for worktree awareness
- [ ] Add auto-sync on loop start
- [ ] Update RALPH_LOOP_PROMPT.md
- [ ] Test full autonomous workflow

### Phase 5: Polish
- [ ] Add `/af pr` status command
- [ ] Configuration file support
- [ ] Error recovery and repair commands
- [ ] Documentation and examples

---

## Open Questions

1. **Worktree location**: Sibling directory vs subdirectory of main repo?
   - Sibling: Cleaner, but requires path management
   - Subdirectory: Simpler paths, but needs .gitignore

2. **Multiple repos**: How to handle projects with multiple git repos?
   - Option A: One worktree per card, pick primary repo
   - Option B: Multiple worktrees per card (complex)
   - Option C: Defer to future version

3. **Conflict resolution**: What happens when base branch diverges?
   - Option A: Warn and let user resolve
   - Option B: Auto-rebase (risky)
   - Option C: Block submission until rebased

4. **PR comments**: Should we sync PR review comments back to card?
   - Adds complexity but enables addressing feedback
   - Defer to future version?

---

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Vibe Kanban Source](https://github.com/BloopAI/vibe-kanban)
- [AgentFlow README](../README.md)
