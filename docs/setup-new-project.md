# Setting Up AgentFlow in a New Project

This guide walks through setting up AgentFlow in a target project directory.

## Prerequisites

- Target project is a git repository
- Claude Code CLI installed (or OpenAI Codex CLI — see [Codex Compatibility](codex-compatibility.md))
- (Optional) GitHub CLI (`gh`) installed if using GitHub backend

---

## Step 1: Choose Your Backend

AgentFlow supports two backends for storing cards. Choose one before copying files:

| Backend | Best For |
|---------|----------|
| **Local JSON** | Solo work, simple projects, offline use |
| **GitHub Projects** | Team collaboration, issue tracking integration |

---

## Step 2: Copy Files

### Option A: Local JSON Backend

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/
cp -r project-files/.claude /path/to/your-project/

# Remove GitHub-specific files
rm -rf /path/to/your-project/.agentflow/github

# Ensure cards directory exists
mkdir -p /path/to/your-project/.agentflow/cards
```

Then run the setup command:

```bash
cd /path/to/your-project
/af-setup-json
```

### Option B: GitHub Projects Backend

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/
cp -r project-files/.claude /path/to/your-project/

# Remove JSON-specific files
rm -f /path/to/your-project/.agentflow/board.json
rm -rf /path/to/your-project/.agentflow/json
rm -rf /path/to/your-project/.agentflow/cards
```

Then run the setup command:

```bash
cd /path/to/your-project
/af-setup-github
```

This will guide you through:
1. Creating a GitHub Project (v2) with the correct columns
2. Configuring labels for card types and tags
3. Creating `.agentflow/github.json` with project IDs

See [docs/github-backlog.md](github-backlog.md) for detailed GitHub setup.

---

## Step 3: Customize PROJECT_LOOP_PROMPT.md

Edit `.agentflow/PROJECT_LOOP_PROMPT.md` with project-specific context:

```markdown
# Project Configuration

## Project Overview
{What is this project? What does it do?}

## Tech Stack
- Language: {TypeScript, Python, etc.}
- Framework: {React, FastAPI, etc.}
- Testing: {bun test, pytest, etc.}

## Verification Commands
{What commands should agents run to verify changes?}
- `bun test` — Run unit tests
- `bun run typecheck` — Type check
- `bun run build` — Build the project

## Project Conventions
{Any project-specific rules or patterns?}

## Important Files
{Key files agents should know about}
```

This file is read by agents at the start of each loop iteration.

---

## Step 4: Verify Setup

Test the installation:

```bash
cd /path/to/your-project

# Check /af command works
/af status

# Should show empty board or "No cards found"
```

---

## Step 5: Create Your First Card

```bash
/af add "My first feature"
```

This creates a card in the "New" column. Move it to "Approved" when ready:

```bash
/af move 1 approved
```

---

## Running the Loop

Start the autonomous agent loop:

```bash
.agentflow/loop.sh        # Default: 20 iterations
.agentflow/loop.sh 50     # Custom max iterations
```

The loop processes one card per iteration until all cards need human input.

---

## File Structure After Setup

### Local JSON Backend

```
your-project/
├── .agentflow/
│   ├── board.json            # Card state
│   ├── cards/                # Card context files
│   ├── columns/              # Phase instructions
│   ├── core.md               # Shared concepts
│   ├── json/                 # JSON backend commands
│   ├── prompts/              # Agent prompts
│   ├── loop.sh               # External loop script
│   ├── ralph.md              # Ralph agent instructions
│   ├── RALPH_LOOP_PROMPT.md  # Loop iteration instructions
│   ├── PROJECT_LOOP_PROMPT.md # YOUR PROJECT CONFIG (customize this!)
│   ├── progress.txt          # Session memory (created during loop)
│   └── iterations/           # Per-iteration output (created during loop)
├── .claude/
│   ├── settings.json         # Tool permissions
│   ├── agents/               # Specialized agents
│   │   ├── code-explorer.md
│   │   ├── code-architect.md
│   │   └── code-reviewer.md
│   └── commands/
│       ├── af.md             # /af command
│       ├── af-final-review.md
│       ├── af-setup-github.md
│       └── af-setup-json.md
└── ... (your project files)
```

### GitHub Projects Backend

```
your-project/
├── .agentflow/
│   ├── github.json           # GitHub project config
│   ├── columns/              # Phase instructions
│   ├── core.md               # Shared concepts
│   ├── github/               # GitHub backend commands
│   ├── prompts/              # Agent prompts
│   ├── loop.sh               # External loop script
│   ├── ralph.md              # Ralph agent instructions
│   ├── RALPH_LOOP_PROMPT.md  # Loop iteration instructions
│   ├── PROJECT_LOOP_PROMPT.md # YOUR PROJECT CONFIG (customize this!)
│   ├── progress.txt          # Session memory (created during loop)
│   └── iterations/           # Per-iteration output (created during loop)
├── .claude/
│   ├── settings.json         # Tool permissions
│   ├── agents/               # Specialized agents
│   │   ├── code-explorer.md
│   │   ├── code-architect.md
│   │   └── code-reviewer.md
│   └── commands/
│       ├── af.md             # /af command
│       ├── af-final-review.md
│       ├── af-setup-github.md
│       └── af-setup-json.md
└── ... (your project files)
```

---

## Project-Specific Files

Over time, your project will accumulate files that diverge from the template:

