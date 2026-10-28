#!/usr/bin/env python3
"""ft: feature tree helper. Stdlib only. Rules live in features/SCHEMA.md."""
import argparse
import hashlib
import json
import os
import re
import signal
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

SECTIONS = ["Abstract", "Acceptance Tests", "Todos", "Questions", "Implemented", "Facts & Details", "Citations", "Archived", "Children"]
STATUSES = ["planned", "in-progress", "done"]
WARN_MIN, WARN_MAX, ERR_MAX = 80, 600, 900
MAX_OPEN_TODOS, MAX_CHILDREN, MAX_DEPTH = 12, 8, 5  # split / regroup guards
CODE_SPAN_WARN, FILEREF_WARN = 6, 2  # prose should be intent/decisions/facts, not code
TODO_RE = re.compile(r"^- \[( |~|x)\] \(P([0-3?])\) (.+)$")
UNASSIGNED = 9  # sort key for (P?)
MARK_RE = re.compile(r"\s*\{(blocked-by|blocked|limit|tle|hitl)(?::\s*([^}]+))?\}\s*$")
DUR_RE = re.compile(r"^(\d+)\s*(s|m|h)$")
Q_RE = re.compile(r"^- \[( |~|x)\] (Q\d+): (.+)$")
O_RE = re.compile(r"^\s+- O: (.+)$")
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

## Facts & Details

## Citations

## Archived

## Children
"""


def split_marks(text):
    """Strip trailing {blocked: Q1} / {blocked-by: node} / {limit: 20m} / {tle: 30m} / {hitl} markers from todo text."""
    marks = {}
    while True:
        m = MARK_RE.search(text)
        if not m:
            return text, marks
        marks.setdefault(m.group(1), (m.group(2) or "").strip())
        text = text[:m.start()]


def parse_dur(v):
    m = DUR_RE.match((v or "").strip())
    return int(m.group(1)) * {"s": 1, "m": 60, "h": 3600}[m.group(2)] if m else None


def fmt_dur(sec):
    return f"{sec // 3600}h" if sec % 3600 == 0 and sec >= 3600 else f"{sec // 60}m" if sec % 60 == 0 and sec >= 60 else f"{sec}s"


def toc_line():
    return "Jump: " + " \u00b7 ".join(f"[{s}](#{s.lower().replace(' ', '-')})" for s in SECTIONS)


def ensure_sections(text):
    """Backfill any SECTIONS heading missing from a legacy file, in canonical position."""
    present = set(re.findall(r"^## (.+)$", text, re.M))
    for i, name in enumerate(SECTIONS):
        if name in present:
            continue
        nxt = next((s for s in SECTIONS[i + 1:] if s in present), None)
        heading = f"## {name}\n\n"
        if nxt:
            text = re.sub(rf"^(## {re.escape(nxt)}\n)", heading + r"\1", text, count=1, flags=re.M)
        else:
            text = text.rstrip("\n") + "\n\n" + heading
        present.add(name)
    return text


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
            out.append({"done": m.group(1) == "x", "state": m.group(1), "pri": UNASSIGNED if m.group(2) == "?" else int(m.group(2)),
                        "text": text, "blocked": marks.get("blocked"), "limit": marks.get("limit"), "tle": marks.get("tle"),
                        "blocked_by": marks.get("blocked-by") or None, "hitl": "hitl" in marks})
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
                out.append({"id": m.group(2), "state": m.group(1), "text": m.group(3), "answer": None, "agent": False, "options": []})
                continue
            o = O_RE.match(line)
            if o and out:
                out[-1]["options"].append(o.group(1))
                continue
            a = A_RE.match(line)
            if a and out:
                out[-1]["answer"], out[-1]["agent"] = a.group(2), bool(a.group(1))
        return out

    def is_stuck(self, todo, by_name=None):
        """Not workable now: waiting on an open question, aborted by the time limit, or gated on another node."""
        return self.is_blocked(todo) or bool(todo["tle"]) or self.is_blocked_by_node(todo, by_name)

    def is_blocked(self, todo):
        return bool(todo["blocked"]) and any(q["id"] == todo["blocked"] and q["state"] == " " for q in self.questions)

    def is_blocked_by_node(self, todo, by_name):
        """Cross-branch dependency gate: blocked while the target node (anywhere in the tree) isn't done."""
        bb = todo.get("blocked_by")
        if not bb or by_name is None:
            return False
        target = by_name.get(bb)
        return target is not None and target.meta.get("status") != "done"

    def computed_status(self):
        """Derive status from actual todo/question state, not habit: in-progress needs a [~] todo,
        done needs zero open todos/questions plus tests+last_verified (else it'd fail lint immediately)."""
        if any(t["state"] == "~" for t in self.todos_full):
            return "in-progress"
        open_t = any(not t["done"] for t in self.todos_full)
        open_q = any(q["state"] == " " for q in self.questions)
        if not open_t and not open_q and self.meta.get("tests") and self.meta.get("last_verified"):
            return "done"
        return "planned"


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
        elif n.sections.get("Abstract", "").strip().startswith("DRAFT:"):
            w("abstract still a DRAFT placeholder from `ft init`; replace with a real abstract")
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
        for q in qs:
            if len(q["options"]) == 1:
                w(f"{q['id']} has a single option; add alternatives or drop the options")
            if len({o.strip().lower() for o in q["options"]}) != len(q["options"]):
                w(f"{q['id']} has duplicate options")
        by_id = {q["id"]: q for q in qs}
        for t in n.todos_full:
            if t["blocked"] and t["blocked"] not in by_id:
                e(f"todo blocked on missing question {t['blocked']}")
            elif t["blocked"] and by_id[t["blocked"]]["state"] != " ":
                w(f"todo '{t['text'][:30]}' still marked blocked but {t['blocked']} is answered; remove marker")
            if t["blocked_by"] and t["blocked_by"] not in names:
                w(f"todo '{t['text'][:30]}' blocked-by missing node '{t['blocked_by']}'")
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
        prose = "\n".join(n.sections.get(k, "") for k in ("Abstract", "Implemented", "Facts & Details"))
        spans = len(re.findall(r"`[^`\n]+`", prose))
        filerefs = len(re.findall(r"\b[\w/.-]+\.(?:py|js|ts|css|json|html)\b", prose))
        if "```" in n.body or spans > CODE_SPAN_WARN or filerefs > FILEREF_WARN:
            w("reads like code docs (identifiers/files/code blocks in Abstract/Implemented/Facts); say what and why in plain language, keep commands in Acceptance Tests")
        if toc_line() not in n.body:
            w("missing section index; run `ft index`")
        if m.get("status") in STATUSES and m.get("status") != n.computed_status():
            w(f"status stale (computed: '{n.computed_status()}'); run `ft index`")
        unset = sum(1 for d, p, _ in n.todos if p == UNASSIGNED and not d)
        if unset:
            w(f"{unset} todo(s) with unassigned priority (P?); infer and set")
        if any(done for done, _, _ in n.todos):
            w("checked todo still in Todos; run `ft reflect`")
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


