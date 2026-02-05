# Azure DevOps Backend — Implementation & Test Checklist

This is a **practical, incremental** checklist for building and validating the Azure DevOps backend step-by-step (with UI verification in Azure DevOps along the way).

It complements `specs/azure-devops-backend.plan.md` (which is the design/plan).

---

## Phase 0 — Manual Setup (Human)

**Target environment:**
- Organization: `https://dev.azure.com/core-bts-02`
- Project: `NRI-Spark`
- Team: `NRI-Spark Team`
- Board: `Backlog items`
- Process: Scrum (work item type: `Product Backlog Item`)

- [x] Choose the Azure DevOps **Organization**, **Project**, **Team**, and **Kanban Board** that AgentFlow will target.
- [x] In Azure DevOps UI: **Boards → Boards → Board settings → Columns**
  - [x] Configure **exactly** these columns (case-sensitive):
    - [x] `New`
    - [x] `Approved`
    - [x] `Refinement`
    - [x] `Tech Design`
    - [x] `Implementation`
    - [x] `Final Review`
    - [x] `Done`
  - [x] Prefer **no split columns** initially.
  - [x] Map workflow states to columns (can map multiple columns to the same State, but avoid editing State directly after this—move via board or `/af move`).
- [x] Ensure the work item type you'll use (recommended: one type like `User Story`) appears on that board for the chosen area path/team settings.
  - Using: `Product Backlog Item` (Scrum process)

