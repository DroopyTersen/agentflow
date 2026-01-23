# Setting Up AgentFlow in a New Project

This guide walks through setting up AgentFlow in a target project directory.

## Prerequisites

- Target project is a git repository
- A coding agent CLI installed (see Step 1)

---

## Step 1: Choose Your Coding Agent

AgentFlow supports multiple AI coding agents. Choose one:

| Agent | CLI | Best For |
|-------|-----|----------|
| **Claude Code** | `claude` | Anthropic's Claude models, native support |
| **Codex CLI** | `codex` | OpenAI's models, reasoning-focused |

**Install your chosen agent:**

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Codex CLI
npm install -g @openai/codex
```

---

## Step 2: Choose Your Backend

AgentFlow supports two backends for storing cards:

| Backend | Best For |
|---------|----------|
| **Local JSON** | Solo work, simple projects, offline use |
| **GitHub Projects** | Team collaboration, issue tracking integration |

**Note:** If using GitHub backend, you'll also need:
- GitHub CLI (`gh`) installed and authenticated
- `gh auth refresh -s project` (for project scope)

---

## Step 3: Setup Instructions

Choose your agent below for specific setup instructions:

- [Claude Code Setup](#claude-code-setup)
- [Codex CLI Setup](#codex-cli-setup)

---

# Claude Code Setup

## Copy Files

### For Local JSON Backend

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

### For GitHub Projects Backend

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

See [GitHub Backlog Setup](github-backlog.md) for detailed GitHub configuration.

## Claude Code File Structure

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

# Codex CLI Setup

## Copy Files

### For Local JSON Backend

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/

# Remove GitHub-specific files
rm -rf /path/to/your-project/.agentflow/github

# Ensure cards directory exists
mkdir -p /path/to/your-project/.agentflow/cards

# Create Codex config directory
mkdir -p /path/to/your-project/.codex/prompts
```

Then copy or create the `/af` prompt for Codex. You can either:

1. **Copy from user-level config** (if you have `~/.codex/prompts/af.md`):
   ```bash
   cp ~/.codex/prompts/af.md /path/to/your-project/.codex/prompts/
   ```

2. **Create a symlink to the JSON backend prompt**:
   ```bash
   # Create af.md that references .agentflow/json/
   cat > /path/to/your-project/.codex/prompts/af.md << 'EOF'
   ---
   description: AgentFlow board management using local JSON
   allowed-tools: Read, Write, Glob, Bash, Agent
   ---

   Read `.agentflow/json/README.md` for command reference, then execute the requested `/af` command.
   EOF
   ```

Run the setup:

```bash
cd /path/to/your-project
/prompts:af-setup-json
```

### For GitHub Projects Backend

```bash
# From the agentflow repo
cp -r project-files/.agentflow /path/to/your-project/

# Remove JSON-specific files
rm -f /path/to/your-project/.agentflow/board.json
rm -rf /path/to/your-project/.agentflow/json
rm -rf /path/to/your-project/.agentflow/cards

# Create Codex config directory
mkdir -p /path/to/your-project/.codex/prompts
```

Then copy or create the `/af` prompt for Codex:

1. **Copy from user-level config** (if you have `~/.codex/prompts/af.md`):
   ```bash
   cp ~/.codex/prompts/af.md /path/to/your-project/.codex/prompts/
   ```

2. **Create a new prompt referencing GitHub backend**:
   ```bash
   cat > /path/to/your-project/.codex/prompts/af.md << 'EOF'
   ---
   description: AgentFlow board management using GitHub Projects
   allowed-tools: Read, Write, Glob, Bash, Agent
   ---

   Read `.agentflow/github/README.md` for command reference, then execute the requested `/af` command.
   EOF
   ```

Run the setup:

```bash
cd /path/to/your-project
/prompts:af-setup-github
```

## Codex CLI File Structure

```
your-project/
├── .agentflow/
│   ├── board.json OR github.json  # Backend config
│   ├── cards/                     # Card context (JSON backend only)
│   ├── columns/                   # Phase instructions
│   ├── core.md                    # Shared concepts
│   ├── json/ OR github/           # Backend commands
│   ├── prompts/                   # Agent prompts
│   ├── loop.sh                    # External loop script (Claude)
│   ├── loop-codex.sh              # External loop script (Codex)
│   ├── ralph.md                   # Ralph agent instructions
│   ├── RALPH_LOOP_PROMPT.md       # Loop iteration instructions
│   └── PROJECT_LOOP_PROMPT.md     # YOUR PROJECT CONFIG
├── .codex/
│   └── prompts/
│       └── af.md                  # /prompts:af command
└── ... (your project files)
```

## Codex-Specific Notes

- Commands use `/prompts:af` instead of `/af`
- Agents are invoked with `Agent("name")` pattern
- The loop script is `.agentflow/loop-codex.sh`

See [Codex Compatibility Guide](codex-compatibility.md) for detailed Codex setup including:
- Converting Claude agents to Codex skills
- Running the Ralph loop with `codex exec`
- Dual-CLI configurations

---

# Post-Setup (Both Agents)

## Customize PROJECT_LOOP_PROMPT.md

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

## Verify Setup

Test the installation:

```bash
cd /path/to/your-project

# Claude Code
/af status

# Codex CLI
/prompts:af status

# Should show empty board or "No cards found"
```

## Create Your First Card

```bash
# Claude Code
/af add "My first feature"
/af move 1 approved

# Codex CLI
/prompts:af add "My first feature"
/prompts:af move 1 approved
```

## Running the Loop

Start the autonomous agent loop:

```bash
# Claude Code
.agentflow/loop.sh        # Default: 20 iterations
.agentflow/loop.sh 50     # Custom max iterations

# Codex CLI
.agentflow/loop-codex.sh
.agentflow/loop-codex.sh 50
```

The loop processes one card per iteration until all cards need human input.

---

# Keeping Files in Sync

When the AgentFlow source repo is updated, you may want to sync changes to your project.

## What to Sync

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

# Claude Code only: agents and commands
cp -r "$SOURCE/.claude/agents/" "$TARGET/.claude/"
cp "$SOURCE/.claude/commands/af.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-setup-github.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-setup-json.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/commands/af-final-review.md" "$TARGET/.claude/commands/"
cp "$SOURCE/.claude/settings.json" "$TARGET/.claude/"
```

## What NOT to Sync

Never overwrite these project-specific files:

- `.agentflow/PROJECT_LOOP_PROMPT.md` — your project config
- `.agentflow/board.json` or `github.json` — your cards
- `.agentflow/cards/` — your card context
- `.agentflow/progress.txt` — your session memory
- Any custom commands you've added

---

# Troubleshooting

## "/af command not found" (Claude Code)

Ensure `.claude/commands/af.md` exists and Claude Code is running in the project directory.

## "/prompts:af not found" (Codex CLI)

Ensure `.codex/prompts/af.md` exists and Codex is running in the project directory.

## "No backend found" error from loop.sh

Either `board.json` (JSON backend) or `github.json` (GitHub backend) must exist in `.agentflow/`.

## GitHub API errors

Run `/af-setup-github` (or `/prompts:af-setup-github`) to reconfigure, or check your `gh` CLI authentication:

```bash
gh auth status
```

## Loop exits immediately

Check `.agentflow/loop_status.txt` for status. Common causes:
- No cards in workable columns
- All cards tagged `needs-feedback` or `blocked`

---

# Project-Specific Files Reference

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