def rollup_progress(n, nodes):
    """(total, done) todo count across a node and all its descendants."""
    total = len(n.todos_full)
    done = sum(1 for t in n.todos_full if t["done"])
    for c in children_of(nodes, n.name):
        ct, cd = rollup_progress(c, nodes)
        total += ct
        done += cd
    return total, done


def cmd_tree(a, nodes, root):
    icon = {"planned": "○", "in-progress": "◐", "done": "●"}

    def walk(n, prefix=""):
        open_n = sum(1 for d, _, _ in n.todos if not d)
        total, done = rollup_progress(n, nodes)
        pct = f" [{round(done / total * 100)}%]" if total else ""
        print(f"{prefix}{icon.get(n.meta.get('status'), '?')} {n.name} [{n.meta.get('status')}] {open_n} open{pct}")
        for c in children_of(nodes, n.name):
            walk(c, prefix + "  ")

    for r in children_of(nodes, None):
        walk(r)
    return 0


def cmd_todos(a, nodes, root):
    by_name = {n.name: n for n in nodes}
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
            done, pri, text, state = tf["done"], tf["pri"], tf["text"], tf["state"]
            stuck = n.is_stuck(tf, by_name)
            if stuck and a.ready:
                continue
            if a.afk_only and tf["hitl"]:
                continue
            if n.is_blocked(tf):
                text += f"  \u26d4 blocked on {tf['blocked']}"
            if n.is_blocked_by_node(tf, by_name):
                text += f"  \u26d4 blocked by {tf['blocked_by']}"
            if tf["hitl"]:
                text += "  \ud83d\udc64 HITL"
            if tf["tle"]:
                text += f"  \u23f1 TLE {tf['tle']}"
            if done and not a.all:
                continue
            if a.unassigned and pri != UNASSIGNED:
                continue
            rows.append((pri, n.rel, text, state))
    rows.sort(key=lambda r: (r[0], r[1]))
    for pri, rel, text, state in rows:
        print(f"P{'?' if pri == UNASSIGNED else pri} [{state}] {text}  ({rel})")
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


