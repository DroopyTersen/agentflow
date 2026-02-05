# Azure DevOps Backend Reference

This guide covers using Azure DevOps Boards as the backlog for AgentFlow instead of local JSON files or GitHub Projects.

## Overview

The Azure DevOps backend stores your AgentFlow board in Azure Boards:

| AgentFlow Concept | Azure DevOps Equivalent |
|-------------------|-------------------------|
| Board | Kanban Board |
| Card | Work Item (Product Backlog Item, User Story, etc.) |
| Card ID | Work Item ID (`123`) |
| Card context | Work Item Description field (HTML) |
| Conversation log | Work Item Discussion (HTML) |
| Column | Kanban board column field (`WEF_*_Kanban.Column`) |
| Tags | Work Item Tags (`System.Tags`, semicolon-separated) |
| Priority | Position in column or `## Priority` in Description |
| Dependencies | Markdown in Description (canonical); optionally Work Item Relations |

## Key Concepts

### Kanban Column Field

Azure DevOps stores Kanban board columns in board-scoped Work Item Extension (WEF) fields:

```
WEF_<GUID>_Kanban.Column       # Column name (e.g., "Refinement")
WEF_<GUID>_Kanban.Column.Done  # Boolean for split columns
```

These fields are **board-specific**. If a work item appears on multiple boards, it will have multiple WEF fields. AgentFlow reads/writes the field specified in `azure-devops.json`.

### HTML Formatting

**Important:** Azure DevOps uses HTML, not markdown, for Description and Discussion fields. AgentFlow commands automatically convert to HTML, but when working manually:

```html
<!-- Bold -->
<b>Important</b>

<!-- Line breaks -->
Line 1<br>Line 2

<!-- Lists -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<ol>
  <li>First</li>
  <li>Second</li>
</ol>

<!-- Links -->
<a href="https://example.com">Link text</a>
```

### Tags (System.Tags)

Tags are stored as a semicolon-separated string in `System.Tags`:

```
needs-feedback; blocked; enhancement
```

**CLI Limitation:** `az boards work-item update --fields "System.Tags=value"` only **adds** tags, it doesn't replace. For tag removal, AgentFlow uses a Bun script that calls the REST API directly.

## CLI Commands Reference

### Create Work Item

```bash
# Basic creation
az boards work-item create \
  --title "Card title" \
  --type "Product Backlog Item" \
  --project PROJECT \
  --org https://dev.azure.com/ORG

# With description
az boards work-item create \
  --title "Card title" \
  --type "Product Backlog Item" \
  --description "<p>Description in HTML</p>" \
  --project PROJECT \
  --org https://dev.azure.com/ORG
```

### Show Work Item

```bash
# Basic show
az boards work-item show --id 123 --org https://dev.azure.com/ORG

# With all details (relations, history)
az boards work-item show --id 123 --expand all --org https://dev.azure.com/ORG

# Get specific field
az boards work-item show --id 123 --query "fields.\"System.Title\"" -o tsv
```

### Update Work Item

```bash
# Update title
az boards work-item update --id 123 --title "New title" --org https://dev.azure.com/ORG

# Update description
az boards work-item update --id 123 --description "<p>New description</p>" --org https://dev.azure.com/ORG

# Update custom field
az boards work-item update --id 123 --fields "FieldName=Value" --org https://dev.azure.com/ORG

# Move via Kanban column field
az boards work-item update --id 123 \
  --fields "WEF_GUID_Kanban.Column=Tech Design" \
  --org https://dev.azure.com/ORG

# Add discussion comment
az boards work-item update --id 123 \
  --discussion "<b>Agent:</b> Comment in HTML" \
  --org https://dev.azure.com/ORG
```

### Query Work Items (WIQL)

```bash
# Basic query
az boards query \
  --wiql "SELECT [System.Id], [System.Title] FROM workitems WHERE [System.TeamProject] = 'PROJECT'" \
  --org https://dev.azure.com/ORG \
  --project PROJECT

# Query with column field
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [WEF_GUID_Kanban.Column], [System.Tags] FROM workitems WHERE [System.TeamProject] = 'PROJECT' AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC" \
  --org https://dev.azure.com/ORG \
  --project PROJECT

# Filter by area path
az boards query \
  --wiql "SELECT [System.Id] FROM workitems WHERE [System.AreaPath] UNDER 'PROJECT\\Team'" \
  --org https://dev.azure.com/ORG
```

