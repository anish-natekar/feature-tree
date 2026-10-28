---
name: distribution
status: planned
parent: feature-tree
tests: manual
last_verified: 2026-10-28
---
# distribution

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
How feature-tree reaches anyone besides its author: the public GitHub repository (the source of truth for the skill, the command line tool and the editor extension), and whatever path the VS Code extension takes to get installed elsewhere. Today that path is a developer-only local install copied into the user's VS Code extensions folder. It is a plain copy, not a link, so the extension's UI assets must be copied again after changes. There is no packaged installer file and no Marketplace listing yet.

## Acceptance Tests
manual checklist: repo is public and cloneable; `README.md` and `LICENSE` exist at the repo root; `vsce package` produces an installable `.vsix` without error.

## Todos
- [ ] (P3) tag a `v0.1.0` release once the extension install story is settled {hitl}

## Questions
- [~] Q1: How should the VS Code extension reach a install?
  - O: Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)
  - O: Package a `.vsix` and share it directly (no Marketplace, no publisher id)
  - O: Register a publisher id and publish to the VS Code Marketplace
  - A (agent): assumed default 'Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)' while unattended; unconfirmed, reopen to change

## Implemented
- Public GitHub repository, with an MIT license and a README at the root, and an ignore file covering build output and dependencies.
- Fixed packaging bugs that blocked real activation: the extension's entry point path was wrong, launch and build configs were added so the extension can be run with F5, and a permanent local install replaced the awkward multi-window development workflow. Because it is a copy, the UI assets must be re-copied after UI changes or the panel shows stale UI.
Decision (agent-assumed, unconfirmed Q1): keep the extension local and developer-only, with no Marketplace publisher. Revisit by reopening Q1.

## Facts & Details

## Citations
- [package.json](../../vscode-feature-tree/package.json)

## Archived
- [x] (P1) choose a real publisher id and decide whether to publish the extension to the VS Code Marketplace, vs. keeping it a local/dev-only install

## Children
