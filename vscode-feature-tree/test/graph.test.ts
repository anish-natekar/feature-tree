import { test } from "node:test";
import * as assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import { readFiles } from "./parse.test";

const media = path.resolve(__dirname, "../../media");
const read = (f: string) => fs.readFileSync(path.join(media, f), "utf8");

function mount() {
  const dom = new JSDOM(
    `<body><div id="toolbar"></div><div id="viewport"><div id="canvas"><svg id="edges"></svg></div></div></body>`,
    { runScripts: "outside-only" }
  );
  const win = dom.window as any;
  const log = { writes: [] as { path: string; text: string }[], external: [] as string[], claude: [] as string[] };
  win.FT_HOST = {
    kind: "test",
    rootName: "features",
    onFiles: (cb: (f: unknown) => void) => { win.__push = cb; cb(readFiles()); },
    write: (p: string, text: string) => log.writes.push({ path: p, text }),
    external: (u: string) => log.external.push(u),
    claude: (p: string) => log.claude.push(p),
    openRaw: () => {},
  };
  win.eval(read("tree.js"));
  win.eval(read("graph.js"));
  const doc = win.document as Document;
  const card = (t: string) =>
    [...doc.querySelectorAll<HTMLElement>(".card")].find((c) => c.querySelector(".title")!.textContent === t)!;
  const key = (el: Element, k: string) =>
    el.dispatchEvent(new win.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  const type = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
    el.value = v;
    el.setSelectionRange(v.length, v.length);
    el.dispatchEvent(new win.Event("input", { bubbles: true }));
  };
  return { doc, win, log, card, key, type };
}

test("renders one card per node with status, edges, fold, expand", () => {
  const { doc, card } = mount();
  assert.strictEqual(doc.querySelectorAll(".card").length, 3);
  assert.strictEqual(card("gripper").dataset.status, "done");
  assert.strictEqual(card("robot-arm").dataset.status, "in-progress");
  assert.strictEqual(doc.querySelectorAll("#edges path").length, 2);
  (card("robot-arm").querySelector(".btn") as HTMLElement).click();
  assert.match(doc.querySelector(".detail")!.textContent!, /tests: pytest tests\/test_robot_arm.py/);
  const fold = [...doc.querySelectorAll<HTMLElement>(".card .btn")].find((b) => b.textContent === "−")!;
  fold.click();
  assert.strictEqual(doc.querySelectorAll(".card").length, 1);
});

test("feature chip navigates in viewer; external link goes to host", () => {
  const { doc, card, log } = mount();
  (card("motion-planning").querySelector(".btn") as HTMLElement).click();
  const ref = card("motion-planning").querySelector<HTMLElement>(".detail .ref")!;
  assert.strictEqual(ref.textContent, "gripper");
  ref.click();
  assert.ok(card("gripper").querySelector(".detail"), "target expanded");
  assert.strictEqual(doc.querySelector(".drawer .dtitle")!.textContent, "gripper");
  assert.deepStrictEqual(log.external, []);
  card("motion-planning").querySelector<HTMLElement>(".detail .ext")!.click();
  assert.deepStrictEqual(log.external, ["https://moveit.ros.org/"]);
});

