---
name: release-process
status: planned
parent: distribution
tests: manual
last_verified: 2026-10-28
---
# release-process

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
How changes to feature-tree are checked before they are shared, and when a versioned release is cut. Every change is verified automatically so the plan and the tooling stay consistent, while the first tagged release is deliberately held back until the install story is settled.

## Methodology
Every push and every pull request triggers an automated check on a clean machine. It runs four steps in order:
1. Lint the plan itself, so the tree stays well-formed.
2. Check that no finished work is left unarchived, so the plan carries no stale confirmed items.
3. Run the command-line tool's test suite.
4. Install dependencies and run the viewer's test suite.

Any failing step fails the whole run. Checking the plan and the tooling together means a change that breaks the plan format is caught by the same gate as a change that breaks the code.

Versioned releases: no tagged release exists yet. Cutting the first one waits until the extension install story is decided (see [[packaging-and-install]]), and the timing is a human call, so the work is marked as needing a person.

## Acceptance Tests
manual checklist: pushing a branch starts the workflow; all four steps appear and pass on a clean checkout; introducing a lint error in the plan makes the run fail.

## Todos
- [ ] (P3) tag a `v0.1.0` release once the extension install story is settled {hitl}

## Questions

## Implemented
Every push and pull request now runs the plan lint, checks that no finished work is left unarchived, and runs both the command-line and viewer test suites, so the plan and the tooling are checked together.

## Facts & Details
- A tagged first release is deferred until the install story is settled, and needs a human to decide.

## Citations
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived
- [x] (P2) add continuous integration that runs both test suites and the plan lint on every push

## Children
