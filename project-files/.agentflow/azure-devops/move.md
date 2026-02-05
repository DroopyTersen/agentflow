# /af move - Azure DevOps Backend

Move a card to a different column.

## Process

⚠️ **CRITICAL: Use literal values, not shell variables** — Shell quoting issues cause failures.

**Step 1: Read config from `.agentflow/azure-devops.json`**

Note these values:
- `organization` — Azure DevOps org URL
- `boardColumnField` — The WEF field for Kanban column

**Step 2: Update Kanban column with literal values**

```bash
az boards work-item update \
  --id {id} \
  --fields "{boardColumnField}=Refinement" \
  --org "{organization}"
```

Replace:
- `{id}` with the actual work item ID
- `{boardColumnField}` with the field name from config
- `Refinement` with the target column name (see table below)
- `{organization}` with the org URL from config

**Step 3: Verify the move**

```bash
az boards work-item show --id {id} --org "{organization}" -o json | jq '.fields["{boardColumnField}"]'
```

## Valid Columns

| AgentFlow Key | Azure DevOps Column |
|---------------|---------------------|
| new | New |
| approved | Approved |
| refinement | Refinement |
| tech-design | Tech Design |
| implementation | Implementation |
| final-review | Final Review |
| done | Done |

## Warnings

- Moving to agent column: "Note: Agent will pick up this card"
- Moving backward: "Warning: Moving backward may lose work"

## Confirm

"Moved #{id} to {column}"
