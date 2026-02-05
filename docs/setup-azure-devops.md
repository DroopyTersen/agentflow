# Azure DevOps Backend Setup

This guide walks through setting up Azure DevOps Boards as the backend for AgentFlow.

## Overview

The Azure DevOps backend uses Azure Boards Kanban columns to track AgentFlow card state:

| AgentFlow Concept | Azure DevOps Equivalent |
|-------------------|-------------------------|
| Board | Kanban Board |
| Card | Work Item (Product Backlog Item, User Story, etc.) |
| Card context | Work Item Description field (HTML) |
| Conversation log | Work Item Discussion (HTML) |
| Column | Kanban board column field (`WEF_*_Kanban.Column`) |
| Tags | Work Item Tags (`System.Tags`) |
| Priority | Position in column or Priority field |

## Prerequisites

### 1. Azure CLI with DevOps Extension

```bash
# Check Azure CLI version
az --version

# Install DevOps extension if needed
az extension add --name azure-devops

# Verify extension
az extension show --name azure-devops
```

### 2. Authentication

```bash
# Login to Azure (opens browser)
az login

# Set defaults for your org and project
az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG project=YOUR_PROJECT

# Verify access
az devops project show --project YOUR_PROJECT
```

### 3. Bun Runtime (for tag removal)

The Azure CLI can only add tags, not remove them. A Bun script handles tag removal via REST API.

```bash
# Install Bun if needed
curl -fsSL https://bun.sh/install | bash

# Verify
bun --version
```

## Step 1: Configure Kanban Board Columns

Azure DevOps stores Kanban columns in board-scoped extension fields. The board must have exactly these 7 columns (case-sensitive):

| Column | Purpose |
|--------|---------|
| `New` | Human creates cards |
| `Approved` | Human approves for agent work |
| `Refinement` | Agent explores requirements |
| `Tech Design` | Agent designs approaches |
| `Implementation` | Agent implements |
| `Final Review` | Human reviews |
| `Done` | Complete |

### Configure via Azure DevOps UI

1. Go to **Azure DevOps** > **Boards** > **Boards**
2. Select your team's board (e.g., "Backlog items" or "Stories")
3. Click the **gear icon** (⚙️) > **Columns**
4. Add/rename columns to match the 7 above exactly
5. Map workflow states to columns (multiple columns can map to the same state)

**Tips:**
- Column names are case-sensitive
- Avoid split columns initially (simplifies setup)
- Use the Requirement-level board (Product Backlog Item for Scrum, User Story for Agile)

## Step 2: Discover Board Column Field Names

Azure DevOps stores Kanban columns in board-scoped WEF (Work Item Extension) fields. You need to find the field names for your board.

### Method: Derive from Work Item Fields

1. Create or find a work item that appears on your target board
2. Drag it on the board at least once (ensures the field is populated)
3. Run:

```bash
# Get the Kanban column field
az boards work-item show --id YOUR_WORK_ITEM_ID -o json | \
  jq -r '.fields | keys[] | select(test("_Kanban\\.Column$"))'

# Example output:
# WEF_1058FFCEC17C4C3E835F0AAD3CE06720_Kanban.Column
```

4. Also find the split-column done field (optional):

```bash
az boards work-item show --id YOUR_WORK_ITEM_ID -o json | \
  jq -r '.fields | keys[] | select(test("_Kanban\\.Column\\.Done$"))'

# Example output:
# WEF_1058FFCEC17C4C3E835F0AAD3CE06720_Kanban.Column.Done
```

**Note:** If multiple `WEF_*_Kanban.Column` fields exist, your work item is on multiple boards. Use the Boards REST API to identify which field belongs to which board.

## Step 3: Create Configuration File

Create `.agentflow/azure-devops.json` in your project:

