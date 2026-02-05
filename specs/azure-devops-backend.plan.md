# Azure DevOps Backend for AgentFlow

## Overview

This document specifies the implementation plan for adding Azure DevOps support to AgentFlow, following the same patterns established by the GitHub backend.

## CLI Tool: Azure DevOps Extension for Azure CLI

Azure DevOps provides an official CLI extension: `az boards` (part of the `azure-devops` extension for Azure CLI).

**Installation:**
```bash
az extension add --name azure-devops
```

**Authentication:**
```bash
az login
az devops configure --defaults organization=https://dev.azure.com/ORG project=PROJECT
```

**References:**
- [Azure DevOps CLI Overview](https://learn.microsoft.com/en-us/azure/devops/cli/)
- [az boards work-item commands](https://learn.microsoft.com/en-us/cli/azure/boards/work-item)
- [az boards query commands](https://learn.microsoft.com/en-us/cli/azure/boards)

---

## Concept Mapping: GitHub vs Azure DevOps

| AgentFlow Concept | GitHub Implementation | Azure DevOps Implementation |
|-------------------|----------------------|----------------------------|
| **Board** | GitHub Project (ProjectsV2) | Azure Boards (native) |
| **Card** | GitHub Issue | Work Item |
| **Card ID** | Issue number (`#123`) | Work Item ID (`123`) |
| **Card body** | Issue body (markdown) | Work Item Description field |
| **Conversation** | Issue comments | Work Item Discussion/History |
| **Column/Status** | Project Status field | Kanban board column field (board-scoped WIT extension) |
| **Tags** | GitHub Labels | Work Item Tags (`System.Tags`) |
| **Card Type** | Labels: `enhancement`, `bug`, `refactor` | Work Item Type: `User Story`, `Bug`, `Task` |
| **Priority** | Position in column | Priority field (1-4) or custom |
| **Dependencies** | Markdown in issue body | Markdown in Description (canonical); optionally mirror to Relations |
| **PR Integration** | `closingIssuesReferences` | Work Item Links to PRs |

---

## Key Differences from GitHub Backend

### 1. Kanban Board Column Field vs Work Item State (Final Recommendation)

**GitHub:** Uses a custom "Status" field on a Project board with arbitrary values (New, Approved, Refinement, etc.).

**Azure DevOps:** Work item **State** is tied to the process template (Agile, Scrum, Basic, CMMI) and often has strict transition rules. It is a poor fit for AgentFlow’s 7 columns.

**Best approach:** Use a **Kanban board column** as the AgentFlow column source-of-truth, the same way GitHub uses a Project “Status” field.

Azure Boards stores the Kanban column in a **board-scoped work item extension field** whose reference name typically looks like:
- `WEF_<GUID>_Kanban.Column`
- `WEF_<GUID>_Kanban.Column.Done` (boolean; used for split columns)

Azure DevOps also exposes `System.BoardColumn` / `System.BoardColumnDone`, but these are effectively **read-only / derived** for many workflows; the reliable way to move an item on a specific team’s Kanban board is to update the `WEF_*` field for that board.

**Why this is better than custom states or a custom picklist field:**
- No org-level process customization required (board columns are team-configurable)
- Preserves a true 7-column state machine (multiple columns can map to the same `State`, but the **column** remains distinct)
- Scales to N backends because AgentFlow keeps one canonical “column” concept and each backend supplies a native column/status implementation

**Important constraint:** This approach requires using the **Kanban board** (Azure Boards → Boards), not the Sprint taskboard. The “board column” fields are Kanban-focused.

### Manual Board Setup (Recommended / OK to Be Manual)

If you’re willing to configure Azure Boards manually, do it. AgentFlow can then treat Azure DevOps like GitHub Projects: a board with a single “column/status” field the agent reads/writes.

**Goal:** A single Team Kanban board with exactly these 7 columns (names are case-sensitive because we’ll store and compare them as strings):
- `New`
- `Approved`
- `Refinement`
- `Tech Design`
- `Implementation`
- `Final Review`
- `Done`

#### Step 1: Pick the Team and Board

1. In Azure DevOps, select the Team you want AgentFlow to operate against (often the default team for the project).
2. Go to **Boards → Boards** and select the backlog-level board you want to use (commonly the “Stories”/“Backlog items” board for the Requirement category).

#### Step 2: Ensure the Work Items Will Appear on That Board

The Kanban Column field is provided via a **WIT Extension** that only attaches to work items when they match the team’s backlog query (area path, backlog level). That means:
- Make sure the team’s board includes the work item type you’ll create (recommended: a single type like `User Story`).
- Make sure the team’s area path configuration includes the area path you’ll use (so created work items show up on the board).

If a work item doesn’t appear on the board, it won’t have the `WEF_*_Kanban.Column` field we need to update.

#### Step 3: Configure Columns to Match AgentFlow

In **Boards → Boards → Configure board settings → Columns**:
1. Rename existing columns and add new columns until you have the 7 AgentFlow columns above.
2. (Optional) Avoid split columns at first. If you do use split columns, we must also set the `WEF_*_Kanban.Column.Done` field, and the config needs per-column done/doing behavior.

Microsoft’s guidance is to map each workflow state to a column and keep mappings complete; unmapped states won’t appear on the board. See: [Manage columns on your board](https://learn.microsoft.com/en-us/azure/devops/boards/boards/split-columns).  

#### Step 4: Map Workflow States to Columns (Practical Guidance)

Azure Boards requires mapping workflow states to columns. There are two viable approaches:

**A) Best (cleanest): 1 column ↔ 1 state (requires workflow customization)**
- Add workflow states so each of the 7 columns maps to a unique state.
- Pros: no ambiguity if someone edits `System.State` directly; consistent reporting.
- Cons: requires process/workflow customization permissions.

**B) Works without customization: multiple columns map to the same state**
- Example: map `Refinement`, `Tech Design`, `Implementation` to `Active`.
- Pros: no admin needed.
- Cons: if someone updates `System.State` directly, Azure may reset the Kanban column to the “default” column for that state (because the reverse mapping becomes ambiguous). Mitigation: treat the Kanban column as the source-of-truth and avoid manual state edits; move work via board drag/drop or `/af move`.

AgentFlow will **always** read/write the Kanban column field, not `System.State`, so (B) is acceptable if your team agrees to the constraint.

#### Step 5: Discover the Kanban Column Field Reference Name (Manual-Friendly)

We need to know the board’s column field name so the agent can update it (example: `WEF_<GUID>_Kanban.Column`).

**Method 1 (easy): derive it from a work item’s fields**
1. Pick a work item that appears on the target board.
2. Move it on the board at least once (ensures the extension is attached and field is populated).
3. Run:
   ```bash
   az boards work-item show --id <id> --org https://dev.azure.com/ORG --project PROJECT -o json | jq '.fields | keys[] | select(test("_Kanban\\\\.Column$"))'
   ```
4. If you see exactly one result, that’s your `boardColumnField`.
5. Similarly, find the done field (for split columns):
   ```bash
   az boards work-item show --id <id> --org https://dev.azure.com/ORG --project PROJECT -o json | jq '.fields | keys[] | select(test("_Kanban\\\\.Column\\\\.Done$"))'
   ```

**Method 2 (robust): map board → field via Boards REST API**
- List boards for the team, then fetch the board and read `fields.columnField.referenceName` and `fields.doneField.referenceName`.
- This is required if work items can appear on multiple boards/teams (multiple `WEF_*_Kanban.Column` fields may exist on one item).

### 2. Tags are a Scalar Field

**GitHub:** Labels are first-class objects with dedicated add/remove commands:
```bash
gh issue edit NUMBER --add-label "needs-feedback"
gh issue edit NUMBER --remove-label "blocked"
```

**Azure DevOps:** Tags are stored in `System.Tags` as a semicolon-separated string. The CLI doesn't have dedicated tag commands.

**Workaround:**
```bash
# Get existing tags
EXISTING=$(az boards work-item show --id ID --query "fields.\"System.Tags\"" -o tsv)

# Add a tag
az boards work-item update --id ID --fields "System.Tags=$EXISTING; needs-feedback"

# Remove a tag (more complex - need to filter out)
NEW_TAGS=$(echo "$EXISTING" | tr ';' '\n' | grep -v "needs-feedback" | tr '\n' ';')
az boards work-item update --id ID --fields "System.Tags=$NEW_TAGS"
```

### 3. Listing Work Items (WIQL vs item-list)

**GitHub:** Single efficient call:
```bash
gh project item-list $PROJECT --owner $OWNER --limit 100 --format json
```

**Azure DevOps:** Requires WIQL (Work Item Query Language):
```bash
az boards query --wiql "SELECT [System.Id], [System.Title], [System.State], [System.Tags] FROM workitems WHERE [System.TeamProject] = 'PROJECT' AND [System.State] <> 'Removed' ORDER BY [System.Id] DESC"
```

**Note:** WIQL queries only return work item IDs and specified fields. To get full details (including Description), you may need follow-up calls.

### 4. Comments/Discussion

**GitHub:** Dedicated comment command:
```bash
gh issue comment NUMBER --body "message"
```

**Azure DevOps:** Uses `--discussion` parameter:
```bash
az boards work-item update --id ID --discussion "message"
```

Discussion history is stored in work item History, not as separate comment objects.

### 5. Dependencies (Relations)

**GitHub:** Stored as markdown in issue body:
```markdown
## Dependencies
Blocked by: #100, #101
```

**Azure DevOps:** Has native work item relations:
```bash
# Add predecessor relation
az boards work-item relation add --id 123 --relation-type "System.LinkTypes.Dependency-Reverse" --target-id 100

# List relations
az boards work-item relation show --id 123
```

Relation types include:
- `System.LinkTypes.Dependency-Forward` (Successor)
- `System.LinkTypes.Dependency-Reverse` (Predecessor)
- `System.LinkTypes.Hierarchy-Forward` (Child)
- `System.LinkTypes.Hierarchy-Reverse` (Parent)

---

## Files to Create

### Directory Structure

```
project-files/.agentflow/
├── azure-devops/                    # NEW: Azure DevOps backend commands
│   ├── README.md                    # Azure DevOps-specific patterns
│   ├── add.md                       # Create work item
│   ├── list.md                      # List work items by state
│   ├── show.md                      # Show work item details
│   ├── move.md                      # Change work item state
│   ├── tag.md                       # Add/remove tags
│   ├── context.md                   # Update description/discussion
│   └── workflow.md                  # work/next/feedback/depends/review/loop
├── prompts/
│   └── af-setup-azure-devops.md     # NEW: Setup instructions
└── ...

project-files/.claude/commands/
└── af-setup-azure-devops.md         # NEW: Claude wrapper for setup

project-files/.codex/prompts/
└── af-setup-azure-devops.md         # NEW: Codex wrapper for setup

docs/                                # RESTRUCTURED documentation
├── setup-new-project.md             # REFACTORED: Core setup (agent choice, file copying)
├── setup-github.md                  # NEW: GitHub-specific setup guide
├── setup-azure-devops.md            # NEW: Azure DevOps-specific setup guide
├── github-backlog.md                # EXISTING: GitHub backend reference
├── azure-devops-backlog.md          # NEW: Azure DevOps backend reference
└── codex-compatibility.md           # EXISTING: Codex CLI guide
```

### Documentation Restructure

The current `docs/setup-new-project.md` is ~450 lines and mixes:
- Agent selection (Claude Code vs Codex)
- Backend selection (JSON vs GitHub)
- File copying instructions
- Backend-specific setup

**Proposed split:**

#### `docs/setup-new-project.md` (Core Setup)
- Prerequisites (git repo, agent CLI)
- Step 1: Choose your coding agent (table + install commands)
- Step 2: Choose your backend (table: JSON vs GitHub vs Azure DevOps)
- Step 3: Copy core files (agent-specific)
- Step 4: Run backend-specific setup → links to:
  - `setup-github.md` for GitHub Projects
  - `setup-azure-devops.md` for Azure DevOps
  - Inline for JSON (simple enough to keep inline)
- Post-setup: Customize `PROJECT_LOOP_PROMPT.md`, verify, first card
- Keeping files in sync
- Troubleshooting (common issues)

#### `docs/setup-github.md` (GitHub Backend Setup)
Move from `setup-new-project.md`:
- Prerequisites (gh CLI, auth, project scopes)
- Creating GitHub Project
- Configuring Status field (7 columns)
- Creating labels
- Getting project IDs
- Creating `github.json`
- Verification commands
- Troubleshooting (GitHub-specific)

#### `docs/setup-azure-devops.md` (Azure DevOps Backend Setup) — NEW
- Prerequisites (az CLI, azure-devops extension, auth)
- Configuring the team Kanban board columns (AgentFlow 7 columns)
- Creating/configuring project
- Creating tags
- Creating `azure-devops.json`
- Verification commands
- Troubleshooting (Azure DevOps-specific)

#### `docs/azure-devops-backlog.md` (Reference) — NEW
Similar to `docs/github-backlog.md`:
- Overview and concept mapping
- CLI command reference
- Data model (work items, states, tags)
- Workflow examples
- Comparison: JSON vs GitHub vs Azure DevOps
- Tips and advanced usage

### Configuration File: `.agentflow/azure-devops.json`

```json
{
  "organization": "https://dev.azure.com/contoso",
  "project": "MyProject",
  "team": "MyTeam",
  "board": "Stories",
  "areaPath": "MyProject\\AgentFlow",
  "iterationPath": "MyProject\\Sprint 1",
  "workItemType": "User Story",
  "boardColumnField": "WEF_00000000-0000-0000-0000-000000000000_Kanban.Column",
  "boardColumnDoneField": "WEF_00000000-0000-0000-0000-000000000000_Kanban.Column.Done",
  "boardColumns": {
    "new": "New",
    "approved": "Approved",
    "refinement": "Refinement",
    "tech-design": "Tech Design",
    "implementation": "Implementation",
    "final-review": "Final Review",
    "done": "Done"
  },
  "boardColumnDone": {
    "new": false,
    "approved": false,
    "refinement": false,
    "tech-design": false,
    "implementation": false,
    "final-review": false,
    "done": false
  }
}
```

**Notes:**
- `board` is the Kanban board name for the chosen backlog level (commonly `Stories`, `Backlog items`, etc.).
- `boardColumnField` / `boardColumnDoneField` are board-specific field reference names. They are discovered during setup by calling the Boards REST API and written into this config.
- `boardColumns` maps AgentFlow canonical columns → exact Azure Board column names (case-sensitive).
- `boardColumnDone` supports split columns. If you don’t use split columns, keep everything `false` and ignore `boardColumnDoneField`.

---

## Command Implementation Specifications

### 1. `/af add` - Create Work Item

**Process:**
1. Gather info (type, priority, description)
2. **Default:** Create all AgentFlow cards as the configured `workItemType` (recommended: a single Requirement-level type like `User Story` so items appear on the chosen board).
   - Optional enhancement (later): map `bug` → `Bug`, `refactor` → `Task` if your chosen board includes those types.
3. Create work item with minimal required fields (keep this step robust even if CLI `--fields` parsing is finicky):
   ```bash
   az boards work-item create \
     --title "{title}" \
     --type "{workItemType}" \
     --org "{organization}" \
     --project "{project}"
   ```
4. Update fields in follow-up calls:
   - Set Description (AgentFlow markdown template)
   - Set Area/Iteration if configured
   - Set Tags (type tag + optional `needs-feedback`/`blocked`)
   - Set Kanban column using `boardColumnField` (and `boardColumnDoneField` if needed)
   ```bash
   az boards work-item update --id {id} --description "{agentflow_markdown}" --org "{organization}" --project "{project}"
   az boards work-item update --id {id} --fields "System.AreaPath={areaPath}" --org "{organization}" --project "{project}"
   az boards work-item update --id {id} --fields "System.IterationPath={iterationPath}" --org "{organization}" --project "{project}"
   az boards work-item update --id {id} --fields "System.Tags={type_tag}" --org "{organization}" --project "{project}"
   az boards work-item update --id {id} --fields "{boardColumnField}={boardColumns.new}" --org "{organization}" --project "{project}"
   az boards work-item update --id {id} --fields "{boardColumnDoneField}=false" --org "{organization}" --project "{project}"
   ```
5. Verify creation (show the work item and confirm the configured board column matches `new`)

**Output:** `✅ Created work item #123: {title} in New`

### 2. `/af list` - List Work Items

**Process:**
```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [{boardColumnField}], [System.Tags], [System.CreatedDate], [System.ChangedDate] FROM workitems WHERE [System.TeamProject] = '@project' AND [System.AreaPath] UNDER '@areaPath' AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC" \
  --org "{organization}" \
  --project "{project}"
```

**Grouping:** Group by `{boardColumnField}` (Kanban column for the configured team board).

**Flags:**
- `--workable`: Filter to workable columns (`approved`, `refinement`, `tech-design`, `implementation`) and exclude `needs-feedback` / `blocked` tags

**Performance note (avoid N+1):**
- WIQL can return the column field and tags; don’t fetch full work item bodies unless needed.
- For output that needs `## Priority` from the Description, consider a second-stage fetch only for candidate workable items.

### 3. `/af show` - Display Work Item

**Process:**
```bash
az boards work-item show \
  --id {id} \
  --expand all \
  --org "{organization}"
```

Include:
- Work item fields (title, description, state, tags, priority)
- Relations (dependencies, linked PRs)
- History/Discussion

**Check for linked PRs:**
```bash
az repos pr list \
  --query "[?contains(description, '#{id}') || contains(title, '#{id}')]" \
  --org "{organization}" \
  --project "{project}"
```

### 4. `/af move` - Change State

**Process:**
```bash
az boards work-item update \
  --id {id} \
  --fields "{boardColumnField}={boardColumns[targetColumn]}" \
  --org "{organization}"
```

If using split columns, also set `{boardColumnDoneField}` based on `boardColumnDone[targetColumn]`.

### 5. `/af tag` - Add/Remove Tags

**Add tag:**
```bash
# Get existing tags
EXISTING=$(az boards work-item show --id {id} --query "fields.\"System.Tags\"" -o tsv)

# Append new tag
if [ -z "$EXISTING" ]; then
  NEW_TAGS="{tag}"
else
  NEW_TAGS="$EXISTING; {tag}"
fi

az boards work-item update --id {id} --fields "System.Tags=$NEW_TAGS"
```

**Remove tag:**
```bash
EXISTING=$(az boards work-item show --id {id} --query "fields.\"System.Tags\"" -o tsv)
NEW_TAGS=$(echo "$EXISTING" | sed "s/; *{tag}//g" | sed "s/{tag}; *//g" | sed "s/^{tag}$//")
az boards work-item update --id {id} --fields "System.Tags=$NEW_TAGS"
```

### 6. `/af context` - Update Content

**Update Description (Body):**
```bash
az boards work-item update \
  --id {id} \
  --description "{updated markdown}" \
  --org "{organization}"
```

**Add Discussion Comment:**
```bash
az boards work-item update \
  --id {id} \
  --discussion "**Agent (YYYY-MM-DD):** {message}" \
  --org "{organization}"
```

### 7. `/af workflow` - Work/Next/Feedback/Depends/Review

**work:** Same pattern as GitHub - get work item, check state, read column instructions, execute phase.

**next:** Query for workable items, select highest priority, execute work.

**feedback:** Get work item, display discussion history, prompt for response, add comment, remove `needs-feedback` tag.

**depends:** Use native relations:
```bash
# Show dependencies
az boards work-item relation show --id {id}

# Add dependency
az boards work-item relation add \
  --id {id} \
  --relation-type "System.LinkTypes.Dependency-Reverse" \
  --target-id {predecessor_id}

# Remove dependency
az boards work-item relation remove \
  --id {id} \
  --relation-type "System.LinkTypes.Dependency-Reverse" \
  --target-id {predecessor_id}
```

---

## Setup Process

### Prerequisites

1. **Azure CLI** installed with `azure-devops` extension:
   ```bash
   az --version
   az extension add --name azure-devops
   ```

2. **Authentication:**
   ```bash
   az login
   # OR for PAT:
   az devops login --organization https://dev.azure.com/ORG
   ```

3. **Permissions:**
   - Work Items: Read & Write
   - Project: Read

### Setup Steps

1. **Configure defaults:**
   ```bash
   az devops configure --defaults organization=https://dev.azure.com/ORG project=PROJECT
   ```

2. **Verify access:**
   ```bash
   az boards work-item show --id 1  # Any existing work item
   ```

3. **Manual board setup (recommended):** Pick a Team + Kanban board (Azure Boards → Boards) and configure columns:
   - Create the 7 AgentFlow columns (exact names): New, Approved, Refinement, Tech Design, Implementation, Final Review, Done
   - Map each column to allowed work item states (multiple columns may map to the same state; column is the source-of-truth)
   - Avoid using Sprint taskboard columns; AgentFlow should rely on Kanban board columns.

4. **Discover the board column field reference names** and write them into `.agentflow/azure-devops.json`:
   - Call the Boards REST API (`Get Board`) and read:
     - `fields.columnField.referenceName` → `boardColumnField` (typically `WEF_*_Kanban.Column`)
     - `fields.doneField.referenceName` → `boardColumnDoneField` (typically `WEF_*_Kanban.Column.Done`)
   - These are board-scoped and are what `/af move` should update.
   - Manual-friendly alternative: derive the field name(s) from an existing work item’s fields (see “Discover the Kanban Column Field Reference Name” above).

5. **Create AgentFlow tags** (if not exists):
   - `needs-feedback`
   - `blocked`
   - `enhancement` / `bug` / `refactor` (optional, for type tracking)

6. **Create configuration file** `.agentflow/azure-devops.json`

7. **Verify setup:**
   ```bash
   az boards query --wiql "SELECT [System.Id] FROM workitems WHERE [System.TeamProject] = 'PROJECT'"
   ```

---

## Dispatcher Updates

Update `project-files/.agentflow/core.md` and `project-files/.claude/commands/af.md`:

```markdown
## Backend Detection

1. If `.agentflow/github.json` exists → GitHub Projects backend
2. If `.agentflow/azure-devops.json` exists → Azure DevOps backend  ← NEW
3. If `.agentflow/board.json` exists → Local JSON backend
4. None → Error: No backend configured
```

---

## Work Estimates by File

### Backend Command Files (project-files/.agentflow/azure-devops/)

| File | Complexity | Notes |
|------|------------|-------|
| `README.md` | Low | Document patterns and auth |
| `add.md` | Medium | Work item creation with proper fields |
| `list.md` | Medium | WIQL query + grouping logic |
| `show.md` | Medium | Include relations and history |
| `move.md` | Low | Simple state update |
| `tag.md` | Medium | Tag manipulation workaround |
| `context.md` | Low | Description + discussion updates |
| `workflow.md` | High | Full workflow logic with relations |

### Setup Prompts

| File | Complexity | Notes |
|------|------------|-------|
| `prompts/af-setup-azure-devops.md` | Medium | Detailed setup guide |
| `.claude/commands/af-setup-azure-devops.md` | Low | Thin wrapper |
| `.codex/prompts/af-setup-azure-devops.md` | Low | Thin wrapper |

### Core Updates

| File | Complexity | Notes |
|------|------------|-------|
| `core.md` | Low | Add backend detection for azure-devops.json |
| `.claude/commands/af.md` | Low | Add backend routing |
| `.codex/prompts/af.md` | Low | Add backend routing |

### Documentation (docs/)

| File | Complexity | Notes |
|------|------------|-------|
| `setup-new-project.md` | Medium | **REFACTOR** — extract backend-specific sections |
| `setup-github.md` | Medium | **NEW** — extracted from setup-new-project.md |
| `setup-azure-devops.md` | Medium | **NEW** — Azure DevOps setup guide |
| `azure-devops-backlog.md` | Medium | **NEW** — reference guide (like github-backlog.md) |

### Summary

| Category | Files | Est. Lines |
|----------|-------|------------|
| Backend commands | 8 | ~400 |
| Setup prompts | 3 | ~100 |
| Core updates | 3 | ~50 |
| Documentation | 4 | ~600 |
| **Total** | **18** | **~1150**

---

## File Copying Instructions (for setup docs)

### For Azure DevOps Backend (Claude Code)

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/
cp -r project-files/.claude /path/to/your-project/

# Remove other backend files
rm -f /path/to/your-project/.agentflow/board.json
rm -rf /path/to/your-project/.agentflow/json
rm -rf /path/to/your-project/.agentflow/github
rm -rf /path/to/your-project/.agentflow/cards
```

Then run:
```bash
cd /path/to/your-project
/af-setup-azure-devops
```

### For Azure DevOps Backend (Codex CLI)

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/
cp -r project-files/.codex /path/to/your-project/
cp project-files/AGENTS.md /path/to/your-project/

# Remove other backend files
rm -f /path/to/your-project/.agentflow/board.json
rm -rf /path/to/your-project/.agentflow/json
rm -rf /path/to/your-project/.agentflow/github
rm -rf /path/to/your-project/.agentflow/cards
```

Then run:
```bash
cd /path/to/your-project
/prompts:af-setup-azure-devops
```

### Updated Backend Selection Table (for setup-new-project.md)

| Backend | Best For | Config File |
|---------|----------|-------------|
| **Local JSON** | Solo work, simple projects, offline use | `board.json` |
| **GitHub Projects** | Team collaboration, GitHub issue tracking | `github.json` |
| **Azure DevOps** | Enterprise teams, Azure ecosystem, ADO integration | `azure-devops.json` |

---

## Limitations and Considerations

### Azure DevOps CLI Limitations

1. **Cloud only:** Azure DevOps CLI doesn't work with Azure DevOps Server (on-premises). Only Azure DevOps Services (cloud).

2. **No dedicated tag commands:** Must use workaround with `System.Tags` field.

3. **WIQL complexity:** Querying requires learning WIQL syntax.

4. **Rate limits:** Azure DevOps has API rate limits (much more generous than GitHub).

### Process Template Considerations

1. **State customization requires admin access:** Not all teams can modify process templates.

2. **State transitions:** Azure DevOps may enforce transition rules (e.g., can't go from New directly to Done).

3. **Required fields:** Some processes require fields like Effort, Story Points, etc.

### Migration Path

For teams moving from GitHub backend:
1. Export cards from GitHub Issues
2. Create corresponding Work Items in Azure DevOps
3. Map labels to tags
4. Update issue body to work item description
5. Replace `github.json` with `azure-devops.json`

---

## Implementation Order

### Phase 1: Foundation
1. **Decide state mapping strategy** — Answer open question #1 first
2. **Create `azure-devops.json` schema** — Define config structure
3. **Update `core.md`** — Add backend detection logic
4. **Create `azure-devops/README.md`** — Document patterns, auth, CLI reference

### Phase 2: Core Commands
5. **`azure-devops/add.md`** — Create work items (foundational)
6. **`azure-devops/show.md`** — Display work items (needed for debugging)
7. **`azure-devops/list.md`** — List/query work items
8. **`azure-devops/move.md`** — Change states
9. **`azure-devops/tag.md`** — Tag manipulation

### Phase 3: Workflow
10. **`azure-devops/context.md`** — Update description/discussion
11. **`azure-devops/workflow.md`** — Full workflow commands

### Phase 4: Setup & Integration
12. **`prompts/af-setup-azure-devops.md`** — Setup instructions
13. **`.claude/commands/af-setup-azure-devops.md`** — Claude wrapper
14. **`.codex/prompts/af-setup-azure-devops.md`** — Codex wrapper
15. **Update dispatchers** — `af.md` files for both Claude and Codex

### Phase 5: Documentation
16. **Refactor `docs/setup-new-project.md`** — Extract backend sections
17. **Create `docs/setup-github.md`** — Extracted GitHub setup
18. **Create `docs/setup-azure-devops.md`** — Azure DevOps setup
19. **Create `docs/azure-devops-backlog.md`** — Reference guide

### Phase 6: Testing
20. **End-to-end testing** — Full workflow in real Azure DevOps project

---

## Testing Checklist

- [ ] Create work item with all fields
- [ ] List work items grouped by Kanban column field
- [ ] Show work item with full details and relations
- [ ] Move work item between Kanban columns (updates `WEF_*_Kanban.Column`)
- [ ] Add tag to work item
- [ ] Remove tag from work item
- [ ] Update work item description
- [ ] Add discussion comment
- [ ] Add dependency relation
- [ ] Remove dependency relation
- [ ] Query workable items (state + no blocking tags)
- [ ] Full workflow: New → Approved → Refinement → Tech Design → Implementation → Final Review → Done
- [ ] Human feedback loop with `needs-feedback` tag
- [ ] Ralph loop integration

---

## Final Recommendations (Defaults)

1. **Use Kanban column fields as the column source-of-truth.** Always read/write the board-scoped column field (`WEF_*_Kanban.Column`) rather than `System.State`.

2. **Make board identity explicit in config:** require `{ organization, project, team, board }` in `.agentflow/azure-devops.json`.
   - Default guidance: pick the team’s primary Requirement-level board (often the “Stories” board when using `User Story` as the work item type).

3. **Field discovery:** prefer the manual-friendly “derive from a work item’s fields” method during setup; fall back to Boards REST API when multiple `WEF_*_Kanban.Column` fields exist (multi-team/multi-board scenarios).

4. **Work item type:** recommend a single work item type for AgentFlow cards (simpler + ensures the work item appears on the chosen board). Keep type-mapping (Bug/Task) as an optional enhancement, not the default.

5. **Dependencies:** keep dependencies canonical in the Description markdown (same as GitHub) for portability across backends. Optionally mirror dependencies to native work item relations later for better ADO UX.

6. **Priority:** keep priority canonical in Description markdown (`## Priority`) for portability and to match current AgentFlow patterns. Optionally map to a native priority field if desired, but do not depend on it for core functionality.

---

## References

- [Azure DevOps CLI](https://learn.microsoft.com/en-us/azure/devops/cli/)
- [az boards commands](https://learn.microsoft.com/en-us/cli/azure/boards)
- [az boards work-item](https://learn.microsoft.com/en-us/cli/azure/boards/work-item)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [Work Item Tags](https://learn.microsoft.com/en-us/azure/devops/boards/queries/add-tags-to-work-items)
- [Work Item Relations](https://learn.microsoft.com/en-us/azure/devops/boards/queries/link-work-items-support-traceability)
- [Azure DevOps REST API - Tags](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/tags)
- [Boards REST API: Get Board](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/boards/get-board?view=azure-devops-rest-7.2)
- [Boards REST API: List Boards](https://learn.microsoft.com/en-us/rest/api/azure/devops/work/boards/list?view=azure-devops-rest-7.2)
- [Manage columns on your board](https://learn.microsoft.com/en-us/azure/devops/boards/boards/split-columns)
- [Customize process workflow (states)](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-workflow)
- [Azure DevOps: Setting the Kanban board column field on work items](https://devblogs.microsoft.com/premier-developer/azure-devops-setting-the-kanban-board-column-field-on-work-items/)
