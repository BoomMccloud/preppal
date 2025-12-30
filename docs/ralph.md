# Ralph Wiggum Plugin

Reference documentation for the `ralph-wiggum` Claude Code plugin - an iterative self-referential development loop.

## Overview

Ralph Wiggum is a Claude Code plugin that implements an automated iteration loop. Named after the Simpsons character, it embodies "persistent iteration despite setbacks."

**Key insight**: Ralph is a `while true` loop that runs *inside* your Claude session via a stop hook, not as an external bash script.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  /ralph-loop "Build X" --completion-promise "DONE"         │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Claude works on task                               │   │
│  │  Tries to exit session                              │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Stop Hook Intercepts:                              │   │
│  │  • Checks .claude/ralph-loop.local.md               │   │
│  │  • Reads last assistant message from transcript     │   │
│  │  • Checks for <promise>DONE</promise>               │   │
│  │  • If not found: blocks exit, feeds SAME prompt     │   │
│  │  • If found: allows exit, loop completes            │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│                     ▼                                       │
│        ↺ Repeat until completion/max iterations            │
└─────────────────────────────────────────────────────────────┘
```

## Commands

### `/ralph-loop`

Start an iterative loop in the current session.

```bash
/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<text>"
```

**Options:**

| Option | Description |
|--------|-------------|
| `--max-iterations <n>` | Stop after N iterations (default: unlimited) |
| `--completion-promise <text>` | Phrase that signals completion |

**Examples:**

```bash
# Basic usage with safety limits
/ralph-loop "Build a REST API for todos" --completion-promise "DONE" --max-iterations 20

# TDD workflow
/ralph-loop "Fix failing tests in auth module" --completion-promise "ALL TESTS PASS" --max-iterations 30

# Refactoring task
/ralph-loop "Refactor cache layer to use Redis" --completion-promise "COMPLETE" --max-iterations 15
```

### `/cancel-ralph`

Cancel an active Ralph loop.

```bash
/cancel-ralph
```

## State Management

The loop tracks state in `.claude/ralph-loop.local.md`:

```yaml
---
active: true
iteration: 1
max_iterations: 50
completion_promise: "DONE"
started_at: "2025-12-30T10:00:00Z"
---

Your task prompt here...
```

**Monitor progress:**

```bash
# View current iteration
grep '^iteration:' .claude/ralph-loop.local.md

# View full state
head -10 .claude/ralph-loop.local.md
```

## Completion Detection

To exit the loop, Claude must output the exact completion promise wrapped in XML tags:

```
<promise>DONE</promise>
```

**Rules:**

- The text inside `<promise>` tags must exactly match the `--completion-promise` value
- The promise must be TRUE - Claude should not lie to exit the loop
- If no completion promise is set, the loop runs until `--max-iterations`

## Why It Works

1. **Prompt never changes** - same task repeated each iteration
2. **Work persists in files** - Claude sees its previous modifications
3. **Git history visible** - can track what changed between iterations
4. **Self-correction** - failures from tests/linters inform next iteration

## Best Use Cases

| Good For | Not Good For |
|----------|--------------|
| TDD workflows | Tasks requiring human judgment |
| Well-defined tasks with clear success criteria | One-shot operations |
| Tasks with automatic verification (tests, linters) | Unclear success criteria |
| "Walk away" overnight development | Production debugging |
| Greenfield projects | Design decisions |

## Prompt Writing Best Practices

### 1. Clear Completion Criteria

```markdown
Build a REST API for todos.

When complete:
- All CRUD endpoints working
- Input validation in place
- Tests passing (coverage > 80%)
- README with API docs
- Output: <promise>COMPLETE</promise>
```

### 2. Incremental Goals

```markdown
Phase 1: User authentication (JWT, tests)
Phase 2: Product catalog (list/search, tests)
Phase 3: Shopping cart (add/remove, tests)

Output <promise>COMPLETE</promise> when all phases done.
```

### 3. Self-Correction Instructions

```markdown
Implement feature X following TDD:
1. Write failing tests
2. Implement feature
3. Run tests
4. If any fail, debug and fix
5. Refactor if needed
6. Repeat until all green
7. Output: <promise>COMPLETE</promise>
```

### 4. Escape Hatches

Always use `--max-iterations` as a safety net:

```bash
/ralph-loop "Try to implement feature X" --max-iterations 20
```

In your prompt, include what to do if stuck:

```markdown
After 15 iterations, if not complete:
- Document what's blocking progress
- List what was attempted
- Suggest alternative approaches
```

## TDD Workflows: Test-Based Completion

Ralph's promise-based completion relies on Claude's self-reported status. For TDD workflows where you want **actual test results** to gate completion, additional strategies are needed.

### The Trust Gap Problem

```
┌─────────────────────────────────────────────────────────────┐
│  Default Ralph Flow:                                        │
│                                                             │
│  Claude says "tests pass" → outputs <promise>DONE</promise> │
│                     ↓                                       │
│  Stop hook sees promise → exits loop                        │
│                                                             │
│  Problem: Claude can claim tests pass without verification  │
└─────────────────────────────────────────────────────────────┘
```

### Solution 1: Multi-Gate Prompt (Recommended)

Require Claude to include **actual command output** as evidence:

```markdown
## Task
Follow the implementation guide exactly.

## Completion Requirements (ALL must be true)

Before outputting the completion promise, you MUST:

1. Run: `pnpm test src/test/unit/feature.test.ts`
   - All tests must pass
   - Copy the FULL test output into your response

2. Run: `pnpm typecheck`
   - Must show 0 errors
   - Copy the output

3. Run: `pnpm lint`
   - Must show 0 errors

