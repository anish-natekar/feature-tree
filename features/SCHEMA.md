# Feature Tree Schema

Source of truth for node format. `ft lint` enforces it. Obsidian-compatible: YAML frontmatter + `[[wikilinks]]`.

## Design Philosophy

Feature tree is a **project status indicator**, not an IDE or a spec-document system. Researched against Matt Pocock's Wayfinder skill, GitHub Spec Kit, and AWS Kiro before writing this down, specifically to reject the parts of those tools that don't fit:

- **A meta-level map, one step above the code.** Agents now write more code than a human can review line by line; what a human can still review and steer is intent, decisions, facts and capabilities. The tree is that map: every feature/capability the project consists of, why it exists, what was decided and why, what is known (and from where), and what still needs a human. It is built by searching and mapping decisions as the project is made, and it grows with the project, updated by the same agents that change the code. A reader should understand the whole project and each feature's reasoning without opening a source file.
- **Altitude rises toward the root; leaves sit closest to the code.** The root states the vision; branches describe capabilities and why they exist; leaves are the most detailed, written like good documentation: what it does, inputs and outputs, rules, edge cases, data it keeps, what was decided and why. Still never code: no function, class, file or tool names, and nothing tied to one programming language, so the same leaf would stay true if the project were rewritten in another language. A reader should be able to rebuild the behavior from a leaf, not read the implementation. Lint holds branches to a stricter standard than leaves.
- **Natural language, not implementation detail.** A node captures intent, decisions, and rationale in prose a human can skim in seconds — not schemas, interfaces, or code. Implementation detail lives in the actual code, which is the source of truth for *how*; a node only needs to say *what* and *why*.
- **One file per node, never fragmented.** Spec Kit and Kiro each split a feature across 3 files (spec/plan/tasks, or requirements/design/tasks). Feature tree deliberately rejects that: one markdown file, one fixed set of sections, so there's exactly one place to look. Don't propose splitting a node into companion files — split into child *nodes* instead if it's genuinely grown too big (see Split guards).
- **Fog of war: don't pre-decompose vague scope.** If a child node's scope isn't sharp enough to write a real Abstract yet, it isn't ready to be a node. Keep it as a loose Todo or Question on the *parent* instead, and only promote it once you can state what it is precisely. `ft lint` nudges at this with a warning when an Abstract is still a `ft init`-style `DRAFT:` placeholder — that's a sign the node was created before its scope was actually known.
- **Acceptance Tests read better as testable statements** (`Given X, when Y, then Z`, or `WHEN <condition> THE SYSTEM SHALL <behavior>`) than as free prose — a style tip borrowed from Kiro's EARS convention, not an enforced rule. `ft lint` doesn't check phrasing.

## Layout

- Tree root dir: `features/`.
- Node with children: `features/<name>/<name>.md`, children sit in same folder (`<child>.md` or `<child>/<child>.md`).
- Leaf: plain `<name>.md`.
- File stem == `name` in frontmatter. Names unique across tree (wikilinks rely on it), kebab-case.

## Frontmatter

| field | rule |
|---|---|
| `name` | kebab-case, equals file stem |
| `status` | `planned` \| `in-progress` \| `done` |
| `parent` | name of parent node, derived from path; empty for roots |
| `tests` | runnable command or test file path. Manual fallback: `manual` + checklist in Acceptance Tests |
| `last_verified` | `YYYY-MM-DD` or empty; set when tests last passed |

## Sections (fixed order, `##` headings)

