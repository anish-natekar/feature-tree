#!/usr/bin/env python3
"""ft: feature tree helper. Stdlib only. Rules live in features/SCHEMA.md."""
import argparse
import hashlib
import os
import re
import signal
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

SECTIONS = ["Abstract", "Acceptance Tests", "Todos", "Questions", "Implemented", "Citations", "Children"]
STATUSES = ["planned", "in-progress", "done"]
WARN_MIN, WARN_MAX, ERR_MAX = 80, 600, 900
MAX_OPEN_TODOS, MAX_CHILDREN, MAX_DEPTH = 12, 8, 5  # split / regroup guards
TODO_RE = re.compile(r"^- \[( |x)\] \(P([0-3?])\) (.+)$")
UNASSIGNED = 9  # sort key for (P?)
MARK_RE = re.compile(r"\s*\{(blocked|limit|tle): ([^}]+)\}\s*$")
DUR_RE = re.compile(r"^(\d+)\s*(s|m|h)$")
Q_RE = re.compile(r"^- \[( |~|x)\] (Q\d+): (.+)$")
A_RE = re.compile(r"^\s+- A(?: \((agent)\))?: (.+)$")
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

TEMPLATE = """---
name: {name}
status: planned
parent: {parent}
tests:
last_verified:
---
# {name}

{toc}

## Abstract
What this feature is and why it is needed.

## Acceptance Tests
Command or path that passes when the feature works.

## Todos
- [ ] (P2) first step

## Questions

## Implemented

## Citations

## Children
"""


def split_marks(text):
    """Strip trailing {blocked: Q1} / {limit: 20m} / {tle: 30m} markers from todo text."""
    marks = {}
    while True:
        m = MARK_RE.search(text)
        if not m:
            return text, marks
        marks.setdefault(m.group(1), m.group(2).strip())
        text = text[:m.start()]


def parse_dur(v):
    m = DUR_RE.match((v or "").strip())
    return int(m.group(1)) * {"s": 1, "m": 60, "h": 3600}[m.group(2)] if m else None


def fmt_dur(sec):
    return f"{sec // 3600}h" if sec % 3600 == 0 and sec >= 3600 else f"{sec // 60}m" if sec % 60 == 0 and sec >= 60 else f"{sec}s"


def toc_line():
    return "Jump: " + " \u00b7 ".join(f"[{s}](#{s.lower().replace(' ', '-')})" for s in SECTIONS)


def ensure_toc(text):
    """Keep a one-line section index right under the node title."""
    m = re.search(r"^# .+\n", text, re.M)
    if not m:
        return text
    rest = re.sub(r"\A\s*Jump: .*\n", "", text[m.end():])
    return text[:m.end()] + "\n" + toc_line() + "\n" + ("" if rest.startswith("\n") else "\n") + rest


class Node:
    def __init__(self, path, root):
        self.path = path
        self.rel = path.relative_to(root.parent).as_posix()
        self.meta, self.body = parse(path.read_text())
        self.name = self.meta.get("name") or path.stem
        self.sections = split_sections(self.body)

    @property
    def todos_full(self):
        out = []
        for line in self.sections.get("Todos", "").splitlines():
            m = TODO_RE.match(line.strip())
            if not m:
                continue
            text, marks = split_marks(m.group(3))
            out.append({"done": m.group(1) == "x", "pri": UNASSIGNED if m.group(2) == "?" else int(m.group(2)),
                        "text": text, "blocked": marks.get("blocked"), "limit": marks.get("limit"), "tle": marks.get("tle")})
        return out

    @property
    def todos(self):
        return [(t["done"], t["pri"], t["text"]) for t in self.todos_full]

    @property
    def questions(self):
        out = []
        for line in self.sections.get("Questions", "").splitlines():
            m = Q_RE.match(line)
            if m:
                out.append({"id": m.group(2), "state": m.group(1), "text": m.group(3), "answer": None, "agent": False})
                continue
            a = A_RE.match(line)
            if a and out:
                out[-1]["answer"], out[-1]["agent"] = a.group(2), bool(a.group(1))
        return out

    def is_stuck(self, todo):
        """Not workable now: waiting on an open question, or aborted by the time limit."""
        return self.is_blocked(todo) or bool(todo["tle"])

    def is_blocked(self, todo):
        return bool(todo["blocked"]) and any(q["id"] == todo["blocked"] and q["state"] == " " for q in self.questions)


