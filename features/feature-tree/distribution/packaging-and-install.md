---
name: packaging-and-install
status: done
parent: distribution
tests: manual
last_verified: 2026-10-28
---
# packaging-and-install

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
How each piece of feature-tree is delivered to a new user. The skill and command-line tool are used straight from a clone of the repository, while the editor extension is currently a developer-only local install. This node records the install steps, the staleness pitfall of copying, and the open decision on wider extension distribution.

## Methodology
Skill and command-line tool: a person clones the public repository and uses it in place. Nothing is built or packaged, so the clone always matches what runs.

Editor extension: today a developer installs it by copying the extension folder into the editor's user extensions directory. The steps are:
1. Build the extension.
2. Copy the folder into the editor's user extensions location.
3. Reload the editor.

Because this is a plain copy and not a link, any later change to the extension's interface assets must be copied again, otherwise the panel keeps showing the old interface. A stale panel is therefore the first thing to suspect when a fix does not appear. The standalone viewer has no such problem because it is regenerated as a whole.

There is no packaged installer file and no marketplace listing. Publishing to a marketplace needs a registered publisher identity, which only the owner can choose, so the decision, confirmed by the human, is to stay local and developer-only. Packaging an installer file for direct sharing is the middle option still open.

## Acceptance Tests
manual checklist: a fresh clone of the repo runs the skill and command-line tool with no build step; following the three extension install steps makes the extension appear after an editor reload; `vsce package` produces an installable `.vsix` without error.

## Todos

## Questions

## Implemented
- Corrected extension manifest and debug-host launch configurations, so the extension activates and can be run during development.
- Permanent local install of the extension by copy.
- Skill and tool delivered by cloning, with no build step.

## Facts & Details
- Why not publish yet: a marketplace listing needs a registered publisher identity, a decision only the owner can make.
- Decided (confirmed by the human): the extension stays local and development-only for now, installed by linking into the editor's extensions folder. No publisher identity or marketplace listing until the project is ready for outside users.

## Citations
- [package.json](../../../vscode-feature-tree/package.json)

## Archived
- [x] (P1) choose a real publisher id and decide whether to publish the extension to the VS Code Marketplace, vs. keeping it a local/dev-only install
- [x] Q1: How should the VS Code extension reach a install?
  - O: Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)
  - O: Package a `.vsix` and share it directly (no Marketplace, no publisher id)
  - O: Register a publisher id and publish to the VS Code Marketplace
  - A (agent): assumed default 'Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)' while unattended; unconfirmed, reopen to change

## Children
