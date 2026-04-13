<div align="center">

# 🏛 Palace

### Claude Code Memory Palace · Claude Code 记忆宫殿

**Give Claude a photographic memory for every project.**  
**让每个项目的 Claude，都记得你们之间的一切。**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron)](https://electronjs.org)
[![Claude Code](https://img.shields.io/badge/Claude_Code-compatible-blueviolet)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey?logo=apple)](https://github.com/Aishuomeng/palace)

<br/>

> *"Stop re-explaining your project every time you open Claude."*  
> *「不要再每次都跟 Claude 从头解释你的项目了。」*

</div>

---

## ✨ What is Palace?

Palace is a **desktop app for Claude Code** that solves one of the most frustrating problems with AI-assisted development: **every new session starts cold**.

You waste the first minutes of every Claude session re-explaining:
- What the project does
- Where you left off
- What decisions were already made
- What's currently broken and why

Palace fixes this by **injecting structured memory into `CLAUDE.md`** before Claude launches — so Claude starts every session already knowing everything.

---

## ✨ 这是什么？

Palace 是一个 **Claude Code 专属桌面应用**，专门解决 AI 辅助开发中最令人抓狂的问题：**每次新会话都从零开始**。

你浪费了多少时间，一遍遍向 Claude 解释：
- 项目是做什么的
- 上次做到哪里了
- 之前做了哪些决策
- 现在哪里有 bug

Palace 的方案：**在启动 Claude 前，自动把结构化记忆注入 `CLAUDE.md`**，让 Claude 一开口就完全了解你的项目。

---

## 🎯 Features · 功能

| Feature | 功能 |
|---------|------|
| 📂 **Multi-project manager** | 多项目统一管理，标签页切换 |
| 🧠 **Persistent memory** | 每个项目独立的 Claude 上下文记忆 |
| 🔑 **Key fields** | API keys、框架、数据库等关键信息自动注入 |
| ⚡ **Local auto-scan** | 自动识别技术栈（package.json / Cargo.toml / go.mod…） |
| 🤖 **AI deep analysis** | 一键让 Claude 分析项目并填写字段 |
| 💉 **CLAUDE.md injection** | 启动时自动注入，退出后保持干净 |
| 🖥️ **Built-in terminal** | 内置 xterm.js 终端，无需切换窗口 |
| ⏱️ **Session timeline** | 记录每次启动快照，随时回溯 |
| 🌏 **6 languages** | 中 / EN / 日 / 한 / DE / FR |
| 🎨 **Dark glassmorphism UI** | 暗色玻璃拟态界面，赏心悦目 |

---

## 🚀 Quick Start · 快速上手

### Requirements · 环境要求
- macOS (Apple Silicon / Intel)
- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Node.js 18+

### Install · 安装

```bash
git clone https://github.com/Aishuomeng/palace.git
cd palace/app
npm install
npm start
```

### First Run · 首次使用

1. **Auth screen** — Palace detects your Claude login automatically  
   **授权界面** — 自动检测 Claude 登录状态

2. **Add a project** — click ＋ or scan a directory  
   **添加项目** — 点击 ＋ 新建，或扫描目录批量导入

3. **Fill in memory** — describe the project context in the memory field  
   **填写记忆** — 在记忆框写下项目上下文、当前状态、待办事项

4. **Launch Claude** — click ▶ or press `⌘ Enter`  
   **启动 Claude** — 点击 ▶ 或按 `⌘ Enter`，记忆自动注入

---

## 🧠 How Memory Works · 记忆机制

```
[Palace]  →  injects memory block  →  [CLAUDE.md]  →  [Claude reads it]
```

Palace writes a structured block into your project's `CLAUDE.md`:

```markdown
<!-- PALACE:START -->
## Project Fields (from Palace)

- **Framework**: Next.js + TypeScript
- **Database**: PostgreSQL
- **ANTHROPIC_API_KEY**: sk-ant-...

# Palace Memory: my-project

## 项目状态
- 登录模块已完成，正在开发支付流程
- Stripe webhook 尚未测试

## 待办
1. 实现 /api/webhook/stripe
2. 添加邮件通知

## 最近决策
- 2026-04-13: 选择 Stripe 而非 LemonSqueezy，因为更好的文档
<!-- PALACE:END -->
```

Claude reads this at startup and **immediately knows your project**.  
Claude 启动后立刻读取，**完全了解项目现状**，不需要任何解释。

---

## ⌨️ Keyboard Shortcuts · 快捷键

| Shortcut | Action |
|----------|--------|
| `⌘ Enter` | Launch Claude · 启动 Claude |
| `⌘ S` | Save project · 保存项目 |
| `Esc` | Close modal · 关闭弹窗 |

---

## 🗂️ Project Structure · 项目结构

```
palace/
├── app/                    # Electron desktop app
│   ├── main.js             # Main process, IPC, PTY, file I/O
│   ├── preload.js          # Context bridge API
│   └── renderer/
│       ├── index.html      # UI skeleton
│       ├── app.js          # All frontend logic
│       ├── style.css       # Dark glassmorphism theme
│       └── i18n.js         # 6-language translations
└── src/palace/             # Legacy Python TUI (archived)
```

Palace stores all data in `~/.palace/`:
```
~/.palace/
└── {project-id}/
    ├── meta.json       # Project name, path, fields
    ├── memory.md       # The memory injected into CLAUDE.md
    └── sessions/       # Launch history checkpoints
```

---

## 🤝 Contributing · 参与贡献

PRs and issues welcome. If you find Palace useful, give it a ⭐

欢迎提 PR 和 Issue。如果 Palace 对你有帮助，点个 ⭐ 支持一下！

---

## 📄 License

MIT © [Aishuomeng](https://github.com/Aishuomeng/palace)

---

<div align="center">

**Built for developers who work with Claude Code every day.**  
**为每天都在使用 Claude Code 的开发者而生。**

</div>