### Tags

```bash
# Add tag (appends to existing)
EXISTING=$(az boards work-item show --id 123 --query "fields.\"System.Tags\"" -o tsv)
if [ -z "$EXISTING" ]; then
  NEW_TAGS="needs-feedback"
else
  NEW_TAGS="$EXISTING; needs-feedback"
fi
az boards work-item update --id 123 --fields "System.Tags=$NEW_TAGS" --org https://dev.azure.com/ORG

# Remove tag (requires REST API via Bun script)
bun .agentflow/azure-devops/api.ts tag remove 123 "needs-feedback"
```

## AgentFlow Commands

### `/af add <title>`

Creates a new work item with the AgentFlow description template.

```bash
/af add "Add user authentication"
```

Creates:
- Work item of configured type
- HTML description with AgentFlow template
- Sets Kanban column to "New"

### `/af list`

Lists all work items grouped by Kanban column.

```bash
/af list              # All cards
/af list --workable   # Only workable cards
```

**Workable cards** are in columns: Approved, Refinement, Tech Design, Implementation
**Excluded:** Cards with `needs-feedback` or `blocked` tags

### `/af show <id>`

Displays full work item details.

```bash
/af show 123
```

Shows:
- Title, Description, Column, Tags
- Discussion history
- Related work items

### `/af move <id> <column>`

Moves a card to a different column by updating the Kanban column field.

```bash
/af move 123 tech-design
/af move 123 implementation
/af move 123 final-review
```

Column names (case-insensitive in command, mapped to exact Azure names):
- `new`, `approved`, `refinement`, `tech-design`, `implementation`, `final-review`, `done`

### `/af tag <id> add|remove <tag>`

Manages work item tags.

```bash
/af tag 123 add needs-feedback
/af tag 123 remove blocked
```

Tag removal uses the REST API via `api.ts` because the CLI only adds tags.

### `/af context <id> append|history --discussion`

Updates work item content.

```bash
# Append to Description
/af context 123 append "## New Section\nContent here"

# Add discussion comment
/af context 123 append "Question for human" --discussion
```

Content is automatically converted to HTML.

### `/af work <id>`

Works on a specific card, executing the current phase.

```bash
/af work 123
```

### `/af next`

Finds the highest-priority workable card and works on it.

```bash
/af next
```

### `/af feedback <id>`

Responds to a card that has the `needs-feedback` tag.

```bash
/af feedback 123
```

Shows discussion history and prompts for response.

## Workflow

### The Ralph Loop

The external loop processes cards autonomously:

```bash
# Claude Code (default)
.agentflow/loop.sh

# Codex CLI
.agentflow/loop.sh --codex
```

Each iteration:
1. Agent runs `/af list --workable`
2. Selects top card (highest priority)
3. Reads column instructions from `.agentflow/columns/`
4. Executes the phase
5. Updates work item via `/af context`, `/af move`, `/af tag`
6. Exits

### Human Checkpoints

Cards pause when agents add `needs-feedback` tag:

1. Agent adds tag + posts discussion comment with questions
2. Human sees tag in Azure Boards (or via `/af status`)
3. Human responds via Azure DevOps Discussion or `/af feedback`
4. Human removes tag via Azure UI or `/af tag remove needs-feedback`
5. Agent picks up card on next loop iteration

### Card Lifecycle

```
NEW → APPROVED → REFINEMENT → TECH-DESIGN → IMPLEMENTATION → FINAL-REVIEW → DONE
 👤      👤          🤖            🤖             🤖              👤          ✅
```

| Column | Actor | Agent | Purpose |
|--------|-------|-------|---------|
| New | Human | - | Create cards, add context |
| Approved | Human | - | Human approves card for work |
| Refinement | Agent | code-explorer | Document requirements, ask clarifying questions |
| Tech Design | Agent | code-architect | Design 3 approaches, get approval |
| Implementation | Agent | code-reviewer | Write tests, implement, verify, code review |
| Final Review | Human | - | Final approval, changes requested, or reject |
| Done | - | - | Terminal state |

## Comparison: JSON vs GitHub vs Azure DevOps

