# /af context - Azure DevOps Backend

Update card context. **Critical:** Know when to use Description vs Discussion.

## Terminology Mapping

Column files use abstract terms. Here's how they map to Azure DevOps:

| Abstract Term | Azure DevOps Implementation |
|---------------|----------------------------|
| Card body | Work Item Description field |
| Card discussion | Work Item Discussion (via `--discussion`) |
| Add `needs-feedback` tag | Update `System.Tags` field |
| Remove tag | Update `System.Tags` field |

## Description vs Discussion (Important)

| Content Type | Where | Why |
|--------------|-------|-----|
| Finalized requirements | Description | Permanent documentation |
| Chosen tech design | Description | Permanent documentation |
| History table updates | Description | Track column transitions |
| Questions for human | **Discussion** | Conversation, not decisions |
| Proposed approaches | **Discussion** | Options, not final choice |
| Agent-human dialogue | **Discussion** | Conversation belongs in history |

**Rule:** If you're asking a question or presenting options, use Discussion. Only update Description after human responds with a decision.

## Updating Description

Use for **finalized content only**.

⚠️ **CRITICAL: Use literal org URL, not shell variables** — Shell quoting issues cause failures.

### `append` — Add content to Description

```bash
# Get current description
az boards work-item show --id {id} --org "{organization}" --query "fields.\"System.Description\"" -o tsv

# Update with new content (Description is HTML)
az boards work-item update --id {id} --description "<h2>New Section</h2><p>New content here</p>" --org "{organization}"
```

Replace `{id}` with the actual work item ID and `{organization}` with the org URL from config.

### `history` — Add row to History table

1. Get current description
2. Find the History table in the markdown/HTML
3. Add new row: `| {YYYY-MM-DD} | {column} | Agent | {notes} |`
4. Update description

## Adding Discussion Comments

Use for **questions, proposals, and dialogue**.

**Important:** Azure DevOps Discussion uses HTML, not markdown. Use `<b>`, `<br>`, `<ol>/<li>` etc.

```bash
# Add a discussion comment (HTML formatting)
az boards work-item update --id {id} --discussion "<b>Agent (2026-02-04):</b> Your message here" --org "{organization}"
```

Replace `{id}` with the actual work item ID.

**When to use Discussion:**
- Asking clarifying questions → discussion + `needs-feedback` tag
- Presenting multiple approaches for selection → discussion + `needs-feedback` tag
- Responding to human feedback → discussion
- Progress updates → discussion

**When to update Description:**
- Requirements are finalized (human approved)
- Tech design is chosen (human selected approach)
- Adding History table entry
- Moving to next phase with complete documentation

## Examples

### Good: Questions as Discussion (use HTML)
```bash
az boards work-item update --id {id} --discussion "<b>Agent (2026-01-11): Questions</b><br><br>Before I can finalize requirements, I need to clarify:<ol><li>Should we support both OAuth providers or just Google?</li><li>Where should user sessions be stored?</li></ol>" --org "{organization}"

# Then add needs-feedback tag
# (see tag.md for the read-modify-write process)
```

### Good: Final requirements in Description
```bash
# Only AFTER human answered questions
# Get current description, append finalized requirements, update
```

### Bad: Don't put questions in Description
Questions belong in Discussion, not the Description field.
