---
name: reflect
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.ReflectTests
last_verified: 2026-10-28
---
# reflect

Jump: [Abstract](#abstract) · [Methodology](#methodology) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The archive-and-distill stage of the work cycle. Once a todo or question is confirmed finished, reflecting it moves the original line, unchanged, into the node's archive and adds one short prose note saying what is now true. The node therefore reads as a summary of its current state rather than a pile of ticked checkboxes, while the archive keeps the full trail.

## Methodology
Reflection is deliberately a second step after checking something off. Flipping the checkbox is cheap and happens first; the distillation happens later in a batch, so a crash mid-task never loses the checkbox.

Input is a node, exactly one target (a finished todo identified by its exact text, or a confirmed question identified by number), and a required note. Missing, ambiguous or non-matching input is rejected with a message and nothing changes; it never guesses. Only items already confirmed can be reflected, and open items and open questions are never touched.

For a todo: the line leaves the todo list, is appended to the archive exactly as written, and the note is appended to the Implemented section.

For a question: the whole block, including its option and answer lines, leaves the question list, is appended to the archive, and the note is appended to Facts and Details, since a question yields decisions and constraints rather than features.

Check mode writes nothing. It lists every confirmed-but-unreflected item, optionally within one subtree, and reports a failing result when any exist. The end-of-turn guard, the headless driver and the planning-mode gate all call this same check, so they can never disagree about what is pending.

Archived text is kept verbatim so history can be audited and the daily digest can still recognize finished work. Notes should be plain behavior statements, not echoes of the task wording.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.ReflectTests -v` passes (5 tests).

## Todos

## Questions

## Implemented
- Reflect of a finished todo into archive plus Implemented note.
- Reflect of a confirmed question into archive plus Facts note.
- Read-only check mode used by the guards.

## Facts & Details
- Batched rather than immediate, to survive crashes.
- One shared check keeps every guard consistent.

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