def parse(text):
    meta = {}
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            for line in text[4:end].splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip() or None
            return meta, text[end + 4:].lstrip("\n")
    return meta, text


def split_sections(body):
    secs, cur = {}, None
    for line in body.splitlines():
        if line.startswith("## "):
            cur = line[3:].strip()
            secs[cur] = ""
        elif cur is not None:
            secs[cur] += line + "\n"
    return secs


def load(root):
    nodes = [Node(p, root) for p in sorted(root.rglob("*.md")) if p.name != "SCHEMA.md"]
    return nodes


def expected_parent(path, root):
    d = path.parent
    if path.stem == d.name and d != root:
        d = d.parent
    return None if d == root else d.name


def lint(nodes, root):
    problems = []  # (level, node, msg)
    names = {}
    for n in nodes:
        names.setdefault(n.name, []).append(n)
    for name, ns in names.items():
        if len(ns) > 1:
            problems.append(("ERROR", ns[0], f"duplicate name '{name}'"))
    for n in nodes:
        e = lambda m: problems.append(("ERROR", n, m))
        w = lambda m: problems.append(("WARN", n, m))
        m = n.meta
        if m.get("name") != n.path.stem:
            e("frontmatter name must equal file stem")
        elif not NAME_RE.match(n.name):
            e("name must be kebab-case")
        if m.get("status") not in STATUSES:
            e(f"status must be one of {STATUSES}")
        exp = expected_parent(n.path, root)
        if (m.get("parent") or None) != exp:
            e(f"parent should be '{exp or ''}' from path")
        elif exp and exp not in names:
            e(f"parent node '{exp}' missing (need {exp}/{exp}.md)")
        if m.get("last_verified") and not DATE_RE.match(m["last_verified"]):
            e("last_verified must be YYYY-MM-DD")
        if not m.get("tests"):
            w("no tests set")
        heads = [s for s in n.sections]
        if heads != SECTIONS:
            e(f"sections must be exactly {SECTIONS} in order; got {heads}")
        if not n.sections.get("Abstract", "").strip():
            e("empty Abstract")
        bad = [l for l in n.sections.get("Todos", "").splitlines()
               if l.strip().startswith("- [") and not TODO_RE.match(l.strip())]
        for l in bad:
            e(f"bad todo line (want '- [ ] (P0-P3) text'): {l.strip()}")
        qs = n.questions
        ids = [q["id"] for q in qs]
        if len(ids) != len(set(ids)):
            e("duplicate question ids")
        for l in n.sections.get("Questions", "").splitlines():
            if l.startswith("- [") and not Q_RE.match(l):
                e(f"bad question line (want '- [ ] Q1: text'): {l.strip()}")
        by_id = {q["id"]: q for q in qs}
        for t in n.todos_full:
            if t["blocked"] and t["blocked"] not in by_id:
                e(f"todo blocked on missing question {t['blocked']}")
            elif t["blocked"] and by_id[t["blocked"]]["state"] != " ":
                w(f"todo '{t['text'][:30]}' still marked blocked but {t['blocked']} is answered; remove marker")
        open_q = sum(1 for q in qs if q["state"] == " ")
        pending = sum(1 for q in qs if q["state"] == "~")
        if open_q:
            w(f"{open_q} open question(s)")
        if pending:
            w(f"{pending} agent-answered question(s) awaiting human confirmation")
        if m.get("status") == "done" and open_q:
            e("done node has open questions")
        for t in n.todos_full:
            if t["limit"] and parse_dur(t["limit"]) is None:
                e(f"bad {{limit: {t['limit']}}} (want 90s / 20m / 2h)")
            if t["tle"] and not t["done"]:
                w(f"TLE todo '{t['text'][:30]}' ({t['tle']}): split it or raise {{limit}}, then remove {{tle}}")
        open_todos = sum(1 for t in n.todos_full if not t["done"])
        if open_todos > MAX_OPEN_TODOS:
            w(f"{open_todos} open todos (>{MAX_OPEN_TODOS}); split the node")
        kids = sum(1 for x in nodes if (x.meta.get("parent") or None) == n.name)
        if kids > MAX_CHILDREN:
            w(f"{kids} children (>{MAX_CHILDREN}); regroup under intermediate nodes")
        if len(n.rel.split("/")) - 2 > MAX_DEPTH:
            w(f"depth > {MAX_DEPTH}; flatten the tree")
        if toc_line() not in n.body:
            w("missing section index; run `ft index`")
        unset = sum(1 for d, p, _ in n.todos if p == UNASSIGNED and not d)
        if unset:
            w(f"{unset} todo(s) with unassigned priority (P?); infer and set")
        if any(done for done, _, _ in n.todos):
            w("checked todo still in Todos; move to Implemented")
        if m.get("status") == "done":
            if any(not d for d, _, _ in n.todos):
                e("done node has open todos")
            if not m.get("tests") or not m.get("last_verified"):
                e("done node needs tests and last_verified")
        words = len(n.body.split())
        if words > ERR_MAX:
            e(f"{words} words, split into children (max {ERR_MAX})")
        elif words > WARN_MAX:
            w(f"{words} words, consider splitting (>{WARN_MAX})")
        elif words < WARN_MIN:
            w(f"{words} words, consider merging into parent (<{WARN_MIN})")
        for target in re.findall(r"\[\[([^\]|#]+)", n.body):
            if target not in names:
                e(f"broken wikilink [[{target}]]")
    return problems


