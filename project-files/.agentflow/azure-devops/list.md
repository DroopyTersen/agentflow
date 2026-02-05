# /af list - Azure DevOps Backend

List all cards grouped by column.

## Process

**Step 1: Read config values from `.agentflow/azure-devops.json`**

Read these values:
- `organization` — Azure DevOps org URL
- `project` — Project name
- `areaPath` — Area path filter
- `boardColumnField` — The WEF field for Kanban column (e.g., `WEF_xxx_Kanban.Column`)

**Step 2: Query work items**

⚠️ **CRITICAL: Shell quoting issues** — WIQL queries with shell variable interpolation often fail due to quote escaping. Use ONE of these approaches:

**Option A: Single command with literal values (RECOMMENDED)**

Replace the placeholder values with actual config values:
```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [{boardColumnField}] FROM WorkItems WHERE [System.AreaPath] = '{areaPath}'" \
  --org "{organization}" \
  --project "{project}" \
  -o json
```

**Option B: Use variables (must be in same shell invocation)**

```bash
ORG=$(jq -r '.organization' .agentflow/azure-devops.json) && \
PROJECT=$(jq -r '.project' .agentflow/azure-devops.json) && \
AREA_PATH=$(jq -r '.areaPath' .agentflow/azure-devops.json) && \
COLUMN_FIELD=$(jq -r '.boardColumnField' .agentflow/azure-devops.json) && \
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [$COLUMN_FIELD] FROM WorkItems WHERE [System.AreaPath] = '$AREA_PATH'" \
  --org "$ORG" \
  --project "$PROJECT" \
  -o json
```

**Common errors and fixes:**
| Error | Cause | Fix |
|-------|-------|-----|
| `Expecting field name or expression` | Shell quotes mangled the WIQL | Use single command with literal values |
| `missing a FROM clause` | Query truncated or malformed | Check for unescaped quotes in WIQL |
| `--organization must be specified` | Variable not expanded | Ensure variables are set in same shell |

**Step 3: Get additional fields if needed**

WIQL returns limited fields. To get full work item details:
```bash
az boards work-item show --id {id} --org "{organization}" -o json
```

**Step 4: Group by Kanban column**

Parse the JSON results and group by the `boardColumnField` value.

## Flags

**`--workable`**: Filter to only show items where:
- Column is: Approved, Refinement, Tech Design, or Implementation
- No `needs-feedback` tag (check `System.Tags`)
- No `blocked` tag (check `System.Tags`)

**Note on dependencies:** Dependency checking (parsing `## Dependencies` from Description) is expensive. For `/af list --workable`, skip dependency checks. Only check dependencies when actually selecting a card to work on in `/af next` or `/af work`.

## Output Format

```
## New (2)
- #123 Add OAuth login [high]
- #124 Fix navbar bug [medium]

## Approved (1)
- #125 Implement search [high]

## Refinement (1)
- #126 Add dark mode [medium]

## Tech Design (0)

## Implementation (1)
- #127 Update dashboard [medium]

## Final Review (1)
- #128 Add caching [low] — score: 85/100

## Done (3)
- #129 Initial setup
```

## Indicators

- Agent-workable columns: Refinement, Tech Design, Implementation
- Has `needs-feedback` tag
- Has `blocked` tag
- Has unfinished predecessors
- Awaiting human review (Final Review column)
