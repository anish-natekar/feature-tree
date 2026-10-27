import { test } from "node:test";
import * as assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FT = require(path.resolve(__dirname, "../../media/tree.js"));

// A fixed copy of the sample tree, independent of the project's own (mutable) features/ directory —
// tests must not depend on live project content that a user might reasonably edit or delete.
// Resolved relative to this source file, not the compiled out/test/ location, so no build-step copy is needed.
const root = path.resolve(__dirname, "../../test/fixtures");

// Scoped to the robot-arm sample tree by default: features/ also holds this project's own
// dogfooded feature-tree/* subtree, which these fixture-driven tests don't know about.
export function readFiles(dir = root, rel = "robot-arm"): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...readFiles(dir, r));
    else if (e.name.endsWith(".md")) out.push({ path: r, text: fs.readFileSync(path.join(dir, r), "utf8") });
  }
  return out;
}
const tree = () => FT.buildTree(readFiles()) as Map<string, any>;

test("loads sample tree", () => {
  const t = tree();
  assert.deepStrictEqual([...t.keys()].sort(), ["gripper", "motion-planning", "robot-arm"]);
  assert.deepStrictEqual([...t.get("robot-arm").children].sort(), ["gripper", "motion-planning"]);
});

test("status, todos, tests parsed", () => {
  const t = tree();
  assert.strictEqual(t.get("gripper").status, "done");
  assert.strictEqual(t.get("gripper").lastVerified, "2026-10-20");
  const mp = t.get("motion-planning");
  assert.deepStrictEqual(mp.todos.map((x: any) => x.priority), [0, 2]);
  assert.strictEqual(mp.tests, "manual");
  assert.match(t.get("robot-arm").abstract, /Six-axis/);
});

test("feature refs and external citations separated", () => {
  const t = tree();
  const mp = t.get("motion-planning");
  assert.deepStrictEqual(mp.refs, ["gripper"]);
  assert.ok(mp.citations.some((c: any) => c.url === "https://moveit.ros.org/"));
  assert.deepStrictEqual(t.get("robot-arm").refs, []);
});

test("unedited round trip is byte identical for every file", () => {
  for (const f of readFiles()) {
    if (f.path === "SCHEMA.md") continue;
    const n = FT.parseNode(f.path, f.text);
    let out = f.text;
    for (const s of ["Abstract", "Acceptance Tests", "Implemented", "Citations"]) out = FT.setSection(out, s, n.sections[s]);
    out = FT.setSection(out, "Todos", FT.formatTodos(n.todos));
    out = FT.setSection(out, "Questions", FT.formatQuestions(n.questions));
    out = FT.setMeta(out, "tests", n.tests);
    assert.strictEqual(out, f.text, f.path);
  }
});

test("edits touch only the target", () => {
  const f = readFiles().find((x) => x.path.endsWith("motion-planning.md"))!;
  const n = FT.parseNode(f.path, f.text);
  const todos = [...n.todos, { done: false, priority: null, text: "handle [[gripper]] width" }];
  const out = FT.setSection(f.text, "Todos", FT.formatTodos(todos));
  assert.match(out, /- \[ \] \(P\?\) handle \[\[gripper\]\] width\n\n## Questions/);
  assert.strictEqual(FT.setMeta(f.text, "status", "in-progress").split("\n").length, f.text.split("\n").length);
  const back = FT.parseNode(f.path, out);
  assert.strictEqual(back.todos.at(-1).priority, null);
});

test("questions parsed, blocked todos unblock when answered", () => {
  const t = tree();
  const mp = t.get("motion-planning");
  assert.strictEqual(mp.questions[0].id, "Q1");
  assert.strictEqual(mp.questions[0].state, " ");
  const blocked = mp.todos.find((x: any) => x.blocked);
  assert.strictEqual(blocked.blocked, "Q1");
  assert.ok(!blocked.text.includes("{blocked"));
  assert.ok(FT.isBlocked(blocked, mp.questions));
  const answered = mp.questions.map((q: any) => ({ ...q, state: "~", answer: "MoveIt", agent: true }));
  assert.ok(!FT.isBlocked(blocked, answered));
  assert.strictEqual(FT.nextQuestionId(mp.questions), "Q2");
  assert.strictEqual(
    FT.formatQuestions(answered),
    "- [~] Q1: " + mp.questions[0].text + "\n  - A (agent): MoveIt"
  );
  const g = t.get("gripper").questions[0];
  assert.deepStrictEqual([g.state, g.agent, g.answer], ["x", false, "Modbus RTU at 115200 baud."]);
});

test("limit and tle markers survive parse/format", () => {
  const line = "- [ ] (P1) do thing {blocked: Q2} {limit: 20m} {tle: 30m}";
  const [t] = FT.parseTodos(line);
  assert.deepStrictEqual([t.text, t.blocked, t.limit, t.tle], ["do thing", "Q2", "20m", "30m"]);
  assert.strictEqual(FT.formatTodos([t]), line);
  const [u] = FT.parseTodos("- [ ] (P0) plain");
  assert.deepStrictEqual([u.limit, u.tle], [null, null]);
});

test("multiple-choice question options survive parse/format, first stays first (recommended)", () => {
  const section = "- [ ] Q1: Which license?\n  - O: MIT\n  - O: Apache-2.0\n  - O: GPL-3.0";
  const [q] = FT.parseQuestions(section);
  assert.deepStrictEqual(q.options, ["MIT", "Apache-2.0", "GPL-3.0"]);
  assert.strictEqual(FT.formatQuestions([q]), section);
  // answering still works the same whether the text came from a listed option or free-text "Other"
  const answered = { ...q, state: "x", answer: "MIT" };
  assert.strictEqual(FT.formatQuestions([answered]), section.replace("[ ]", "[x]") + "\n  - A: MIT");
  // a plain question with no options round-trips with an empty options array, unchanged on disk
  const [plain] = FT.parseQuestions("- [ ] Q2: Open-ended?");
  assert.deepStrictEqual(plain.options, []);
  assert.strictEqual(FT.formatQuestions([plain]), "- [ ] Q2: Open-ended?");
});