def children_of(nodes, name):
    return [n for n in nodes if (n.meta.get("parent") or None) == name]


def cmd_lint(a, nodes, root):
    problems = lint(nodes, root)
    for lvl, n, msg in problems:
        print(f"{lvl} {n.rel}: {msg}")
    errs = sum(1 for p in problems if p[0] == "ERROR")
    print(f"{len(nodes)} nodes, {errs} errors, {len(problems) - errs} warnings")
    return 1 if errs else 0


def cmd_tree(a, nodes, root):
    icon = {"planned": "○", "in-progress": "◐", "done": "●"}

    def walk(n, prefix=""):
        open_n = sum(1 for d, _, _ in n.todos if not d)
        print(f"{prefix}{icon.get(n.meta.get('status'), '?')} {n.name} [{n.meta.get('status')}] {open_n} open")
        for c in children_of(nodes, n.name):
            walk(c, prefix + "  ")

    for r in children_of(nodes, None):
        walk(r)
    return 0


def cmd_todos(a, nodes, root):
    rows = []
    for n in nodes:
        if a.under:
            chain, cur = set(), n
            while cur:
                chain.add(cur.name)
                p = cur.meta.get("parent")
                cur = next((x for x in nodes if x.name == p), None) if p else None
            if a.under not in chain:
                continue
        for tf in n.todos_full:
            done, pri, text = tf["done"], tf["pri"], tf["text"]
            stuck = n.is_stuck(tf)
            if stuck and a.ready:
                continue
            if n.is_blocked(tf):
                text += f"  \u26d4 blocked on {tf['blocked']}"
            if tf["tle"]:
                text += f"  \u23f1 TLE {tf['tle']}"
            if done and not a.all:
                continue
            if a.unassigned and pri != UNASSIGNED:
                continue
            rows.append((pri, n.rel, text, done))
    rows.sort(key=lambda r: (r[0], r[1]))
    for pri, rel, text, done in rows:
        print(f"P{'?' if pri == UNASSIGNED else pri} {'[x]' if done else '[ ]'} {text}  ({rel})")
    return 0


