// Feature tree viewer + editor. Host-agnostic: talks to window.FT_HOST (browser) or the VS Code webview bridge.
(function () {
  const FT = window.FT;
  const CARD_W = 240, H_COLLAPSED = 40, H_EXPANDED = 210, GAP_X = 70, GAP_Y = 14;
  const COLORS = { done: "#2e9e5b", "in-progress": "#e0a020", planned: "#5a7fd6" };
  const canvas = document.getElementById("canvas");
  const edges = document.getElementById("edges");
  const viewport = document.getElementById("viewport");
  const toolbar = document.getElementById("toolbar");

  function vscodeHost() {
    const api = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : { postMessage() {} };
    let cb = null;
    window.addEventListener("message", (e) => { if (e.data.type === "files" && cb) cb(e.data.files); });
    const post = (m) => api.postMessage(m);
    return {
      kind: "vscode", rootName: "features",
      onFiles(f) { cb = f; post({ type: "ready" }); },
      write(path, text) { post({ type: "write", path, text }); },
      openRaw(path) { post({ type: "open", path }); },
      external(url) { post({ type: "external", url }); },
      claude(prompt) { post({ type: "claude", prompt }); return "Starting Claude Code in a terminal…"; },
    };
  }
  const host = window.FT_HOST || vscodeHost();

  let nodes = new Map();
  const expanded = new Set(), folded = new Set();
  let view = { x: 40, y: 60, k: 1 };
  let bbox = { w: 0, h: 0 };
  let fitted = false;
  let selected = null;
  let lastPos = new Map();

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const rel = (n) => host.rootName + "/" + n.path;

  function toast(msg) {
    const t = el("div", "toast", msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ---------- inline links ----------
  const INLINE_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

  function refChip(name, label) {
    const ok = nodes.has(name);
    const c = el("span", "ref" + (ok ? "" : " missing"), label || name);
    c.title = ok ? "Go to " + name : "Missing node: " + name;
    if (ok) c.onclick = () => { focusNode(name); select(name); };
    return c;
  }
  function extLink(text, url) {
    const a = el("span", "ext", text);
    a.title = url;
    a.onclick = () => host.external(url);
    return a;
  }
  function linkify(text, parent) {
    let last = 0, m;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(text))) {
      if (m.index > last) parent.append(text.slice(last, m.index));
      parent.append(m[1] ? refChip(m[1].trim(), m[2]) : extLink(m[3], m[4]));
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.append(text.slice(last));
    return parent;
  }

  // ---------- autocomplete for [[ ----------
  function attachComplete(inp) {
    let pop = null, items = [], sel = 0, range = null;
    const close = () => { if (pop) pop.remove(); pop = null; };
    function show() {
      if (pop) pop.remove();
      pop = el("div", "ac");
      const r = inp.getBoundingClientRect();
      pop.style.left = r.left + "px";
      pop.style.top = r.bottom + 2 + "px";
      items.forEach((name, i) => {
        const it = el("div", "ac-item" + (i === sel ? " sel" : ""), name);
        it.onmousedown = (ev) => { ev.preventDefault(); choose(i); };
        pop.append(it);
      });
      document.body.append(pop);
    }
    function update() {
      const pos = inp.selectionStart;
      const m = /\[\[([^\]|\n]*)$/.exec(inp.value.slice(0, pos));
      if (!m) return close();
      const q = m[1].toLowerCase();
      items = [...nodes.keys()].filter((k) => k.includes(q)).sort().slice(0, 8);
      if (!items.length) return close();
      range = { start: pos - m[1].length, end: pos };
      sel = Math.min(sel, items.length - 1);
      show();
    }
    function choose(i) {
      const v = inp.value, after = v.slice(range.end);
      inp.value = v.slice(0, range.start) + items[i] + (after.startsWith("]]") ? "" : "]]") + after;
      const caret = range.start + items[i].length + 2;
      inp.setSelectionRange(caret, caret);
      close();
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
    inp.addEventListener("input", update);
    inp.addEventListener("keydown", (e) => {
      if (!pop) return;
      if (e.key === "ArrowDown") { sel = (sel + 1) % items.length; show(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = (sel + items.length - 1) % items.length; show(); e.preventDefault(); }
      else if (e.key === "Enter" || e.key === "Tab") { choose(sel); e.preventDefault(); e.stopImmediatePropagation(); }
      else if (e.key === "Escape") { close(); e.preventDefault(); }
    });
    inp.addEventListener("blur", () => setTimeout(close, 150));
  }

  // ---------- Claude Code prompts (only node paths/names, never file text) ----------
  const SKILL = "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). ";
  const prompts = {
    work: (n) => SKILL + `Implement mode for ${rel(n)} ([[${n.name}]]): follow the Work loop in the skill (ft next, skip todos blocked on questions, checkpoint the node after each todo), run the acceptance tests, then update the node per the skill. Ask me if anything is unclear and cite node paths.`,
    interview: (n) => SKILL + `Plan mode. Interview me about ${rel(n)}: read it and linked nodes, search the web if useful, ask questions that cite node paths, then update the node and run ft lint.`,
    triage: (n) => SKILL + (n ? `Assign a priority P0-P3 to every (P?) todo in ${rel(n)}` : "Assign a priority P0-P3 to every (P?) todo in the tree (ft todos --unassigned)") + ", using dependencies between nodes and their abstracts. Rewrite the lines in place, run ft lint, and summarise your reasoning.",
    close: (n) => SKILL + `Verify ${rel(n)}: run its acceptance tests; if they pass, move finished todos into Implemented, set status and last_verified, run ft index and ft lint.`,
    research: (n) => SKILL + (n ? `Research mode for ${rel(n)}` : "Research mode for the whole tree") + ": run ft questions --open, research each open question on the web and in the repo, record answers as [~] with sources per SCHEMA.md, remove stale {blocked} markers, run ft lint, and list anything still needing me.",
    plan: () => SKILL + "Plan mode for the whole tree. Run ft tree, read the roots, and interview me about gaps or unclear features, citing node paths.",
  };
  async function sendClaude(prompt) {
    try { toast((await host.claude(prompt)) || "Sent."); } catch (e) { toast("Claude action failed: " + e.message); }
  }

  // ---------- editing ----------
  const timers = new Map();
  function commit(n, mutate) {
    const text = mutate(n.text);
    if (text === n.text) return;
    const children = n.children;
    Object.assign(n, FT.parseNode(n.path, text), { children });
    Promise.resolve(host.write(n.path, text)).catch((e) => toast("Write failed: " + e.message));
    render();
  }
  function debounced(key, fn) {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(fn, 500));
  }

  // textareas grow with their content so long pages never hide behind an inner scrollbar
  function autoGrow(ta) {
    const fit = () => { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 2, 90) + "px"; };
    ta.addEventListener("input", fit);
    ta.style.overflow = "hidden";
    ta.style.resize = "none";
    ta.addEventListener("ft-fit", fit);
    setTimeout(fit, 0);
  }

  function field(label, node) {
    const w = el("div", "field");
    w.append(el("label", "", label), node);
    return w;
  }

  function section(n, name, hint) {
    const ta = el("textarea");
    ta.value = (n.sections[name] || "").trim();
    ta.rows = 5;
    ta.placeholder = hint;
    autoGrow(ta);
    const save = () => commit(n, (t) => FT.setSection(t, name, ta.value));
    ta.addEventListener("input", () => debounced(n.name + name, save));
    ta.addEventListener("blur", save);
    attachComplete(ta);
    return field(name, ta);
  }

  function todoBox(n) {
    const todos = n.todos.map((t) => ({ ...t }));
    const box = el("div", "todos");
    const save = () => commit(n, (t) => FT.setSection(t, "Todos", FT.formatTodos(todos)));
    const prSel = (val, onChange) => {
      const s = el("select", "pr");
      for (const v of ["?", 0, 1, 2, 3]) s.append(Object.assign(el("option", "", v === "?" ? "P?" : "P" + v), { value: String(v) }));
      s.value = val == null ? "?" : String(val);
      s.onchange = () => onChange(s.value === "?" ? null : Number(s.value));
      return s;
    };
    function row(t) {
      const r = el("div", "todo" + (t.done ? " done" : ""));
      const cb = el("input"); cb.type = "checkbox"; cb.checked = t.done;
      cb.onchange = () => { t.done = cb.checked; r.classList.toggle("done", t.done); save(); };
      const txt = el("input", "txt"); txt.value = t.text;
      txt.addEventListener("input", () => { t.text = txt.value; debounced(n.name + "todos", save); });
      txt.addEventListener("blur", save);
      attachComplete(txt);
      const del = el("span", "btn", "×"); del.title = "Delete todo";
      del.onclick = () => { todos.splice(todos.indexOf(t), 1); save(); box.replaceChildren(...build()); };
      const bl = el("select", "blk");
      bl.title = "Blocked on question";
      bl.append(Object.assign(el("option", "", "—"), { value: "" }));
      for (const q of n.questions) bl.append(Object.assign(el("option", "", "⛔ " + q.id), { value: q.id }));
      bl.value = t.blocked || "";
      bl.onchange = () => { t.blocked = bl.value || null; save(); };
      const lim = el("input", "lim"); lim.value = t.limit || ""; lim.placeholder = "limit"; lim.title = "Time limit for the agent, e.g. 20m (blank = default)";
      lim.onchange = () => { t.limit = /^\d+[smh]$/.test(lim.value.trim()) ? lim.value.trim() : null; lim.value = t.limit || ""; save(); };
      r.append(cb, prSel(t.priority, (v) => { t.priority = v; save(); }), txt, lim, bl, del);
      if (t.tle) {
        const retry = el("span", "btn tle", "⏱ TLE " + t.tle + " ↻");
        retry.title = "Aborted at the time limit. Click to clear and let the agent retry (consider splitting the todo or raising the limit)";
        retry.onclick = () => { t.tle = null; save(); box.replaceChildren(...build()); };
        r.append(retry);
      }
      return r;
    }
    function build() {
      const rows = todos.map(row);
      const add = el("div", "todo add");
      const pr = prSel(null, () => {});
      const txt = el("input", "txt"); txt.placeholder = "New todo or issue… ([[ links a feature, priority ? = Claude infers)";
      attachComplete(txt);
      txt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && txt.value.trim() && !document.querySelector(".ac")) {
          todos.push({ done: false, priority: pr.value === "?" ? null : Number(pr.value), text: txt.value, blocked: null });
          save();
          box.replaceChildren(...build());
          box.querySelector(".add .txt").focus();
        }
      });
      add.append(el("span"), pr, txt);
      return [...rows, add];
    }
    box.append(...build());
    return field("Todos", box);
  }

  // write the Questions section and drop {blocked} markers whose question is no longer open (or gone)
  function writeQuestions(n, qs) {
    const open = new Set(qs.filter((q) => q.state === " ").map((q) => q.id));
    const todos = n.todos.map((t) => (t.blocked && !open.has(t.blocked) ? { ...t, blocked: null } : t));
    commit(n, (t) => FT.setSection(FT.setSection(t, "Questions", FT.formatQuestions(qs)), "Todos", FT.formatTodos(todos)));
  }

  function questionBox(n) {
    const qs = n.questions.map((q) => ({ ...q }));
    const box = el("div", "qs");
    const save = (rebuild) => {
      writeQuestions(n, qs);
      if (rebuild) renderDrawer();
    };
    function row(q) {
      const kind = q.state === " " ? "open" : q.state === "~" ? "pend" : "done";
      const r = el("div", "q " + kind);
      const head = el("div", "qhead");
      head.append(el("span", "qid", q.id), el("span", "qstate", kind === "open" ? "open" : kind === "pend" ? "agent answer, confirm?" : "answered"));
      const del = el("span", "btn", "×"); del.title = "Delete question (also unblocks its todos)";
      del.onclick = () => {
        qs.splice(qs.indexOf(q), 1);
        writeQuestions(n, qs);
        renderDrawer();
      };
      head.append(del);
      const txt = el("textarea"); txt.rows = 2; txt.value = q.text;
      txt.addEventListener("input", () => { q.text = txt.value; debounced(n.name + q.id, () => save(false)); });
      txt.addEventListener("blur", () => save(false));
      attachComplete(txt);
      const ans = el("textarea", "ans"); ans.rows = 2; ans.value = q.answer || "";
      ans.placeholder = "Your answer… (cite sources as [text](url))";
      attachComplete(ans);
      if (q.state !== " ") {
        ans.addEventListener("blur", () => {
          if (ans.value.trim() === (q.answer || "")) return;
          q.answer = ans.value.trim() || null; q.agent = false; q.state = q.answer ? "x" : " ";
          save(true); // human edit counts as confirmation
        });
      }
      const btns = el("div", "qbtns");
      const b = (label, fn) => { const x = el("button", "", label); x.onclick = fn; btns.append(x); };
      if (q.state === " ") b("Answer", () => { if (!ans.value.trim()) return; q.answer = ans.value.trim(); q.agent = false; q.state = "x"; save(true); });
      if (q.state === "~") b("Confirm", () => { q.state = "x"; q.agent = false; save(true); });
      if (q.state !== " ") b("Reopen", () => { q.state = " "; q.answer = null; q.agent = false; save(true); });
      r.append(head, txt, ans, btns);
      return r;
    }
    function build() {
      const add = el("input"); add.placeholder = "New question for the human or agent… (Enter)";
      attachComplete(add);
      add.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && add.value.trim() && !document.querySelector(".ac")) {
          qs.push({ id: FT.nextQuestionId(qs), state: " ", text: add.value.trim(), answer: null, agent: false });
          save(true);
        }
      });
      return [...qs.map(row), add];
    }
    box.append(...build());
    return field("Questions", box);
  }

  // ---------- drawer ----------
  const drawer = el("div", "drawer");
  drawer.hidden = true;
  document.body.append(drawer);

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  const maxW = () => Math.max(320, window.innerWidth - 40);
  function setDrawerWidth(w) {
    drawer.style.width = Math.min(maxW(), Math.max(320, w)) + "px";
    drawer.style.maxWidth = "none";
  }
  setDrawerWidth(Number(store.get("ft.drawerW")) || 560);
  if (window.ResizeObserver) new ResizeObserver(() => drawer.querySelectorAll("textarea").forEach((t) => t.dispatchEvent(new Event("ft-fit")))).observe(drawer);
  const grip = el("div", "grip");
  grip.title = "Drag to resize";
  grip.onpointerdown = (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    grip.onpointermove = (m) => setDrawerWidth(window.innerWidth - m.clientX);
    grip.onpointerup = () => { grip.onpointermove = grip.onpointerup = null; store.set("ft.drawerW", String(drawer.offsetWidth)); };
  };

  function select(name) {
    selected = name;
    renderDrawer();
  }

  function renderDrawer() {
    const n = nodes.get(selected);
    drawer.hidden = !n;
    drawer.replaceChildren(grip);
    if (!n) return;
    const head = el("div", "dhead");
    head.append(el("span", "dtitle", n.name));
    const status = el("select", "status");
    for (const s of FT.STATUSES) status.append(Object.assign(el("option", "", s), { value: s }));
    status.value = n.status;
    status.dataset.status = n.status;
    status.onchange = () => commit(n, (t) => FT.setMeta(t, "status", status.value));
    const x = el("span", "btn", "✕"); x.title = "Close";
    x.onclick = () => { selected = null; renderDrawer(); };
    const wide = el("span", "btn", "⤢"); wide.title = "Page width: toggle a one-page editing view";
    wide.onclick = () => {
      const full = drawer.offsetWidth < 900;
      setDrawerWidth(full ? Math.min(980, maxW()) : 560);
      drawer.classList.toggle("page", full);
      store.set("ft.drawerW", String(drawer.offsetWidth));
      renderDrawer();
    };
    head.append(status, wide, x);
    drawer.append(head);
    drawer.append(el("div", "path", rel(n) + (n.lastVerified ? "  ·  verified " + n.lastVerified : "")));
    if (host.openRaw) {
      const raw = el("span", "link", "open raw markdown");
      raw.onclick = () => host.openRaw(n.path);
      drawer.append(raw);
    }

    const actions = el("div", "actions");
    for (const [label, key] of [["▶ Work next todo", "work"], ["? Interview me", "interview"], ["⚖ Triage P?", "triage"], ["🔎 Research questions", "research"], ["✓ Verify & close", "close"]]) {
      const b = el("button", "", label);
      b.onclick = () => sendClaude(prompts[key](n));
      actions.append(b);
    }
    drawer.append(el("div", "claude-label", "Claude Code"), actions);

    const tests = el("input"); tests.value = n.tests || "";
    tests.placeholder = "command, test path, or manual";
    const saveTests = () => commit(n, (t) => FT.setMeta(t, "tests", tests.value.trim() || null));
    tests.addEventListener("input", () => debounced(n.name + "tests", saveTests));
    tests.addEventListener("blur", saveTests);
    drawer.append(field("tests (frontmatter)", tests));
    const jump = el("div", "jump");
    for (const s of ["Abstract", "Acceptance Tests", "Todos", "Questions", "Implemented", "Citations"]) {
      const a = el("span", "chip", s);
      a.onclick = () => { const f = [...drawer.querySelectorAll(".field > label")].find((l) => l.textContent === s); if (f) f.parentElement.scrollIntoView({ behavior: "smooth", block: "start" }); };
      jump.append(a);
    }
    drawer.append(jump);
    drawer.append(section(n, "Abstract", "What it is and why it is needed. Use [[node]] to reference features."));
    drawer.append(section(n, "Acceptance Tests", "Command or path that passes when the feature works."));
    drawer.append(todoBox(n));
    drawer.append(questionBox(n));
    drawer.append(section(n, "Implemented", "Documentation of what exists."));
    drawer.append(section(n, "Citations", "- [Title](https://…)"));
  }

  // ---------- floating tree-wide todo box ----------
  const tf = { tab: "todos", qstates: new Set([" ", "~"]), pris: new Set(["0", "1", "2", "3", "?"]), under: "", q: "", done: false };
  const tbox = el("div", "todobox");
  tbox.hidden = true;
  const thead = el("div", "thead");
  const tcount = el("span", "tcount");
  const tclose = el("span", "btn", "✕");
  tclose.title = "Close";
  tclose.onclick = () => { tbox.hidden = true; renderToolbar(); };
  const tabTodos = el("span", "tab on", "Todos");
  const tabQs = el("span", "tab", "Questions");
  tabTodos.onclick = () => { tf.tab = "todos"; refreshTodoBox(); };
  tabQs.onclick = () => { tf.tab = "questions"; refreshTodoBox(); };
  thead.append(tabTodos, tabQs, tcount, tclose);
  const tfilters = el("div", "tfilters");
  const chips = el("div", "chips");
  for (const v of ["0", "1", "2", "3", "?"]) {
    const c = el("span", "chip on p" + v, "P" + v);
    c.onclick = () => { tf.pris.has(v) ? tf.pris.delete(v) : tf.pris.add(v); c.classList.toggle("on", tf.pris.has(v)); refreshTodoBox(); };
    chips.append(c);
  }
  const qchips = el("div", "chips");
  for (const [v, label] of [[" ", "open"], ["~", "to confirm"], ["x", "answered"]]) {
    const c = el("span", "chip on q" + (v === " " ? "o" : v === "~" ? "p" : "d"), label);
    c.onclick = () => { tf.qstates.has(v) ? tf.qstates.delete(v) : tf.qstates.add(v); c.classList.toggle("on", tf.qstates.has(v)); refreshTodoBox(); };
    qchips.append(c);
  }
  qchips.hidden = true;
  const under = el("select");
  under.onchange = () => { tf.under = under.value; refreshTodoBox(); };
  const search = el("input"); search.placeholder = "filter text…";
  search.oninput = () => { tf.q = search.value.toLowerCase(); refreshTodoBox(); };
  const doneLbl = el("label", "dl");
  const doneCb = el("input"); doneCb.type = "checkbox";
  doneCb.onchange = () => { tf.done = doneCb.checked; refreshTodoBox(); };
  doneLbl.append(doneCb, " done");
  tfilters.append(chips, qchips, under, search, doneLbl);
  const tlist = el("div", "tlist");
  tbox.append(thead, tfilters, tlist);
  document.body.append(tbox);

  // drag by header
  let tdrag = null;
  thead.addEventListener("mousedown", (e) => {
    if (e.target.closest(".btn")) return;
    const r = tbox.getBoundingClientRect();
    tdrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!tdrag) return;
    tbox.style.left = e.clientX - tdrag.dx + "px";
    tbox.style.top = e.clientY - tdrag.dy + "px";
    tbox.style.bottom = "auto";
  });
  window.addEventListener("mouseup", () => { tdrag = null; });

  function descendants(name) {
    const out = new Set([name]);
    (function go(x) { const n = nodes.get(x); if (n) for (const c of n.children) { out.add(c); go(c); } })(name);
    return out;
  }

  function collectTodos() {
    const scope = tf.under && nodes.has(tf.under) ? descendants(tf.under) : null;
    const rows = [];
    for (const n of nodes.values()) {
      if (scope && !scope.has(n.name)) continue;
      n.todos.forEach((t, i) => {
        if (t.done && !tf.done) return;
        if (!tf.pris.has(t.priority == null ? "?" : String(t.priority))) return;
        if (tf.q && !(t.text + " " + n.name).toLowerCase().includes(tf.q)) return;
        rows.push({ n, t, i });
      });
    }
    const key = (r) => (r.t.priority == null ? 9 : r.t.priority);
    rows.sort((a, b) => key(a) - key(b) || a.n.name.localeCompare(b.n.name) || a.i - b.i);
    return rows;
  }

  function refreshTodoBox() {
    tabTodos.classList.toggle("on", tf.tab === "todos");
    tabQs.classList.toggle("on", tf.tab === "questions");
    chips.hidden = tf.tab !== "todos";
    doneLbl.hidden = tf.tab !== "todos";
    qchips.hidden = tf.tab !== "questions";
    const openQs = [...nodes.values()].reduce((a, n) => a + n.questions.filter((q) => q.state === " ").length, 0);
    tabQs.textContent = "Questions" + (openQs ? " (" + openQs + ")" : "");
    if (tf.tab === "questions") refreshQuestionList();
    else refreshTodoList();
  }

  function syncUnder() {
    // subtree options follow the tree; keep the current choice when it still exists
    const names = [...nodes.keys()].sort();
    if (under.options.length !== names.length + 1 || names.some((nm, i) => under.options[i + 1].value !== nm)) {
      under.replaceChildren(Object.assign(el("option", "", "whole tree"), { value: "" }));
      for (const nm of names) under.append(Object.assign(el("option", "", nm), { value: nm }));
      if (!nodes.has(tf.under)) tf.under = "";
    }
    under.value = tf.under;
  }

  function refreshQuestionList() {
    syncUnder();
    const scope = tf.under && nodes.has(tf.under) ? descendants(tf.under) : null;
    const rows = [];
    for (const n of nodes.values()) {
      if (scope && !scope.has(n.name)) continue;
      n.questions.forEach((q, i) => {
        if (!tf.qstates.has(q.state)) return;
        if (tf.q && !(q.text + " " + n.name + " " + (q.answer || "")).toLowerCase().includes(tf.q)) return;
        rows.push({ n, q, i });
      });
    }
    const ord = { " ": 0, "~": 1, x: 2 };
    rows.sort((a, b) => ord[a.q.state] - ord[b.q.state] || a.n.name.localeCompare(b.n.name) || a.i - b.i);
    tcount.textContent = rows.length + " shown";
    tlist.replaceChildren();
    if (!rows.length) tlist.append(el("div", "empty", "no questions match"));
    for (const { n, q } of rows) {
      const blocks = n.todos.filter((t) => !t.done && t.blocked === q.id).length;
      const r = el("div", "qrow " + (q.state === " " ? "open" : q.state === "~" ? "pend" : "done"));
      const line = el("div", "qline");
      line.append(el("span", "qid", q.id));
      const text = linkify(q.text, el("span", "ttext"));
      text.onclick = (e) => { if (!e.target.closest(".ref,.ext")) { focusNode(n.name); select(n.name); } };
      const where = el("span", "twhere", n.name);
      where.title = rel(n);
      where.onclick = () => { focusNode(n.name); select(n.name); };
      line.append(text, where);
      r.append(line);
      if (blocks && q.state === " ") r.append(el("div", "qmeta", "⛔ blocks " + blocks + " todo(s)"));
      if (q.answer) r.append(linkify((q.agent ? "agent: " : "") + q.answer, el("div", "qmeta")));
      if (q.state === " ") {
        const inp = el("input"); inp.placeholder = "Answer… (Enter)";
        attachComplete(inp);
        inp.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" || !inp.value.trim() || document.querySelector(".ac")) return;
          const qs = n.questions.map((x) => (x.id === q.id ? { ...x, state: "x", answer: inp.value.trim(), agent: false } : x));
          writeQuestions(n, qs);
        });
        r.append(inp);
      } else if (q.state === "~") {
        const b = el("button", "", "Confirm");
        b.onclick = () => {
          const qs = n.questions.map((x) => (x.id === q.id ? { ...x, state: "x", agent: false } : x));
          writeQuestions(n, qs);
        };
        r.append(b);
      }
      tlist.append(r);
    }
  }

  function refreshTodoList() {
    syncUnder();
    const rows = collectTodos();
    tcount.textContent = rows.length + " shown";
    tlist.replaceChildren();
    if (!rows.length) tlist.append(el("div", "empty", "no todos match"));
    for (const { n, t, i } of rows) {
      const r = el("div", "trow" + (t.done ? " done" : ""));
      const cb = el("input"); cb.type = "checkbox"; cb.checked = t.done;
      cb.onchange = () => commit(n, (txt) => FT.setSection(txt, "Todos", FT.formatTodos(n.todos.map((x, j) => (j === i ? { ...x, done: cb.checked } : x)))));
      const pr = el("span", "pbadge p" + (t.priority == null ? "?" : t.priority), t.priority == null ? "P?" : "P" + t.priority);
      const text = linkify(t.text, el("span", "ttext"));
      if (t.tle) { r.classList.add("blocked"); text.append(Object.assign(el("span", "blk-tag", " ⏱ TLE " + t.tle), { title: "Aborted at the time limit" })); }
      if (FT.isBlocked(t, n.questions)) { r.classList.add("blocked"); text.append(Object.assign(el("span", "blk-tag", " ⛔ " + t.blocked), { title: "Blocked on an open question" })); }
      text.onclick = (e) => { if (!e.target.closest(".ref,.ext")) { focusNode(n.name); select(n.name); } };
      const where = el("span", "twhere", n.name);
      where.title = rel(n);
      where.onclick = () => { focusNode(n.name); select(n.name); };
      r.append(cb, pr, text, where);
      tlist.append(r);
    }
  }

  // ---------- graph ----------
  const height = (n) => (expanded.has(n.name) ? H_EXPANDED : H_COLLAPSED);
  const visibleKids = (n) => (folded.has(n.name) ? [] : n.children.map((c) => nodes.get(c)).filter(Boolean));

  function layout(n, depth, top, pos) {
    const kids = visibleKids(n);
    let cursor = top, first = null, last = null;
    for (const k of kids) {
      const h = layout(k, depth + 1, cursor, pos);
      const p = pos.get(k.name);
      if (first === null) first = p.y + height(k) / 2;
      last = p.y + height(k) / 2;
      cursor += h + GAP_Y;
    }
    const kidsH = kids.length ? cursor - GAP_Y - top : 0;
    const own = height(n);
    const y = kids.length ? (first + last) / 2 - own / 2 : top;
    pos.set(n.name, { x: depth * (CARD_W + GAP_X), y: Math.max(y, top) });
    return Math.max(own, kidsH);
  }

  function focusNode(name) {
    let p = nodes.get(name);
    while (p && p.parent && nodes.has(p.parent)) { p = nodes.get(p.parent); folded.delete(p.name); }
    expanded.add(name);
    render();
    const pos = lastPos.get(name);
    if (pos) {
      view.x = viewport.clientWidth / 2 - (pos.x + CARD_W / 2) * view.k;
      view.y = viewport.clientHeight / 2 - (pos.y + height(nodes.get(name)) / 2) * view.k;
      applyView();
    }
    const c = canvas.querySelector('.card[data-name="' + name + '"]');
    if (c) { c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1300); }
  }

  function card(n, p) {
    const c = el("div", "card");
    c.dataset.status = n.status;
    c.dataset.name = n.name;
    if (n.name === selected) c.classList.add("selected");
    c.style.left = p.x + "px";
    c.style.top = p.y + "px";
    c.style.height = height(n) + "px";

    const head = el("div", "head");
    const chev = el("span", "btn", expanded.has(n.name) ? "▾" : "▸");
    chev.title = "Show details";
    chev.onclick = () => { expanded.has(n.name) ? expanded.delete(n.name) : expanded.add(n.name); render(); };
    const title = el("span", "title", n.name);
    title.title = "Edit " + rel(n);
    title.onclick = () => { select(n.name); render(); };
    const unset = n.todos.filter((t) => !t.done && t.priority == null).length;
    head.append(chev, title);
    if (unset) head.append(Object.assign(el("span", "unset", "P?" + unset), { title: unset + " todo(s) without priority" }));
    const openQ = n.questions.filter((q) => q.state === " ").length;
    if (openQ) head.append(Object.assign(el("span", "qbadge", "?" + openQ), { title: openQ + " open question(s)" }));
    head.append(el("span", "badge", n.status));
    if (n.children.length) {
      const f = el("span", "btn", folded.has(n.name) ? "＋" + n.children.length : "−");
      f.title = "Collapse/expand children";
      f.onclick = () => { folded.has(n.name) ? folded.delete(n.name) : folded.add(n.name); render(); };
      head.append(f);
    }
    c.append(head);

    if (expanded.has(n.name)) {
      const d = el("div", "detail");
      d.append(linkify(n.abstract || "(no abstract)", el("div", "abs")));
      const open = n.todos.filter((t) => !t.done);
      const counts = el("div", "row");
      for (const pr of [0, 1, 2, 3, null]) {
        const cnt = open.filter((t) => t.priority === pr).length;
        if (cnt) { const s = el("span", "pri"); s.append((pr == null ? "P?" : "P" + pr) + " "); s.append(Object.assign(el("b"), { textContent: cnt })); counts.append(s); }
      }
      if (!open.length) counts.append("no open todos");
      d.append(counts);
      const pend = n.questions.filter((q) => q.state === "~").length;
      const blockedN = n.todos.filter((t) => !t.done && FT.isBlocked(t, n.questions)).length;
      if (openQ || pend) d.append(el("div", "row", `questions: ${openQ} open${pend ? ", " + pend + " to confirm" : ""}${blockedN ? " · " + blockedN + " todo(s) blocked" : ""}`));
      d.append(el("div", "row", "tests: " + (n.tests || "none") + (n.lastVerified ? " ✓ " + n.lastVerified : "")));
      const links = el("div", "row links");
      for (const r of n.refs) links.append(refChip(r));
      for (const ct of n.citations) links.append(extLink(ct.text, ct.url));
      if (links.childNodes.length) d.append(links);
      d.append(el("div", "row", n.words + " words"));
      c.append(d);
    }
    return c;
  }

  const empty = el("div", "emptymsg");
  document.body.append(empty);
  function renderEmpty() {
    empty.hidden = nodes.size > 0;
    if (host.kind === "web") {
      empty.textContent = host.canPick
        ? "No feature tree loaded. Click “open features/ folder” (top-left) and choose your project's features/ directory."
        : "This browser cannot edit local folders. Open this file in Chrome or Edge, or use the VS Code extension.";
    } else {
      empty.textContent = "No feature nodes found in features/. Run `ft new - <name>` or ask Claude to plan with the feature-tree skill.";
    }
  }

  function render() {
    renderEmpty();
    canvas.querySelectorAll(".card").forEach((e) => e.remove());
    edges.replaceChildren();
    const roots = [...nodes.values()].filter((n) => !n.parent || !nodes.has(n.parent));
    const pos = new Map();
    let top = 0;
    for (const r of roots) top += layout(r, 0, top, pos) + GAP_Y * 3;
    lastPos = pos;
    let maxX = 0, maxY = 0;
    for (const [name, p] of pos) {
      const n = nodes.get(name);
      canvas.append(card(n, p));
      maxX = Math.max(maxX, p.x + CARD_W);
      maxY = Math.max(maxY, p.y + height(n));
      for (const k of visibleKids(n)) {
        const q = pos.get(k.name);
        const x1 = p.x + CARD_W, y1 = p.y + height(n) / 2, x2 = q.x, y2 = q.y + height(k) / 2, mx = (x1 + x2) / 2;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
        edges.append(path);
      }
    }
    bbox = { w: maxX, h: maxY };
    edges.setAttribute("width", maxX);
    edges.setAttribute("height", maxY);
    applyView();
    renderToolbar();
    refreshTodoBox();
  }

  function renderToolbar() {
    toolbar.replaceChildren();
    for (const [s, c] of Object.entries(COLORS)) {
      const n = [...nodes.values()].filter((x) => x.status === s).length;
      const item = el("span");
      const dot = el("span", "dot"); dot.style.background = c;
      item.append(dot, `${s} ${n}`);
      toolbar.append(item);
    }
    const btn = (label, fn) => { const b = el("button", nodes.size ? "" : "primary", label); b.onclick = fn; toolbar.append(b); };
    if (host.canPick) btn(nodes.size ? "change folder" : "open features/ folder", () => host.pick().catch((e) => toast(e.message)));
    btn(tbox.hidden ? "☑ Todos" : "☑ Hide todos", () => { tbox.hidden = !tbox.hidden; renderToolbar(); });
    btn("expand all", () => { nodes.forEach((n) => expanded.add(n.name)); render(); });
    btn("collapse all", () => { expanded.clear(); render(); });
    btn("fit view", fitView);
    if (nodes.size) {
      btn("🔎 Research questions", () => sendClaude(prompts.research(null)));
      btn("⚖ Triage all P?", () => sendClaude(prompts.triage(null)));
      btn("💬 Plan with Claude", () => sendClaude(prompts.plan()));
    }
  }

  // scale down to fit, keep clear of the (possibly wrapped) toolbar and the drawer
  function fitView() {
    const top = toolbar.offsetHeight + 24;
    const w = viewport.clientWidth - 80 - (drawer.hidden ? 0 : drawer.offsetWidth);
    const h = viewport.clientHeight - top - 20;
    const k = bbox.w && bbox.h ? Math.min(1, w / bbox.w, h / bbox.h) : 1;
    view = { x: 40, y: top, k: Math.max(0.3, k) };
    applyView();
  }

  const applyView = () => { canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`; };

  let drag = null;
  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".card")) return;
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    viewport.classList.add("drag");
  });
  window.addEventListener("mousemove", (e) => { if (drag) { view.x = e.clientX - drag.x; view.y = e.clientY - drag.y; applyView(); } });
  window.addEventListener("mouseup", () => { drag = null; viewport.classList.remove("drag"); });
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const k = Math.min(2.5, Math.max(0.3, view.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    view.x = e.clientX - ((e.clientX - view.x) / view.k) * k;
    view.y = e.clientY - ((e.clientY - view.y) / view.k) * k;
    view.k = k;
    applyView();
  }, { passive: false });

  host.onFiles((files) => {
    nodes = FT.buildTree(files);
    render();
    if (!fitted && nodes.size) { fitted = true; fitView(); }
    // never rebuild the drawer under the user's cursor
    if (!drawer.contains(document.activeElement)) renderDrawer();
  });
  renderEmpty();
  renderToolbar();
})();
