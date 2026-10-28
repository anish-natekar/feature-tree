import os, subprocess, sys, tempfile, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
FT = HERE.parent / "scripts" / "ft.py"
FAKE = HERE / "fake_claude.py"

NODE = """---
name: {name}
status: planned
parent:
tests: manual
last_verified:
---
# {name}

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Facts & Details](#facts-&-details) · [Citations](#citations) · [Archived](#archived) · [Children](#children)

## Abstract
{abstract}

## Acceptance Tests
manual: check by eye.

## Todos
{todos}

## Questions

## Implemented

## Facts & Details

## Citations

## Archived

## Children
"""
ABSTRACT = " ".join(["word"] * 90)


def make(todos, name="alpha"):
    d = tempfile.mkdtemp()
    f = Path(d) / "features" / name
    f.mkdir(parents=True)
    (f / f"{name}.md").write_text(NODE.format(name=name, abstract=ABSTRACT, todos="\n".join(todos)))
    return Path(d)


def ft(proj, *args, env=None):
    e = dict(os.environ, **(env or {}))
    return subprocess.run([sys.executable, str(FT), "--root", str(proj / "features"), *args], capture_output=True, text=True, cwd=proj, env=e)


def work(proj, mode, *args):
    log = proj / "fake.log"
    r = ft(proj, "work", "--claude-cmd", f"{sys.executable} {FAKE}", *args, env={"FT_FAKE": mode, "FT_FAKE_LOG": str(log)})
    return r, (log.read_text().splitlines() if log.exists() else [])


class WorkTests(unittest.TestCase):
    def test_completes_until_none(self):
        p = make(["- [ ] (P1) one", "- [ ] (P2) two"])
        r, log = work(p, "done")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("done.", r.stdout)
        self.assertEqual(ft(p, "next").stdout.split()[0], "NONE")
        self.assertEqual(len(log), 2)

    def test_triage_first(self):
        p = make(["- [ ] (P?) vague"])
        r, log = work(p, "done")
        self.assertTrue(log[0].startswith("Triage"), log)
        self.assertIn("done.", r.stdout)

    def test_tle_marks_and_continues(self):
        p = make(["- [ ] (P0) first slow {limit: 1s}", "- [ ] (P1) second"])
        r, log = work(p, "hang_first")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("TLE", r.stdout)
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("first slow {limit: 1s} {tle: 1s}", text)
        self.assertNotIn("second", text)  # second got done
        self.assertEqual(ft(p, "next").stdout.split()[0], "NONE")
        self.assertIn("TLE", ft(p, "todos").stdout)

    def test_consecutive_tle_stops(self):
        p = make(["- [ ] (P0) a {limit: 1s}", "- [ ] (P1) b {limit: 1s}", "- [ ] (P2) c {limit: 1s}"])
        r, _ = work(p, "hang_all", "--max-tle", "2")
        self.assertEqual(r.returncode, 3, r.stdout)
        self.assertIn("2 TLEs in a row", r.stdout)

    def test_no_change_stops(self):
        p = make(["- [ ] (P1) stuck"])
        r, _ = work(p, "noop")
        self.assertEqual(r.returncode, 2)
        self.assertIn("no change", r.stdout)

    def test_split_runs_for_big_node(self):
        p = make([f"- [ ] (P1) t{i}" for i in range(14)])
        r, log = work(p, "done", "--max", "2")
        self.assertEqual(log[0], "Split")

    def test_dry_run(self):
        p = make(["- [ ] (P1) one"])
        r = ft(p, "work", "--dry-run")
        self.assertIn("would run", r.stdout)


class MarkerTests(unittest.TestCase):
    def test_bad_limit_is_error(self):
        p = make(["- [ ] (P1) x {limit: soon}"])
        r = ft(p, "lint")
        self.assertEqual(r.returncode, 1)
        self.assertIn("bad {limit", r.stdout)

    def test_limit_parsed_and_toc_lint(self):
        p = make(["- [ ] (P1) x {limit: 2h}"])
        self.assertEqual(ft(p, "lint").returncode, 0)
        f = p / "features/alpha/alpha.md"
        f.write_text(f.read_text().replace("Jump:", "Skip:"))
        self.assertIn("section index", ft(p, "lint").stdout)
        ft(p, "index")
        self.assertNotIn("section index", ft(p, "lint").stdout)

    def test_tle_hidden_from_ready(self):
        p = make(["- [ ] (P1) x {tle: 20m}"])
        self.assertEqual(ft(p, "next").stdout.split()[0], "NONE")
        self.assertEqual(ft(p, "todos", "--ready").stdout.strip(), "")