def unreflected(nodes, under=None):
    """Confirmed [x] todos and questions not yet archived+distilled -> list of (node, kind, ident)."""
    scope = under_filter(nodes, under)
    out = []
    for n in nodes:
        if n.name not in scope:
            continue
        for t in n.todos_full:
            if t["state"] == "x":
                out.append((n, "todo", t["text"]))
        for q in n.questions:
            if q["state"] == "x":
                out.append((n, "question", q["id"]))
    return out


def cmd_reflect(a, nodes, root):
    if a.check:
        problems = unreflected(nodes, a.under)
        for n, kind, ident in problems:
            print(f"{n.rel}: unreflected {kind} {ident!r}")
        print(f"{len(problems)} unreflected item(s)")
        return 1 if problems else 0
    if not a.name:
        print("NODE required unless --check", file=sys.stderr)
        return 1
    n = next((x for x in nodes if x.name == a.name), None)
    if not n:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    if bool(a.todo) == bool(a.question):
        print("exactly one of --todo / --question required", file=sys.stderr)
        return 1
    if not a.note:
        print("--note required", file=sys.stderr)
        return 1
    text = n.path.read_text()
    if a.todo:
        lines = n.sections.get("Todos", "").splitlines()
        match_i, raw = None, None
        for i, line in enumerate(lines):
            m = TODO_RE.match(line.strip())
            if m and m.group(1) == "x" and split_marks(m.group(3))[0] == a.todo:
                match_i, raw = i, line
                break
        if match_i is None:
            print(f"no confirmed [x] todo matching that text in {n.rel}", file=sys.stderr)
            return 1
        new_todos = "\n".join(l for i, l in enumerate(lines) if i != match_i)
        text = replace_section(text, "Todos", new_todos)
        archived = (n.sections.get("Archived", "").strip() + "\n" + raw.strip()).strip()
        text = replace_section(text, "Archived", archived)
        implemented = (n.sections.get("Implemented", "").strip() + "\n" + a.note.strip()).strip()
        text = replace_section(text, "Implemented", implemented)
    else:
        qid = a.question
        if not any(q["id"] == qid and q["state"] == "x" for q in n.questions):
            print(f"no confirmed question {qid} in {n.rel}", file=sys.stderr)
            return 1
        lines = n.sections.get("Questions", "").splitlines()
        block, rest, i = [], [], 0
        while i < len(lines):
            m = Q_RE.match(lines[i])
            if m and m.group(2) == qid:
                block.append(lines[i])
                i += 1
                while i < len(lines) and (O_RE.match(lines[i]) or A_RE.match(lines[i])):
                    block.append(lines[i])
                    i += 1
            else:
                rest.append(lines[i])
                i += 1
        text = replace_section(text, "Questions", "\n".join(rest))
        archived = (n.sections.get("Archived", "").strip() + "\n" + "\n".join(block)).strip()
        text = replace_section(text, "Archived", archived)
        facts = (n.sections.get("Facts & Details", "").strip() + "\n" + a.note.strip()).strip()
        text = replace_section(text, "Facts & Details", facts)
    n.path.write_text(text)
    print(f"reflected into {n.rel}")
    return 0


def pick_next(nodes, under=None, afk_only=False):
    """Highest priority open, unblocked, non-TLE, prioritised todo -> (pri, rel, text, limit_seconds|None) or None; plus count of unblocked P? todos."""
    scope = under_filter(nodes, under)
    by_name = {n.name: n for n in nodes}
    rows = []
    unset = 0
    for n in nodes:
        if n.name not in scope:
            continue
        for t in n.todos_full:
            if t["done"] or n.is_stuck(t, by_name):
                continue
            if afk_only and t["hitl"]:
                continue
            if t["pri"] == UNASSIGNED:
                unset += 1
            else:
                rows.append((t["pri"], n.rel, t["text"], parse_dur(t["limit"]), 0 if t["state"] == "~" else 1))
    rows.sort(key=lambda r: (r[4], r[0], r[1]))
    return ((rows[0][:4]) if rows else None), unset


def cmd_next(a, nodes, root):
    paused = pause_reason(root)
    if paused:
        print(f"PAUSED: {paused} (human ran `ft pause`; do not start work, run `ft resume` to continue)")
        return 0
    pick, unset = pick_next(nodes, a.under, a.afk_only)
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
                opts = "".join(f"\n    {'* ' if i == 0 else '  '}{o}" for i, o in enumerate(q["options"]))
                ans = f"\n    A{' (agent)' if q['agent'] else ''}: {q['answer']}" if q["answer"] else ""
                print(f"{n.rel} {q['id']} [{q['state']}] {q['text']}{tag}{opts}{ans}")
    return 0


