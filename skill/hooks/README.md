# Feature tree hooks (optional)

`ft_hook.py` gives Claude Code three guard rails for a project that keeps its plan in `features/`:

| hook | event | what it does |
|---|---|---|
| `lint` | PostToolUse on Edit/Write | runs `ft lint` after any `features/**/*.md` edit; exit 2 on errors so the agent fixes them |
| `stop` | Stop | blocks ending a turn while a confirmed `[x]` item is unreflected or a `P?` remains; silent while `ft pause`d |
| `context` | SessionStart | prints `ft status` and `ft next` so a fresh session starts from the briefing |

## Install

1. Copy `skill/hooks/settings.example.json` into your project's `.claude/settings.json` (merge with existing hooks).
2. Fix the path to `ft_hook.py` if the skill lives somewhere other than `skill/hooks/`.
3. Restart Claude Code. Hooks do not enforce time limits (use `ft work`) and cannot trigger `/compact`.
