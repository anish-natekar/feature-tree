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
  const log = { writes: [] as { path: string; text: string }[], external: [] as string[], openPath: [] as { node: string; href: string }[] };
  win.FT_HOST = {
    kind: "test",
    rootName: "features",
    onFiles: (cb: (f: unknown) => void) => { win.__push = cb; cb(readFiles()); },
    write: (p: string, text: string) => log.writes.push({ path: p, text }),
    external: (u: string) => log.external.push(u),
    openRaw: () => {},
    openPath: (node: string, href: string) => log.openPath.push({ node, href }),
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

test("drawer: Methodology section sits right after Abstract and is editable", () => {
  const { doc, card } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const heads = [...doc.querySelectorAll(".drawer .field > label")].map((e) => (e.textContent || "").trim().toLowerCase());
  const a = heads.findIndex((h) => h.startsWith("abstract"));
  const mth = heads.findIndex((h) => h.startsWith("methodology"));
  assert.ok(a >= 0 && mth === a + 1, `headings: ${heads.join(" | ")}`);
});

test("drawer: numbered and bulleted lines in prose render as real lists", () => {
  const { doc, win, card } = mount();
  const files = readFiles().map((f) =>
    f.path === "robot-arm/motion-planning.md"
      ? { ...f, text: f.text.replace(/## Abstract\n/, "## Abstract\nIntro line\n1. first\n2. second\n\n* a\n* b\n") }
      : f
  );
  win.__push(files);
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const view = doc.querySelector<HTMLElement>(".drawer .secview")!;
  assert.strictEqual(view.querySelectorAll("ol > li").length, 2);
  assert.strictEqual(view.querySelectorAll("ul > li").length, 2);
  assert.match(view.querySelector(".p")!.textContent!, /^Intro line/);
});

test("drawer: status and priority edits", () => {
  const { doc, card, log, win } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const st = doc.querySelector<HTMLSelectElement>(".drawer select.bstatus")!;
  st.value = "in-progress";
  st.dispatchEvent(new win.Event("change"));
  assert.match(log.writes.at(-1)!.text, /^status: in-progress$/m);
  const pr = doc.querySelector<HTMLSelectElement>(".drawer .todo select.pr")!;
  pr.value = "3";
  pr.dispatchEvent(new win.Event("change"));
  assert.match(log.writes.at(-1)!.text, /\(P3\) choose planner library/);
});

test("no claude-launch controls remain anywhere in the UI", () => {
  const { doc, card } = mount();
  card("gripper").querySelector<HTMLElement>(".title")!.click();
  assert.strictEqual(doc.querySelectorAll(".drawer .actions, .claude-label").length, 0);
  const labels = [...doc.querySelectorAll("button")].map((b) => b.textContent || "");
  assert.ok(!labels.some((t) => /claude|triage|research questions/i.test(t)));
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
  // human picks the state directly (not a cycle) via the select; writes [x] only there, and row leaves list
  const stateSel = box.querySelector<HTMLSelectElement>(".trow .tstate")!;
  stateSel.value = "x";
  stateSel.dispatchEvent(new win.Event("change"));
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

// ---------- single-node custom editor tab (window.FT_MODE === "node") ----------

function mountNode(filePath: string) {
  const dom = new JSDOM(
    `<body><div id="toolbar"></div><div id="viewport"><div id="canvas"><svg id="edges"></svg></div></div></body>`,
    { runScripts: "outside-only" }
  );
  const win = dom.window as any;
  const posted: { type: string; [k: string]: unknown }[] = [];
  win.FT_MODE = "node";
  win.acquireVsCodeApi = () => ({ postMessage: (m: unknown) => posted.push(m as any) });
  win.eval(read("tree.js"));
  win.eval(read("graph.js"));
  const file = readFiles().find((f) => f.path === filePath)!;
  const push = (text: string) => win.dispatchEvent(new win.MessageEvent("message", { data: { type: "doc", path: filePath, text } }));
  push(file.text);
  return { doc: win.document as Document, win, posted, push, text: file.text };
}

test("card shows progress rollup badge summed across node + descendants; no badge when subtree has no todos", () => {
  const { card } = mount();
  const badge = card("robot-arm").querySelector<HTMLElement>(".pctbadge")!;
  assert.strictEqual(badge.textContent, "0%");
  assert.ok(!card("gripper").querySelector(".pctbadge"), "gripper's subtree has no todos at all");
});

test("blocked-by node gates the todo until that node is done; hitl flags it everywhere; both shown in drawer and floating box", () => {
  const { doc, win, card } = mount();
  const mp = readFiles().find((f) => f.path.endsWith("motion-planning.md"))!;
  const withMarks = (f: { path: string; text: string }) =>
    f.path === mp.path ? { ...f, text: f.text.replace("limits config", "limits config {blocked-by: robot-arm} {hitl}") } : f;
  win.__push(readFiles().map(withMarks));

  [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Todos"))!.click();
  const box = doc.querySelector<HTMLElement>(".todobox")!;
  const row = [...box.querySelectorAll<HTMLElement>(".trow")].find((r) => r.textContent!.includes("limits config"))!;
  assert.ok(row.classList.contains("blocked"), "blocked-by node flags the row (robot-arm isn't done)");
  assert.match(row.textContent!, /⛔ robot-arm/);
  assert.ok(row.querySelector(".hitl-tag"), "hitl glyph shown in floating box");

  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const drawerRow = [...doc.querySelectorAll<HTMLElement>(".drawer .todo")].find((r) => (r.querySelector(".txt") as HTMLInputElement)?.value.includes("limits config"))!;
  assert.ok(drawerRow.querySelector(".hitl-tag"), "drawer summary shows hitl glyph");
  assert.ok(drawerRow.querySelectorAll(".blk-tag").length >= 1, "drawer summary shows blocked-by glyph");

  // robot-arm becomes done -> no longer blocked
  win.__push(readFiles().map(withMarks).map((f) => (f.path.endsWith("robot-arm.md") ? { ...f, text: f.text.replace("status: in-progress", "status: done") } : f)));
  const box2 = doc.querySelector<HTMLElement>(".todobox")!;
  const row2 = [...box2.querySelectorAll<HTMLElement>(".trow")].find((r) => r.textContent!.includes("limits config"))!;
  assert.ok(!row2.classList.contains("blocked"), "unblocks once the target node is done");
});

test("node-editor mode: single doc renders full-page drawer with no graph chrome, and asks to open", () => {
  const { doc, posted } = mountNode("robot-arm/gripper.md");
  assert.ok(doc.body.classList.contains("node-editor"));
  assert.ok(doc.querySelector(".drawer") && !doc.querySelector(".drawer")!.hasAttribute("hidden"), "drawer visible without clicking a card");
  assert.strictEqual(doc.querySelectorAll(".card").length, 0, "no graph is built in single-node mode");
  assert.ok(posted.some((m) => m.type === "ready"), "webview announced readiness so the extension sends the doc");
  assert.strictEqual(doc.querySelector(".drawer .dtitle")!.textContent, "gripper");
});

test("node-editor mode: editing a section writes {type:'write', text} with no path, and raw/claude bridge through", () => {
  const { doc, posted, win } = mountNode("robot-arm/gripper.md");
  const ta = [...doc.querySelectorAll<HTMLTextAreaElement>(".drawer textarea")].find(
    (t) => t.closest(".field")!.querySelector("label")!.textContent === "Abstract"
  )!;
  ta.value = "Rewritten abstract for the gripper.";
  ta.dispatchEvent(new win.Event("blur"));
  const write = posted.find((m) => m.type === "write")!;
  assert.ok(write, "a write message was posted");
  assert.strictEqual(write.path, undefined, "single-doc write carries no path — it targets the bound document");
  assert.match(write.text as string, /Rewritten abstract for the gripper\./);

  doc.querySelector<HTMLElement>(".drawer .link")!.click();
  assert.ok(posted.some((m) => m.type === "raw"));
});

test("node-editor mode: an external doc change (e.g. edited elsewhere) re-renders the drawer when not focused", () => {
  const { doc, push, text } = mountNode("robot-arm/gripper.md");
  assert.strictEqual(doc.querySelector(".drawer .dtitle")!.textContent, "gripper");
  push(text.replace("status: done", "status: planned"));
  assert.strictEqual(doc.querySelector<HTMLSelectElement>(".drawer select.bstatus")!.value, "planned");
});

// ---------- multiple-choice questions (AskUserQuestion-style: first = recommended, "Other" implicit) ----------

function withMcQuestion() {
  const mp = readFiles().find((f) => f.path.endsWith("motion-planning.md"))!;
  const withOptions = mp.text.replace(
    "- [ ] Q1: Should we depend on MoveIt (ROS 2) or write our own IK, given the arm runs on a Raspberry Pi?",
    "- [ ] Q1: Should we depend on MoveIt (ROS 2) or write our own IK, given the arm runs on a Raspberry Pi?\n  - O: MoveIt\n  - O: Custom RRT"
  );
  assert.notStrictEqual(withOptions, mp.text, "fixture line must match the file on disk");
  return readFiles().map((f) => (f.path === mp.path ? { ...f, text: withOptions } : f));
}

test("MCQ: recommended option badged first, picking a listed option answers immediately", () => {
  const { doc, card, log, win } = mount();
  win.__push(withMcQuestion());
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const opts = [...doc.querySelectorAll<HTMLElement>(".mc .mcopt")];
  assert.strictEqual(opts.length, 3, "MoveIt, Custom RRT, and an implicit Other");
  assert.ok(opts[0].classList.contains("rec"), "first option is flagged recommended");
  assert.ok(!opts[1].classList.contains("rec"));
  assert.match(opts[2].textContent!, /Other/);
  assert.ok(doc.querySelector(".mcother")!.hasAttribute("hidden"), "free-text box stays hidden until Other is picked");

  (opts[1].querySelector("input") as HTMLInputElement).click();
  const write = log.writes.at(-1)!;
  assert.match(write.text, /- \[x\] Q1: .*\n {2}- O: MoveIt\n {2}- O: Custom RRT\n {2}- A: Custom RRT/);
});

test("MCQ: picking Other reveals the free-text answer box instead of auto-answering", () => {
  const { doc, card, log, win } = mount();
  win.__push(withMcQuestion());
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const other = [...doc.querySelectorAll<HTMLElement>(".mc .mcopt")].at(-1)!;
  (other.querySelector("input") as HTMLInputElement).click();
  assert.strictEqual(log.writes.length, 0, "choosing Other must not write by itself");
  assert.ok(!doc.querySelector(".mcother")!.hasAttribute("hidden"), "free-text box is now visible");
  const ans = doc.querySelector<HTMLTextAreaElement>(".mcother .ans")!;
  ans.value = "ROS 1 bridge";
  [...doc.querySelectorAll<HTMLElement>(".mcother button")].find((b) => b.textContent === "Answer")!.click();
  assert.match(log.writes.at(-1)!.text, /- A: ROS 1 bridge/);
});

test("MCQ: a question with no options still renders the plain free-text editor", () => {
  const { doc, card } = mount();
  card("gripper").querySelector<HTMLElement>(".title")!.click();
  assert.strictEqual(doc.querySelectorAll(".drawer .mc").length, 0);
  assert.ok(doc.querySelector(".drawer .q .ans"));
});

// ---------- todo row: blocked-on dropdown only appears when it has something to say; priority is color-coded ----------

test("todo row: blocked-on dropdown hidden with no open questions, shown (and wide enough to read) when one exists", () => {
  const { doc, card } = mount();
  card("gripper").querySelector<HTMLElement>(".title")!.click();
  assert.strictEqual(doc.querySelectorAll(".drawer .todo select.blk").length, 0, "gripper's only question is answered — nothing to block on");

  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const bl = doc.querySelector<HTMLSelectElement>(".drawer .todo select.blk")!;
  assert.ok(bl, "motion-planning has an open question, so the blocked-on control is useful here");
  assert.deepStrictEqual([...bl.options].map((o) => o.value), ["", "Q1"]);
  assert.strictEqual(bl.value, "Q1");
});

test("todo row: priority select carries a data-pri hook for color coding, and the limit input has a clock icon", () => {
  const { doc, card, win } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const pr = doc.querySelector<HTMLSelectElement>(".drawer .todo select.pr")!;
  assert.strictEqual(pr.dataset.pri, "0");
  pr.value = "2";
  pr.dispatchEvent(new win.Event("change"));
  assert.strictEqual(pr.dataset.pri, "2");
  assert.ok(doc.querySelector(".drawer .todo .limwrap .ico"), "limit box has a persistent ⏱ affordance, not just a placeholder that vanishes on focus");
});

test("todo row collapses to state+priority+title by default; priority/limit controls live behind expand", () => {
  const { doc, card } = mount();
  card("motion-planning").querySelector<HTMLElement>(".title")!.click();
  const row = doc.querySelector<HTMLDetailsElement>(".drawer .todo")!;
  assert.strictEqual(row.tagName, "DETAILS");
  assert.strictEqual(row.open, false, "collapsed by default");
  assert.ok(row.querySelector("summary select.tstate"), "state picker visible in the summary");
  assert.ok(row.querySelector("summary .pbadge"), "priority shown as a compact badge, not an editable control, in the summary");
  assert.ok(row.querySelector("summary input.txt"), "title visible and editable in the summary");
  assert.strictEqual(row.querySelector("summary select.pr"), null, "the priority select itself is not in the summary");
  assert.ok(row.querySelector(".tdetail select.pr"), "priority select is in the collapsible body");
  assert.ok(row.querySelector(".tdetail .limwrap"), "limit input is in the collapsible body");
});

test("citations: external links call host.external, relative-path links resolve against the node and call host.openPath", () => {
  const { doc, card, log } = mount();
  card("robot-arm").querySelector<HTMLElement>(".title")!.click();
  const links = [...doc.querySelectorAll<HTMLElement>(".drawer .secview .ext")];
  assert.strictEqual(links.length, 2, "both the http citation and the relative-path citation render as clickable links");

  const ext = links.find((l) => l.textContent === "ROS MoveIt docs")!;
  ext.click();
  assert.deepStrictEqual(log.external, ["https://moveit.ros.org/"]);

  const rel = links.find((l) => l.textContent === "SCHEMA.md")!;
  assert.strictEqual(rel.title, "../SCHEMA.md", "raw relative href shown on hover instead of a dead literal string");
  rel.click();
  assert.deepStrictEqual(log.openPath, [{ node: "robot-arm/robot-arm.md", href: "../SCHEMA.md" }]);
});

test("abstract read view renders `code` spans instead of showing raw backticks", () => {
  const { doc, card } = mount();
  card("robot-arm").querySelector<HTMLElement>(".title")!.click();
  const abs = [...doc.querySelectorAll<HTMLElement>(".drawer .field")].find(
    (f) => f.querySelector("label")!.textContent === "Abstract"
  )!;
  const code = abs.querySelector(".secview code")!;
  assert.strictEqual(code.textContent, "motor_driver.py");
  assert.ok(!abs.querySelector(".secview")!.textContent!.includes("`"), "no literal backticks left in the rendered view");
});

test("needs-you tab: blocking question first, HITL todo listed, count in tab label", () => {
  const { doc, win } = mount();
  const mp = readFiles().find((f) => f.path.endsWith("motion-planning.md"))!;
  win.__push(readFiles().map((f) => (f.path === mp.path ? { ...f, text: f.text.replace("limits config", "limits config {hitl}") } : f)));
  const box = doc.querySelector<HTMLElement>(".todobox")!;
  [...doc.querySelectorAll<HTMLElement>("#toolbar button")].find((b) => b.textContent!.includes("Todos"))!.click();
  const tab = [...box.querySelectorAll<HTMLElement>(".tab")].find((t) => t.textContent!.startsWith("Needs you"))!;
  assert.match(tab.textContent!, /Needs you \(2\)/);
  tab.click();
  const rows = [...box.querySelectorAll(".qrow")];
  assert.strictEqual(rows.length, 2);
  assert.match(rows[0].textContent!, /Q1.*blocks 1 todo/);
  assert.ok(rows[1].classList.contains("hitl"));
  assert.match(rows[1].textContent!, /needs a live human/);
});

test("paused banner shows when features/.paused exists and clears on resume", () => {
  const { doc, win } = mount();
  assert.ok(!doc.querySelector("#toolbar .pausedbanner"));
  win.__push([...readFiles(), { path: ".paused", text: "lunch" }]);
  assert.match(doc.querySelector("#toolbar .pausedbanner")!.textContent!, /PAUSED — lunch/);
  win.__push(readFiles());
  assert.ok(!doc.querySelector("#toolbar .pausedbanner"));
});