def cmd_ask(a, nodes, root):
    n = next((x for x in nodes if x.name == a.name), None)
    if not n:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    nums = [int(q["id"][1:]) for q in n.questions]
    qid = f"Q{max(nums, default=0) + 1}"
    body = n.sections.get("Questions", "").strip()
    lines = [f"- [ ] {qid}: {' '.join(a.text.split())}"]
    for o in a.option or []:
        lines.append(f"  - O: {' '.join(o.split())}")
    n.path.write_text(replace_section(n.path.read_text(), "Questions", (body + "\n" if body else "") + "\n".join(lines)))
    print(f"{qid} added to {n.rel}" + (f" with {len(a.option)} options (first = recommended)" if a.option else ""))
    return 0


WORK_PROMPTS = {
    "triage": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Triage only: run `ft todos --unassigned`{scope}, assign P0-P3 to every (P?) todo by rewriting the line in place, run `ft lint`, then stop.",
    "work": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Do exactly ONE iteration of the Work loop{scope}: run `ft next`, implement that todo, run the node's acceptance tests, then checkpoint the node (steps 3-5; if the todo is blocked on a decision, `ft ask` and add {{blocked: Qn}} instead). Run `ft lint`. Then stop; do not start another todo.",
    "reflect": "Use the feature-tree skill (skill/SKILL.md, rules in features/SCHEMA.md). Reflect only{scope}. The project root is the current directory; use `python3 skill/scripts/ft.py` for every ft command and do not read anything outside it. Run `ft reflect --check`, then for every item write a one-line prose note and archive it with `ft reflect NODE --todo \"<exact text>\" --note \"...\"` (or --question Qn), then `ft index` and `ft lint`. Then stop.",
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
    researched = triage_failed = reflect_failed = False
    last_todo = None
    split_tried = set()
    tle_run = 0
    for i in range(1, a.max + 1):
        paused = pause_reason(root)
        if paused:
            print(f"stopping: paused ({paused})")
            return 5
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
        elif unreflected(nodes, a.under) and not reflect_failed:
            kind = "reflect"
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
        elif kind == "reflect":
            reflect_failed = not changed
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


PAUSE_FILE = ".paused"


def pause_reason(root):
    """Human kill switch: features/.paused exists -> unattended work must stop. Returns reason text or None."""
    p = root / PAUSE_FILE
    return (p.read_text().strip() or "paused by human") if p.exists() else None


def cmd_pause(a, nodes, root):
    (root / PAUSE_FILE).write_text(" ".join(a.reason) if a.reason else "paused by human")
    print(f"paused: `ft work` and `ft next` stop handing out work until `ft resume`")
    return 0


def cmd_resume(a, nodes, root):
    p = root / PAUSE_FILE
    if p.exists():
        p.unlink()
    print("resumed")
    return 0


def cmd_status(a, nodes, root):
    """One-screen briefing for a human: where things stand, what needs them, what the agent can do alone."""
    scope = under_filter(nodes, a.under)
    sel = [n for n in nodes if n.name in scope]
    by_name = {n.name: n for n in nodes}
    paused = pause_reason(root)
    if paused:
        print(f"PAUSED: {paused}  (ft resume to continue)\n")
    archived = sum(1 for n in sel for l in n.sections.get("Archived", "").splitlines() if (m := TODO_RE.match(l.strip())) and m.group(1) == "x")
    total = sum(len(n.todos_full) for n in sel) + archived  # reflected todos left Todos but still count as done work
    done = sum(1 for n in sel for t in n.todos_full if t["done"]) + archived
    counts = {s: sum(1 for n in sel if n.meta.get("status") == s) for s in STATUSES}
    pct = f" ({round(done / total * 100)}%)" if total else ""
    print(f"PROGRESS  {done}/{total} todos done{pct}; nodes: {counts['done']} done, {counts['in-progress']} in-progress, {counts['planned']} planned")
    needs = []
    for n in sel:
        stuck_on = {}
        for t in n.todos_full:
            if t["blocked"] and not t["done"]:
                stuck_on.setdefault(t["blocked"], []).append(t["text"])
        for q in n.questions:
            if q["state"] == " ":
                blocks = len(stuck_on.get(q["id"], []))
                rec = f"  [agent would pick: {q['options'][0]}]" if q["options"] else ""
                needs.append((0 if blocks else 1, f"answer {n.rel} {q['id']}: {q['text']}" + (f"  (blocks {blocks} todo)" if blocks else "") + rec))
            elif q["state"] == "~":
                needs.append((2, f"confirm {n.rel} {q['id']}: {q['text']}  [agent: {q['answer']}]"))
        for t in n.todos_full:
            if t["done"]:
                continue
            if t["hitl"]:
                needs.append((1, f"do (needs a human) {n.rel}: {t['text']}"))
            if t["tle"]:
                needs.append((3, f"split TLE todo {n.rel}: {t['text']} ({t['tle']})"))
    errs = [p for p in lint(nodes, root) if p[0] == "ERROR"]
    for _, n, m in errs:
        needs.append((0, f"fix lint error {n.rel}: {m}"))
    print(f"\nNEEDS YOU  ({len(needs)})")
    for _, line in sorted(needs, key=lambda x: x[0]):
        print(f"  - {line}")
    if not needs:
        print("  nothing")
    ready = [(n, t) for n in sel for t in n.todos_full
             if not t["done"] and not n.is_stuck(t, by_name) and not t["hitl"] and t["pri"] != UNASSIGNED]
    pick, _ = pick_next(nodes, a.under, afk_only=True)
    unrefl = len(unreflected(nodes, a.under))
    print(f"\nAGENT CAN DO ALONE  ({len(ready)} ready todo(s))")
    print(f"  next: P{pick[0]} {pick[2]}  ({pick[1]})" if pick else "  nothing ready (blocked on you, or done)")
    if unrefl:
        print(f"  housekeeping: {unrefl} unreflected item(s) (`ft reflect --check`)")
    if not pick and not unrefl:
        print("\nAGENT IDLE: nothing left the agent can do alone. Remaining items need a human; stopping here is correct.")
    return 0


def cmd_digest(a, nodes, root):
    """What changed in the plan since WHEN, read from git history: finished todos, new questions, agent-assumed
    decisions, added nodes. Read-only."""
    since = a.since
    try:
        patch = subprocess.run(["git", "log", f"--since={since}", "-p", "--format=", "--", str(root)],
                               cwd=root, capture_output=True, text=True, check=True).stdout
        added = subprocess.run(["git", "log", f"--since={since}", "--diff-filter=A", "--name-only", "--format=", "--", str(root)],
                               cwd=root, capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("digest needs the plan to be in a git repository", file=sys.stderr)
        return 1
    done, asked, assumed = [], [], []
    for line in patch.splitlines():
        if not line.startswith("+") or line.startswith("+++"):
            continue
        s = line[1:].strip()
        m = re.match(r"- \[x\] (?:\(P[0-3?]\) )?(.*)", s)
        if m and not re.match(r"Q\d+:", m.group(1)):
            done.append(m.group(1))
        m = re.match(r"- \[ \] (Q\d+: .*)", s)
        if m:
            asked.append(m.group(1))
        m = re.match(r"- A \(agent\): assumed default '(.*?)'", s)
        if m:
            assumed.append(m.group(1))
    new_nodes = sorted({Path(f).stem for f in added.split() if f.endswith(".md") and Path(f).stem not in ("SCHEMA",)})
    def uniq(xs):
        return list(dict.fromkeys(xs))
    done, asked, assumed = uniq(done), uniq(asked), uniq(assumed)
    print(f"SINCE {since}")
    if not (done or asked or assumed or new_nodes):
        print("  nothing changed in the plan")
        return 0
    for title, items in (("FINISHED", done), ("QUESTIONS RAISED", asked), ("DECIDED BY AGENT (unconfirmed)", assumed), ("NODES ADDED", new_nodes)):
        if items:
            print(f"\n{title}  ({len(items)})")
            for i in items:
                print(f"  - {i}")
    return 0


def cmd_assume(a, nodes, root):
    """Unattended escape hatch: answer an open question with its recommended option (or --option N), flagged unconfirmed
    so the human can review/reopen. Unblocks todos waiting on it."""
    n = next((x for x in nodes if x.name == a.name), None)
    q = next((x for x in n.questions if x["id"] == a.qid), None) if n else None
    if not n or not q:
        print(f"no question {a.qid} on node '{a.name}'", file=sys.stderr)
        return 1
    if q["state"] != " ":
        print(f"{a.qid} is not open", file=sys.stderr)
        return 1
    if not q["options"]:
        print(f"{a.qid} has no options to assume; research it or leave it for the human", file=sys.stderr)
        return 1
    if not 1 <= a.option <= len(q["options"]):
        print(f"--option must be 1..{len(q['options'])}", file=sys.stderr)
        return 1
    choice = q["options"][a.option - 1]
    out, in_q = [], False
    for line in n.sections.get("Questions", "").splitlines():
        m = Q_RE.match(line)
        if m:
            if in_q:
                out.append(f"  - A (agent): assumed default '{choice}' while unattended; unconfirmed, reopen to change")
            in_q = m.group(2) == a.qid
            if in_q:
                line = line.replace("- [ ]", "- [~]", 1)
        elif in_q and not (O_RE.match(line) or A_RE.match(line)):
            out.append(f"  - A (agent): assumed default '{choice}' while unattended; unconfirmed, reopen to change")
            in_q = False
        out.append(line)
    if in_q:
        out.append(f"  - A (agent): assumed default '{choice}' while unattended; unconfirmed, reopen to change")
    text = replace_section(n.path.read_text(), "Questions", "\n".join(out))
    text = re.sub(rf"\s*\{{blocked:\s*{a.qid}\}}", "", text)
    n.path.write_text(text)
    print(f"{a.qid} assumed '{choice}' in {n.rel} (needs human confirmation)")
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


def _is_folder_node(node):
    return node.path.stem == node.path.parent.name


def _promote_to_folder(parent_node):
    """Mirror cmd_new's leaf->folder promotion. Returns the parent's folder path."""
    pdir = parent_node.path.parent
    if not _is_folder_node(parent_node):
        newdir = pdir / parent_node.name
        newdir.mkdir()
        parent_node.path = parent_node.path.rename(newdir / parent_node.path.name)
        pdir = newdir
    return pdir


def _set_frontmatter_parent(path, new_parent_name):
    text = path.read_text()
    text = re.sub(r"^parent:.*$", f"parent: {new_parent_name or ''}", text, count=1, flags=re.M)
    path.write_text(text)


def _reparent(node, new_parent_name, nodes, root):
    is_folder = _is_folder_node(node)
    src = node.path.parent if is_folder else node.path
    pdir = _promote_to_folder(next(x for x in nodes if x.name == new_parent_name)) if new_parent_name else root
    dest = pdir / src.name
    shutil.move(str(src), str(dest))
    node.path = (dest / node.path.name) if is_folder else dest
    _set_frontmatter_parent(node.path, new_parent_name)


def _delete_file(node):
    if _is_folder_node(node):
        shutil.rmtree(node.path.parent)
    else:
        node.path.unlink()


def cmd_delete(a, nodes, root):
    n = next((x for x in nodes if x.name == a.name), None)
    if not n:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    kids = children_of(nodes, n.name)
    if a.subtree:
        descendants = []

        def collect(name):
            for c in children_of(nodes, name):
                descendants.append(c)
                collect(c.name)

        collect(n.name)
        if not a.yes:
            print("dry run (pass --yes to apply):")
            print(f"  delete {n.rel} and {len(descendants)} descendant(s)")
            for d in descendants:
                print(f"    - {d.rel}")
            return 0
        _delete_file(n)
        print(f"deleted {n.rel} (+ {len(descendants)} descendant(s))")
    else:
        new_parent = n.meta.get("parent") or None
        if not a.yes:
            print("dry run (pass --yes to apply):")
            for c in kids:
                print(f"  reparent {c.rel} -> {new_parent or '(root)'}")
            print(f"  delete {n.rel}")
            return 0
        for c in kids:
            _reparent(c, new_parent, nodes, root)
        _delete_file(n)
        print(f"deleted {n.rel} ({len(kids)} child(ren) reparented to {new_parent or '(root)'})")
    cmd_index(a, load(root), root)
    return 0


def cmd_rename(a, nodes, root):
    n = next((x for x in nodes if x.name == a.old), None)
    if not n:
        print(f"no node '{a.old}'", file=sys.stderr)
        return 1
    if not NAME_RE.match(a.new) or any(x.name == a.new for x in nodes):
        print("new name must be unique kebab-case", file=sys.stderr)
        return 1
    if _is_folder_node(n):
        olddir = n.path.parent
        newdir = olddir.parent / a.new
        olddir.rename(newdir)
        (newdir / n.path.name).rename(newdir / f"{a.new}.md")
        n.path = newdir / f"{a.new}.md"
    else:
        n.path = n.path.rename(n.path.parent / f"{a.new}.md")
    text = n.path.read_text()
    text = re.sub(r"^name:.*$", f"name: {a.new}", text, count=1, flags=re.M)
    n.path.write_text(text)
    for c in children_of(nodes, a.old):
        _set_frontmatter_parent(c.path, a.new)
    link_re = re.compile(rf"\[\[{re.escape(a.old)}(\||#|\])")
    for x in load(root):
        t = x.path.read_text()
        nt = link_re.sub(lambda m: f"[[{a.new}{m.group(1)}", t)
        if nt != t:
            x.path.write_text(nt)
    cmd_index(a, load(root), root)
    print(f"renamed {a.old} -> {a.new}")
    return 0


def cmd_move(a, nodes, root):
    n = next((x for x in nodes if x.name == a.name), None)
    if not n:
        print(f"no node '{a.name}'", file=sys.stderr)
        return 1
    new_parent = None if a.new_parent == "-" else a.new_parent
    if new_parent and not any(x.name == new_parent for x in nodes):
        print(f"no parent '{new_parent}'", file=sys.stderr)
        return 1
    if new_parent == (n.meta.get("parent") or None):
        print("already there", file=sys.stderr)
        return 1
    if new_parent and new_parent in under_filter(nodes, n.name):
        print(f"cannot move {n.name} under its own descendant {new_parent}", file=sys.stderr)
        return 1
    _reparent(n, new_parent, nodes, root)
    cmd_index(a, load(root), root)
    print(f"moved {n.name} -> {new_parent or '(root)'}")
    return 0


def cmd_init(a, nodes, root):
    if nodes:
        print(f"{root} already has node(s); refusing to init (use `ft new` to add more)", file=sys.stderr)
        return 1
    src = Path(a.path).resolve()
    abstract = None
    readme = next(iter(sorted(src.glob("README*"))), None)
    if readme:
        for para in readme.read_text(errors="ignore").split("\n\n"):
            para = " ".join(para.split())
            if para and not para.startswith("#"):
                abstract = para
                break
    name = src.name
    pkg, pyproj = src / "package.json", src / "pyproject.toml"
    if pkg.exists():
        data = json.loads(pkg.read_text())
        name = data.get("name", name)
        abstract = abstract or data.get("description")
    elif pyproj.exists():
        t = pyproj.read_text()
        m = re.search(r'(?m)^name\s*=\s*"([^"]+)"', t)
        name = m.group(1) if m else name
        m = re.search(r'(?m)^description\s*=\s*"([^"]+)"', t)
        abstract = abstract or (m.group(1) if m else None)
    name = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-") or "project"
    skip = {".git", "node_modules", "dist", "build", "venv", ".venv", "__pycache__", "features", ".vscode", "out"}
    children = sorted(p.name for p in src.iterdir() if p.is_dir() and p.name not in skip and not p.name.startswith("."))[:MAX_CHILDREN]
    path = root / name / f"{name}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TEMPLATE.format(name=name, parent="", toc=toc_line()).replace(
        "What this feature is and why it is needed.", abstract or "DRAFT: describe what this project is and why it exists."))
    for c in children:
        cname = re.sub(r"[^a-z0-9-]+", "-", c.lower()).strip("-")
        if not cname or cname == name:
            continue
        cpath = path.parent / f"{cname}.md"
        cpath.write_text(TEMPLATE.format(name=cname, parent=name, toc=toc_line()).replace(
            "What this feature is and why it is needed.", f"DRAFT: describe what {c}/ does."))
    print(path)
    print("run the Plan-mode interview next to refine this draft")
    return 0


