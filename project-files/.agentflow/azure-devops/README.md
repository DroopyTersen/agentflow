# Azure DevOps Backend

Uses Azure Boards Kanban board as the board and Work Items as cards.

## Detection

Backend is active when `.agentflow/azure-devops.json` exists.

## Prerequisites

```bash
az --version                      # Verify Azure CLI installed
az extension list                 # Verify azure-devops extension
az login                          # Authenticate
az devops configure --defaults organization=https://dev.azure.com/ORG project=PROJECT
```

## Configuration

`.agentflow/azure-devops.json` contains:
```json
{
  "organization": "https://dev.azure.com/ORG",
  "project": "PROJECT",
  "team": "TEAM",
  "board": "Backlog items",
  "areaPath": "PROJECT",
  "iterationPath": "PROJECT",
  "workItemType": "Product Backlog Item",
  "boardColumnField": "WEF_GUID_Kanban.Column",
  "boardColumnDoneField": "WEF_GUID_Kanban.Column.Done",
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

Run `/af-setup-azure-devops` to create this file.

## Core Patterns

⚠️ **CRITICAL: Shell Variable Interpolation Issues**

When running commands via AI agents (Claude, Codex), shell variable interpolation in WIQL queries often fails due to nested quoting. **Always use literal values instead of shell variables.**

### Reading Config Values

First, read these values from `.agentflow/azure-devops.json`:
- `organization` — Azure DevOps org URL (e.g., `https://dev.azure.com/contoso`)
- `project` — Project name
- `areaPath` — Area path filter
- `boardColumnField` — The WEF field for Kanban column (e.g., `WEF_GUID_Kanban.Column`)
- `workItemType` — Work item type to create (e.g., `Product Backlog Item`)

Then use these values **literally** in commands (don't use shell variables in WIQL).

### List Work Items (WIQL) - Working Example

Replace placeholders with values from your config:
```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [{boardColumnField}] FROM WorkItems WHERE [System.AreaPath] = '{areaPath}'" \
  --org "{organization}" \
  --project "{project}" \
  -o json
```

**Note:** WIQL queries return work item IDs and specified fields. For full details (Description, History), use follow-up `az boards work-item show` calls.

## Performance — Minimize API Calls

**CRITICAL:** Unlike GitHub Projects, Azure DevOps WIQL can return most fields in a single query. Avoid N+1 patterns where possible.

For listing/filtering, query just the fields needed:
- `System.Id`, `System.Title`, `System.Tags`, `{boardColumnField}`

For showing full details, use:
```bash
az boards work-item show --id {id} --expand all --org "{organization}" -o json
```

### Show Work Item
```bash
az boards work-item show --id {id} --expand all --org "{organization}" -o json
```

Returns all fields including:
- `System.Title`, `System.Description`, `System.State`
- `System.Tags` (semicolon-separated string)
- `{boardColumnField}` (Kanban column)
- Relations (dependencies, linked PRs)

### Update Work Item
```bash
# Update single field
az boards work-item update --id {id} --fields "System.Tags=feature; bug" --org "{organization}"

# Update description (HTML)
az boards work-item update --id {id} --description "<h2>Requirements</h2><p>Content here</p>" --org "{organization}"

# Add discussion comment
az boards work-item update --id {id} --discussion "<b>Agent:</b> My update here" --org "{organization}"
```

### Move Card (Update Kanban Column)
```bash
az boards work-item update --id {id} --fields "{boardColumnField}=Refinement" --org "{organization}"
```

Valid column values: `New`, `Approved`, `Refinement`, `Tech Design`, `Implementation`, `Final Review`, `Done`

### Create Work Item
```bash
az boards work-item create \
  --title "My New Feature" \
  --type "{workItemType}" \
  --project "{project}" \
  --org "{organization}" \
  -o json
```

Then update additional fields (Description, Area Path, Tags, Kanban Column) in follow-up calls.

## Card Identification

Cards are identified by **work item ID** (e.g., `123`, `#123`).

## Card Context

Card context is stored in the **Description field** (HTML/markdown). Use:
- `az boards work-item show --id {id}` to read
- `az boards work-item update --id {id} --description "content"` to update

## Conversation Log

Use **Discussion/History** for agent-human dialogue:
- `az boards work-item update --id {id} --discussion "message"` to add
- Discussion history is in work item History (returned with `--expand all`)

## Tags

Azure DevOps stores tags in `System.Tags` as a semicolon-separated string.

**Add tag (get existing first, then append):**
```bash
# Get existing tags
az boards work-item show --id {id} --org "{organization}" --query "fields.\"System.Tags\"" -o tsv

# Update with new tag appended
az boards work-item update --id {id} --fields "System.Tags=existing-tag; new-tag" --org "{organization}"
```

**Remove tag (use the Bun helper - CLI only adds, doesn't replace):**
```bash
bun .agentflow/azure-devops/api.ts tag remove {id} needs-feedback
```

**Set all tags explicitly:**
```bash
bun .agentflow/azure-devops/api.ts tag set {id} "tag1; tag2"
```

## Common Tags

- `needs-feedback` — Card waiting for human input
- `blocked` — External dependency blocking work