| File | Template vs Project-Specific |
|------|------------------------------|
| `PROJECT_LOOP_PROMPT.md` | **Project-specific** — your config |
| `board.json` or `github.json` | **Project-specific** — your cards |
| `.agentflow/cards/*.md` | **Project-specific** — your card context |
| `progress.txt` | **Project-specific** — session memory |
| `RALPH_LOOP_PROMPT.md` | Template — sync from source |
| `columns/*.md` | Template — sync from source |
| `.claude/agents/*.md` | Template — sync from source |
| `.claude/commands/af*.md` | Template — sync from source |

---

## Keeping Files in Sync

When the AgentFlow source repo is updated, you may want to sync changes to your project.

### What to Sync

Sync these files/directories from `agentflow/project-files/`:

```bash
# From agentflow repo root
SOURCE="project-files"
TARGET="/path/to/your-project"

# Core loop logic
cp "$SOURCE/.agentflow/RALPH_LOOP_PROMPT.md" "$TARGET/.agentflow/"
cp "$SOURCE/.agentflow/loop.sh" "$TARGET/.agentflow/"
cp "$SOURCE/.agentflow/ralph.md" "$TARGET/.agentflow/"
cp "$SOURCE/.agentflow/core.md" "$TARGET/.agentflow/"

# Phase instructions
cp -r "$SOURCE/.agentflow/columns/" "$TARGET/.agentflow/"

# Agent prompts
cp -r "$SOURCE/.agentflow/prompts/" "$TARGET/.agentflow/"

# Backend commands (sync whichever you use)
cp -r "$SOURCE/.agentflow/json/" "$TARGET/.agentflow/"    # If using JSON
cp -r "$SOURCE/.agentflow/github/" "$TARGET/.agentflow/"  # If using GitHub

# Agents
cp -r "$SOURCE/.claude/agents/" "$TARGET/.claude/"

# Commands (careful: project may have custom commands)
cp "$SOURCE/.claude/commands/af.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-setup-github.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-setup-json.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-final-review.md" "$TARGET/.claude/commands/"

# Settings (merge carefully if project has customizations)
cp "$SOURCE/.claude/settings.json" "$TARGET/.claude/"
```

### What NOT to Sync

Never overwrite these project-specific files:

- `.agentflow/PROJECT_LOOP_PROMPT.md` — your project config
- `.agentflow/board.json` or `github.json` — your cards
- `.agentflow/cards/` — your card context
- `.agentflow/progress.txt` — your session memory
- Any custom commands you've added to `.claude/commands/`

### Sync Script

You can create a sync script in your project:

```bash
#!/bin/bash
# sync-agentflow.sh — Run from your project root

AGENTFLOW_REPO="/path/to/agentflow"
SOURCE="$AGENTFLOW_REPO/project-files"

echo "Syncing AgentFlow from $AGENTFLOW_REPO..."

# Core files
cp "$SOURCE/.agentflow/RALPH_LOOP_PROMPT.md" .agentflow/
cp "$SOURCE/.agentflow/loop.sh" .agentflow/
cp "$SOURCE/.agentflow/ralph.md" .agentflow/
cp "$SOURCE/.agentflow/core.md" .agentflow/
cp -r "$SOURCE/.agentflow/columns/" .agentflow/
cp -r "$SOURCE/.agentflow/prompts/" .agentflow/

# Backend commands (uncomment the one you use)
# cp -r "$SOURCE/.agentflow/json/" .agentflow/
# cp -r "$SOURCE/.agentflow/github/" .agentflow/

# Claude config
cp -r "$SOURCE/.claude/agents/" .claude/
cp "$SOURCE/.claude/commands/af.md" .claude/commands/
cp "$SOURCE/.claude/commands/af-setup-github.md" .claude/commands/
cp "$SOURCE/.claude/commands/af-setup-json.md" .claude/commands/
cp "$SOURCE/.claude/commands/af-final-review.md" .claude/commands/
cp "$SOURCE/.claude/settings.json" .claude/

echo "Done. Review changes with: git diff"
```

---

## Troubleshooting

### "/af command not found"

Ensure `.claude/commands/af.md` exists and Claude Code is running in the project directory.

### "No backend found" error from loop.sh

Either `board.json` (JSON backend) or `github.json` (GitHub backend) must exist in `.agentflow/`.

### GitHub API errors

Run `/af-setup-github` to reconfigure, or check your `gh` CLI authentication:

```bash
gh auth status
```

### Loop exits immediately

Check `.agentflow/loop_status.txt` for status. Common causes:
- No cards in workable columns
- All cards tagged `needs-feedback` or `blocked`

---

## Example: Mayi Project

The `mayi` project uses AgentFlow with the GitHub backend. Key customizations:

**`.agentflow/PROJECT_LOOP_PROMPT.md`:**
- References project-specific docs (`docs/house-rules.md`)
- Defines TDD requirements
- Specifies verification via Agent Game Harness
- Links to UI testing approach with Storybook

**Custom commands:**
- `.claude/commands/never-stop.md` — project-specific command

This shows how your project will naturally accumulate customizations while still benefiting from AgentFlow updates.

---

## OpenAI Codex CLI Support

AgentFlow is also compatible with OpenAI Codex CLI. For dual-CLI setup:

```bash
# Create AGENTS.md symlink (Codex reads this instead of CLAUDE.md)
ln -s CLAUDE.md AGENTS.md

# Create Codex skills directory
mkdir -p .codex/skills
ln -s ../../.claude/skills/agentflow .codex/skills/agentflow

# Run Codex version of the loop
.agentflow/loop-codex.sh
```

For full details including:
- Converting Claude agents to Codex skills
- Setting up `/prompts:af` commands
- Running the Ralph loop with `codex exec`
- Testing and validation

See **[Codex Compatibility Guide](codex-compatibility.md)**.
