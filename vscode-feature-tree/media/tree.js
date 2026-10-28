// Shared parse + minimal-diff edit helpers for feature nodes. Used by viewer (VS Code and browser) and tests.
// Rules live in features/SCHEMA.md. Priority: 0-3, or null for unassigned "(P?)".
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const SECTIONS = ["Abstract", "Methodology", "Acceptance Tests", "Todos", "Questions", "Implemented", "Facts & Details", "Citations", "Archived", "Children"];
  const TODO_RE = /^- \[( |~|x)\] \(P([0-3?])\) (.+)$/;
  const WIKI_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
  // matches both external (https?://…) and relative-path markdown links, e.g. [SKILL.md](../../skill/SKILL.md)
  const EXT_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const MARK_RE = /\s*\{(blocked-by|blocked|limit|tle|hitl)(?::\s*([^}]+))?\}\s*$/;
  const Q_RE = /^- \[( |~|x)\] (Q\d+): (.+)$/;
  const O_RE = /^\s+- O: (.+)$/;
  const A_RE = /^\s+- A(?: \((agent)\))?: (.+)$/;
  const STATUSES = ["planned", "in-progress", "done"];

  function parseFrontmatter(text) {
    const meta = {};
    if (text.startsWith("---\n")) {
      const end = text.indexOf("\n---", 4);
      if (end !== -1) {
        for (const line of text.slice(4, end).split("\n")) {
          const i = line.indexOf(":");
          if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim() || null;
        }
        return { meta, body: text.slice(end + 4).replace(/^\n+/, "") };
      }
    }
    return { meta, body: text };
  }

  function splitSections(body) {
    const secs = {};
    let cur = null;
    for (const line of body.split("\n")) {
      if (line.startsWith("## ")) { cur = line.slice(3).trim(); secs[cur] = ""; }
      else if (cur !== null) secs[cur] += line + "\n";
    }
    return secs;
  }

  function parseTodos(sectionText) {
    const todos = [];
    for (const line of sectionText.split("\n")) {
      const m = TODO_RE.exec(line.trim());
      if (!m) continue;
      let text = m[3];
      const marks = {};
      for (let b = MARK_RE.exec(text); b; b = MARK_RE.exec(text)) { text = text.slice(0, b.index); if (!(b[1] in marks)) marks[b[1]] = (b[2] || "").trim(); }
      todos.push({
        done: m[1] === "x", state: m[1], priority: m[2] === "?" ? null : Number(m[2]), text,
        blocked: marks.blocked || null, limit: marks.limit || null, tle: marks.tle || null,
        blockedBy: marks["blocked-by"] || null, hitl: "hitl" in marks,
      });
    }
    return todos;
  }

  function formatTodos(todos) {
    return todos
      .filter((t) => t.text.trim())
      .map((t) => `- [${t.state || (t.done ? "x" : " ")}] (P${t.priority == null ? "?" : t.priority}) ${t.text.trim().replace(/\n/g, " ")}${t.blocked ? " {blocked: " + t.blocked + "}" : ""}${t.blockedBy ? " {blocked-by: " + t.blockedBy + "}" : ""}${t.limit ? " {limit: " + t.limit + "}" : ""}${t.tle ? " {tle: " + t.tle + "}" : ""}${t.hitl ? " {hitl}" : ""}`)
      .join("\n");
  }

  /** state: " " open, "~" agent-answered (needs human confirm), "x" answered.
   *  options: multiple-choice offers, first = recommended; "Other" is implicit, never stored. */
  function parseQuestions(sectionText) {
    const qs = [];
    for (const line of sectionText.split("\n")) {
      const m = Q_RE.exec(line);
      if (m) { qs.push({ id: m[2], state: m[1], text: m[3], answer: null, agent: false, options: [] }); continue; }
      const o = O_RE.exec(line);
      if (o && qs.length) { qs[qs.length - 1].options.push(o[1]); continue; }
      const a = A_RE.exec(line);
      if (a && qs.length) { qs[qs.length - 1].answer = a[2]; qs[qs.length - 1].agent = !!a[1]; }
    }
    return qs;
  }

  function formatQuestions(qs) {
    return qs.map((q) => `- [${q.state}] ${q.id}: ${q.text.trim().replace(/\n/g, " ")}` +
      (q.options || []).map((o) => `\n  - O: ${o.trim().replace(/\n/g, " ")}`).join("") +
      (q.answer ? `\n  - A${q.agent ? " (agent)" : ""}: ${q.answer.trim().replace(/\n/g, " ")}` : "")).join("\n");
  }

  function nextQuestionId(qs) {
    return "Q" + (Math.max(0, ...qs.map((q) => Number(q.id.slice(1)))) + 1);
  }

  const isBlocked = (todo, qs) => !!todo.blocked && qs.some((q) => q.id === todo.blocked && q.state === " ");

  // Cross-branch gate: blocked while the target node (anywhere in the tree) isn't done. nodes: Map name -> node.
  const isBlockedByNode = (todo, nodes) => !!todo.blockedBy && nodes.has(todo.blockedBy) && nodes.get(todo.blockedBy).status !== "done";

  /** (total, done) todo count across a node and all its descendants. nodes: Map name -> node. */
  function rollupProgress(node, nodes) {
    let total = node.todos.length;
    let done = node.todos.filter((t) => t.done).length;
    for (const childName of node.children) {
      const c = nodes.get(childName);
      if (!c) continue;
      const [ct, cd] = rollupProgress(c, nodes);
      total += ct;
      done += cd;
    }
    return [total, done];
  }

  function parseNode(path, text) {
    const { meta, body } = parseFrontmatter(text);
    const sections = splitSections(body);
    const stem = path.split("/").pop().replace(/\.md$/, "");
    const noChildren = body.replace(/## Children\n[\s\S]*$/, "");
    const seen = new Set();
    const citations = [];
    for (const m of body.matchAll(EXT_RE)) if (!seen.has(m[2])) { seen.add(m[2]); citations.push({ text: m[1], url: m[2] }); }
    return {
      path, text, sections,
      name: meta.name || stem,
      status: STATUSES.includes(meta.status) ? meta.status : "unknown",
      parent: meta.parent || null,
      tests: meta.tests || null,
      lastVerified: meta.last_verified || null,
      abstract: (sections["Abstract"] || "").trim(),
      todos: parseTodos(sections["Todos"] || ""),
      questions: parseQuestions(sections["Questions"] || ""),
      refs: [...new Set([...noChildren.matchAll(WIKI_RE)].map((m) => m[1].trim()))],
      citations,
      words: body.split(/\s+/).filter(Boolean).length,
      children: [],
    };
  }

  /** files: [{path, text}] with path relative to features/. Returns Map name -> node. */
  function buildTree(files) {
    const nodes = new Map();
    for (const f of files) {
      if (!f.path.endsWith(".md") || f.path.split("/").pop() === "SCHEMA.md") continue;
      const n = parseNode(f.path, f.text);
      if (!parseFrontmatter(f.text).meta.status) continue; // not a feature node (e.g. README)
      nodes.set(n.name, n);
    }
    for (const n of nodes.values()) if (n.parent && nodes.has(n.parent)) nodes.get(n.parent).children.push(n.name);
    return nodes;
  }

  /** Replace one frontmatter value (null clears it). Keeps everything else byte-identical. */
  function setMeta(text, key, value) {
    if (!text.startsWith("---\n")) return text;
    const end = text.indexOf("\n---", 4);
    const re = new RegExp(`^${key}:.*$`, "m");
    const head = text.slice(0, end), rest = text.slice(end);
    const line = `${key}:${value == null || value === "" ? "" : " " + value}`;
    return re.test(head) ? head.replace(re, () => line) + rest : head + "\n" + line + rest;
  }

  /** Replace body of "## name"; empty content leaves just the blank separator. */
  function setSection(text, name, content) {
    const head = new RegExp(`^## ${name}\\n`, "m").exec(text);
    if (!head) return text;
    const start = head.index + head[0].length;
    const next = /^## /m.exec(text.slice(start));
    const end = next ? start + next.index : text.length;
    const c = content.trim();
    const body = (c ? c + "\n" : "") + (next ? "\n" : "");
    return text.slice(0, start) + body + text.slice(end);
  }

  return { SECTIONS, TODO_RE, STATUSES, parseNode, buildTree, setMeta, setSection, parseTodos, formatTodos, parseQuestions, formatQuestions, nextQuestionId, isBlocked, isBlockedByNode, rollupProgress };
});
