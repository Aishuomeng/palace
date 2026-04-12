# 🏛 Claude Code 记忆宫殿

> Stop re-explaining your projects to Claude. Let the palace remember.

A TUI project manager for Claude Code that maintains persistent, structured context per project — so every new Claude session starts with full awareness of what's happening.

## The Problem

Claude Code is powerful, but every new session starts cold. You waste time re-explaining:
- What the project is
- Where you left off  
- What decisions were made
- What's broken and why

## The Solution

Palace injects a structured memory block into your project's `CLAUDE.md` before launching Claude. When Claude starts, it reads the full context automatically — no re-explanation needed.

## Install

```bash
# Requires Python 3.10+
pipx install ./palace

# Or with pip
pip install -e ./palace
```

## Usage

```bash
palace
```

The TUI opens. Select a project → edit its memory → launch Claude.

**Keyboard shortcuts:**
| Key | Action |
|-----|--------|
| `Ctrl+N` | Add project |
| `Ctrl+E` | Edit memory |
| `Ctrl+L` | Launch Claude |
| `Q` | Quit |

## How Memory Works

Each project gets a memory file at `~/.palace/{project}/memory.md`. When you launch Claude:

1. The memory is injected into your project's `CLAUDE.md` inside a `<!-- PALACE:START -->` block
2. Claude reads it automatically at startup
3. When Claude exits, the block is removed (keeps your `CLAUDE.md` clean)

The memory file is written in **Claude's own language** — structured notes meant to be read by the next Claude instance, not by you.

## Memory Format (Example)

```markdown
# Palace Memory: btc-trader

## 项目状态
- 系统已停止，待修复 run_reanalysis() 中 grid_range 下限 bug
- 账户当前亏损约 62U（本金 1000U）

## 关键路径
- 主脚本: ubuntu@54.227.17.224:~/btc/grid_trade_v4.py
- SSH key: /Users/sea-file/btc-trader/sea.pem

## 待办
1. 在 run_reanalysis() 中加 grid_range = max(..., 0.008)
2. 确认 BTC 市场稳定后重启

## 最近决策
- 2026-04-12: 连锁止损 -74U，手动停止系统，等待修复
```

## Project Structure

```
palace/
├── src/palace/
│   ├── app.py        # Textual TUI
│   ├── models.py     # Project / Memory data models  
│   ├── scanner.py    # Auto-detect projects
│   ├── memory.py     # CLAUDE.md injection
│   └── runner.py     # Launch claude subprocess
└── pyproject.toml
```

## License

MIT