def cmd_view(a, nodes, root):
    """Write one self-contained HTML viewer/editor; no server. Chromium browsers write via File System Access."""
    media = Path(__file__).resolve().parents[2] / "vscode-feature-tree" / "media"
    parts = {f: (media / f).read_text() for f in ("graph.css", "tree.js", "graph.js", "host-web.js")}
    snap = [{"path": f.relative_to(root).as_posix(), "text": f.read_text()}
            for f in sorted(root.rglob("*")) if f.is_file() and (f.suffix == ".md" or f.relative_to(root).as_posix() == ".paused")]
    snap_js = "window.FT_SNAPSHOT=" + json.dumps(snap).replace("</", "<\\/") + ";"
    html = ("<!doctype html><html><head><meta charset=\"utf-8\"><title>Feature Tree</title><style>"
            + parts["graph.css"] + "</style></head><body><div id=\"toolbar\"></div>"
            "<div id=\"viewport\"><div id=\"canvas\"><svg id=\"edges\"></svg></div></div>"
            + f"<script>{snap_js}</script>"
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
        if "status" not in n.meta:
            continue  # not a feature node (README, SKILL.md): never rewrite stray markdown
        kids = children_of(nodes, n.name)
        orig = n.path.read_text()
        text = ensure_sections(orig)
        new_status = n.computed_status()
        if n.meta.get("status") != new_status:
            text = re.sub(r"^status:.*$", f"status: {new_status}", text, count=1, flags=re.M)
        listing = "\n".join(f"- [[{k.name}]] ({k.meta.get('status')})" for k in kids)
        new = re.sub(r"(## Children\n).*\Z", lambda m: m.group(1) + (listing + "\n" if listing else ""), text, flags=re.S)
        new = ensure_toc(new)
        if new != orig:
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
    t.add_argument("--afk-only", action="store_true", help="hide {hitl} todos; use for unattended/looped sessions")
    nx = sub.add_parser("next", help="highest priority unblocked todo")
    nx.add_argument("--under")
    nx.add_argument("--afk-only", action="store_true", help="skip {hitl} todos; use for unattended/looped sessions")
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
    ak.add_argument("--option", action="append", help="a multiple-choice option; repeat, first = recommended, 'Other' is implicit")
    v = sub.add_parser("view")
    v.add_argument("-o", "--out", help="output html (default: <root>/viewer.html)")
    l = sub.add_parser("link")
    l.add_argument("name")
    r = sub.add_parser("refs")
    r.add_argument("name")
    nw = sub.add_parser("new")
    nw.add_argument("parent", help="parent node name or '-' for root")
    nw.add_argument("name")
    rf = sub.add_parser("reflect", help="archive confirmed todos/questions and distil them into Implemented / Facts & Details")
    rf.add_argument("name", nargs="?", help="node to reflect (omit with --check)")
    rf.add_argument("--todo", help="exact text of a confirmed [x] todo")
    rf.add_argument("--question", help="id (Qn) of a confirmed [x] question")
    rf.add_argument("--note", help="prose to append to Implemented / Facts & Details")
    rf.add_argument("--check", action="store_true", help="exit 1 if unreflected items exist tree-wide (or --under NODE)")
    rf.add_argument("--under", help="scope --check to this node and its descendants")
    dl = sub.add_parser("delete", help="delete a node, reparenting its children, or a whole subtree")
    dl.add_argument("name")
    dl.add_argument("--subtree", action="store_true", help="delete the node and all descendants")
    dl.add_argument("--yes", action="store_true", help="apply (default is dry-run)")
    rn = sub.add_parser("rename", help="rename a node, updating children's parent and all wikilinks")
    rn.add_argument("old")
    rn.add_argument("new")
    mv = sub.add_parser("move", help="relocate a node (and its subtree) under a different parent")
    mv.add_argument("name")
    mv.add_argument("new_parent", help="new parent node name or '-' for root")
    it = sub.add_parser("init", help="bootstrap a draft tree from an existing codebase")
    it.add_argument("path", nargs="?", default=".", help="codebase root to scan (default: .)")
    st = sub.add_parser("status", help="one-screen briefing: progress, what needs the human, what the agent can do alone")
    st.add_argument("--under")
    dg = sub.add_parser("digest", help="what changed in the plan since a time, from git history")
    dg.add_argument("--since", default="1 day ago", help="git date expression (default: '1 day ago')")
    asm = sub.add_parser("assume", help="unattended: answer an open question with its recommended option, flagged unconfirmed")
    asm.add_argument("name")
    asm.add_argument("qid")
    asm.add_argument("--option", type=int, default=1, help="1-based option number (default 1 = recommended)")
    ps = sub.add_parser("pause", help="human kill switch: stop unattended work")
    ps.add_argument("reason", nargs="*")
    sub.add_parser("resume", help="clear the pause")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    nodes = load(root)
    sys.exit({"lint": cmd_lint, "tree": cmd_tree, "todos": cmd_todos,
              "link": cmd_link, "next": cmd_next, "work": cmd_work, "questions": cmd_questions, "ask": cmd_ask, "view": cmd_view, "refs": cmd_refs, "new": cmd_new, "index": cmd_index,
              "reflect": cmd_reflect, "delete": cmd_delete, "rename": cmd_rename, "move": cmd_move, "init": cmd_init,
              "status": cmd_status, "digest": cmd_digest, "assume": cmd_assume, "pause": cmd_pause, "resume": cmd_resume}[a.cmd](a, nodes, root))


if __name__ == "__main__":
    main()
