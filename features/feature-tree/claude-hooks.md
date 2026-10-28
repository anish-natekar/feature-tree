---
name: claude-hooks
status: done
parent: feature-tree
tests: python3 -m unittest skill.tests.test_ft.HookTests
last_verified: 2026-10-28
---
# claude-hooks

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
`skill/hooks/ft_hook.py`: Claude Code hooks that keep an agent honest while it works a feature-tree node, without relying on the agent remembering to follow the rules itself. A PostToolUse lint hook blocks a write that leaves a node schema-invalid; a Stop hook refuses to end the turn while any confirmed `[x]` todo/question hasn't been reflected (via `ft.unreflected()`, which backs both this hook and `ft reflect --check`), a todo is still `P?` unassigned, or a node claims `status: done` with open todos remaining; a SessionStart hook injects the current node's tree summary and next todo automatically.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.HookTests -v` passes (3 tests: lint-blocks-on-error, stop-hook-checkpoint, context-hook).

## Todos

## Questions

## Implemented
- Lint hook: runs `ft lint` scoped to the edited file's node on every write under `features/`, exits non-zero (blocks) on schema errors, no-ops for files outside `features/`.
- Stop hook: calls the shared `unreflected()` helper (confirmed todos and questions not yet archived via `ft reflect`), plus checks for `P?`-unassigned todos and a `status: done` node with open todos; refuses to stop with the specific `ft reflect ... --note "..."` command to run; honors `stop_hook_active` to avoid an infinite block loop.
- Context hook: prints the current node's highest-priority open todo at session start.
skill/hooks/README.md documents the three hooks and install steps.

## Facts & Details

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P3) document the hook install steps (wiring `ft_hook.py` into `settings.json`) in a README, not just inline in `SKILL.md`

## Children