4. Run: `git diff --stat` and include output

Only when ALL above are verified with actual command output:
<promise>FEATURE-COMPLETE-{SESSION_ID}</promise>
```

### Solution 2: Unique Session Tokens

Generate a unique promise per session to prevent memorized escape phrases:

```bash
# Generate unique session ID
SESSION_ID=$(openssl rand -hex 8)

/ralph-loop "Implement feature X following TDD.
When all tests pass, output: <promise>FEAT-$SESSION_ID</promise>" \
  --completion-promise "FEAT-$SESSION_ID" \
  --max-iterations 20
```

### Solution 3: Test Output Verification Token

Design tests to output a verification token only when passing:

```typescript
// In test file afterAll hook:
afterAll(() => {
  if (allTestsPassed) {
    console.log(`VERIFIED:${process.env.RALPH_SESSION_TOKEN}`);
  }
});
```

Then in the prompt:
```markdown
Run: RALPH_SESSION_TOKEN=abc123 pnpm test
If tests pass, you'll see: VERIFIED:abc123
Only output: <promise>VERIFIED:abc123</promise> when you see this token
```

### Solution 4: External Verification Hook (Most Secure)

Fork ralph-wiggum to verify tests externally before accepting completion:

```bash
# Modified stop-hook.sh
if [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
  # Don't trust Claude - verify externally
  TEST_OUTPUT=$(pnpm test 2>&1)
  if echo "$TEST_OUTPUT" | grep -q "All tests passed"; then
    echo "✅ Tests verified externally"
    rm "$RALPH_STATE_FILE"
    exit 0
  else
    echo "❌ Tests failed - continuing loop"
    # Don't exit, continue the loop
  fi
fi
```

### Example: Implementation Guide with Ralph

For a spec like `FEAT30_implementation_guide.md`:

```bash
# Generate unique session ID
SESSION_ID=$(date +%s)

# Create the prompt
cat > /tmp/ralph-prompt.md << 'EOF'
## Task
Follow /docs/todo/FEAT30_implementation_guide.md exactly.

## Verification Gates

Before claiming completion, run and include output for:

1. `pnpm test src/test/unit/session-reducer.test.ts`
   - Must show 6 new "Dev-only events" tests passing

2. `pnpm typecheck` - 0 errors

3. `pnpm lint` - 0 errors

4. `git diff --stat` - Only these files changed:
   - types.ts
   - reducer.ts
   - SessionContentDev.tsx
   - session-reducer.test.ts

## Completion
When ALL gates pass with verified output:
<promise>FEAT30-COMPLETE-SESSION_ID_PLACEHOLDER</promise>
EOF

# Replace placeholder with actual session ID
sed -i '' "s/SESSION_ID_PLACEHOLDER/$SESSION_ID/" /tmp/ralph-prompt.md

# Start the loop
/ralph-loop "$(cat /tmp/ralph-prompt.md)" \
  --completion-promise "FEAT30-COMPLETE-$SESSION_ID" \
  --max-iterations 15
```

### Recommended Practices for TDD Loops

| Practice | Rationale |
|----------|-----------|
| Always use `--max-iterations` | Safety net against infinite loops |
| Require full command output | Creates audit trail, harder to fake |
| Use unique session tokens | Prevents memorized escape phrases |
| Include `git diff --stat` | Verifies only expected files changed |
| Set iteration limit at 1.5x expected | Allows retries but bounds runaway |

## Agent Ralph: TDD Loop Agent

For automated TDD workflows, use the `agent-ralph` agent which wraps ralph-wiggum with test-based completion.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     agent-ralph                             │
│                                                             │
│  Responsibility: WHAT to do                                 │
│  • Read and understand spec                                 │
│  • Implement code correctly                                 │
│  • Run tests and interpret failures                         │
│  • Fix issues based on feedback                             │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │         ralph-wiggum                │             │
│         │                                     │             │
│         │  Responsibility: HOW to loop        │             │
│         │  • Iteration tracking               │             │
│         │  • State persistence                │             │
│         │  • Exit blocking                    │             │
│         │  • Promise detection                │             │
│         └─────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Usage

Invoke via the Task tool with:

```
spec_path: docs/todo/FEAT30_implementation_guide.md
test_command: pnpm typecheck && pnpm test src/test/unit/session-reducer.test.ts
max_iterations: 15
```

The agent will:
1. Validate inputs exist
2. Generate unique session token
3. Read spec and current test state
4. Invoke `/ralph-loop` with embedded spec
5. Loop until tests pass or max iterations
6. Report final status with test output and git diff

### When to Use

| Use agent-ralph | Use ralph directly |
|-----------------|-------------------|
| Have a spec + tests ready | Ad-hoc iteration tasks |
| Want autonomous implementation | Interactive development |
| TDD workflow | General looping needs |
| Can run in background | Need manual control |

### Definition

See `.claude/agents/agent-ralph.md` for the full agent definition.

## Architecture

| File | Purpose |
|------|---------|
| `hooks/stop-hook.sh` | Core mechanism - intercepts exit, parses transcript, feeds prompt back |
| `commands/ralph-loop.md` | Command definition to start the loop |
| `commands/cancel-ralph.md` | Command definition to cancel active loop |
| `scripts/setup-ralph-loop.sh` | Creates state file with YAML frontmatter |

## Safety Features

- `--max-iterations` prevents infinite loops
- Completion promise requires explicit "true" statement
- Hook validates all state file fields before continuing
- Manual cancellation available via `/cancel-ralph`
- State file corruption detection with helpful error messages

## References

- [Original technique by Geoffrey Huntley](https://ghuntley.com/ralph/)
- [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
- [Official Plugin Source](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-wiggum)
