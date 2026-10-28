---
name: distribution
status: planned
parent: feature-tree
tests: manual
last_verified: 2026-10-28
---
# distribution

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
How feature-tree reaches people other than its author. The source of truth is a public repository holding the agent skill, the command-line planning tool and the editor extension. The skill and tool travel by cloning it; the extension has no real distribution channel yet and is a developer-only local install.

## Methodology
There are two delivery paths, and they differ in how well they stay current.

Skill and command-line tool: a person clones the public repository and uses it in place. Nothing is built or packaged, so what they clone is what runs. The repository carries a permissive open-source license, a readme at the root, and an ignore list covering build output and installed dependencies.

Editor extension: today a developer installs it by copying the extension folder into the editor's user extensions directory. The steps are:
1. Build the extension.
2. Copy the folder into the editor's user extensions location.
3. Reload the editor.

Because this is a plain copy and not a link, any later change to the extension's interface assets must be copied again, otherwise the panel keeps showing the old interface. A stale panel is therefore the first thing to suspect when a fix does not appear. The standalone viewer has no such problem because it is regenerated as a whole.

There is no packaged installer file and no marketplace listing. Publishing to a marketplace needs a registered publisher identity, which only the owner can choose, so the current decision, assumed by the agent while unattended and unconfirmed, is to stay local and developer-only. Packaging an installer file for direct sharing is the middle option still open.

A tagged first release waits until the install story is settled.

## Acceptance Tests
manual checklist: repo is public and cloneable; `README.md` and `LICENSE` exist at the repo root; `vsce package` produces an installable `.vsix` without error.

## Todos
- [ ] (P3) update the sample fixture plans used by tests to the current section layout
- [ ] (P3) tag a `v0.1.0` release once the extension install story is settled {hitl}

## Questions
- [~] Q1: How should the VS Code extension reach a install?
  - O: Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)
  - O: Package a `.vsix` and share it directly (no Marketplace, no publisher id)
  - O: Register a publisher id and publish to the VS Code Marketplace
  - A (agent): assumed default 'Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)' while unattended; unconfirmed, reopen to change

## Implemented
- Public repository with license, readme and ignore list.
- Corrected extension manifest and debug-host launch configurations, so the extension activates and can be run during development.
- Permanent local install of the extension by copy.
Every push and pull request now runs the plan lint, checks that no finished work is left unarchived, and runs both the command-line and viewer test suites, so the plan and the tooling are checked together.

## Facts & Details
- Why not publish yet: a marketplace listing needs a registered publisher identity, a decision only the owner can make.
- A tagged first release is deferred until the install story is settled, and needs a human to decide.

## Citations
- [package.json](../../vscode-feature-tree/package.json)

## Archived
- [x] (P1) choose a real publisher id and decide whether to publish the extension to the VS Code Marketplace, vs. keeping it a local/dev-only install
- [x] (P2) add continuous integration that runs both test suites and the plan lint on every push

## Children
