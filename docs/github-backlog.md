# GitHub Projects Backend

This guide covers using GitHub Projects as the backlog for AgentFlow instead of local JSON files.

## Overview

The GitHub backend stores your AgentFlow board in GitHub Projects:

| AgentFlow Concept | GitHub Equivalent |
|-------------------|-------------------|
| Board | GitHub Project (ProjectsV2) |
| Card | GitHub Issue |
| Card context | Issue body (markdown) |
| Conversation log | Issue comments |
| Column | Project Status field |
| Tags | Issue labels |
| Priority | Position in column (top = highest) |

## Prerequisites

1. **GitHub CLI v2.21+** installed:
   ```bash
   gh --version
   # If older, upgrade: brew upgrade gh
   ```

2. **Authenticate with GitHub:**
   ```bash
   gh auth login
   ```

3. **Add project scopes** (required for project commands):
   ```bash
   gh auth refresh -s read:project,project
   ```
   This opens a browser to authorize the additional scopes.

4. **A GitHub repository** for your project

## Setup

You can set up manually via GitHub UI, or use the CLI commands below.

### Option A: Automated Setup via CLI

If you have an existing GitHub Project, you can configure it with these commands.

#### 1. Get your project info

```bash
# Find your project number from the URL: github.com/users/YOU/projects/NUMBER
# Get the project ID and field IDs
gh project view PROJECT_NUM --owner YOUR_USERNAME --format json
gh project field-list PROJECT_NUM --owner YOUR_USERNAME --format json
```

#### 2. Configure Status field with all 7 columns

```bash
# Get the Status field ID from field-list output (look for "Status" with type "ProjectV2SingleSelectField")
# Then update it with all options:

cat << 'EOF' | gh api graphql --input -
{
  "query": "mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) { updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $options }) { projectV2Field { ... on ProjectV2SingleSelectField { options { name description } } } } }",
  "variables": {
    "fieldId": "YOUR_STATUS_FIELD_ID",
    "options": [
      {"name": "New", "description": "Backlog items awaiting human review and approval", "color": "GRAY"},
      {"name": "Approved", "description": "Human-approved, ready for agent to pick up", "color": "BLUE"},
      {"name": "Refinement", "description": "Agent exploring codebase, documenting requirements", "color": "PURPLE"},
      {"name": "Tech Design", "description": "Agent designing implementation approach", "color": "PINK"},
      {"name": "Implementation", "description": "Agent writing tests and code", "color": "YELLOW"},
      {"name": "Final Review", "description": "Implementation complete, awaiting human approval", "color": "ORANGE"},
      {"name": "Done", "description": "Work complete and approved", "color": "GREEN"}
    ]
  }
}
EOF
```

#### 3. Create required labels

GitHub provides default `bug` and `enhancement` labels. Create the missing ones:

```bash
# Replace OWNER/REPO with your repository
gh label create "refactor" --color "1D76DB" --description "Code refactor" --repo OWNER/REPO
gh label create "needs-feedback" --color "FBCA04" --description "Waiting for human input" --repo OWNER/REPO
gh label create "blocked" --color "B60205" --description "Blocked by external dependency" --repo OWNER/REPO
```

#### 4. Link project to repository

```bash
gh project link PROJECT_NUM --owner YOUR_USERNAME --repo OWNER/REPO
```

### Option B: Manual Setup via GitHub UI

#### 1. Create a GitHub Project

1. Go to your GitHub profile or organization
2. Click "Projects" → "New project"
3. Choose "Board" layout
4. Name it (e.g., "AgentFlow" or your project name)

#### 2. Configure the Status Field

Edit the "Status" field to have these options (in order):

| Status | Description |
|--------|-------------|
| New | Backlog items awaiting human review and approval |
| Approved | Human-approved, ready for agent to pick up |
| Refinement | Agent exploring codebase, documenting requirements |
| Tech Design | Agent designing implementation approach |
| Implementation | Agent writing tests and code |
| Final Review | Implementation complete, awaiting human approval |
| Done | Work complete and approved |

#### 3. Create Labels in Your Repository

Go to your repo → Issues → Labels, and create:

| Label | Color | Description |
|-------|-------|-------------|
| `refactor` | `#1D76DB` | Code refactor |
| `needs-feedback` | `#FBCA04` | Waiting for human input |
| `blocked` | `#B60205` | Blocked by external dependency |

The `bug` and `enhancement` labels already exist by default.

#### 4. Link Project to Repository

1. Open your GitHub Project
2. Click "..." menu → "Settings"
3. Under "Manage access", add your repository

### Configure AgentFlow

Create `.agentflow/github.json` in your project:

```json
{
  "project": 42
}
```

Replace `42` with your project number (from the project URL: `github.com/users/YOU/projects/42`).

### Install the Command File

Copy `af-github.md` to your project:

```bash
cp af-github.md .claude/commands/af.md
```

## Label Mapping

| AgentFlow Type | GitHub Label |
|----------------|--------------|
| feature | `enhancement` (default) |
| bug | `bug` (default) |
| refactor | `refactor` (create) |

| AgentFlow Tag | GitHub Label |
|---------------|--------------|
| needs-feedback | `needs-feedback` (create) |
| blocked | `blocked` (create) |

## Usage

### Creating Cards

```bash
# Via Claude
/af add "Add user authentication"

# Or create issue directly in GitHub, then add to project
gh issue create --title "Add user authentication" --label "enhancement" --repo OWNER/REPO
```

### Viewing the Board

```bash
/af list              # All cards by column
/af list --workable   # Only cards ready for agent work
/af status            # Quick overview
```