**Acceptance check (UI):**
- [x] The board shows items of the chosen work item type.
- [x] You can drag an item across all 7 columns.
- [x] CLI can move item through all columns (verified with work item #113866)

---

## Phase 1 — CLI Prereqs + Auth (Human)

- [x] Install Azure CLI + ADO extension:
  - [x] `az --version` → 2.64.0
  - [x] `az extension add --name azure-devops` → 1.0.2
- [x] Authenticate:
  - [x] `az login` (Core BTS tenant)
  - [x] `az devops configure --defaults organization=https://dev.azure.com/core-bts-02 project=NRI-Spark`

**Acceptance check (CLI):**
- [x] `az devops project show --project NRI-Spark` works (verified access)

---

## Phase 2 — Discover Board Column Fields (Human; one-time)

We need the board-scoped Kanban column field names (typically `WEF_*_Kanban.Column` and optionally `WEF_*_Kanban.Column.Done`).

- [x] Pick an existing work item that is visible on the target board.
  - Created test item #113866
- [x] Move it on the board at least once (ensures extension fields are present).
  - Moved through all 7 columns via CLI
- [x] Discover column field:
  - **Found:** `WEF_1058FFCEC17C4C3E835F0AAD3CE06720_Kanban.Column`
- [x] (Optional) Discover split-column done field:
  - **Found:** `WEF_1058FFCEC17C4C3E835F0AAD3CE06720_Kanban.Column.Done`

**Acceptance check:**
- [x] Exactly one `*_Kanban.Column` key is returned for a simple single-board setup.
- If multiple are returned, the implementation should use the Boards REST API method to pick the correct one (defer until needed).

---

## Phase 3 — Create `.agentflow/azure-devops.json` (Human)

- [x] Create `.agentflow/azure-devops.json` in the target project with:
  - [x] `organization`, `project`, `team`, `board`
  - [x] `boardColumnField` and (optional) `boardColumnDoneField`
  - [x] `boardColumns` mapping AgentFlow canonical columns → ADO column names

**Files created:**
- `/Users/drew/code/agentflow/project-files/.agentflow/azure-devops.json.template` (template for future projects)
- `/Users/drew/code/core/nri-spark/.agentflow/azure-devops.json` (actual config for testing)

**Acceptance check:**
- [x] The config is committed or at least present locally.

---

## Phase 4 — Minimal Backend Wiring (Implementation)

- [x] Add backend folder: `.agentflow/azure-devops/`
- [x] Add minimum command docs:
  - [x] `azure-devops/README.md`
  - [x] `azure-devops/list.md`
  - [x] `azure-devops/show.md`
  - [x] `azure-devops/move.md`
  - [x] `azure-devops/add.md`
  - [x] `azure-devops/context.md`
  - [x] `azure-devops/tag.md`
  - [x] `azure-devops/workflow.md`
- [x] Update dispatcher routing:
  - [x] `.claude/commands/af.md` detects `.agentflow/azure-devops.json`
  - [x] `.codex/prompts/af.md` detects `.agentflow/azure-devops.json`
- [x] Update shared docs that enumerate backends:
  - [x] `.agentflow/README.md`
  - [x] `.agentflow/core.md` (error string + "backend implementations" table)
  - [x] `.agentflow/loop.sh` (accept `.agentflow/azure-devops.json` as valid backend config)
  - [x] `.agentflow/ralph.md` (backend config list)

**Synced to test project:**
- `/Users/drew/code/core/nri-spark/.agentflow/` contains azure-devops backend + core files

**Acceptance check:**
- [x] `/af` can route to the azure-devops backend when `.agentflow/azure-devops.json` exists.

---

## Phase 5 — Command-by-Command Validation (We iterate)

### 5.1 `/af list`

- [x] Implement WIQL that selects:
  - work item `Id`, `Title`, `System.Tags`, `{boardColumnField}`, and timestamps
- [x] Group output by `{boardColumnField}` value
- [ ] Support `--workable` by filtering:
  - columns in: `Approved`, `Refinement`, `Tech Design`, `Implementation`
  - exclude `needs-feedback` / `blocked` tags

**Acceptance check (CLI + UI):**
- [x] Output groups match what you see on the ADO board (same counts per column).

### 5.2 `/af move <id> <column>`

- [x] Update `{boardColumnField}` to the configured column name string
- [ ] If split columns are used, also set `{boardColumnDoneField}` accordingly

**Acceptance check (UI):**
- [x] Work item moves to the expected column on the board immediately.

### 5.3 `/af show <id>`

- [x] Include:
  - [x] current board column (from `{boardColumnField}`)
  - [x] Description
  - [x] Tags
  - [ ] Recent history/discussion (at least enough to see latest Q&A)

**Acceptance check (UI parity):**
- [x] You can see what you need to run the next phase (context + latest discussion) without opening the UI.

### 5.4 `/af add <title>`

- [x] Create item of configured `workItemType`
- [x] Set Description to the AgentFlow markdown template (HTML format)
- [x] Set the board column to `New`

**Acceptance check (UI):**
- [x] Newly created item appears in the `New` column on the chosen board, with the expected Description contents.

### 5.5 `/af context <id> append|history`

- [x] `append`: update Description by appending HTML content
- [ ] `history`: add a row to the markdown history table in Description
- [x] Discussion: use `--discussion` with **HTML formatting** (not markdown)

**Key finding:** Azure DevOps uses HTML, not markdown, for Description and Discussion.

**Acceptance check (UI):**
- [x] The description updates display correctly in the work item form.
- [x] Discussion comments render with proper formatting when using HTML.

### 5.6 `/af tag <id> add|remove <tag>`

- [x] Implement tag add on `System.Tags` (semicolon-separated)
- [x] Implement tag remove via Bun REST API helper (`api.ts`)

**Key finding:** `az boards work-item update --fields "System.Tags=..."` only ADDS tags, it doesn't replace them. Solution: Bun script at `.agentflow/azure-devops/api.ts` uses REST API.

**Acceptance check (UI):**
- [x] Tags appear as expected (add works).
- [x] Tags disappear as expected (remove works via `bun api.ts tag remove`).

---

## Phase 5.7 — Setup Prompts

- [x] Create `.agentflow/prompts/af-setup-azure-devops.md` (detailed setup guide)
- [x] Create `.claude/commands/af-setup-azure-devops.md` (Claude wrapper)
- [x] Create `.codex/prompts/af-setup-azure-devops.md` (Codex wrapper)

**Acceptance check:**
- [x] `/af-setup-azure-devops` command exists and references the setup prompt

---

## Phase 5.8 — E2E Command Test (Automated)

Ran automated test with work item #113867:

- [x] `/af add` — Created work item
- [x] `/af move` — Moved through all 7 columns (New → Done)
- [x] `/af tag add` — Added `needs-feedback` tag
- [x] `/af tag remove` — Removed tag via `api.ts`
- [x] `/af context` — Added discussion comment (HTML)
- [x] `/af list` — Queried and returned both test items

---

## Phase 6 — Workflow Smoke Test (End-to-End)

Tested with card #113868:

- [x] Create a work item via `/af add` — Created #113868
- [x] Move it `New → Approved` (human gate) — Simulated human approval
- [x] Progress through columns: Approved → Refinement → Tech Design → Implementation → Final Review → Done
- [x] `needs-feedback` tag stops workability — Verified card excluded from workable query
- [x] Removing tag re-enables workability — Verified card returns to workable query
- [x] Final Review is human gate — Verified not in workable columns
- [x] Discussion comments work with HTML formatting — 7 comments added during workflow

**Acceptance check:**
- [x] The Ralph loop assumptions remain true: one card, one column per iteration, and "workable" detection behaves correctly.

---

## Phase 7 — Documentation (Complete)

- [x] Create `docs/setup-azure-devops.md` — Human-readable setup guide
- [x] Create `docs/azure-devops-backlog.md` — Reference documentation
- [x] Refactor `docs/setup-new-project.md` — Add Azure DevOps to backend selection

---

## Implementation Complete

All phases of the Azure DevOps backend implementation are complete:

| Phase | Status |
|-------|--------|
| Phase 0: Manual Setup | ✅ Complete |
| Phase 1: CLI Prereqs + Auth | ✅ Complete |
| Phase 2: Discover Board Column Fields | ✅ Complete |
| Phase 3: Create Config File | ✅ Complete |
| Phase 4: Minimal Backend Wiring | ✅ Complete |
| Phase 5: Command-by-Command Validation | ✅ Complete |
| Phase 5.7: Setup Prompts | ✅ Complete |
| Phase 5.8: E2E Command Test | ✅ Complete |
| Phase 6: Workflow Smoke Test | ✅ Complete |
| Phase 7: Documentation | ✅ Complete |

**Files created/modified:**

Backend commands:
- `project-files/.agentflow/azure-devops/README.md`
- `project-files/.agentflow/azure-devops/add.md`
- `project-files/.agentflow/azure-devops/list.md`
- `project-files/.agentflow/azure-devops/show.md`
- `project-files/.agentflow/azure-devops/move.md`
- `project-files/.agentflow/azure-devops/tag.md`
- `project-files/.agentflow/azure-devops/context.md`
- `project-files/.agentflow/azure-devops/workflow.md`
- `project-files/.agentflow/azure-devops/api.ts` (Bun REST API for tag removal)

Setup prompts:
- `project-files/.agentflow/prompts/af-setup-azure-devops.md`
- `project-files/.claude/commands/af-setup-azure-devops.md`
- `project-files/.codex/prompts/af-setup-azure-devops.md`

Updated files:
- `project-files/.agentflow/README.md`
- `project-files/.agentflow/core.md`
- `project-files/.agentflow/loop.sh`
- `project-files/.agentflow/ralph.md`
- `project-files/.claude/commands/af.md`
- `project-files/.codex/prompts/af.md`

Documentation:
- `docs/setup-azure-devops.md`
- `docs/azure-devops-backlog.md`
- `docs/setup-new-project.md` (updated)

