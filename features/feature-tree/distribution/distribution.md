---
name: distribution
status: done
parent: feature-tree
tests: manual
last_verified: 2026-10-28
---
# distribution

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
How feature-tree reaches people other than its author. The source of truth is a public repository holding the agent skill, the command-line planning tool and the editor extension. Two concerns are split out: how each piece is packaged and installed, and how changes are checked and released.

## Methodology
There are two delivery paths, and they differ in how well they stay current. The skill and the command-line tool travel by cloning the public repository and using it in place; nothing is built or packaged, so what a person clones is what runs. The editor extension has no real distribution channel yet and is a developer-only local install.

The repository carries a permissive open-source license, a readme at the root, and an ignore list covering build output and installed dependencies. These shared basics are what every consumer of the project sees first, so they are kept in place regardless of which install route is chosen.

The details of each route live in the children: [[packaging-and-install]] covers how each piece is delivered and the open decision about the extension, and [[release-process]] covers the automated checks on every change and the deferred first tagged release.

## Acceptance Tests
manual checklist: repo is public and cloneable; `README.md` and `LICENSE` exist at the repo root; each child's own checklist passes.

## Todos

## Questions

## Implemented
- Public repository with license, readme and ignore list.
Sample plans used by the viewer tests now follow the current section layout, so tests exercise real-shaped data.

## Facts & Details
- Delivery by clone is the only route that is always current, because nothing sits between the repository and the person using it.
- The remaining distribution decisions, such as marketplace publishing and the first tagged release, need a human choice and are tracked in the children.

## Citations
- [package.json](../../../vscode-feature-tree/package.json)

## Archived
- [x] (P3) update the sample fixture plans used by tests to the current section layout

## Children
- [[packaging-and-install]] (done)
- [[release-process]] (planned)
