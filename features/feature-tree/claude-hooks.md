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
Claude Code hooks that keep an agent honest while it works on a feature-tree node, without relying on the agent remembering the rules. Three guards exist: one blocks any write that leaves a node invalid, one refuses to let the agent stop while finished work has not been reflected into the node (or a todo has no priority, or a node claims to be done while todos remain open), and one greets each new session with the current node's summary and its next todo. The same check for unreflected work powers both the stop guard and the reflect command, so the two never disagree.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.HookTests -v` passes (3 tests: lint-blocks-on-error, stop-hook-checkpoint, context-hook).

## Todos

## Questions

## Implemented
- Write guard: after every edit under the features folder, the node is linted and the edit is blocked if the node is now invalid. Edits elsewhere are ignored.
- Stop guard: refuses to end the turn while confirmed todos or questions are not yet archived, while any todo still lacks a priority, or while a node marked done has open todos. It tells the agent exactly which reflect command to run, and it steps aside on a repeated stop so it can never trap the agent in a loop.
- Session context: at session start, shows the current node's highest-priority open todo.
The install steps are documented in a hooks README next to the hook script, not just in the skill file.

## Facts & Details

## Citations
- [skill/SKILL.md](../../skill/SKILL.md)

## Archived
- [x] (P3) document the hook install steps (wiring `ft_hook.py` into `settings.json`) in a README, not just inline in `SKILL.md`

## Children
