# /af add - Azure DevOps Backend

Create a new work item and add it to the Kanban board.

## Process

**Step 1: Gather info**
- Ask user for type (feature/bug/refactor) if not obvious
- Ask user for priority (default: medium)

**Step 2: Read config from `.agentflow/azure-devops.json`**

Read these values:
- `organization` — Azure DevOps org URL
- `project` — Project name
- `workItemType` — Work item type (e.g., `Product Backlog Item`)
- `areaPath` — Area path for the work item
- `boardColumnField` — The WEF field for Kanban column

**Step 3: Create work item**

⚠️ **Use literal values, not shell variables** — Shell quoting causes failures with AI agents.

```bash
az boards work-item create \
  --title "My New Feature" \
  --type "{workItemType}" \
  --project "{project}" \
  --org "{organization}" \
  -o json
```

Capture the returned `id` from the response.

**Step 4: Prepare description (AgentFlow template)**
```markdown
## Type
{feature | bug | refactor}

## Priority
{critical | high | medium | low}

## Description
{description from user or title if simple}

---

## History
| Date | Column | Actor | Notes |
|------|--------|-------|-------|
| {YYYY-MM-DD} | New | Human | Created |
```

**Step 5: Update work item fields**

Replace `{id}` with the ID returned from step 3:

```bash
# Set Description (HTML format)
az boards work-item update --id {id} --description "<h2>Type</h2><p>feature</p>" --org "{organization}"

# Set Area Path
az boards work-item update --id {id} --fields "System.AreaPath={areaPath}" --org "{organization}"

# Set Tags
az boards work-item update --id {id} --fields "System.Tags=feature" --org "{organization}"

# Set Kanban Column to New
az boards work-item update --id {id} --fields "{boardColumnField}=New" --org "{organization}"
```

**Step 6: Verify**
```bash
az boards work-item show --id {id} --org "{organization}" -o json | jq '{id: .id, title: .fields["System.Title"]}'
```

## Confirm

"Created work item #{id}: {title} in New"