class TodoStateTests(unittest.TestCase):
    def test_in_progress_preferred_over_higher_priority_not_started(self):
        p = make(["- [ ] (P0) not started", "- [~] (P2) in progress"])
        self.assertIn("in progress", ft(p, "next").stdout)

    def test_three_states_shown_in_todos(self):
        p = make(["- [~] (P1) doing it"])
        self.assertIn("[~]", ft(p, "todos", "--all").stdout)


class ReflectTests(unittest.TestCase):
    def test_check_reports_unreflected_todo_and_question(self):
        p = make(["- [x] (P1) done thing"])
        r = ft(p, "reflect", "--check")
        self.assertEqual(r.returncode, 1)
        self.assertIn("done thing", r.stdout)

    def test_check_clean_when_nothing_outstanding(self):
        p = make(["- [ ] (P1) open"])
        self.assertEqual(ft(p, "reflect", "--check").returncode, 0)

    def test_reflect_todo_moves_to_archived_and_implemented(self):
        p = make(["- [x] (P1) done thing"])
        r = ft(p, "reflect", "alpha", "--todo", "done thing", "--note", "Did the thing.")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("done thing", text.split("## Archived")[1])
        self.assertIn("Did the thing.", text.split("## Implemented")[1])
        self.assertNotIn("done thing", text.split("## Todos")[1].split("## Questions")[0])
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)
        self.assertEqual(ft(p, "reflect", "--check").returncode, 0)

    def test_reflect_question_moves_to_archived_and_facts(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "ask", "alpha", "Which license?", "--option", "MIT")
        f = p / "features/alpha/alpha.md"
        f.write_text(f.read_text().replace("- [ ] Q1:", "- [x] Q1:"))
        r = ft(p, "reflect", "alpha", "--question", "Q1", "--note", "Chose MIT.")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        text = f.read_text()
        self.assertIn("Q1", text.split("## Archived")[1])
        self.assertIn("Chose MIT.", text.split("## Facts & Details")[1])
        self.assertNotIn("Q1", text.split("## Questions")[1].split("## Implemented")[0])
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_reflect_no_match_errors(self):
        p = make(["- [ ] (P1) x"])
        r = ft(p, "reflect", "alpha", "--todo", "nope", "--note", "x")
        self.assertEqual(r.returncode, 1)


