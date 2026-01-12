# /af context - GitHub Backend

Update the issue body (card context).

## Actions

### `append` — Add content to issue body

```bash
# Get current body
gh issue view NUMBER --json body -q '.body' > /tmp/issue-body.md

# Append new content
cat >> /tmp/issue-body.md << 'EOF'

{new content}
EOF

# Update issue
gh issue edit NUMBER --body-file /tmp/issue-body.md
```

### `history` — Add row to History table

1. Get current body
2. Find the History table
3. Add new row: `| {YYYY-MM-DD} | {column} | Agent | {notes} |`
4. Update issue body

## Examples

```
/af context 123 append "
## Refinement
**Date:** 2026-01-11
**Status:** Complete

### Requirements
- User can log in with Google OAuth
- Session persists for 7 days
"

/af context 123 history "Requirements documented, ready for tech design"
```

## Adding Comments (Alternative)

For conversation entries, prefer issue comments:
```bash
gh issue comment NUMBER --body "**Agent (2026-01-11):** Your message here"
```

This keeps the issue body clean and creates threaded conversation.