1. **Abstract**: what the feature is, why it is needed (intent).
2. **Acceptance Tests**: tests that, when passing, mean feature implemented. Command or path, plus short description. Manual checklist allowed if `tests: manual`.
3. **Todos**: `- [ ] (P1) text`. Priority P0 (urgent) to P3 (nice-to-have), or `P?` = unassigned: the human logged an issue without ranking it and the agent infers the priority (`ft todos --unassigned`), then rewrites the line. 3-state checkbox, same as Questions: `[ ]` not started, `[~]` in progress, `[x]` completed.
4. **Questions**: open questions the agent could not settle alone, so the human can answer later or the agent can research them. Format below.
5. **Implemented**: documentation of what exists. Reflect moves a confirmed `[x]` todo's prose here (see Reflect below), then removes it from Todos.
6. **Facts & Details**: prose distilled from confirmed (`[x]`) questions — facts, decisions, constraints that came out of asking something. Reflect writes here, never todos.
7. **Citations**: links to web pages, papers, docs. Supports claims made in either Implemented or Facts & Details.
8. **Archived**: verbatim raw record of completed todo lines and confirmed question blocks, collapsed by default in the viewer. Written only by `ft reflect`; never hand-edit.
9. **Children**: auto-generated by `ft index` as wikilinks.

## Questions and blocked todos

