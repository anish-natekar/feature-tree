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
How feature-tree reaches people other than its author. The source of truth is a public repository holding three things: the agent skill, the command-line planning tool and the editor extension. The skill and tool travel by cloning that repository. The editor extension has no real distribution channel yet. Today it is a developer-only local install: the extension folder is copied into the editor's user extensions directory. It is a plain copy, not a link, so after any change to the extension's interface assets they must be copied again or the panel keeps showing the old interface. There is no packaged installer file and no marketplace listing.

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
- Public repository with a permissive open-source license, a readme at the root, and an ignore list covering build output and installed dependencies.
- Packaging fixes that were blocking real activation: the extension manifest pointed at the wrong entry point, so the extension never started. Launch and build configurations were added so a developer can run it in a debug host, and a permanent local install replaced the awkward workflow of reopening a second editor window for every change.
- Current decision, assumed by the agent while unattended and not confirmed by a human: keep the extension local and developer-only, with no marketplace publisher. Reopen the question to change it.

## Facts & Details
- Why not publish yet: a marketplace listing needs a registered publisher identity, a decision only the owner can make.
- Freshness rule: because the local install is a copy, a stale panel is the first thing to suspect when a fix in the extension does not appear. The standalone viewer has no such problem because it is regenerated as a whole.
- A tagged first release is deferred until the install story is settled, and needs a human to decide.

## Citations
- [package.json](../../vscode-feature-tree/package.json)

## Archived
- [x] (P1) choose a real publisher id and decide whether to publish the extension to the VS Code Marketplace, vs. keeping it a local/dev-only install

## Children
