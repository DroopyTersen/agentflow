# /af workflow - Azure DevOps Backend

Workflow commands: work, next, feedback, depends, review, loop.

## /af work {id}

Work on a specific card. Execute one phase based on current column.

**Process:**
1. Load config and get work item details (see `show.md`)
2. **⚠️ CRITICAL: Read ALL discussion comments** (not just latest):
   ```bash
   az devops invoke --area wit --resource updates --route-parameters id={id} --org "{organization}" -o json | jq '.value[] | select(.fields["System.History"]) | {rev: .rev, history: .fields["System.History"].newValue}'
   ```
   - Look for human responses to previous questions
   - Look for selected approach if you proposed options
   - Do NOT re-ask questions already answered
3. Check current Kanban column
4. Read corresponding column instructions from `.agentflow/columns/`
5. Execute the phase (incorporating any human feedback from comments)
6. Update card context (see `context.md`)
7. Move to next column if phase complete (see `move.md`)

## /af next

Find and work on the next available card.

**Process:**

1. Query workable items:

⚠️ **CRITICAL: Use literal values in the WIQL query** — Shell variable interpolation fails due to quoting issues.

Read config values from `.agentflow/azure-devops.json`, then use them literally:

```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.Tags], [{boardColumnField}] FROM WorkItems WHERE [System.AreaPath] = '{areaPath}'" \
  --org "{organization}" \
  --project "{project}" \
  -o json
```

This returns JSON with work items. Parse it with `jq` to extract the fields.

2. Filter to workable:
   - Column in: Approved, Refinement, Tech Design, Implementation
   - No `needs-feedback` tag
   - No `blocked` tag

3. Check dependencies (parse `## Dependencies` from Description)
   - Skip items with unfinished predecessors

4. Select highest priority item (parse `## Priority` from Description)

5. Execute `/af work {id}` on selected item

**If no workable cards:** Output `AGENTFLOW_NO_WORKABLE_CARDS`

## /af feedback {id}

Respond to a card waiting for human feedback.

**Process:**
1. Get work item with discussion history (see `show.md`)
2. Display recent discussion
3. Prompt human for response
4. Add response as discussion comment
5. Remove `needs-feedback` tag (see `tag.md`)

## /af depends {id}

Manage dependencies using work item relations.

**Show dependencies:**
```bash
az boards work-item show --id {id} --expand all --org "{organization}" -o json | jq '.relations[] | select(.rel | contains("Dependency"))'
```

**Add dependency (blocked by another item):**
```bash
az boards work-item relation add \
  --id {id} \
  --relation-type "System.LinkTypes.Dependency-Reverse" \
  --target-id {predecessor_id} \
  --org "{organization}"
```

**Remove dependency:**
```bash
az boards work-item relation remove \
  --id {id} \
  --relation-type "System.LinkTypes.Dependency-Reverse" \
  --target-id {predecessor_id} \
  --org "{organization}"
```

Replace `{id}`, `{predecessor_id}`, and `{organization}` with actual values.

**Relation types:**
- `System.LinkTypes.Dependency-Forward` — Successor (this blocks something else)
- `System.LinkTypes.Dependency-Reverse` — Predecessor (this is blocked by something)

**Note:** AgentFlow also stores dependencies in the Description markdown for portability:
```markdown
## Dependencies
Blocked by: #100, #101
```

## /af review {id}

Run code review on a card in Implementation.

**Process:**
1. Get card context (see `show.md`)
2. Load code-reviewer prompt from `.agentflow/prompts/code-reviewer.md`
3. Execute review against implementation
4. Add review results to discussion
5. If score >= 70: move to Final Review
6. If score < 70: add findings, keep in Implementation

## /af loop

Display instructions for running the external loop.

**Output:**
```
Run the AgentFlow loop with:

  .agentflow/loop.sh              # Claude Code (default)
  .agentflow/loop.sh --codex      # Codex CLI
  .agentflow/loop.sh 50           # Custom max iterations

The loop runs until:
- No workable cards remain
- Max iterations reached
- Manual interrupt (Ctrl+C)
```