test("drawer: add todo with [[ autocomplete, unassigned priority, minimal diff", () => {
  const { doc, card, log, key, type } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const add = doc.querySelector<HTMLInputElement>(".drawer .todo.add .txt")!;
  type(add, "handle [[gri");
  assert.deepStrictEqual([...doc.querySelectorAll(".ac-item")].map((e) => e.textContent), ["gripper"]);
  key(add, "Enter"); // picks completion, must not add yet
  assert.strictEqual(add.value, "handle [[gripper]]");
  assert.strictEqual(log.writes.length, 0);
  key(add, "Enter"); // adds
  assert.strictEqual(log.writes.length, 1);
  const w = log.writes[0];
  assert.strictEqual(w.path, "robot-arm/motion-planning.md");
  assert.match(w.text, /- \[ \] \(P\?\) handle \[\[gripper\]\]\n\n## Questions/);
  const before = readFiles().find((f) => f.path === w.path)!.text;
  assert.strictEqual(w.text.split("\n").length, before.split("\n").length + 1, "exactly one added line");
  assert.ok(card("motion-planning").querySelector(".unset"), "P? badge shown");
});

test("drawer: status and priority edits", () => {
  const { doc, card, log, win } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const st = doc.querySelector<HTMLSelectElement>(".drawer select.status")!;
  st.value = "in-progress";
  st.dispatchEvent(new win.Event("change"));
  assert.match(log.writes.at(-1)!.text, /^status: in-progress$/m);
  const pr = doc.querySelector<HTMLSelectElement>(".drawer .todo select.pr")!;
  pr.value = "3";
  pr.dispatchEvent(new win.Event("change"));
  assert.match(log.writes.at(-1)!.text, /\(P3\) choose planner library/);
});

test("claude buttons send prompts citing node path, never file text", () => {
  const { doc, card, log } = mount();
  card("gripper").querySelector<HTMLElement>(".title")!.click();
  const btn = [...doc.querySelectorAll<HTMLElement>(".drawer .actions button")].find((b) => b.textContent!.includes("Work"))!;
  btn.click();
  assert.strictEqual(log.claude.length, 1);
  assert.match(log.claude[0], /features\/robot-arm\/gripper\.md/);
  assert.doesNotMatch(log.claude[0], /Two-finger/);
  [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Triage"))!.click();
  assert.match(log.claude[1], /ft todos --unassigned/);
});

test("floating todo box: sorted by priority, filters, tick, jump", () => {
  const { doc, win, card, log } = mount();
  const toggle = [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Todos"))!;
  const box = doc.querySelector<HTMLElement>(".todobox")!;
  assert.ok(box.hidden);
  toggle.click();
  assert.ok(!box.hidden);
  const order = () => [...box.querySelectorAll(".trow")].map((r) => r.querySelector(".pbadge")!.textContent);
  assert.deepStrictEqual(order(), ["P0", "P1", "P2", "P3", "P?"]);
  // priority filter: hide P0 and P?
  const chip = (v: string) => [...box.querySelectorAll<HTMLElement>(".chip")].find((c) => c.textContent === "P" + v)!;
  chip("0").click();
  chip("?").click();
  assert.deepStrictEqual(order(), ["P1", "P2", "P3"]);
  chip("0").click();
  chip("?").click();
  // subtree filter
  const under = box.querySelector<HTMLSelectElement>("select")!;
  under.value = "motion-planning";
  under.dispatchEvent(new win.Event("change"));
  assert.deepStrictEqual(order(), ["P0", "P2"]);
  under.value = "";
  under.dispatchEvent(new win.Event("change"));
  // text filter
  const q = box.querySelector<HTMLInputElement>('input[placeholder^="filter"]')!;
  q.value = "power";
  q.dispatchEvent(new win.Event("input"));
  assert.deepStrictEqual(order(), ["P?"]);
  q.value = "";
  q.dispatchEvent(new win.Event("input"));
  // tick P0 todo writes [x] only there, and row leaves list
  const cb = box.querySelector<HTMLInputElement>(".trow input")!;
  cb.checked = true;
  cb.dispatchEvent(new win.Event("change"));
  assert.match(log.writes.at(-1)!.text, /- \[x\] \(P0\) choose planner library/);
  assert.deepStrictEqual(order(), ["P1", "P2", "P3", "P?"]);
  // click node name jumps and opens drawer
  box.querySelector<HTMLElement>(".twhere")!.click();
  assert.ok(doc.querySelector(".drawer .dtitle"));
  assert.ok(card("robot-arm"));
});

test("empty state explains what to do; stray markdown is not a node", () => {
  const dom = new JSDOM(
    `<body><div id="toolbar"></div><div id="viewport"><div id="canvas"><svg id="edges"></svg></div></div></body>`,
    { runScripts: "outside-only" }
  );
  const win = dom.window as any;
  win.FT_HOST = { kind: "web", canPick: true, rootName: "features", onFiles: () => {}, pick: async () => {} };
  win.eval(read("tree.js"));
  win.eval(read("graph.js"));
  const doc = win.document as Document;
  const msg = doc.querySelector<HTMLElement>(".emptymsg")!;
  assert.ok(!msg.hidden);
  assert.match(msg.textContent!, /open features\/ folder/);
  assert.ok(doc.querySelector("#toolbar button.primary"));
  assert.strictEqual(win.FT.buildTree([{ path: "README.md", text: "# hi\n" }]).size, 0);
});

test("questions: add, answer unblocks todo, confirm agent answer, floating inbox", () => {
  const { doc, win, card, log, key, type } = mount();
  assert.ok(card("motion-planning").querySelector(".qbadge"), "open-question badge on card");
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();

  // add a question
  const add = doc.querySelector<HTMLInputElement>(".drawer .qs > input")!;
  type(add, "Which IK solver?");
  key(add, "Enter");
  const w1 = log.writes.at(-1)!;
  assert.match(w1.text, /- \[ \] Q1: Should we depend on MoveIt.*\n- \[ \] Q2: Which IK solver\?\n\n## Implemented/);

  // answer Q1 -> [x] with answer line, and the blocked marker on the todo is removed
  const q1 = doc.querySelector<HTMLElement>(".drawer .q.open")!;
  const ans = q1.querySelector<HTMLTextAreaElement>("textarea.ans")!;
  ans.value = "MoveIt; Pi 5 is fast enough";
  [...q1.querySelectorAll("button")].find((b) => b.textContent === "Answer")!.click();
  const w2 = log.writes.at(-1)!;
  assert.match(w2.text, /- \[x\] Q1: .*\n  - A: MoveIt; Pi 5 is fast enough/);
  assert.doesNotMatch(w2.text, /\{blocked/);
  assert.match(w2.text, /\(P0\) choose planner library \(MoveIt vs custom IK\)\n/);

  // inbox tab lists open Q2, hides answered by default
  const box = doc.querySelector<HTMLElement>(".todobox")!;
  [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Todos"))!.click();
  const tab = [...box.querySelectorAll<HTMLElement>(".tab")].find((t) => t.textContent!.startsWith("Questions"))!;
  tab.click();
  const rows = [...box.querySelectorAll(".qrow")];
  assert.strictEqual(rows.length, 1);
  assert.match(rows[0].textContent!, /Q2.*Which IK solver/);
  // answer from the inbox
  const inp = rows[0].querySelector<HTMLInputElement>("input")!;
  type(inp, "Analytical IK");
  key(inp, "Enter");
  assert.match(log.writes.at(-1)!.text, /- \[x\] Q2: Which IK solver\?\n  - A: Analytical IK/);
  void win;
});

test("blocked todo shows marker; agent answer awaits confirm; confirm unblocks", () => {
  const { doc, card, log } = mount();
  const box = doc.querySelector<HTMLElement>(".todobox")!;
  [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Todos"))!.click();
  assert.ok(box.querySelector(".trow.blocked .blk-tag"), "blocked todo flagged");
  // simulate an agent-answered question arriving from disk
  const files = readFiles().map((f) =>
    f.path.endsWith("motion-planning.md")
      ? { ...f, text: f.text.replace("- [ ] Q1:", "- [~] Q1:").replace(/(- \[~\] Q1: .*)\n/, "$1\n  - A (agent): Use MoveIt. Sources: [docs](https://moveit.ros.org/)\n") }
      : f
  );
  (doc.defaultView as any).__push(files);
  assert.ok(!box.querySelector(".trow.blocked"), "agent answer unblocks");
  [...box.querySelectorAll<HTMLElement>(".tab")].find((t) => t.textContent!.startsWith("Questions"))!.click();
  const row = box.querySelector(".qrow.pend")!;
  assert.match(row.textContent!, /agent: Use MoveIt/);
  (row.querySelector("button") as HTMLElement).click();
  assert.match(log.writes.at(-1)!.text, /- \[x\] Q1: .*\n  - A: Use MoveIt/);
  void card;
});

test("drawer: TLE todo shows retry that clears the marker; limit editable; jump chips present", () => {
  const { doc, win, card, log } = mount();
  const mp = readFiles().find((f) => f.path.endsWith("motion-planning.md"))!;
  win.__push(readFiles().map((f) => (f.path === mp.path ? { ...f, text: f.text.replace("limits config", "limits config {tle: 20m}") } : f)));
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  assert.ok(doc.querySelectorAll(".drawer .jump .chip").length >= 6);
  const retry = doc.querySelector<HTMLElement>(".drawer .btn.tle")!;
  assert.match(retry.textContent!, /TLE 20m/);
  retry.click();
  assert.ok(log.writes.length >= 1);
  assert.ok(!log.writes.at(-1)!.text.includes("{tle"));
  const lim = doc.querySelector<HTMLInputElement>(".drawer .todo .lim")!;
  lim.value = "5m";
  lim.dispatchEvent(new win.Event("change", { bubbles: true }));
  assert.match(log.writes.at(-1)!.text, /\{limit: 5m\}/);
});
