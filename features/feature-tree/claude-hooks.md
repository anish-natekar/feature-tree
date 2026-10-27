---
name: claude-hooks
status: in-progress
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft.HookTests
last_verified: 2026-10-28
---
# claude-hooks

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`skill/hooks/ft_hook.py`: Claude Code hooks that keep an agent honest while it works a feature-tree node, without relying on the agent remembering to follow the rules itself. A PostToolUse lint hook blocks a write that leaves a node schema-invalid; a Stop hook refuses to end the turn if a todo was checked `[x]` but its text wasn't moved into `## Implemented` yet; a SessionStart hook injects the current node's open-todo context automatically.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.HookTests -v` passes (3 tests: lint-blocks-on-error, stop-hook-checkpoint, context-hook).

## Todos
- [ ] (P3) document the hook install steps (wiring `ft_hook.py` into `settings.json`) in a README, not just inline in `SKILL.md`

## Questions

## Implemented
- Lint hook: runs `ft lint` scoped to the edited file's node on every write under `features/`, exits non-zero (blocks) on schema errors, no-ops for files outside `features/`.
- Stop hook: scans for any `[x]` todo whose text hasn't been moved to `## Implemented`, refuses to stop with a message telling the agent to move it first; honors `stop_hook_active` to avoid an infinite block loop.
- Context hook: prints the current node's highest-priority open todo at session start.

## Facts & Details

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)

## Archived

## Children
