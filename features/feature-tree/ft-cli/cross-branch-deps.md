---
name: cross-branch-deps
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.DependencyTests
last_verified: 2026-10-28
---
# cross-branch-deps

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
A way to say that one todo cannot start until some other node is finished, wherever either sits in the tree. Ordinary blocking only works within a node, through a question; this gate links work across branches, so a feature in one corner can wait on a capability built in another. A second marker flags todos that only a human can do, so unattended agent runs can leave them alone.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.DependencyTests -v` passes (4 tests).

## Todos

## Questions

## Implemented
- Blocked-by gate: a todo may name another node. While that node's status is anything other than done, the todo is not workable. It disappears from the next-work choice and from the ready listing, but still shows in the full todo listing with a note saying which node it waits on. The moment the target reaches done, the todo becomes eligible again with no edit needed.
- Dangling targets: if the named node does not exist the gate does not hold the todo back (so a typo cannot freeze work forever), and the linter raises a warning so the typo is noticed.
- Human-only marker: a todo tagged this way is still listed everywhere, labeled as needing a human. A filter option on both the next-work choice and the listing removes them, which is what unattended or looped runs use. The status briefing and the viewer show these todos in the human's inbox instead.
- Both markers sit at the end of the todo line, in curly braces, and are stripped from the todo text when it is archived or matched.

## Facts & Details
- The gate is deliberately by node, not by todo: a node's status is the one signal that already summarizes whether its work and tests are complete, so no todo-to-todo references are needed and nothing breaks when todos are reflected away.
- The gate never edits anything; it is computed fresh from current statuses on every read, so it cannot go stale.
- Inspired by the Wayfinder approach of hiding work until its prerequisite lands.
- The human-only marker is advisory for agents: it removes the todo from autonomous selection but does not stop an interactive agent from doing it if a human asks.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P1) add `{blocked-by: node-name}` todo marker (cross-branch dependency gate, independent of tree position) with `ft next`/`ft todos` exclusion while the target node isn't `done`; `ft lint` warns on a dangling target
- [x] (P1) add `{hitl}` todo marker plus `--afk-only` on `ft next`/`ft todos` to filter HITL-tagged todos out for unattended/looped work sessions

## Children