### Working on Cards

```bash
/af next              # Work on highest priority card
/af work 123          # Work on specific issue #123
```

### Managing Cards

```bash
/af show 123                          # View card details
/af move 123 tech-design              # Move to column
/af tag 123 add needs-feedback        # Add tag
/af tag 123 remove blocked            # Remove tag
/af context 123 append "## Notes..."  # Add to issue body
```

### Human Feedback

When a card has `needs-feedback` label:

```bash
/af feedback 123      # View questions and respond
```

Or respond directly in GitHub by commenting on the issue.

## How It Works

### Card Context in Issue Body

The issue body stores all card context as markdown:

```markdown
## Type
feature

## Priority
high

## Description
Users should be able to log in with Google OAuth.

---

## Refinement
**Date:** 2026-01-11
**Status:** Complete

### Requirements
- Support Google OAuth 2.0
- Store user profile in database
- Session expires after 7 days

---

## Tech Design
**Date:** 2026-01-12
**Status:** Complete

### Decision
Selected Pragmatic approach: Use passport.js with Redis sessions.

### Files to Modify
| File | Changes |
|------|---------|
| src/auth/google.ts | New OAuth handler |
| src/middleware/session.ts | Add Redis store |

---

## History
| Date | Column | Actor | Notes |
|------|--------|-------|-------|
| 2026-01-10 | New | Human | Created |
| 2026-01-11 | Refinement | Agent | Requirements documented |
| 2026-01-12 | Tech Design | Agent | Design complete |
```

### Conversation via Comments

Agent-human dialogue happens in issue comments:

**Agent comment:**
> **Agent (2026-01-11):** I have some questions:
> 1. Should we support multiple OAuth providers?
> 2. What should happen if the user's email changes?

**Human comment:**
> **Human (2026-01-11):**
> 1. Start with Google only, we'll add more later
> 2. Update the email in our database

### Priority by Position

Cards are prioritized by their position in the column:
- Top of column = highest priority
- Bottom = lowest priority

Drag cards in the GitHub Projects UI to reorder priorities.

## Workflow

### The Ralph Loop

The external loop works the same way:

```bash
.agentflow/loop.sh        # Run autonomous loop
```

Each iteration:
1. Claude runs `/af list --workable`
2. Selects top card (highest priority)
3. Executes the phase per column instructions
4. Updates issue via `/af context`, `/af move`, `/af tag`
5. Exits

### Human Checkpoints

Cards pause when agents add `needs-feedback` label:

1. Agent adds label + posts comment with questions
2. Human sees label in GitHub (or via `/af status`)
3. Human responds via GitHub comment or `/af feedback`
4. Human removes label (or `/af tag remove needs-feedback`)
5. Agent picks up card on next loop iteration

## Comparison: JSON vs GitHub

| Aspect | JSON Backend | GitHub Backend |
|--------|--------------|----------------|
| Storage | Local files | GitHub cloud |
| Collaboration | Single user | Team visibility |
| History | Git commits | GitHub activity |
| Comments | In markdown file | Native comments |
| Notifications | None | GitHub notifications |
| Mobile access | None | GitHub mobile app |
| Offline | Yes | No |
| Setup | Zero | Project + labels |

## Troubleshooting

### "your authentication token is missing required scopes"

Add the project scopes:
```bash
gh auth refresh -s read:project,project
```

### "unknown command project for gh"

Your gh CLI is too old. Upgrade to v2.21+:
```bash
brew upgrade gh
```

### "Issue not in project"

Add the issue to the project:
```bash
gh project item-add PROJECT_NUM --owner OWNER --url ISSUE_URL
```

### Labels not found

Create the required labels (see Setup section).

### Can't move card

Ensure the Status field has matching option names (case-sensitive):
- "New" not "new"
- "Tech Design" not "Tech-Design"

## Tips

### Bulk Import Existing Issues

```bash
# Add all open issues to project
gh issue list --repo OWNER/REPO --state open --json url -q '.[].url' | while read url; do
  gh project item-add PROJECT_NUM --owner OWNER --url "$url"
done
```

### View Project in Terminal

```bash
# List all items with status
gh project item-list PROJECT_NUM --owner OWNER --format json | \
  jq -r '.items[] | "\(.content.number) [\(.status)] \(.content.title)"'
```

### Quick Status Check

```bash
# Count cards by status
gh project item-list PROJECT_NUM --owner OWNER --format json | \
  jq -r '[.items[].status] | group_by(.) | map({status: .[0], count: length})'
```

### Verify Setup

```bash
# Check project fields
gh project field-list PROJECT_NUM --owner OWNER --format json | jq '.fields[] | select(.name == "Status")'

# Check labels
gh label list --repo OWNER/REPO | grep -E "refactor|needs-feedback|blocked"
```

## Migration from JSON Backend

To migrate from local JSON to GitHub:

1. Create GitHub Project and labels (see Setup)
2. For each card in `board.json`:
   ```bash
   # Create issue
   gh issue create --title "CARD_TITLE" --body-file .agentflow/cards/CARD_ID.md --repo OWNER/REPO

   # Add to project
   gh project item-add PROJECT_NUM --owner OWNER --url ISSUE_URL

   # Set status to match column
   # (use gh project item-edit)

   # Add labels for type and tags
   gh issue edit ISSUE_NUM --add-label "enhancement" --repo OWNER/REPO
   ```
3. Replace `af-json.md` with `af-github.md` as `af.md`
4. Delete local `board.json` and `cards/` directory
