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
How feature-tree reaches anyone besides its author: the public GitHub repo (source of truth for the skill, CLI, and extension), and whatever path the VS Code extension takes to get installed elsewhere (currently a dev-only local symlink install, not a packaged `.vsix` or Marketplace listing).

## Acceptance Tests
manual checklist: repo is public and cloneable; `README.md` and `LICENSE` exist at the repo root; `vsce package` produces an installable `.vsix` without error.

## Todos
- [ ] (P1) choose a real publisher id and decide whether to publish the extension to the VS Code Marketplace, vs. keeping it a local/dev-only install {blocked: Q1}
- [ ] (P3) tag a `v0.1.0` release once the extension install story is settled

## Questions
- [ ] Q1: How should the VS Code extension reach a install?
  - O: Keep it local/dev-only (current — symlinked into `~/.vscode/extensions/`, no publisher id needed)
  - O: Package a `.vsix` and share it directly (no Marketplace, no publisher id)
  - O: Register a publisher id and publish to the VS Code Marketplace

## Implemented
- Public GitHub repo at `https://github.com/anish-natekar/feature-tree`.
- `LICENSE` (MIT) and `README.md` at the repo root.
- `.gitignore` covering `out/`, `node_modules/`, etc.
- Fixed packaging bugs that blocked real activation: `package.json` `main` path (`out/extension.js` → `out/src/extension.js`), added `.vscode/launch.json`/`tasks.json` for F5, and a permanent install via symlink into `~/.vscode/extensions/` to avoid the multi-window Extension-Development-Host workflow.

## Facts & Details

## Citations
- [package.json](../../vscode-feature-tree/package.json)

## Archived

## Children
