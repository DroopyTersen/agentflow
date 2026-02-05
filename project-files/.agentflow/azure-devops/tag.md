# /af tag - Azure DevOps Backend

Add or remove tags from a work item.

**Note:** Azure DevOps stores tags in `System.Tags` as a semicolon-separated string.

## Quick Reference (Use These Commands)

### Add a tag

```bash
# First get existing tags
az boards work-item show --id {id} --org "{organization}" --query "fields.\"System.Tags\"" -o tsv

# Then update with the new tag appended (semicolon-separated)
az boards work-item update --id {id} --fields "System.Tags=existing-tag; new-tag" --org "{organization}"
```

Replace `{id}` and `{organization}` with values from config.

### Remove a tag (use the Bun helper)

⚠️ **Tag removal requires the REST API** — the CLI only adds, doesn't replace.

```bash
bun .agentflow/azure-devops/api.ts tag remove {id} needs-feedback
```

### Set all tags explicitly

```bash
bun .agentflow/azure-devops/api.ts tag set {id} "tag1; tag2"
```

The helper script uses Azure DevOps REST API with your `az login` credentials.

## Common Tags

- `needs-feedback` — Card waiting for human input
- `blocked` — External dependency blocking work

## Examples

```
/af tag 123 add needs-feedback
/af tag 123 remove blocked
```

## Confirm

"Tag `{tag}` added to #{id}"
"Tag `{tag}` removed from #{id}"