def under_filter(nodes, name):
    if not name:
        return set(n.name for n in nodes)
    out = {name}
    grew = True
    while grew:
        grew = False
        for n in nodes:
            if n.meta.get("parent") in out and n.name not in out:
                out.add(n.name)
                grew = True
    return out


def pname(pri):
    return "?" if pri == UNASSIGNED else str(pri)


def replace_section(text, name, content):
    m = re.search(rf"^## {re.escape(name)}\n", text, re.M)
    if not m:
        return text
    start = m.end()
    nxt = re.search(r"^## ", text[start:], re.M)
    end = start + nxt.start() if nxt else len(text)
    c = content.strip()
    return text[:start] + (c + "\n" if c else "") + ("\n" if nxt else "") + text[end:]


def pick_next(nodes, under=None):
    """Highest priority open, unblocked, non-TLE, prioritised todo -> (pri, rel, text, limit_seconds|None) or None; plus count of unblocked P? todos."""
    scope = under_filter(nodes, under)
    rows = []
    unset = 0
    for n in nodes:
        if n.name not in scope:
            continue
        for t in n.todos_full:
            if t["done"] or n.is_stuck(t):
                continue
            if t["pri"] == UNASSIGNED:
                unset += 1
            else:
                rows.append((t["pri"], n.rel, t["text"], parse_dur(t["limit"])))
    rows.sort(key=lambda r: (r[0], r[1]))
    return (rows[0] if rows else None), unset


def cmd_next(a, nodes, root):
    pick, unset = pick_next(nodes, a.under)
    if unset:
        print(f"note: {unset} unblocked todo(s) have P? priority; triage them first", file=sys.stderr)
    if not pick:
        print("NONE (no unblocked prioritised todos; research open questions with `ft questions`)")
        return 0
    print(f"P{pick[0]} {pick[2]}  ({pick[1]})")
    return 0


def cmd_questions(a, nodes, root):
    scope = under_filter(nodes, a.under)
    want = {" ", "~", "x"} if a.all else ({" "} if a.open else {" ", "~"})
    for n in nodes:
        if n.name not in scope:
            continue
        blocked = {t["blocked"] for t in n.todos_full if t["blocked"] and not t["done"]}
        for q in n.questions:
            if q["state"] in want:
                tag = " (blocks a todo)" if q["id"] in blocked and q["state"] == " " else ""
                ans = f"\n    A{' (agent)' if q['agent'] else ''}: {q['answer']}" if q["answer"] else ""
                print(f"{n.rel} {q['id']} [{q['state']}] {q['text']}{tag}{ans}")
    return 0


def cmd_ask(a, nodes, root):
    n = next((x for x in nodes if x.name == a.name), None)
    if not n:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    nums = [int(q["id"][1:]) for q in n.questions]
    qid = f"Q{max(nums, default=0) + 1}"
    body = n.sections.get("Questions", "").strip()
    line = f"- [ ] {qid}: {' '.join(a.text.split())}"
    n.path.write_text(replace_section(n.path.read_text(), "Questions", (body + "\n" if body else "") + line))
    print(f"{qid} added to {n.rel}")
    return 0


WORK_PROMPTS = {
    "triage": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Triage only: run `ft todos --unassigned`{scope}, assign P0-P3 to every (P?) todo by rewriting the line in place, run `ft lint`, then stop.",
    "work": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Do exactly ONE iteration of the Work loop{scope}: run `ft next`, implement that todo, run the node's acceptance tests, then checkpoint the node (steps 3-5; if the todo is blocked on a decision, `ft ask` and add {{blocked: Qn}} instead). Run `ft lint`. Then stop; do not start another todo.",
    "research": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Research mode{scope}: `ft questions --open`; research each on the web and in the repo; record answers as [~] with sources, remove stale {{blocked}} markers, run `ft lint`. Then stop.",
    "split": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Split node {node} ({why}): move cohesive todos/content into new child nodes with `ft new`, keep the Abstract of the parent short, update links, run `ft index` and `ft lint`. Do not change project code. Then stop.",
}