| Aspect | JSON | GitHub | Azure DevOps |
|--------|------|--------|--------------|
| Storage | Local files | GitHub cloud | Azure cloud |
| Collaboration | Single user | GitHub team | Azure team |
| History | Git commits | GitHub activity | Azure history |
| Comments | Markdown file | Issue comments | Discussion (HTML) |
| Tags | JSON array | GitHub labels | System.Tags field |
| Notifications | None | GitHub notifications | Azure notifications |
| Mobile access | None | GitHub mobile | Azure DevOps mobile |
| Offline | Yes | No | No |
| Setup | Zero | Project + labels | Board columns + config |
| Enterprise | Limited | GitHub Enterprise | Azure DevOps Services/Server |

## REST API (api.ts)

For operations the CLI can't handle (like tag removal), AgentFlow includes a Bun script:

```bash
# Tag operations
bun .agentflow/azure-devops/api.ts tag remove 123 "needs-feedback"
bun .agentflow/azure-devops/api.ts tag set 123 "tag1; tag2; tag3"

# Uses Azure AD token from: az account get-access-token
```

The script:
1. Gets an access token via `az account get-access-token`
2. Calls the Azure DevOps REST API with PATCH operations
3. Updates the `System.Tags` field directly

## Tips

### Quick Status Check

```bash
# Via Azure CLI
COLUMN_FIELD=$(jq -r '.boardColumnField' .agentflow/azure-devops.json)
PROJECT=$(jq -r '.project' .agentflow/azure-devops.json)
ORG=$(jq -r '.organization' .agentflow/azure-devops.json)

az boards query \
  --wiql "SELECT [System.Id], [System.Title], [$COLUMN_FIELD] FROM workitems WHERE [System.TeamProject] = '$PROJECT' AND [System.State] <> 'Removed'" \
  --org "$ORG" \
  --project "$PROJECT" \
  -o table
```

### View in Azure DevOps UI

Open directly:
```
https://dev.azure.com/ORG/PROJECT/_boards/board/t/TEAM/BOARD
```

### Verify Column Field

```bash
# Check if a work item has the column field
az boards work-item show --id 123 -o json | \
  jq '.fields | to_entries[] | select(.key | contains("Kanban.Column"))'
```

### Debug WIQL Queries

Test queries in Azure DevOps UI:
1. Go to **Boards** > **Queries**
2. Create new query
3. Switch to **WIQL** mode (Editor dropdown)
4. Paste and run your query

## Limitations

### Azure DevOps CLI

1. **Cloud only:** Works with Azure DevOps Services (cloud), not Azure DevOps Server (on-premises)
2. **No tag removal:** CLI only adds tags; removal requires REST API
3. **HTML required:** Description and Discussion use HTML, not markdown
4. **Rate limits:** API has rate limits (generous compared to GitHub)

### Process Templates

1. **State customization:** May require admin access
2. **Transition rules:** Some processes enforce state transitions
3. **Required fields:** Some processes require Effort, Story Points, etc.

### Multi-Board Scenarios

If work items appear on multiple boards (multi-team), they'll have multiple `WEF_*_Kanban.Column` fields. AgentFlow uses the field specified in config, but manual board moves may update a different field.

## Migration

### From JSON Backend

1. For each card in `board.json`:
   ```bash
   # Read card data
   TITLE=$(jq -r '.cards[] | select(.id == "CARD_ID") | .title' .agentflow/board.json)

   # Create work item
   az boards work-item create --title "$TITLE" --type "Product Backlog Item" ...

   # Set column, tags, description
   az boards work-item update --id NEW_ID --description "$(cat .agentflow/cards/CARD_ID.md)" ...
   ```
2. Replace `board.json` with `azure-devops.json`
3. Remove `cards/` directory

### From GitHub Backend

1. Export issues from GitHub
2. Create work items in Azure DevOps
3. Map labels to tags
4. Replace `github.json` with `azure-devops.json`

## References

- [Azure DevOps CLI](https://learn.microsoft.com/en-us/azure/devops/cli/)
- [az boards work-item](https://learn.microsoft.com/en-us/cli/azure/boards/work-item)
- [WIQL Syntax](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [Work Item Tags](https://learn.microsoft.com/en-us/azure/devops/boards/queries/add-tags-to-work-items)
- [Kanban Board Columns](https://learn.microsoft.com/en-us/azure/devops/boards/boards/add-columns)
- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