class StructuralEditTests(unittest.TestCase):
    def test_delete_leaf_removes_file(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "alpha", "child")
        r = ft(p, "delete", "child", "--yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse((p / "features/alpha/child.md").exists())
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_delete_dry_run_makes_no_changes(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "alpha", "child")
        ft(p, "delete", "child")
        self.assertTrue((p / "features/alpha/child.md").exists())

    def test_delete_reparents_children(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "alpha", "mid")
        ft(p, "new", "mid", "grand")
        r = ft(p, "delete", "mid", "--yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)
        grand = next(f for f in (p / "features").rglob("grand.md"))
        self.assertIn("parent: alpha", grand.read_text())

    def test_delete_subtree_removes_descendants(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "alpha", "mid")
        ft(p, "new", "mid", "grand")
        r = ft(p, "delete", "mid", "--subtree", "--yes")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse(list((p / "features").rglob("grand.md")))
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_rename_updates_wikilinks(self):
        p = make(["- [ ] (P1) see [[beta]]"])
        ft(p, "new", "alpha", "beta")
        r = ft(p, "rename", "beta", "gamma")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("[[gamma]]", (p / "features/alpha/alpha.md").read_text())
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_move_relocates_subtree(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "-", "other")
        ft(p, "new", "alpha", "child")
        r = ft(p, "move", "child", "other")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)
        child = next(f for f in (p / "features").rglob("child.md"))
        self.assertIn("parent: other", child.read_text())

    def test_move_rejects_cycle(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "new", "alpha", "child")
        r = ft(p, "move", "alpha", "child")
        self.assertEqual(r.returncode, 1)


class InitTests(unittest.TestCase):
    def test_init_scans_readme_and_dirs(self):
        d = Path(tempfile.mkdtemp())
        (d / "README.md").write_text("# myproj\n\nA tiny tool that does a thing.\n")
        (d / "src").mkdir()
        (d / "docs").mkdir()
        r = ft(d, "init", str(d))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(ft(d, "lint").returncode, 0, ft(d, "lint").stdout)
        # root node is whichever file carries the real abstract; children get a DRAFT placeholder instead.
        root_md = next(f for f in (d / "features").glob("*/*.md") if "DRAFT:" not in f.read_text())
        self.assertIn("A tiny tool that does a thing.", root_md.read_text())

    def test_init_refuses_when_features_nonempty(self):
        p = make(["- [ ] (P1) x"])
        r = ft(p, "init", str(p))
        self.assertEqual(r.returncode, 1)


if __name__ == "__main__":
    unittest.main()


class HookTests(unittest.TestCase):
    HOOK = HERE.parent / "hooks" / "ft_hook.py"

    def run_hook(self, kind, proj, **data):
        data.setdefault("cwd", str(proj))
        import json
        return subprocess.run([sys.executable, str(self.HOOK), kind], input=json.dumps(data), capture_output=True, text=True)

    def test_lint_hook_blocks_on_error(self):
        p = make(["- [ ] (P1) x {limit: soon}"])
        f = str(p / "features/alpha/alpha.md")
        self.assertEqual(self.run_hook("lint", p, tool_input={"file_path": f}).returncode, 2)
        self.assertEqual(self.run_hook("lint", p, tool_input={"file_path": "/x/src/a.py"}).returncode, 0)

    def test_stop_hook_checkpoint(self):
        p = make(["- [x] (P1) finished but not moved"])
        r = self.run_hook("stop", p)
        self.assertEqual(r.returncode, 2)
        self.assertIn("ft reflect", r.stderr)
        self.assertEqual(self.run_hook("stop", p, stop_hook_active=True).returncode, 0)
        self.assertEqual(self.run_hook("stop", make(["- [ ] (P1) fine"])).returncode, 0)

    def test_context_hook(self):
        p = make(["- [ ] (P1) fine"])
        self.assertIn("P1 fine", self.run_hook("context", p).stdout)


class QuestionOptionTests(unittest.TestCase):
    def test_ask_with_options_round_trips_and_lints_clean(self):
        p = make(["- [ ] (P1) pick a license"])
        r = ft(p, "ask", "alpha", "Which license?", "--option", "MIT", "--option", "Apache-2.0", "--option", "GPL-3.0")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("with 3 options (first = recommended)", r.stdout)
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("- [ ] Q1: Which license?\n  - O: MIT\n  - O: Apache-2.0\n  - O: GPL-3.0", text)
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_questions_cli_shows_recommended_marker(self):
        p = make(["- [ ] (P1) pick a license"])
        ft(p, "ask", "alpha", "Which license?", "--option", "MIT", "--option", "Apache-2.0")
        out = ft(p, "questions", "--open").stdout
        self.assertIn("* MIT", out)  # first option flagged as recommended
        self.assertIn("  Apache-2.0", out)
        self.assertNotIn("* Apache-2.0", out)

    def test_plain_question_without_options_still_works(self):
        p = make(["- [ ] (P1) x"])
        r = ft(p, "ask", "alpha", "No options here?")
        self.assertEqual(r.returncode, 0)
        self.assertNotIn(" with ", r.stdout)
        self.assertEqual(ft(p, "lint").returncode, 0)


class DependencyTests(unittest.TestCase):
    def test_blocked_by_excludes_from_next_until_target_done(self):
        import re
        p = make(["- [ ] (P1) gated {blocked-by: other}"])
        ft(p, "new", "-", "other")
        other = next(f for f in (p / "features").rglob("other.md"))
        # strip the default "first step" todo `ft new` seeds, so it can't win `ft next` on its own
        other.write_text(re.sub(r"## Todos\n.*?\n\n## Questions", "## Todos\n\n## Questions", other.read_text(), flags=re.S))
        self.assertEqual(ft(p, "next").stdout.split()[0], "NONE")
        other.write_text(other.read_text().replace("status: planned", "status: done"))
        self.assertIn("gated", ft(p, "next").stdout)

    def test_lint_warns_on_dangling_blocked_by(self):
        p = make(["- [ ] (P1) gated {blocked-by: ghost}"])
        r = ft(p, "lint")
        self.assertIn("blocked-by missing node 'ghost'", r.stdout)

    def test_todos_shows_blocked_by_suffix(self):
        p = make(["- [ ] (P1) gated {blocked-by: other}"])
        ft(p, "new", "-", "other")
        self.assertIn("blocked by other", ft(p, "todos").stdout)

    def test_hitl_excluded_with_afk_only(self):
        p = make(["- [ ] (P1) ask-a-human {hitl}", "- [ ] (P2) autonomous ok"])
        self.assertIn("ask-a-human", ft(p, "next").stdout)
        self.assertIn("autonomous ok", ft(p, "next", "--afk-only").stdout)
        out = ft(p, "todos", "--afk-only").stdout
        self.assertIn("autonomous ok", out)
        self.assertNotIn("ask-a-human", out)


class RollupTests(unittest.TestCase):
    def test_tree_shows_rollup_percentage(self):
        import re
        p = make(["- [x] (P1) done one", "- [ ] (P2) open one"])
        ft(p, "new", "alpha", "child")
        child = next(f for f in (p / "features").rglob("child.md"))
        child.write_text(re.sub(r"## Todos\n.*?\n\n## Questions", "## Todos\n- [x] (P1) child done\n\n## Questions",
                                 child.read_text(), flags=re.S))
        out = ft(p, "tree").stdout
        lines = out.strip().splitlines()
        alpha_line = next(l for l in lines if "alpha" in l)
        child_line = next(l for l in lines if "child" in l)
        self.assertIn("[67%]", alpha_line)  # 2 of 3 todos done across alpha + child
        self.assertIn("[100%]", child_line)  # child's own subtree is fully done


class StatusSyncTests(unittest.TestCase):
    def test_index_sets_in_progress_when_todo_actively_worked(self):
        p = make(["- [~] (P1) doing it"])
        ft(p, "index")
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("status: in-progress", text)

    def test_index_sets_done_when_no_open_items_and_verified(self):
        p = make([])
        f = p / "features/alpha/alpha.md"
        f.write_text(f.read_text().replace("last_verified:", "last_verified: 2026-10-28"))
        ft(p, "index")
        self.assertIn("status: done", f.read_text())

    def test_index_keeps_planned_when_no_open_items_but_unverified(self):
        p = make([])
        ft(p, "index")
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("status: planned", text)

    def test_index_demotes_in_progress_to_planned_without_active_todo(self):
        p = make(["- [ ] (P1) not started yet"])
        f = p / "features/alpha/alpha.md"
        f.write_text(f.read_text().replace("status: planned", "status: in-progress"))
        ft(p, "index")
        self.assertIn("status: planned", f.read_text())

    def test_lint_warns_on_stale_status(self):
        p = make(["- [~] (P1) doing it"])  # template default is status: planned, computed is in-progress
        out = ft(p, "lint").stdout
        self.assertIn("status stale", out)


class LintPhilosophyTests(unittest.TestCase):
    def test_lint_warns_on_draft_placeholder_abstract(self):
        d = Path(tempfile.mkdtemp())
        (d / "README.md").write_text("# myproj\n")
        r = ft(d, "init", str(d))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        out = ft(d, "lint").stdout
        self.assertIn("DRAFT placeholder", out)


class ViewSnapshotTests(unittest.TestCase):
    def test_view_embeds_snapshot_so_it_opens_populated(self):
        p = make(["- [ ] (P1) one </script> trick"])
        out = p / "v.html"
        self.assertEqual(ft(p, "view", "-o", str(out)).returncode, 0)
        html = out.read_text()
        self.assertIn("window.FT_SNAPSHOT=", html)
        self.assertIn("alpha/alpha.md", html)
        self.assertEqual(html.count("</script>"), 4)  # embedded text cannot close the snapshot script early


class DigestTests(unittest.TestCase):
    def git(self, p, *args):
        subprocess.run(["git", "-c", "user.email=a@b", "-c", "user.name=t", *args], cwd=p, check=True, capture_output=True)

    def test_digest_reports_changes_and_quiet(self):
        p = make(["- [ ] (P1) ship it", "- [ ] (P2) pick it {blocked: Q1}"])
        self.git(p, "init", "-q")
        self.git(p, "add", "-A")
        self.git(p, "commit", "-qm", "base")
        ft(p, "ask", "alpha", "Which?", "--option", "MIT", "--option", "GPL")
        ft(p, "assume", "alpha", "Q1")
        f = p / "features" / "alpha" / "alpha.md"
        f.write_text(f.read_text().replace("- [ ] (P1) ship it", "- [x] (P1) ship it"))
        ft(p, "new", "alpha", "beta")
        self.git(p, "add", "-A")
        self.git(p, "commit", "-qm", "work")
        out = ft(p, "digest", "--since", "1 hour ago").stdout
        self.assertIn("FINISHED", out)
        self.assertIn("ship it", out)
        self.assertIn("DECIDED BY AGENT", out)
        self.assertIn("MIT", out)
        self.assertIn("NODES ADDED", out)
        self.assertIn("beta", out)
        self.assertIn("nothing changed", ft(p, "digest", "--since", "2099-01-01").stdout)

    def test_digest_needs_git(self):
        p = make(["- [ ] (P1) x"])
        r = ft(p, "digest")
        self.assertEqual(r.returncode, 1)


class AutonomyTests(unittest.TestCase):
    def ask_opts(self, p, *opts):
        args = ["ask", "alpha", "Which?"]
        for o in opts:
            args += ["--option", o]
        return ft(p, *args)

    def test_status_reports_agent_idle(self):
        p = make(["- [ ] (P2) human only {hitl}"])
        self.assertIn("AGENT IDLE", ft(p, "status").stdout)
        p = make(["- [ ] (P2) free work"])
        self.assertNotIn("AGENT IDLE", ft(p, "status").stdout)

    def test_status_sections_and_needs_you(self):
        p = make(["- [ ] (P1) pick it {blocked: Q1}", "- [ ] (P2) human only {hitl}", "- [ ] (P2) free work"])
        self.ask_opts(p, "MIT", "GPL")
        out = ft(p, "status").stdout
        self.assertIn("PROGRESS", out)
        self.assertIn("answer features/alpha/alpha.md Q1", out)
        self.assertIn("(blocks 1 todo)", out)
        self.assertIn("[agent would pick: MIT]", out)
        self.assertIn("do (needs a human)", out)
        self.assertIn("next: P2 free work", out)

    def test_assume_unblocks_and_flags_unconfirmed(self):
        p = make(["- [ ] (P1) pick it {blocked: Q1}"])
        self.ask_opts(p, "MIT", "GPL")
        self.assertTrue(ft(p, "next").stdout.startswith("NONE"))
        r = ft(p, "assume", "alpha", "Q1", "--option", "2")
        self.assertEqual(r.returncode, 0, r.stderr)
        text = (p / "features/alpha/alpha.md").read_text()
        self.assertIn("- [~] Q1: Which?", text)
        self.assertIn("A (agent): assumed default 'GPL'", text)
        self.assertNotIn("{blocked", text)
        self.assertIn("pick it", ft(p, "next").stdout)
        self.assertIn("confirm features/alpha/alpha.md Q1", ft(p, "status").stdout)
        self.assertEqual(ft(p, "lint").returncode, 0, ft(p, "lint").stdout)

    def test_assume_refuses_optionless_and_closed(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "ask", "alpha", "No options?")
        self.assertEqual(ft(p, "assume", "alpha", "Q1").returncode, 1)
        self.ask_opts(p, "a", "b")
        self.assertEqual(ft(p, "assume", "alpha", "Q2").returncode, 0)
        self.assertEqual(ft(p, "assume", "alpha", "Q2").returncode, 1)

    def test_pause_gates_next_and_work_then_resume(self):
        p = make(["- [ ] (P1) do it"])
        ft(p, "pause", "lunch", "break")
        self.assertIn("PAUSED: lunch break", ft(p, "next").stdout)
        self.assertIn("PAUSED", ft(p, "status").stdout)
        r, calls = work(p, "ok", "--max", "2")
        self.assertEqual(r.returncode, 5, r.stdout + r.stderr)
        self.assertEqual(calls, [])
        ft(p, "resume")
        self.assertIn("do it", ft(p, "next").stdout)

    def test_e2e_unattended_run_assume_then_work_then_handoff(self):
        p = make(["- [ ] (P1) pick license {blocked: Q1}", "- [ ] (P2) free work"])
        ft(p, "ask", "alpha", "Which license?", "--option", "MIT", "--option", "GPL")
        r, calls = work(p, "done", "--max", "5")  # blocked todo is skipped; free one is done; then research
        self.assertEqual(calls.count("Work loop"), 1, calls)
        self.assertEqual(ft(p, "assume", "alpha", "Q1").returncode, 0)  # agent unblocks itself
        r, calls = work(p, "done", "--max", "5")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn("pick license", (p / "features/alpha/alpha.md").read_text().split("## Questions")[0])
        out = ft(p, "status").stdout
        self.assertIn("confirm features/alpha/alpha.md Q1", out)  # human's only job: review the assumption
        self.assertIn("nothing ready", out)

    HOOK = HookTests.HOOK

    def test_stop_hook_silent_while_paused(self):
        p = make(["- [x] (P1) finished but not moved"])
        ft(p, "pause")
        self.assertEqual(HookTests.run_hook(self, "stop", p).returncode, 0)
        ft(p, "resume")
        self.assertEqual(HookTests.run_hook(self, "stop", p).returncode, 2)

    def test_work_reflects_checked_items_before_picking_more(self):
        p = make(["- [x] (P1) already finished", "- [ ] (P2) next one"])
        r, calls = work(p, "done", "--max", "5")
        self.assertEqual(calls[0], "Reflect", calls)
        self.assertEqual(ft(p, "reflect", "--check").returncode, 0)
        self.assertIn("already finished", (p / "features/alpha/alpha.md").read_text().split("## Archived")[1])


class IndexSafetyTests(unittest.TestCase):
    def test_index_never_rewrites_non_node_markdown(self):
        p = make(["- [ ] (P1) x"])
        stray = p / "features" / "README.md"
        stray.write_text("---\nname: readme\ndescription: not a node\n---\n# readme\n\nhello\n")
        ft(p, "index")
        self.assertEqual(stray.read_text(), "---\nname: readme\ndescription: not a node\n---\n# readme\n\nhello\n")


class LintBaseTests(unittest.TestCase):
    def lint_out(self, p):
        return ft(p, "lint")

    def edit(self, p, fn):
        f = p / "features/alpha/alpha.md"
        f.write_text(fn(f.read_text()))

    def test_clean_tree_passes(self):
        self.assertEqual(self.lint_out(make(["- [ ] (P1) x"])).returncode, 0)

    def test_section_order_error(self):
        p = make(["- [ ] (P1) x"])
        self.edit(p, lambda t: t.replace("## Todos", "## Zed", 1))
        r = self.lint_out(p)
        self.assertEqual(r.returncode, 1)
        self.assertIn("sections must be exactly", r.stdout)

    def test_short_node_warns_but_passes(self):
        p = make(["- [ ] (P1) x"])
        self.edit(p, lambda t: t.replace(ABSTRACT, "tiny"))
        r = self.lint_out(p)
        self.assertEqual(r.returncode, 0)
        self.assertIn("consider merging", r.stdout)

    def test_oversize_node_errors(self):
        p = make(["- [ ] (P1) x"])
        self.edit(p, lambda t: t.replace(ABSTRACT, " ".join(["w"] * 950)))
        self.assertIn("split into children", self.lint_out(p).stdout)

    def test_stale_jump_line_warns(self):
        p = make(["- [ ] (P1) x"])
        self.edit(p, lambda t: t.replace("Jump: ", "Jump: [Old](#old) · ", 1))
        self.assertIn("missing section index", self.lint_out(p).stdout)

    def test_broken_wikilink_errors(self):
        p = make(["- [ ] (P1) see [[ghost]]"])
        r = self.lint_out(p)
        self.assertEqual(r.returncode, 1)
        self.assertIn("broken wikilink [[ghost]]", r.stdout)

    def test_missing_parent_errors(self):
        p = make(["- [ ] (P1) x"])
        self.edit(p, lambda t: t.replace("parent:\n", "parent: nobody\n", 1))
        self.assertIn("parent should be", self.lint_out(p).stdout)

    def test_degenerate_mcq_options_warn(self):
        p = make(["- [ ] (P1) x"])
        ft(p, "ask", "alpha", "One option?", "--option", "only")
        ft(p, "ask", "alpha", "Dup?", "--option", "A", "--option", "a")
        out = self.lint_out(p).stdout
        self.assertIn("Q1 has a single option", out)
        self.assertIn("Q2 has duplicate options", out)


class AltitudeLintTests(unittest.TestCase):
    def test_code_heavy_prose_warns_and_plain_prose_does_not(self):
        p = make(["- [ ] (P1) x"])
        f = p / "features/alpha/alpha.md"
        self.assertNotIn("reads like code docs", ft(p, "lint").stdout)
        f.write_text(f.read_text().replace("## Implemented\n", "## Implemented\n" + " ".join(f"`fn_{i}()`" for i in range(8)) + "\n", 1))
        r = ft(p, "lint")
        self.assertEqual(r.returncode, 0)
        self.assertIn("reads like code docs", r.stdout)