def needs_split(n):
    words = len(n.body.split())
    open_t = sum(1 for t in n.todos_full if not t["done"])
    if words > WARN_MAX:
        return f"{words} words"
    if open_t > MAX_OPEN_TODOS:
        return f"{open_t} open todos"
    return None


def mark_tle(node, text, dur):
    """Append {tle: dur} to the matching open todo line so it is skipped until a human or planner revisits it."""
    out = []
    done = False
    for line in node.path.read_text().splitlines(keepends=True):
        m = TODO_RE.match(line.strip())
        if not done and m and m.group(1) == " " and split_marks(m.group(3))[0] == text:
            line = line.rstrip("\n") + f" {{tle: {fmt_dur(dur)}}}\n"
            done = True
        out.append(line)
    node.path.write_text("".join(out))


def run_limited(cmd, cwd, limit):
    """Run cmd; on timeout kill the whole process group. Returns (returncode|None, stdout, stderr)."""
    proc = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    try:
        out, err = proc.communicate(timeout=limit)
        return proc.returncode, out, err
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        out, err = proc.communicate()
        return None, out or "", err or ""


def tree_hash(root):
    h = hashlib.sha256()
    for p in sorted(root.rglob("*.md")):
        h.update(p.as_posix().encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def cmd_work(a, nodes, root):
    """Run the Work loop headlessly: one fresh `claude -p` session per step. Never bypasses permissions on its own."""
    claude = shlex.split(a.claude_cmd)
    extra = [x for x in (a.claude_args or []) if x != "--"]
    if not a.dry_run and not shutil.which(claude[0]):
        print(f"cannot find '{claude[0]}' on PATH (use --claude-cmd)", file=sys.stderr)
        return 1
    scope = f" for node {a.under} and its children (use --under {a.under})" if a.under else ""
    logdir = root / ".work"
    researched = triage_failed = False
    last_todo = None
    split_tried = set()
    tle_run = 0
    for i in range(1, a.max + 1):
        nodes = load(root)
        errs = [p for p in lint(nodes, root) if p[0] == "ERROR"]
        if errs:
            for _, n, msg in errs:
                print(f"ERROR {n.rel}: {msg}")
            print("stopping: fix lint errors first")
            return 1
        pick, unset = pick_next(nodes, a.under)
        open_q = any(q["state"] == " " for n in nodes if n.name in under_filter(nodes, a.under) for q in n.questions)
        big = next(((n, w) for n in nodes if n.name in under_filter(nodes, a.under) and n.name not in split_tried
                    for w in [needs_split(n)] if w), None)
        limit = a.timeout
        if big:
            kind = "split"
            split_tried.add(big[0].name)
        elif unset and not triage_failed:
            kind = "triage"
        elif pick:
            kind = "work"
            if (pick[1], pick[2]) == last_todo:
                print(f"stopping: '{pick[2]}' still next after a full pass (tests failing or not checkpointed)")
                return 2
            last_todo = (pick[1], pick[2])
            limit = pick[3] or a.task_limit
        elif open_q and not researched:
            kind = "research"
        else:
            break
        prompt = WORK_PROMPTS[kind].format(scope=scope, **({"node": big[0].name, "why": big[1]} if big else {}))
        cmd = claude + ["-p", prompt] + extra
        print(f"[{i}/{a.max}] {kind}" + (f": P{pick[0]} {pick[2]} ({pick[1]}) limit {fmt_dur(limit)}" if kind == "work" else f": {big[0].name} ({big[1]})" if big else ""))
        if a.dry_run:
            print("  would run:", " ".join(shlex.quote(c) for c in cmd))
            return 0
        before = tree_hash(root)
        rc, out, err = run_limited(cmd, root.parent, limit)
        if rc is None:
            if kind != "work":
                print(f"stopping: {kind} step hit the {fmt_dur(limit)} limit")
                return 3
            mark_tle(next(n for n in nodes if n.rel == pick[1]), pick[2], limit)
            tle_run += 1
            print(f"  TLE after {fmt_dur(limit)}: marked {{tle}}, skipping '{pick[2]}'")
            if tle_run >= a.max_tle:
                print(f"stopping: {tle_run} TLEs in a row; model may be unfit for these todos (split them or raise --task-limit)")
                return 3
            continue
        tle_run = 0
        logdir.mkdir(exist_ok=True)
        (logdir / f"{i:02d}-{kind}.log").write_text(out + ("\n--- stderr ---\n" + err if err else ""))
        tail = [l for l in out.strip().splitlines() if l.strip()][-3:]
        for l in tail:
            print("  |", l[:160])
        if rc != 0:
            print(f"stopping: claude exited {rc} (log: {logdir}/{i:02d}-{kind}.log)")
            return 4
        changed = tree_hash(root) != before
        if kind == "triage" and not changed:
            triage_failed = True
        elif kind == "research":
            researched = True
        elif kind == "work":
            researched = False  # new questions may have appeared
            if not changed:
                print("stopping: no change to features/ after a work step")
                return 2
    else:
        print(f"stopping: reached --max {a.max} steps")
    nodes = load(root)
    pick, unset = pick_next(nodes, a.under)
    print("done." if not pick else f"left: next is P{pick[0]} {pick[2]}")
    print("open questions for you:")
    cmd_questions(argparse.Namespace(under=a.under, open=True, all=False), nodes, root)
    return 0


def cmd_link(a, nodes, root):
    for n in nodes:
        if n.name == a.name:
            print(f"{n.rel}  [[{n.name}]]")
            return 0
    print(f"no node '{a.name}'", file=sys.stderr)
    return 1


def cmd_new(a, nodes, root):
    parent = next((n for n in nodes if n.name == a.parent), None) if a.parent != "-" else None
    if a.parent != "-" and not parent:
        print(f"no parent '{a.parent}'", file=sys.stderr)
        return 1
    if not NAME_RE.match(a.name) or any(n.name == a.name for n in nodes):
        print("name must be unique kebab-case", file=sys.stderr)
        return 1
    if parent is None:
        path = root / a.name / f"{a.name}.md"
    else:
        pdir = parent.path.parent
        if parent.path.stem != pdir.name:  # leaf parent becomes folder node
            newdir = pdir / parent.name
            newdir.mkdir()
            parent.path = parent.path.rename(newdir / parent.path.name)
            pdir = newdir
        path = pdir / f"{a.name}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TEMPLATE.format(name=a.name, parent=a.parent if a.parent != "-" else "", toc=toc_line()))
    print(path)
    return 0


def cmd_view(a, nodes, root):
    """Write one self-contained HTML viewer/editor; no server. Chromium browsers write via File System Access."""
    media = Path(__file__).resolve().parents[2] / "vscode-feature-tree" / "media"
    parts = {f: (media / f).read_text() for f in ("graph.css", "tree.js", "graph.js", "host-web.js")}
    html = ("<!doctype html><html><head><meta charset=\"utf-8\"><title>Feature Tree</title><style>"
            + parts["graph.css"] + "</style></head><body><div id=\"toolbar\"></div>"
            "<div id=\"viewport\"><div id=\"canvas\"><svg id=\"edges\"></svg></div></div>"
            + "".join(f"<script>{parts[f]}</script>" for f in ("tree.js", "host-web.js", "graph.js"))
            + "</body></html>")
    out = Path(a.out) if a.out else root / "viewer.html"
    out.write_text(html)
    print(out)
    return 0


def wikilinks(n):
    body = re.sub(r"## Children\n.*\Z", "", n.body, flags=re.S)
    return sorted(set(t.strip() for t in re.findall(r"\[\[([^\]|#]+)", body)))


def cmd_refs(a, nodes, root):
    me = next((n for n in nodes if n.name == a.name), None)
    if not me:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    print("links to:", ", ".join(wikilinks(me)) or "-")
    print("linked from:", ", ".join(n.name for n in nodes if a.name in wikilinks(n)) or "-")
    return 0


def cmd_index(a, nodes, root):
    for n in nodes:
        kids = children_of(nodes, n.name)
        text = n.path.read_text()
        listing = "\n".join(f"- [[{k.name}]] ({k.meta.get('status')})" for k in kids)
        new = re.sub(r"(## Children\n).*\Z", lambda m: m.group(1) + (listing + "\n" if listing else ""), text, flags=re.S)
        new = ensure_toc(new)
        if new != text:
            n.path.write_text(new)
            print(f"updated {n.rel}")
    return 0


def main():
    ap = argparse.ArgumentParser(prog="ft")
    ap.add_argument("--root", default="features")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("lint")
    sub.add_parser("tree")
    sub.add_parser("index")
    t = sub.add_parser("todos")
    t.add_argument("--under")
    t.add_argument("--all", action="store_true", help="include checked")
    t.add_argument("--unassigned", action="store_true", help="only (P?) todos")
    t.add_argument("--ready", action="store_true", help="hide todos blocked on open questions or TLE")
    nx = sub.add_parser("next", help="highest priority unblocked todo")
    nx.add_argument("--under")
    qs = sub.add_parser("questions", help="open + agent-answered questions")
    qs.add_argument("--under")
    qs.add_argument("--open", action="store_true", help="only unanswered")
    qs.add_argument("--all", action="store_true", help="include confirmed answers")
    wk = sub.add_parser("work", help="drive claude -p, one fresh session per step, until ft next says NONE")
    wk.add_argument("--under")
    wk.add_argument("--max", type=int, default=10, help="max steps (default 10)")
    wk.add_argument("--timeout", type=int, default=1800, help="seconds per triage/research/split step")
    wk.add_argument("--task-limit", type=int, default=1200, help="default seconds per todo (override per todo with {limit: 20m}); over it = TLE")
    wk.add_argument("--max-tle", type=int, default=3, help="stop after this many TLEs in a row")
    wk.add_argument("--dry-run", action="store_true", help="print the first command and exit")
    wk.add_argument("--claude-cmd", default="claude")
    wk.add_argument("claude_args", nargs=argparse.REMAINDER, help="after --: extra args for claude, e.g. --permission-mode acceptEdits --allowedTools 'Bash(python3 skill/scripts/ft.py:*)'")
    ak = sub.add_parser("ask", help="append a question to a node")
    ak.add_argument("name")
    ak.add_argument("text")
    v = sub.add_parser("view")
    v.add_argument("-o", "--out", help="output html (default: <root>/viewer.html)")
    l = sub.add_parser("link")
    l.add_argument("name")
    r = sub.add_parser("refs")
    r.add_argument("name")
    nw = sub.add_parser("new")
    nw.add_argument("parent", help="parent node name or '-' for root")
    nw.add_argument("name")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    nodes = load(root)
    sys.exit({"lint": cmd_lint, "tree": cmd_tree, "todos": cmd_todos,
              "link": cmd_link, "next": cmd_next, "work": cmd_work, "questions": cmd_questions, "ask": cmd_ask, "view": cmd_view, "refs": cmd_refs, "new": cmd_new, "index": cmd_index}[a.cmd](a, nodes, root))


if __name__ == "__main__":
    main()