```
- [ ] Q1: Which planner library fits a 6-DOF arm on a Pi?
  - O: OMPL
  - O: Custom RRT
- [~] Q2: What rating does the power supply need?
  - A (agent): 24 V 10 A. Sources: [datasheet](https://example.com)
- [x] Q3: Which serial protocol?
  - A: Modbus RTU.
```
- `[ ]` open · `[~]` answered by the agent after research, human should confirm · `[x]` answered by the human (or confirmed).
- IDs `Q1`, `Q2`… are unique within the node, never reused. One-line answers.
- A todo blocked on a question ends with `{blocked: Q1}` (same node). It counts as blocked only while that question is `[ ]`; `[~]` and `[x]` unblock it. Remove the marker once the question is answered.
- A `done` node must have no open (`[ ]`) questions.
- Questions are asked to the human with node path + id, e.g. `features/robot-arm/motion-planning.md Q1`.
- Todos use the same three states: `[ ]` not started · `[~]` in progress · `[x]` completed, awaiting Reflect. `ft next` prefers an in-progress todo over a not-started one regardless of priority (finish what's started).

## Reflect

Completing a todo or confirming a question doesn't delete it immediately — it just flips the checkbox to `[x]`. A separate **Reflect** stage archives and distills confirmed items in bulk, later:

- `ft reflect --check [--under NODE]` — lists every confirmed `[x]` todo/question not yet archived; exit 1 if any exist. The Stop hook runs this automatically and blocks the turn until it's clean.
- `ft reflect <node> --todo "<exact text>" --note "<prose>"` — moves that todo's raw line verbatim into Archived, removes it from Todos, appends the note to Implemented.
- `ft reflect <node> --question Qn --note "<prose>"` — moves the question's full block verbatim into Archived, removes it from Questions, appends the note to Facts & Details.
- Plan mode requires `ft reflect --check` to pass before starting a new plan — Reflect first, then plan.

### Multiple-choice questions

Same convention as the `AskUserQuestion` tool: offer a short list of concrete options instead of an open-ended question when there is one.

- `- O: <option>` lines go directly under the question line, before any `- A:` line. Add with `ft ask <node> "text" --option "OMPL" --option "Custom RRT"`.
- The **first** `O:` line is the recommended option. The viewer badges it "Recommended" and pre-highlights it — don't write the word "Recommended" into the text yourself.
- Never write an "Other" option by hand. The viewer and the agent always add it implicitly as the last choice, revealing a free-text box when picked.
- The answer line (`- A: ...`) is unchanged whether the human picked a listed option or typed something under "Other".
- Plain open-ended questions (no `O:` lines) still work exactly as before — options are optional.

## Cross-branch dependencies and unattended work

Tree position (parent/child) governs *organization*; it doesn't have to govern *sequencing*. A todo can be gated on a completely different branch of the tree, and a todo can be marked as needing a live human regardless of where it sits. Both researched from Matt Pocock's Wayfinder skill, adapted to this tool's node-granularity (todos have no stable id, so blocking targets a *node*, reusing the node status the tree already tracks).

- `{blocked-by: node-name}` — this todo is excluded from `ft next`/`ft todos --ready` until `node-name`'s own `status` is `done`, no matter where that node sits in the tree. `ft todos` shows it with a `⛔ blocked by node-name` suffix instead of hiding it. `ft lint` warns if `node-name` doesn't exist.
- `{hitl}` — this todo needs a live human (a decision only they can make, not something an agent should resolve alone). No marker = AFK-doable by an agent, the common case. `ft next --afk-only` / `ft todos --afk-only` filter `{hitl}` todos out — the call an unattended or looped work session makes instead of the plain form.

## Progress

`ft tree` shows a rollup percentage next to each node: `done / total` todos summed across that node and every descendant. A node with no todos anywhere in its subtree shows no percentage (not `0%`, since there's nothing to track, not nothing done). Purely derived from existing checkboxes — no extra frontmatter.

## Time limits and TLE

- Todo markers go at the end of the line, in any order: `{blocked: Q1}` `{blocked-by: node-name}` `{limit: 20m}` `{tle: 20m}` `{hitl}`.
- `{limit: 90s|20m|2h}` overrides the default per-todo time budget for the headless driver (`ft work --task-limit`, default 20m).
- `{tle: 20m}` is written by `ft work` when the agent ran out of time on that todo (Time Limit Exceeded): the process is killed, the todo is skipped by `ft next`, and `ft lint` warns. A human or planner then splits the todo or raises `{limit}` and removes `{tle}` (viewer: click the TLE chip).

## Section index

Every node has one line under its title: `Jump: [Abstract](#abstract) · …`. `ft new` writes it, `ft index` repairs it, `ft lint` warns when missing. Do not edit it by hand. The viewer shows the same sections as jump chips.

## Split guards (lint warnings)

- Body over 600 words, over 12 open todos, over 8 children, or depth over 5 → split or regroup. `ft work` runs one split step per oversized node before doing todos.

## Links

- Feature link: `[[node-name]]` or `[[node-name|label]]`, anywhere in the body. Use instead of re-explaining another feature. Must name an existing node (lint error otherwise). Viewer shows teal chips; click navigates inside the viewer.
- External link: plain markdown `[text](https://...)`. Viewer shows orange links with ↗; click opens the browser. Put sources in `## Citations`; inline use is fine too.
- Feature links in `## Children` are auto-generated and not counted as references.

## Editing

- Humans edit by hand, in the VS Code viewer drawer, or in the standalone `features/viewer.html` (`ft view`). All write the same markdown; edits change only the touched section.
- Typing `[[` in any viewer field autocompletes node names.
- Structural edits (CLI/skill only, no viewer buttons): `ft delete <name> [--subtree] [--yes]` (dry-run by default; without `--subtree`, direct children are reparented up to the deleted node's own parent), `ft rename <old> <new>` (updates children's `parent:` and every `[[old]]` wikilink tree-wide), `ft move <name> <new-parent|->` (relocates a node and its whole subtree). All three are filesystem operations — parent/child nesting is folder-derived, not just frontmatter.
- `ft init [path]` bootstraps a rough-draft tree from an existing codebase (README + manifest + top-level dirs); refuses if `features/` is already non-empty. Follow up with the Plan-mode interview to refine the draft.

## Rules

- Body size: warn under 80 words, warn over 600, error over 900. Too big → split into children. Too small → merge into parent.
- `done` requires: no unchecked todos, `tests` set, `last_verified` set.
- `status` is computed, not hand-maintained: `ft index` sets it to `in-progress` if any todo is `[~]`; else `done` if there are zero open todos/questions and `tests`/`last_verified` are set; else `planned`. Hand-editing `status` is fine but `ft lint` warns if it drifts from the computed value — run `ft index` to resync.
- Confirmed todo (`[x]`) left in Todos → lint warning (run `ft reflect`).
- Questions to the human cite node path, e.g. `features/robot/arm/gripper.md`.
