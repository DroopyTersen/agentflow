# /af show - Azure DevOps Backend

Display full card information.

## Process

**Step 1: Read config values from `.agentflow/azure-devops.json`**

Read the `organization` value from the config file.

**Step 2: Get work item with all details**

⚠️ **Use literal values to avoid shell quoting issues:**

```bash
az boards work-item show --id {id} --expand all --org "{organization}" -o json
```

Replace `{id}` with the actual work item ID, and `{organization}` with the org URL from config.

**Common errors and fixes:**
| Error | Cause | Fix |
|-------|-------|-----|
| `unrecognized arguments: --project` | `work-item show` doesn't take `--project` | Remove `--project`, only use `--id` and `--org` |
| `expand parameter can not be used with fields` | Can't combine `--expand` and `--fields` | Use `--expand all` alone, then parse with jq |
| `TF401232: does not exist or no permissions` | Missing `--org` parameter | Always include `--org "{organization}"` |

This returns:
- `fields.System.Title` - Title
- `fields.System.Description` - Description (card body)
- `fields.System.State` - Workflow state
- `fields.System.Tags` - Tags (semicolon-separated)
- `fields.{boardColumnField}` - Kanban column
- `relations` - Links to other work items, PRs, etc.

**Step 3: Get ALL discussion comments (CRITICAL)**

**⚠️ CRITICAL: `System.History` only shows the MOST RECENT comment, not all comments!**

To get ALL comments, you MUST use the **updates** API:

```bash
# Get ALL comments/history entries for a work item
az devops invoke --area wit --resource updates --route-parameters id={id} --org "{organization}" -o json | jq '.value[] | select(.fields["System.History"]) | {rev: .rev, history: .fields["System.History"].newValue}'
```

Replace `{id}` with the actual work item ID, and `{organization}` with the org URL from config.

**This returns ALL discussion entries** including:
- Human questions and feedback
- Agent proposals and responses
- Decision records

**DO NOT use this (only shows latest):**
```bash
# ❌ WRONG - only shows most recent comment
az boards work-item show --id {id} --expand all --org "{organization}" -o json | jq '.fields["System.History"]'
```

**Verification - confirm you see all comments:**
```bash
# Count total comments
az devops invoke --area wit --resource updates --route-parameters id={id} --org "{organization}" -o json | jq '[.value[] | select(.fields["System.History"])] | length'
```

## Check for Linked PRs

Work items can have relations to Pull Requests:
```bash
az boards work-item show --id {id} --expand all --org "{organization}" -o json | jq '.relations[] | select(.rel == "ArtifactLink" and (.url | contains("PullRequest")))'
```

Or search for PRs that reference the work item:
```bash
az repos pr list --project "{project}" --org "{organization}" -o json | jq '.[] | select(.description | contains("#{id}"))'
```

## Display Order

1. Work item ID, title, state
2. Current column (from Kanban column field)
3. Tags
4. Full description (card context)
5. Recent discussion/history
6. Linked PRs (if any)

## Why Discussion Matters

Discussion contains the ongoing dialogue:
- Agent questions and findings
- Human feedback and decisions
- Status updates and blockers
- Code review results

Without discussion history, you lose critical context.

## Output Format

```
# #123 Add OAuth login

**Column:** Tech Design
**Tags:** enhancement, high
**State:** Active

---

[Full description content]

---

## Discussion

**Agent (2026-01-10):**
I have some questions about the OAuth implementation...

**Human (2026-01-10):**
Use Google OAuth only for now.

**Agent (2026-01-11):**
Tech design complete. Ready for implementation.

---

## Linked PRs

- PR #456 (Active): Implement OAuth login
```

## When No PR Exists

If no linked PR is found, simply omit the "Linked PRs" section.
