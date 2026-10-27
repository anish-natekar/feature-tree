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

Jump: [Abstract](#abstract) · [Acceptance Tests](#acceptance-tests) · [Todos](#todos) · [Questions](#questions) · [Implemented](#implemented) · [Citations](#citations) · [Children](#children)

## Abstract
{abstract}

## Acceptance Tests
manual: check by eye.

## Todos
{todos}

## Questions

## Implemented

## Citations

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
        self.assertIn("move it to ## Implemented", r.stderr)
        self.assertEqual(self.run_hook("stop", p, stop_hook_active=True).returncode, 0)
        self.assertEqual(self.run_hook("stop", make(["- [ ] (P1) fine"])).returncode, 0)

    def test_context_hook(self):
        p = make(["- [ ] (P1) fine"])
        self.assertIn("P1 fine", self.run_hook("context", p).stdout)
