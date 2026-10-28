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
      openPath(nodePath, href) { post({ type: "openPath", node: nodePath, href }); },
    };
  }

  // Custom-editor tab bound to exactly one node document: same bridge shape, single-file "files" list.
  function nodeHost() {
    const api = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : { postMessage() {} };
    let cb = null;
    window.addEventListener("message", (e) => { if (e.data.type === "doc" && cb) cb([{ path: e.data.path, text: e.data.text }]); });
    const post = (m) => api.postMessage(m);
    return {
      kind: "node", rootName: "features",
      onFiles(f) { cb = f; post({ type: "ready" }); },
      write(_path, text) { post({ type: "write", text }); },
      openRaw() { post({ type: "raw" }); },
      external(url) { post({ type: "external", url }); },
      // single-doc mode has no node path of its own; the extension resolves hrefs against this document
      openPath(_nodePath, href) { post({ type: "openPath", href }); },
    };
  }
  const host = window.FT_HOST || (window.FT_MODE === "node" ? nodeHost() : vscodeHost());
  const singleNode = host.kind === "node";
  if (singleNode) document.body.classList.add("node-editor");

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
  // second alternative matches ANY [text](href) — https?:// (opens externally) or a relative
  // path (opens in the editor, resolved against the node the link is rendered on)
  const INLINE_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)\s]+)\)/g;
  // inline code/bold/italic within plain text runs — read view renders these, edit view stays raw markdown
  const MD_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

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
  // a [text](relative/path) link: opens in the editor, resolved relative to the node it's rendered on
  function pathLink(text, href, nodePath) {
    const a = el("span", "ext", text);
    a.title = href;
    a.onclick = () => {
      if (host.openPath) host.openPath(nodePath, href);
      else toast('Can\'t open "' + href + '" from this viewer.');
    };
    return a;
  }
  function mdLink(text, href, nodePath) {
    return /^https?:\/\//.test(href) ? extLink(text, href) : pathLink(text, href, nodePath);
  }
  // append plain text with `code`/**bold**/*italic* rendered — no links here, linkify() already split those out
  function appendInline(parent, text) {
    let last = 0, m;
    MD_RE.lastIndex = 0;
    while ((m = MD_RE.exec(text))) {
      if (m.index > last) parent.append(text.slice(last, m.index));
      if (m[1] !== undefined) parent.append(el("code", "", m[1]));
      else if (m[2] !== undefined) parent.append(el("strong", "", m[2]));
      else parent.append(el("em", "", m[3]));
      last = m.index + m[0].length;
    }
    if (last < text.length) parent.append(text.slice(last));
  }
  // render loose markdown (bullet lines + plain paragraphs, with [[links]], [text](url) and `code`/**bold** resolved) for read view
  function renderProse(text, parent, nodePath) {
    const lines = text.split("\n");
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === "") { i++; continue; }
      if (/^- /.test(lines[i])) {
        const ul = el("ul");
        while (i < lines.length && /^- /.test(lines[i])) { ul.append(linkify(lines[i].slice(2), el("li"), nodePath)); i++; }
        parent.append(ul);
      } else {
        const start = i;
        while (i < lines.length && lines[i].trim() !== "" && !/^- /.test(lines[i])) i++;
        parent.append(linkify(lines.slice(start, i).join(" "), el("div", "p"), nodePath));
      }
    }
    return parent;
  }
  function linkify(text, parent, nodePath) {
    let last = 0, m;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(text))) {
      if (m.index > last) appendInline(parent, text.slice(last, m.index));
      parent.append(m[1] ? refChip(m[1].trim(), m[2]) : mdLink(m[3], m[4], nodePath));
      last = m.index + m[0].length;
    }
    if (last < text.length) appendInline(parent, text.slice(last));
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

  // ---------- editing ----------
  const todoState = (t) => t.state || (t.done ? "x" : " ");
  const stateIcon = (s) => (s === "x" ? "●" : s === "~" ? "◐" : "○");
  const stateClass = (s) => (s === "x" ? " done" : s === "~" ? " progress" : "");
  const stateLabel = (s) => (s === "x" ? "done" : s === "~" ? "in progress" : "not started");
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

  // read view by default (rendered prose, [[links]] resolved); click to switch to a plain textarea for editing.
  function section(n, name, hint) {
    const view = el("div", "secview");
    view.title = "Click to edit";
    const ta = el("textarea");
    ta.hidden = true;
    ta.rows = 5;
    ta.placeholder = hint;
    autoGrow(ta);
    const save = () => commit(n, (t) => FT.setSection(t, name, ta.value));
    ta.addEventListener("input", () => debounced(n.name + name, save));
    const showView = () => {
      view.replaceChildren();
      const txt = (n.sections[name] || "").trim();
      if (!txt) view.append(el("span", "empty", hint));
      else renderProse(txt, view, n.path);
      view.hidden = false;
      ta.hidden = true;
    };
    const showEdit = () => {
      ta.value = (n.sections[name] || "").trim();
      view.hidden = true;
      ta.hidden = false;
      ta.dispatchEvent(new Event("ft-fit"));
      ta.focus();
    };
    view.addEventListener("click", (e) => { if (!e.target.closest(".ref,.ext")) showEdit(); });
    ta.addEventListener("blur", () => { save(); showView(); });
    attachComplete(ta);
    showView();
    const wrap = el("div", "secwrap");
    wrap.append(view, ta);
    return field(name, wrap);
  }

  // Acceptance Tests: humans scan a short description, not a shell command; the run command lives in Metadata.
  function acceptanceSection(n) {
    const view = el("div", "secview accview");
    view.title = "Click to edit";
    const ta = el("textarea");
    ta.hidden = true;
    ta.rows = 3;
    ta.placeholder = "Short description of what proves this feature works. The run command lives in Metadata.";
    autoGrow(ta);
    const save = () => commit(n, (t) => FT.setSection(t, "Acceptance Tests", ta.value));
    ta.addEventListener("input", () => debounced(n.name + "AT", save));
    const showView = () => {
      view.replaceChildren();
      const raw = (n.sections["Acceptance Tests"] || "").trim();
      const desc = raw.replace(/`[^`]*`/g, "").replace(/[ \t]{2,}/g, " ").trim();
      const pill = el("span", "testpill", n.tests ? "▶ run test" : "▶ no run command set");
      pill.title = n.tests ? n.tests : "Set a run command in Metadata";
      if (n.tests) pill.onclick = (e) => {
        e.stopPropagation();
        Promise.resolve(navigator.clipboard && navigator.clipboard.writeText(n.tests)).then(() => toast("Copied: " + n.tests)).catch(() => toast(n.tests));
      };
      view.append(pill, linkify(desc || "(no description — click to add)", el("span", "atdesc"), n.path));
      view.hidden = false;
      ta.hidden = true;
    };
    const showEdit = () => {
      ta.value = (n.sections["Acceptance Tests"] || "").trim();
      view.hidden = true;
      ta.hidden = false;
      ta.dispatchEvent(new Event("ft-fit"));
      ta.focus();
    };
    view.addEventListener("click", (e) => { if (!e.target.closest(".ref,.ext,.testpill")) showEdit(); });
    ta.addEventListener("blur", () => { save(); showView(); });
    attachComplete(ta);
    showView();
    const wrap = el("div", "secwrap");
    wrap.append(view, ta);
    return field("Acceptance Tests", wrap);
  }

  // Frontmatter, as a quiet always-visible byline under the title — not a boxed, collapsed section.
  function metaByline(n) {
    const row = el("div", "byline");
    row.append(el("span", "", "status:"));

    const status = el("select", "bstatus");
    for (const s of FT.STATUSES) status.append(Object.assign(el("option", "", s), { value: s }));
    status.value = n.status;
    status.dataset.status = n.status;
    status.onchange = () => commit(n, (t) => FT.setMeta(t, "status", status.value));
    row.append(status);

    row.append(el("span", "bsep", "·"), el("span", "", "tests:"));
    const tests = el("input", "testsinp"); tests.value = n.tests || ""; tests.placeholder = "command, test path, or manual";
    const saveTests = () => commit(n, (t) => FT.setMeta(t, "tests", tests.value.trim() || null));
    tests.addEventListener("input", () => debounced(n.name + "tests", saveTests));
    tests.addEventListener("blur", saveTests);
    row.append(tests);

    row.append(el("span", "bsep", "·"), el("span", "muted", rel(n) + (n.lastVerified ? "  ·  verified " + n.lastVerified : "")));

    if (host.openRaw) {
      row.append(el("span", "bsep", "·"));
      const raw = el("span", "link", "raw");
      raw.onclick = () => host.openRaw(n.path);
      row.append(raw);
    }
    return row;
  }

  function archivedSection(n) {
    const ta = el("textarea");
    ta.value = (n.sections["Archived"] || "").trim();
    ta.rows = 5;
    ta.placeholder = "Raw archived todo lines and question blocks. Written by `ft reflect`; usually left alone.";
    autoGrow(ta);
    const save = () => commit(n, (t) => FT.setSection(t, "Archived", ta.value));
    ta.addEventListener("input", () => debounced(n.name + "Archived", save));
    ta.addEventListener("blur", save);
    attachComplete(ta);
    const d = el("details", "afield");
    const summary = el("summary");
    summary.append(el("label", "", "Archived"));
    d.append(summary, ta);
    d.addEventListener("toggle", () => ta.dispatchEvent(new Event("ft-fit")));
    return d;
  }

  function todoBox(n) {
    const todos = n.todos.map((t) => ({ ...t }));
    const box = el("div", "todos");
    const save = () => commit(n, (t) => FT.setSection(t, "Todos", FT.formatTodos(todos)));
    const prSel = (val, onChange) => {
      const s = el("select", "pr");
      s.title = "Priority: P0 urgent → P3 nice-to-have, P? = not yet triaged";
      for (const v of ["?", 0, 1, 2, 3]) s.append(Object.assign(el("option", "", v === "?" ? "P?" : "P" + v), { value: String(v) }));
      s.value = val == null ? "?" : String(val);
      s.dataset.pri = s.value;
      s.onchange = () => { s.dataset.pri = s.value; onChange(s.value === "?" ? null : Number(s.value)); };
      return s;
    };
    // row is a <details>: the summary line is just state + priority + title (what you scan a list for),
    // priority/limit/blocked-on move into the expandable body so the list doesn't turn into a wall of boxes
    function row(t) {
      const r = el("details", "todo" + stateClass(todoState(t)));
      const summary = el("summary");
      const stop = (e) => e.stopPropagation();

      const cb = el("select", "tstate");
      cb.title = "Todo status — pick directly";
      for (const v of [" ", "~", "x"]) cb.append(Object.assign(el("option", "", stateIcon(v) + " " + stateLabel(v)), { value: v }));
      cb.value = todoState(t);
      cb.dataset.tstate = todoState(t);
      cb.addEventListener("click", stop);
      cb.onchange = () => {
        t.state = cb.value;
        t.done = t.state === "x";
        r.className = "todo" + stateClass(t.state);
        cb.dataset.tstate = t.state;
        save();
      };

      const prBadge = el("span", "pbadge p" + (t.priority == null ? "?" : t.priority), t.priority == null ? "P?" : "P" + t.priority);
      prBadge.title = "Priority — click the row to expand and change it";

      const txt = el("input", "txt"); txt.value = t.text;
      txt.addEventListener("click", stop);
      txt.addEventListener("input", () => { t.text = txt.value; debounced(n.name + "todos", save); });
      txt.addEventListener("blur", save);
      attachComplete(txt);

      const del = el("span", "btn del", "×"); del.title = "Delete todo";
      del.onclick = (e) => { stop(e); todos.splice(todos.indexOf(t), 1); save(); box.replaceChildren(...build()); };

      summary.append(cb, prBadge, txt);
      if (FT.isBlocked(t, n.questions)) summary.append(Object.assign(el("span", "blk-tag", "⛔"), { title: "Blocked on " + t.blocked + " — expand to change" }));
      if (FT.isBlockedByNode(t, nodes)) summary.append(Object.assign(el("span", "blk-tag", "⛔"), { title: "Blocked by node " + t.blockedBy + " — not done yet" }));
      if (t.tle) summary.append(Object.assign(el("span", "blk-tag", "⏱"), { title: "Aborted at the time limit (" + t.tle + ") — expand to retry" }));
      if (t.hitl) summary.append(Object.assign(el("span", "hitl-tag", "👤"), { title: "Needs a live human — excluded from --afk-only runs" }));
      summary.append(del);
      r.append(summary);

      const body = el("div", "tdetail");
      body.append(prSel(t.priority, (v) => {
        t.priority = v;
        prBadge.className = "pbadge p" + (v == null ? "?" : v);
        prBadge.textContent = v == null ? "P?" : "P" + v;
        save();
      }));

      // a visible clock icon so this reads as "time limit" even when empty, not a mystery blank box
      const limWrap = el("span", "limwrap");
      limWrap.title = "Time limit for the agent before this todo aborts (TLE), e.g. 20m. Blank = ft work's default.";
      const lim = el("input", "lim"); lim.value = t.limit || ""; lim.placeholder = "default";
      lim.onchange = () => { t.limit = /^\d+[smh]$/.test(lim.value.trim()) ? lim.value.trim() : null; lim.value = t.limit || ""; save(); };
      limWrap.append(el("span", "ico", "⏱"), lim);
      body.append(limWrap);

      // only show "blocked on" when there's an actual open/pending question to block on (or one already set) —
      // an empty dropdown with nothing to pick is the "shows nothing" box, so just don't render it then
      const blockable = n.questions.filter((q) => q.state !== "x" || q.id === t.blocked);
      if (blockable.length) {
        const bl = el("select", "blk");
        bl.title = "Pause this todo until a question is answered";
        bl.append(Object.assign(el("option", "", "not blocked"), { value: "" }));
        for (const q of blockable) bl.append(Object.assign(el("option", "", "⛔ " + q.id), { value: q.id }));
        bl.value = t.blocked || "";
        bl.onchange = () => { t.blocked = bl.value || null; save(); };
        body.append(bl);
      }

      const bbSel = el("select", "blk");
      bbSel.title = "Pause this todo until a node (anywhere in the tree) is done";
      bbSel.append(Object.assign(el("option", "", "not blocked by a node"), { value: "" }));
      for (const name of [...nodes.keys()].sort()) if (name !== n.name) bbSel.append(Object.assign(el("option", "", "⛔ " + name), { value: name }));
      bbSel.value = t.blockedBy || "";
      bbSel.onchange = () => { t.blockedBy = bbSel.value || null; save(); };
      body.append(bbSel);

      const hitlLbl = el("label", "hitl-toggle");
      const hitlCb = el("input"); hitlCb.type = "checkbox"; hitlCb.checked = !!t.hitl;
      hitlCb.onchange = () => { t.hitl = hitlCb.checked; save(); };
      hitlLbl.append(hitlCb, " 👤 needs a human (HITL)");
      body.append(hitlLbl);

      if (t.tle) {
        const retry = el("span", "btn tle", "⏱ TLE " + t.tle + " ↻");
        retry.title = "Aborted at the time limit. Click to clear and let the agent retry (consider splitting the todo or raising the limit)";
        retry.onclick = () => { t.tle = null; save(); box.replaceChildren(...build()); };
        body.append(retry);
      }
      r.append(body);
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
      add.append(el("span", "cbspace"), pr, txt);
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

      const optsInp = el("input", "opts");
      optsInp.value = q.options.join(", ");
      optsInp.placeholder = "Multiple choice: first, second, … (first = recommended; “Other” is automatic)";
      optsInp.title = "Like AskUserQuestion: list concrete choices here. The first is the recommended one; an Other box always appears too.";
      optsInp.addEventListener("blur", () => {
        const next = optsInp.value.split(",").map((s) => s.trim()).filter(Boolean);
        if (next.join("\u0001") === q.options.join("\u0001")) return;
        q.options = next;
        save(true);
      });

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
      r.append(head, txt, optsInp);

      if (q.state === " " && q.options.length) {
        // AskUserQuestion-style: pick a listed choice (first = recommended), or "Other" for free text
        const mc = el("div", "mc");
        const other = el("div", "mcother"); other.hidden = true; other.append(ans, btns);
        const groupName = "mc-" + n.name + "-" + q.id;
        const pick = (value, label, isOther) => {
          const lab = el("label", "mcopt" + (isOther ? " other" : ""));
          const radio = el("input"); radio.type = "radio"; radio.name = groupName;
          radio.onchange = () => {
            other.hidden = !isOther;
            if (isOther) { ans.focus(); return; }
            q.answer = value; q.agent = false; q.state = "x"; save(true);
          };
          lab.append(radio, el("span", "", label));
          return lab;
        };
        q.options.forEach((o, i) => mc.append(pick(o, o, false)));
        mc.append(pick(null, "Other…", true));
        const rec = mc.querySelector(".mcopt");
        rec.classList.add("rec");
        rec.title = "Recommended";
        r.append(mc, other);
      } else {
        r.append(ans, btns);
      }
      return r;
    }
    function build() {
      const add = el("input"); add.placeholder = "New question for the human or agent… (Enter)";
      attachComplete(add);
      add.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && add.value.trim() && !document.querySelector(".ac")) {
          qs.push({ id: FT.nextQuestionId(qs), state: " ", text: add.value.trim(), answer: null, agent: false, options: [] });
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
    const dot = el("span", "sdot"); dot.dataset.status = n.status; dot.title = "status: " + n.status + " (see Metadata to change)";
    head.append(dot, el("span", "dtitle", n.name));
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
    head.append(wide, x);
    drawer.append(head);
    drawer.append(metaByline(n));
    const jump = el("div", "jump");
    for (const s of FT.SECTIONS.filter((s) => s !== "Children")) {
      const a = el("span", "chip", s);
      a.onclick = () => { const f = [...drawer.querySelectorAll(".field > label, .afield > summary > label")].find((l) => l.textContent === s); if (f) f.closest(".field,.afield").scrollIntoView({ behavior: "smooth", block: "start" }); };
      jump.append(a);
    }
    drawer.append(jump);
    drawer.append(section(n, "Abstract", "What it is and why it is needed. Use [[node]] to reference features."));
    drawer.append(section(n, "Methodology", "How it works: approach, steps and rules, edge cases, data it keeps, and why. Plain language, no code."));
    drawer.append(acceptanceSection(n));
    drawer.append(todoBox(n));
    drawer.append(questionBox(n));
    drawer.append(section(n, "Implemented", "Documentation of what exists."));
    drawer.append(section(n, "Facts & Details", "Prose distilled from confirmed questions — facts, decisions, constraints."));
    drawer.append(section(n, "Citations", "- [Title](https://…)"));
    drawer.append(archivedSection(n));
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
  const tabNeeds = el("span", "tab", "Needs you");
  tabNeeds.onclick = () => { tf.tab = "needs"; refreshTodoBox(); };
  thead.append(tabTodos, tabQs, tabNeeds, tcount, tclose);
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
        if (todoState(t) === "x" && !tf.done) return;
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
    tabNeeds.classList.toggle("on", tf.tab === "needs");
    chips.hidden = tf.tab !== "todos";
    doneLbl.hidden = tf.tab !== "todos";
    qchips.hidden = tf.tab !== "questions";
    const needsN = [...nodes.values()].reduce((a, n) => a + n.questions.filter((q) => q.state !== "x").length + n.todos.filter((t) => t.hitl && todoState(t) !== "x").length, 0);
    tabNeeds.textContent = "Needs you" + (needsN ? " (" + needsN + ")" : "");
    const openQs = [...nodes.values()].reduce((a, n) => a + n.questions.filter((q) => q.state === " ").length, 0);
    tabQs.textContent = "Questions" + (openQs ? " (" + openQs + ")" : "");
    if (tf.tab === "questions") refreshQuestionList();
    else if (tf.tab === "needs") refreshQuestionList(true);
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

  // needs=true: the human's inbox — open + agent-answered questions (blockers first) plus open human-only (HITL) todos
  function refreshQuestionList(needs) {
    syncUnder();
    const scope = tf.under && nodes.has(tf.under) ? descendants(tf.under) : null;
    const rows = [];
    for (const n of nodes.values()) {
      if (scope && !scope.has(n.name)) continue;
      n.questions.forEach((q, i) => {
        if (needs ? q.state === "x" : !tf.qstates.has(q.state)) return;
        if (tf.q && !(q.text + " " + n.name + " " + (q.answer || "")).toLowerCase().includes(tf.q)) return;
        rows.push({ n, q, i });
      });
    }
    const ord = { " ": 0, "~": 1, x: 2 };
    const nblock = (r) => r.n.todos.filter((t) => todoState(t) !== "x" && t.blocked === r.q.id).length;
    rows.sort((a, b) => (needs ? nblock(b) - nblock(a) : 0) || ord[a.q.state] - ord[b.q.state] || a.n.name.localeCompare(b.n.name) || a.i - b.i);
    const hitl = [];
    if (needs) for (const n of nodes.values()) { if (!scope || scope.has(n.name)) for (const t of n.todos) if (t.hitl && todoState(t) !== "x") hitl.push({ n, t }); }
    tcount.textContent = rows.length + hitl.length + " shown";
    tlist.replaceChildren();
    if (!rows.length && !hitl.length) tlist.append(el("div", "empty", needs ? "nothing needs you" : "no questions match"));
    for (const { n, q } of rows) {
      const blocks = n.todos.filter((t) => todoState(t) !== "x" && t.blocked === q.id).length;
      const r = el("div", "qrow " + (q.state === " " ? "open" : q.state === "~" ? "pend" : "done"));
      const line = el("div", "qline");
      line.append(el("span", "qid", q.id));
      const text = linkify(q.text, el("span", "ttext"), n.path);
      text.onclick = (e) => { if (!e.target.closest(".ref,.ext")) { focusNode(n.name); select(n.name); } };
      const where = el("span", "twhere", n.name);
      where.title = rel(n);
      where.onclick = () => { focusNode(n.name); select(n.name); };
      line.append(text, where);
      r.append(line);
      if (blocks && q.state === " ") r.append(el("div", "qmeta", "⛔ blocks " + blocks + " todo(s)"));
      if (q.answer) r.append(linkify((q.agent ? "agent: " : "") + q.answer, el("div", "qmeta"), n.path));
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
    for (const { n, t } of hitl) {
      const r = el("div", "qrow open hitl");
      const line = el("div", "qline");
      line.append(el("span", "qid", "👤"));
      const text = linkify(t.text, el("span", "ttext"), n.path);
      text.onclick = (e) => { if (!e.target.closest(".ref,.ext")) { focusNode(n.name); select(n.name); } };
      const where = el("span", "twhere", n.name);
      where.onclick = () => { focusNode(n.name); select(n.name); };
      line.append(text, where);
      r.append(line, el("div", "qmeta", "needs a live human — agents skip this in unattended runs"));
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
      const r = el("div", "trow" + stateClass(todoState(t)));
      const cb = el("select", "tstate");
      cb.dataset.tstate = todoState(t);
      cb.title = "Todo status — pick directly";
      for (const v of [" ", "~", "x"]) cb.append(Object.assign(el("option", "", stateIcon(v)), { value: v }));
      cb.value = todoState(t);
      cb.onchange = () => {
        commit(n, (txt) => FT.setSection(txt, "Todos", FT.formatTodos(n.todos.map((x, j) => (j === i ? { ...x, state: cb.value, done: cb.value === "x" } : x)))));
      };
      const pr = el("span", "pbadge p" + (t.priority == null ? "?" : t.priority), t.priority == null ? "P?" : "P" + t.priority);
      const text = linkify(t.text, el("span", "ttext"), n.path);
      if (t.tle) { r.classList.add("blocked"); text.append(Object.assign(el("span", "blk-tag", " ⏱ TLE " + t.tle), { title: "Aborted at the time limit" })); }
      if (FT.isBlocked(t, n.questions)) { r.classList.add("blocked"); text.append(Object.assign(el("span", "blk-tag", " ⛔ " + t.blocked), { title: "Blocked on an open question" })); }
      if (FT.isBlockedByNode(t, nodes)) { r.classList.add("blocked"); text.append(Object.assign(el("span", "blk-tag", " ⛔ " + t.blockedBy), { title: "Blocked by node " + t.blockedBy + " — not done yet" })); }
      if (t.hitl) text.append(Object.assign(el("span", "hitl-tag", " 👤"), { title: "Needs a live human — excluded from --afk-only runs" }));
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
    const unset = n.todos.filter((t) => todoState(t) !== "x" && t.priority == null).length;
    head.append(chev, title);
    if (unset) head.append(Object.assign(el("span", "unset", "P?" + unset), { title: unset + " todo(s) without priority" }));
    const openQ = n.questions.filter((q) => q.state === " ").length;
    if (openQ) head.append(Object.assign(el("span", "qbadge", "?" + openQ), { title: openQ + " open question(s)" }));
    const statusSel = el("select", "badge statussel");
    for (const s of FT.STATUSES) statusSel.append(Object.assign(el("option", "", s), { value: s }));
    statusSel.value = n.status;
    statusSel.dataset.status = n.status;
    statusSel.title = "status — pick directly";
    statusSel.onclick = (e) => e.stopPropagation();
    statusSel.onchange = () => commit(n, (t) => FT.setMeta(t, "status", statusSel.value));
    head.append(statusSel);
    const [rTotal, rDone] = FT.rollupProgress(n, nodes);
    if (rTotal) head.append(Object.assign(el("span", "pctbadge", Math.round((rDone / rTotal) * 100) + "%"), { title: rDone + "/" + rTotal + " todos done across this subtree" }));
    if (n.children.length) {
      const f = el("span", "btn", folded.has(n.name) ? "＋" + n.children.length : "−");
      f.title = "Collapse/expand children";
      f.onclick = () => { folded.has(n.name) ? folded.delete(n.name) : folded.add(n.name); render(); };
      head.append(f);
    }
    c.append(head);

    if (expanded.has(n.name)) {
      const d = el("div", "detail");
      d.append(linkify(n.abstract || "(no abstract)", el("div", "abs"), n.path));
      const open = n.todos.filter((t) => todoState(t) !== "x");
      const counts = el("div", "row");
      for (const pr of [0, 1, 2, 3, null]) {
        const cnt = open.filter((t) => t.priority === pr).length;
        if (cnt) { const s = el("span", "pri"); s.append((pr == null ? "P?" : "P" + pr) + " "); s.append(Object.assign(el("b"), { textContent: cnt })); counts.append(s); }
      }
      if (!open.length) counts.append("no open todos");
      d.append(counts);
      const pend = n.questions.filter((q) => q.state === "~").length;
      const blockedN = n.todos.filter((t) => todoState(t) !== "x" && FT.isBlocked(t, n.questions)).length;
      if (openQ || pend) d.append(el("div", "row", `questions: ${openQ} open${pend ? ", " + pend + " to confirm" : ""}${blockedN ? " · " + blockedN + " todo(s) blocked" : ""}`));
      d.append(el("div", "row", "tests: " + (n.tests || "none") + (n.lastVerified ? " ✓ " + n.lastVerified : "")));
      const links = el("div", "row links");
      for (const r of n.refs) links.append(refChip(r));
      for (const ct of n.citations) links.append(mdLink(ct.text, ct.url, n.path));
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
    if (pausedBy !== null) toolbar.append(Object.assign(el("span", "pausedbanner", "⏸ PAUSED — " + pausedBy + " (ft resume)"), { title: "Agents stop picking work until `ft resume`" }));
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

  let pausedBy = null; // text of features/.paused when a human ran `ft pause`, else null
  host.onFiles((files) => {
    nodes = FT.buildTree(files);
    const pf = files.find((f) => f.path === ".paused");
    pausedBy = pf ? pf.text.trim() || "paused by human" : null;
    if (singleNode) {
      selected = [...nodes.keys()][0];
      // never rebuild the drawer under the user's cursor (debounced autosave round-trips through here)
      if (!drawer.contains(document.activeElement)) renderDrawer();
      return;
    }
    render();
    if (!fitted && nodes.size) { fitted = true; fitView(); }
    // never rebuild the drawer under the user's cursor
    if (!drawer.contains(document.activeElement)) renderDrawer();
  });
  if (!singleNode) { renderEmpty(); renderToolbar(); }
})();