```json
{
  "organization": "https://dev.azure.com/YOUR_ORG",
  "project": "YOUR_PROJECT",
  "team": "YOUR_PROJECT Team",
  "board": "Backlog items",
  "areaPath": "YOUR_PROJECT",
  "iterationPath": "YOUR_PROJECT",
  "workItemType": "Product Backlog Item",
  "boardColumnField": "WEF_XXXXXXXX_Kanban.Column",
  "boardColumnDoneField": "WEF_XXXXXXXX_Kanban.Column.Done",
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

### Field Descriptions

| Field | Description |
|-------|-------------|
| `organization` | Full Azure DevOps org URL |
| `project` | Project name |
| `team` | Team name (usually `{Project} Team`) |
| `board` | Board name (`Backlog items`, `Stories`, etc.) |
| `areaPath` | Area path for new work items |
| `iterationPath` | Iteration path for new work items |
| `workItemType` | Work item type to create (see Process Templates below) |
| `boardColumnField` | The WEF field from Step 2 |
| `boardColumnDoneField` | The WEF done field (optional, for split columns) |
| `boardColumns` | Maps AgentFlow column keys to exact Azure column names |
| `boardColumnDone` | Split column settings (all false if not using split columns) |

### Process Templates

Azure DevOps has different process templates with different work item types:

| Process | Requirement Type | Best For |
|---------|-----------------|----------|
| Scrum | Product Backlog Item | Teams using Scrum |
| Agile | User Story | Teams using Agile |
| Basic | Issue | Simple projects |
| CMMI | Requirement | Enterprise compliance |

Use the Requirement-level type as your `workItemType` so cards appear on the primary Kanban board.

## Step 4: Copy Files

### For Claude Code

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

### For Codex CLI

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

## Step 5: Verify Setup

### Test Configuration

```bash
cd /path/to/your-project

# Verify config file
cat .agentflow/azure-devops.json | jq .

# Test creating a work item
ORG=$(jq -r '.organization' .agentflow/azure-devops.json)
PROJECT=$(jq -r '.project' .agentflow/azure-devops.json)
TYPE=$(jq -r '.workItemType' .agentflow/azure-devops.json)

az boards work-item create --title "Test Card" --type "$TYPE" --project "$PROJECT" --org "$ORG"
```

### Test Moving via Column Field

```bash
COLUMN_FIELD=$(jq -r '.boardColumnField' .agentflow/azure-devops.json)
az boards work-item update --id YOUR_WORK_ITEM_ID --fields "$COLUMN_FIELD=Approved" --org "$ORG"
```

Check the Azure Boards UI to confirm the work item moved to the Approved column.

### Test AgentFlow Commands

```bash
# Claude Code
/af status
/af list

# Codex CLI
/prompts:af status
/prompts:af list
```

## Troubleshooting

### "azure-devops extension not found"

```bash
az extension add --name azure-devops
```

### "Please run 'az login'"

```bash
az login
```

### "TF400813: not authorized"

Check your permissions in Azure DevOps. You need:
- Work Items: Read & Write
- Project: Read

### "The field 'WEF_...' does not exist"

The work item may not be on the board yet. Drag it onto the board in the UI first to populate the extension field.

### Tags only add, don't replace

This is a known Azure CLI limitation. Use the Bun script for tag removal:

```bash
cd /path/to/your-project
bun .agentflow/azure-devops/api.ts tag remove WORK_ITEM_ID "tag-to-remove"
```

### Markdown not rendering in Discussion

Azure DevOps uses HTML, not markdown, for Description and Discussion fields. The AgentFlow backend handles this automatically, but if you're adding comments manually, use HTML:

```bash
# Instead of: **bold**
# Use: <b>bold</b>

# Instead of: - item
# Use: <ul><li>item</li></ul>
```

### Work item doesn't appear on board

Ensure:
1. The work item's Area Path matches the team's area path configuration
2. The work item type is included in the board's backlog settings
3. The work item state is mapped to a board column

## Quick Reference

After setup, use these commands:

```bash
# Claude Code
/af add "Title"           # Create card
/af list                  # List all cards
/af list --workable       # List workable cards
/af next                  # Work on next available card
/af status                # Board overview

# Codex CLI
/prompts:af add "Title"
/prompts:af list
/prompts:af list --workable
/prompts:af next
/prompts:af status
```

See [Azure DevOps Backlog Reference](azure-devops-backlog.md) for full command documentation.
