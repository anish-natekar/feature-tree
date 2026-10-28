---
name: reflect
status: done
parent: ft-cli
tests: python3 -m unittest skill.tests.test_ft.ReflectTests
last_verified: 2026-10-28
---
# reflect

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
The archive-and-distill stage of the work cycle. Once a todo or question is confirmed finished, reflecting it moves the original line, unchanged, into the node's archive and adds one short prose note saying what is now true. The node therefore reads as a summary of its current state rather than a pile of ticked checkboxes, while the archive keeps the full trail.

## Acceptance Tests
`python3 -m unittest skill.tests.test_ft.ReflectTests -v` passes (5 tests).

## Todos

## Questions

## Implemented
- Inputs: a node, exactly one of a finished todo (identified by its exact text) or a confirmed question (by number), and a required note. Missing or ambiguous input is rejected with a message and nothing changes.
- Todo effect: the line leaves the todo list, is appended to the archive as written, and the note is appended to the Implemented section.
- Question effect: the question with all its option and answer lines leaves the question list, is appended to the archive, and the note is appended to Facts and Details.
- Only items already confirmed can be reflected. An item that does not match is an error rather than a guess.
- Check mode: lists every confirmed-but-unreflected item, optionally within one subtree, and reports a failing result when any exist. Nothing is written.
- Notes should be plain behavior statements, not echoes of the task wording.

## Facts & Details
- Reflection is batched, not done at checkpoint time, so a crash mid-task never loses the checkbox: the cheap flip happens first and the distillation later.
- The end-of-turn guard, the headless driver and the planning-mode gate all call the same check, so they can never disagree about what is pending.
- Archived text is kept verbatim so history can be audited and the daily digest can still recognize finished work.
- Open items and open questions are never touched by this step.

## Citations
- [skill/SKILL.md](../../../skill/SKILL.md)
- [features/SCHEMA.md](../../SCHEMA.md)

## Archived

## Children
