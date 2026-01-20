# OpenAI Codex CLI Compatibility

This guide documents how to make AgentFlow compatible with [OpenAI Codex CLI](https://developers.openai.com/codex/cli), enabling teams to use either Claude Code or Codex with the same workflow.

---

## Overview

AgentFlow uses Claude Code's customization primitives:

| Claude Code Primitive | Purpose | Codex Equivalent |
|-----------------------|---------|------------------|
| `CLAUDE.md` | Project instructions | `AGENTS.md` |
| `.claude/commands/` | Slash commands | `~/.codex/prompts/` |
| `.claude/skills/` | Reusable workflows | `.codex/skills/` |
| `.claude/agents/` | Specialized sub-agents | No direct equivalent |
| `.claude/settings.json` | Permissions | `~/.codex/config.toml` |

---

## 1. Project Instructions: CLAUDE.md → AGENTS.md

### The Problem

Claude Code reads `CLAUDE.md` files for project context. Codex reads `AGENTS.md` files. Both serve the same purpose but have different names.

### Solution: Symlinks + Fallback Configuration

**Option A: Symlink (Recommended)**

Create a symlink so both tools read the same file:

```bash
# In your project root
ln -s CLAUDE.md AGENTS.md
```

Now both Claude Code and Codex read the same instructions.

**Option B: Configure Codex Fallback**

Codex supports fallback filenames when `AGENTS.md` doesn't exist. Add to `~/.codex/config.toml`:

```toml
# Tell Codex to try CLAUDE.md if AGENTS.md is missing
project_doc_fallback_filenames = ["CLAUDE.md"]
```

This way Codex will find `CLAUDE.md` automatically without symlinks.

### Discovery Order

Both tools walk from project root to current directory, merging instructions:

| Claude Code | Codex |
|-------------|-------|
| `~/.claude/CLAUDE.md` (global) | `~/.codex/AGENTS.md` (global) |
| `./CLAUDE.md` (project) | `./AGENTS.md` (project) |
| `./{subdir}/CLAUDE.md` | `./{subdir}/AGENTS.md` |

Both tools support override files (`CLAUDE.override.md` / `AGENTS.override.md`) for local variations.

### Size Limits

| Tool | Default Limit |
|------|---------------|
| Claude Code | No documented limit |
| Codex | 32 KiB (`project_doc_max_bytes`) |

Keep instructions under 32KB for Codex compatibility.

---

## 2. Skills: Nearly 1:1 Compatible

Skills work almost identically between Claude Code and Codex. This is the easiest primitive to port.

### File Format Comparison

**Claude Code SKILL.md:**
```yaml
---
name: agentflow
description: AgentFlow Kanban workflow for AI-assisted development...
---

# AgentFlow Skill

Instructions here...
```

**Codex SKILL.md:**
```yaml
---
name: agentflow
description: AgentFlow Kanban workflow for AI-assisted development...
metadata:
  short-description: Kanban workflow management
---

# AgentFlow Skill

Instructions here...
```

The formats are nearly identical. Codex adds an optional `metadata` field.

### Directory Structure

| Claude Code | Codex |
|-------------|-------|
| `.claude/skills/{name}/SKILL.md` | `.codex/skills/{name}/SKILL.md` |
| `~/.config/claude/skills/` | `~/.codex/skills/` |

### Making AgentFlow Skills Codex-Compatible

Copy the skills directory:

```bash
# From your project root
mkdir -p .codex/skills
cp -r .claude/skills/agentflow .codex/skills/agentflow
```

**Note:** Use a full copy, not a symlink. Codex may not follow symlinks correctly when loading skills.

### Invocation

| Claude Code | Codex |
|-------------|-------|
| Natural language triggers | Natural language triggers |
| `$agentflow` mention | `$agentflow` mention |
| `/skills` command | `/skills` command |

Both tools use semantic matching on descriptions to decide when to activate skills.

---

## 3. Commands → Prompts

Claude Code's commands and Codex's prompts serve similar purposes but have different formats and locations.

### Key Differences

| Aspect | Claude Code Commands | Codex Prompts |
|--------|---------------------|---------------|
| Location | `.claude/commands/{name}.md` | `~/.codex/prompts/{name}.md` |
| Scope | Per-project (repo) | Per-user (global only) |
| Invocation | `/command-name` | `/prompts:name` |
| Arguments | `$ARGUMENTS`, `$1`-`$9` | `$ARGUMENTS`, `$1`-`$9`, named args |

### Claude Code Command Format

```yaml
---
description: AgentFlow board management
allowed-tools: Read, Write, Glob, Bash, Agent
---

# Command instructions here...
```

### Codex Prompt Format

```yaml
---
description: AgentFlow board management
argument-hint: [CARD_ID=<id>] [COLUMN=<column>]
---

# Prompt instructions here...
```

### Porting Strategy

Since Codex prompts are user-scoped (global), you'll need to:

1. **Document the prompts** users should install
2. **Provide a setup script** that copies prompts to `~/.codex/prompts/`

Create a setup script (`scripts/setup-codex-prompts.sh`):

```bash
#!/bin/bash
# Install AgentFlow prompts for Codex CLI

CODEX_PROMPTS="$HOME/.codex/prompts"
mkdir -p "$CODEX_PROMPTS"

# Copy converted prompts
cp prompts/codex/af.md "$CODEX_PROMPTS/"
cp prompts/codex/af-setup-github.md "$CODEX_PROMPTS/"

echo "AgentFlow prompts installed to $CODEX_PROMPTS"
echo "Use /prompts:af in Codex to access"
```

### Example: Converting `/af` Command

**Claude Code (`.claude/commands/af.md`):**
```yaml
---
description: AgentFlow board management and workflow commands
allowed-tools: Read, Write, Glob, Bash, Agent
---

Usage: `/af <command> [args]`
...
```

**Codex (`~/.codex/prompts/af.md`):**
```yaml
---
description: AgentFlow board management and workflow commands
argument-hint: <command> [args]
---

Usage: `/prompts:af <command> [args]`
...
```

### Command Differences

| Action | Claude Code | Codex |
|--------|-------------|-------|
| Add card | `/af add "title"` | `/prompts:af add "title"` |
| List cards | `/af list` | `/prompts:af list` |
| Work on card | `/af work 123` | `/prompts:af work 123` |

Consider creating shorter aliases like `/prompts:afa` for add, `/prompts:afl` for list, etc.

---

## 4. Agents: No Direct Equivalent

Claude Code's agents (sub-agents) have no direct equivalent in Codex. Agents are specialized AI assistants with focused prompts.

### AgentFlow Agents

| Agent | Purpose |
|-------|---------|
| `code-explorer` | Codebase reconnaissance |
| `code-architect` | Architecture design |
| `code-reviewer` | Code review |

### Workaround Options

**Option A: Convert to Skills**

Reframe agents as skills that provide focused instructions:

```yaml
# .codex/skills/code-explorer/SKILL.md
---
name: code-explorer
description: Deep codebase analysis. Use when exploring code structure, tracing execution paths, or finding relevant files for a feature.
---

# Code Explorer

You are a specialized assistant for exploring and understanding codebases...
```

**Option B: Include in Prompts**

Embed agent instructions directly in prompts:

```yaml
# ~/.codex/prompts/af-explore.md
---
description: Run codebase exploration for a feature
argument-hint: <feature-description>
---

# Code Explorer Mode

You are exploring the codebase for: $ARGUMENTS

## Your Mission
1. Find all relevant existing code
2. Trace execution paths...
```

**Option C: External Scripts**

For complex agent workflows, use external scripts that orchestrate Codex:

```bash
#!/bin/bash
# scripts/explore.sh

codex --prompt "Read .claude/agents/code-explorer.md and follow those instructions for: $1"
```

### Recommendation

For AgentFlow, use **Option A (Skills)** for the most seamless experience:

```
.codex/skills/
├── agentflow/           # Main skill
├── code-explorer/       # Agent as skill
├── code-architect/      # Agent as skill
└── code-reviewer/       # Agent as skill
```

---

## 5. Settings and Permissions

### Claude Code Settings

```json
// .claude/settings.json
{
  "permissions": {
    "allow": ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task"]
  }
}
```

### Codex Configuration

```toml
# ~/.codex/config.toml

# Approval mode: "suggest" | "auto-edit" | "full-auto"
approval_mode = "suggest"

# Sandbox: "always" | "permissive" | "never"
sandbox = "permissive"

# Model selection
model = "gpt-4.1"

# AGENTS.md settings
project_doc_max_bytes = 32768
project_doc_fallback_filenames = ["CLAUDE.md"]
```

Codex uses a different permission model based on approval modes rather than explicit tool allow/deny lists.

---

## 6. Complete Setup for Dual Compatibility

### Directory Structure

```
your-project/
├── CLAUDE.md                      # Shared instructions
├── AGENTS.md → CLAUDE.md          # Symlink for Codex
├── .agentflow/                    # Workflow state (shared)
│   ├── board.json
│   ├── cards/
│   └── ...
├── .claude/                       # Claude Code config
│   ├── settings.json
│   ├── commands/
│   │   └── af.md
│   ├── skills/
│   │   └── agentflow/
│   └── agents/
│       ├── code-explorer.md
│       ├── code-architect.md
│       └── code-reviewer.md
└── .codex/                        # Codex config
    └── skills/
        ├── agentflow → ../../.claude/skills/agentflow
        ├── code-explorer/
        │   └── SKILL.md
        ├── code-architect/
        │   └── SKILL.md
        └── code-reviewer/
            └── SKILL.md
```

### Setup Script

Create `scripts/setup-dual-cli.sh`:

```bash
#!/bin/bash
# Setup AgentFlow for both Claude Code and Codex CLI

set -e

echo "Setting up AgentFlow for dual CLI support..."

# 1. Create AGENTS.md symlink
if [ ! -L "AGENTS.md" ] && [ ! -f "AGENTS.md" ]; then
    ln -s CLAUDE.md AGENTS.md
    echo "✓ Created AGENTS.md symlink"
fi

# 2. Create .codex/skills directory
mkdir -p .codex/skills

# 3. Symlink main agentflow skill
if [ ! -L ".codex/skills/agentflow" ]; then
    ln -s ../../.claude/skills/agentflow .codex/skills/agentflow
    echo "✓ Linked agentflow skill"
fi

# 4. Create agent-as-skill wrappers
for agent in code-explorer code-architect code-reviewer; do
    if [ ! -d ".codex/skills/$agent" ]; then
        mkdir -p ".codex/skills/$agent"

        # Extract name and description from Claude agent
        name=$(grep -A1 "^name:" ".claude/agents/$agent.md" | tail -1 | sed 's/name: //')
        desc=$(grep -A5 "^description:" ".claude/agents/$agent.md" | sed -n '2,5p' | tr '\n' ' ')

        cat > ".codex/skills/$agent/SKILL.md" << EOF
---
name: $agent
description: $desc
---

$(cat ".claude/agents/$agent.md" | sed '1,/^---$/d' | sed '1,/^---$/d')
EOF
        echo "✓ Created $agent skill"
    fi
done

# 5. Setup user prompts (optional - requires user confirmation)
echo ""
echo "To install /af command for Codex, run:"
echo "  mkdir -p ~/.codex/prompts"
echo "  cp .claude/commands/af.md ~/.codex/prompts/af.md"
echo "  # Then use: /prompts:af <command>"

echo ""
echo "Setup complete!"
```

---

## 7. Usage Comparison

### Adding a Card

| Claude Code | Codex |
|-------------|-------|
| `/af add "My feature"` | `/prompts:af add "My feature"` |
| Or: "add a card for my feature" | Or: "add a card for my feature" |

### Running the Loop

| Claude Code | Codex |
|-------------|-------|
| `.agentflow/loop.sh` | `.agentflow/loop.sh` |

The loop script works with both CLIs since it's external bash.

### Using Agents/Skills

| Claude Code | Codex |
|-------------|-------|
| `Agent("code-explorer")` | `$code-explorer` or natural language |
| Automatic via workflow | Automatic via workflow |

---

## 8. Limitations and Workarounds

### No Per-Project Prompts in Codex

Codex prompts are user-global (`~/.codex/prompts/`). Workarounds:

1. Use skills instead (skills can be per-project)
2. Document prompts users should install
3. Include setup scripts

### No `Agent()` Function in Codex

Codex doesn't have Claude Code's `Agent()` invocation. Workarounds:

1. Convert agents to skills
2. Use skill mentions (`$code-explorer`)
3. Include agent instructions inline in prompts

### Different Tool Permission Models

Claude Code uses explicit allow/deny lists. Codex uses approval modes. For shared workflows:

1. Codex `full-auto` ≈ Claude Code with all tools allowed
2. Codex `suggest` ≈ Claude Code with manual approval
3. Document recommended Codex settings for your workflow

---

## 9. Testing Compatibility

Before running the full loop, validate that Codex can interact with AgentFlow's backlog and board state.

### Part 1: Interactive Testing

Test basic skill/command functionality in interactive Codex:

```bash
# Start Codex interactively
codex

# Test 1: Check if skill is recognized
> $agentflow show me my board status

# Test 2: List cards (using skill or prompts)
> list my agentflow cards

# Test 3: Add a test card
> add a card called "Test Codex Integration"

# Test 4: Show card details
> show me details on card 1

# Test 5: Check JSON backend directly
> read .agentflow/board.json and summarize the cards
```

**Expected results:**
- Skill triggers on natural language about "agentflow", "board", "cards"
- Can read `board.json` or query GitHub Projects
- Can create/modify cards
- Status output matches Claude Code behavior

### Part 2: Non-Interactive Testing

Test `codex exec` for automation compatibility:

```bash
# Test read-only status check
codex exec "Read .agentflow/board.json and list all cards by column"

# Test with JSON output for parsing
codex exec --json "What cards are in the backlog?" | jq '.result'

# Test card creation (requires --full-auto)
codex exec --full-auto "Add a card titled 'Test from exec mode' to the board"

# Verify it worked
codex exec "How many cards are on the board now?"
```

### Part 3: Validation Checklist

| Test | Command | Expected |
|------|---------|----------|
| Skill loads | `$agentflow status` | Shows board summary |
| Read board | `read .agentflow/board.json` | Valid JSON parsed |
| List cards | `/prompts:af list` or natural language | Cards by column |
| Add card | `/prompts:af add "Test"` | Card created |
| Move card | `/prompts:af move 1 approved` | Card moved |
| Show card | `/prompts:af show 1` | Card details |

### Troubleshooting

**Skill not triggering:**
- Check `.codex/skills/agentflow/SKILL.md` exists
- Verify description contains trigger words
- Try explicit: `$agentflow` mention

**Permission errors:**
- For writes: use `--full-auto` or `--sandbox workspace-write`
- For reads: default should work

**JSON parsing issues:**
- Codex may format output differently than Claude
- Use `--json` mode and parse with `jq`

---

## 10. The Ralph Loop with Codex

The Ralph Loop pattern can run with Codex CLI using `codex exec` for non-interactive (headless) execution.

### Headless Mode Comparison

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| Headless flag | `claude -p "prompt"` | `codex exec "prompt"` |
| JSON output | `--output-format stream-json` | `--json` |
| Tool permissions | `--allowedTools "..."` | `--full-auto` or `--sandbox` |
| Output to file | stdout redirect | `-o output.json` |

### Creating loop-codex.sh

Create a Codex-compatible loop script at `.agentflow/loop-codex.sh`:

```bash
#!/bin/bash
#
# AgentFlow Ralph Loop (Codex CLI Version)
# Runs Codex repeatedly until no workable cards remain.
#
# Usage:
#   .agentflow/loop-codex.sh              # Default: max 20 iterations
#   .agentflow/loop-codex.sh 50           # Custom max iterations
#
# Requirements:
#   - OpenAI Codex CLI installed
#   - CODEX_API_KEY set in environment
#   - Backend config: .agentflow/board.json or .agentflow/github.json
#   - .agentflow/RALPH_LOOP_PROMPT.md exists
#

set -e

MAX_ITERATIONS=${1:-20}
KEEP_ITERATIONS=5
PROMPT_FILE=".agentflow/RALPH_LOOP_PROMPT.md"
ITERATIONS_DIR=".agentflow/iterations"
STATUS_FILE=".agentflow/loop_status.txt"
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Verify setup
[[ -f ".agentflow/board.json" || -f ".agentflow/github.json" ]] || { echo "Error: No backend found"; exit 1; }
[[ -f "$PROMPT_FILE" ]] || { echo "Error: $PROMPT_FILE not found"; exit 1; }
command -v codex >/dev/null 2>&1 || { echo "Error: codex CLI not found"; exit 1; }

# Create iterations directory
mkdir -p "$ITERATIONS_DIR"

# Initialize status file
cat > "$STATUS_FILE" << EOF
AgentFlow Loop Status (Codex)
==============================
Started: $START_TIME
Max iterations: $MAX_ITERATIONS
CLI: codex
Status: running
Current: 0/$MAX_ITERATIONS
EOF

echo "AgentFlow Loop (Codex) | Max: $MAX_ITERATIONS iterations | Ctrl+C to stop"
echo "Status: $STATUS_FILE"
echo "Iterations: $ITERATIONS_DIR/"
echo ""

cleanup_old_iterations() {
    local count=$(ls -1 "$ITERATIONS_DIR"/iteration_*.txt 2>/dev/null | wc -l)
    if [[ $count -gt $KEEP_ITERATIONS ]]; then
        ls -1t "$ITERATIONS_DIR"/iteration_*.txt | tail -n +$((KEEP_ITERATIONS + 1)) | xargs rm -f
    fi
}

update_status() {
    local iteration=$1
    local status=$2
    local detail=$3
    cat > "$STATUS_FILE" << EOF
AgentFlow Loop Status (Codex)
==============================
Started: $START_TIME
Max iterations: $MAX_ITERATIONS
CLI: codex
Status: $status
Current: $iteration/$MAX_ITERATIONS
Last update: $(date '+%H:%M:%S')

$detail

Recent iterations: $ITERATIONS_DIR/
EOF
}

for ((i=1; i<=MAX_ITERATIONS; i++)); do
    ITERATION_FILE="$ITERATIONS_DIR/iteration_$(printf '%03d' $i).txt"

    echo "--- Iteration $i/$MAX_ITERATIONS ---"
    update_status "$i" "running" "Processing iteration $i..."

    # Run Codex in non-interactive mode
    # --full-auto: allows file edits without prompts
    # --json: machine-readable output
    # --sandbox workspace-write: can write to project files
    set +e
    codex exec \
        --full-auto \
        --json \
        --sandbox workspace-write \
        "$(cat $PROMPT_FILE)" \
        > "$ITERATION_FILE" 2>&1 &
    CODEX_PID=$!

    # Show dots while waiting
    while kill -0 $CODEX_PID 2>/dev/null; do
        sleep 10
        echo -n "." >&2
    done
    wait $CODEX_PID
    EXIT_CODE=$?
    set -e

    echo "" >&2
    echo "[$(date '+%H:%M:%S')] Iteration $i complete (exit: $EXIT_CODE)"

    # Show progress
    if [[ -f ".agentflow/progress.txt" ]]; then
        echo "--- Progress ---"
        tail -20 .agentflow/progress.txt
        echo "----------------"
    fi

    # Check for errors
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo "Warning: Codex exited with code $EXIT_CODE"
        update_status "$i" "error" "Iteration $i failed with exit code $EXIT_CODE"
    fi

    # Check for completion signals in JSON output
    # Codex JSON format differs from Claude - look in content/text fields
    if grep -qE '"(content|text|result)".*AGENTFLOW_NO_WORKABLE_CARDS' "$ITERATION_FILE" 2>/dev/null; then
        echo ""
        echo "No workable cards remain."
        update_status "$i" "complete" "No workable cards remain. Loop finished after $i iteration(s)."
        cleanup_old_iterations
        echo "Loop finished after $i iteration(s)"
        exit 0
    fi

    if grep -qE '"(content|text|result)".*AGENTFLOW_ITERATION_COMPLETE' "$ITERATION_FILE" 2>/dev/null; then
        echo "Card processed successfully."
    else
        echo "Warning: No completion signal found."
        update_status "$i" "warning" "Iteration $i: No completion signal."
    fi

    cleanup_old_iterations
    update_status "$i" "running" "Completed iteration $i"

    echo ""
    sleep 2
done

update_status "$MAX_ITERATIONS" "complete" "Max iterations reached."
cleanup_old_iterations
echo "Loop finished after $MAX_ITERATIONS iteration(s) (max reached)"
```

### Key Differences from Claude Loop

| Aspect | Claude loop.sh | Codex loop-codex.sh |
|--------|----------------|---------------------|
| CLI command | `claude -p "..."` | `codex exec "..."` |
| Output format | `--output-format stream-json` | `--json` |
| Permissions | `--allowedTools "Read,Write,..."` | `--full-auto --sandbox workspace-write` |
| Tool control | Fine-grained per-tool | Approval + sandbox modes |
| JSON structure | `{"result": "..."}` | `{"content": "...", "text": "..."}` |

### Authentication for Headless/CI

For Codex in headless environments:

```bash
# Option 1: Environment variable
export CODEX_API_KEY="your-api-key"

# Option 2: Inline
CODEX_API_KEY="your-key" .agentflow/loop-codex.sh

# Option 3: Device auth (for first-time setup in headless)
codex login --device-auth
```

### Codex exec Flags Reference

| Flag | Purpose | AgentFlow Use |
|------|---------|---------------|
| `--full-auto` | Skip approvals, allow edits | Required for loop |
| `--json` | JSON Lines output | Parse completion signals |
| `--sandbox workspace-write` | Write to project files | Required for edits |
| `--sandbox read-only` | No modifications | Testing only |
| `-o <path>` | Write final message to file | Optional |
| `--skip-git-repo-check` | Run outside git repo | Not recommended |

### Running Both Loops

You can maintain both loop scripts and choose based on which CLI is available:

```bash
# Auto-detect and run appropriate loop
if command -v claude &>/dev/null; then
    .agentflow/loop.sh "$@"
elif command -v codex &>/dev/null; then
    .agentflow/loop-codex.sh "$@"
else
    echo "Error: Neither claude nor codex CLI found"
    exit 1
fi
```

Or create a wrapper script at `.agentflow/loop-auto.sh`.

---

## 11. Migration Checklist

- [ ] Create `AGENTS.md` symlink to `CLAUDE.md`
- [ ] Configure `project_doc_fallback_filenames` in Codex (optional)
- [ ] Create `.codex/skills/` directory
- [ ] Symlink or copy `agentflow` skill
- [ ] Convert agents to Codex skills
- [ ] Document `/prompts:af` usage for Codex users
- [ ] Test core workflow with both CLIs
- [ ] Update team documentation

---

## References

- [Codex CLI Documentation](https://developers.openai.com/codex/cli)
- [Custom Instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md/)
- [Codex Skills](https://developers.openai.com/codex/skills/)
- [Create Skills](https://developers.openai.com/codex/skills/create-skill/)
- [Custom Prompts](https://developers.openai.com/codex/custom-prompts)
- [Configuration Reference](https://developers.openai.com/codex/config-reference/)
