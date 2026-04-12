"""Textual TUI — Claude Code 记忆宫殿."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.screen import ModalScreen
from textual.widgets import (
    Button, Footer, Header, Input, Label, ListItem, ListView,
    Markdown, Static, TabbedContent, TabPane,
)

from .models import Project, PALACE_DIR
from .memory import load_memory, save_memory, inject_into_claude_md
from .runner import launch_claude, has_claude_cli
from .scanner import scan


# ─── Add Project Modal ────────────────────────────────────────────────────────

class AddProjectScreen(ModalScreen[Project | None]):
    """Modal to add a project manually or pick from scan results."""

    CSS = """
    AddProjectScreen {
        align: center middle;
    }
    #dialog {
        width: 70;
        height: auto;
        border: thick $primary;
        background: $surface;
        padding: 1 2;
    }
    #scan-list {
        height: 12;
        border: solid $primary-darken-2;
        margin-top: 1;
    }
    #buttons {
        margin-top: 1;
    }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="dialog"):
            yield Label("添加项目", classes="title")
            yield Label("项目名称:")
            yield Input(placeholder="my-project", id="name-input")
            yield Label("项目路径:")
            yield Input(placeholder="/path/to/project", id="path-input")
            yield Label("或从扫描结果选择:")
            yield ListView(id="scan-list")
            with Horizontal(id="buttons"):
                yield Button("确认", variant="primary", id="confirm")
                yield Button("取消", id="cancel")

    def on_mount(self) -> None:
        # Populate scan list in background
        found = scan(depth=2)
        lv = self.query_one("#scan-list", ListView)
        for p in found[:30]:
            lv.append(ListItem(Label(f"{p.name}  {p.path}")))
        self._scanned = found[:30]

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        idx = event.list_view.index
        if idx is not None and idx < len(self._scanned):
            p = self._scanned[idx]
            self.query_one("#name-input", Input).value = p.name
            self.query_one("#path-input", Input).value = str(p.path)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "cancel":
            self.dismiss(None)
            return
        name = self.query_one("#name-input", Input).value.strip()
        path_str = self.query_one("#path-input", Input).value.strip()
        if not name or not path_str:
            return
        path = Path(path_str).expanduser()
        project = Project(name=name, path=path, last_active=datetime.now())
        project.save_meta()
        self.dismiss(project)


# ─── Edit Memory Modal ────────────────────────────────────────────────────────

class EditMemoryScreen(ModalScreen[str | None]):
    """Full-screen memory editor."""

    CSS = """
    EditMemoryScreen {
        align: center middle;
    }
    #editor-box {
        width: 90%;
        height: 80%;
        border: thick $primary;
        background: $surface;
        padding: 1 2;
    }
    #mem-input {
        height: 1fr;
    }
    #edit-buttons { margin-top: 1; }
    """

    def __init__(self, content: str, **kwargs):
        super().__init__(**kwargs)
        self._content = content

    def compose(self) -> ComposeResult:
        with Vertical(id="editor-box"):
            yield Label("编辑记忆（Claude 的上下文语言）")
            yield Input(value=self._content, id="mem-input")
            with Horizontal(id="edit-buttons"):
                yield Button("保存", variant="primary", id="save")
                yield Button("取消", id="cancel")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "save":
            self.dismiss(self.query_one("#mem-input", Input).value)
        else:
            self.dismiss(None)


# ─── Main App ─────────────────────────────────────────────────────────────────

class PalaceApp(App):
    """Claude Code 记忆宫殿."""

    TITLE = "🏛  Claude Code 记忆宫殿"
    CSS = """
    Screen {
        layout: vertical;
    }

    /* Project bar */
    #project-bar {
        height: 3;
        layout: horizontal;
        background: $primary-darken-2;
        padding: 0 1;
    }
    .proj-btn {
        min-width: 14;
        height: 3;
        margin-right: 1;
    }
    .proj-btn.active {
        background: $accent;
    }
    #add-btn {
        min-width: 6;
        height: 3;
    }

    /* Context panel */
    #context-panel {
        height: 10;
        border-bottom: solid $primary-darken-2;
        padding: 0 2;
        background: $surface-darken-1;
    }
    #context-panel Markdown {
        height: 1fr;
    }
    #panel-actions {
        height: 3;
        layout: horizontal;
        align: right middle;
        padding: 0 1;
    }

    /* Bottom status */
    #status-bar {
        height: 1;
        background: $primary-darken-3;
        padding: 0 2;
        color: $text-muted;
    }
    """

    BINDINGS = [
        Binding("ctrl+n", "add_project", "新建项目"),
        Binding("ctrl+e", "edit_memory", "编辑记忆"),
        Binding("ctrl+l", "launch", "启动 Claude"),
        Binding("q", "quit", "退出"),
    ]

    def __init__(self):
        super().__init__()
        self._projects: list[Project] = []
        self._active: Project | None = None

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="project-bar"):
            yield Button("+ 新建", id="add-btn", variant="success")
        with Vertical(id="context-panel"):
            yield Markdown("_选择一个项目查看记忆_", id="memory-view")
        with Horizontal(id="panel-actions"):
            yield Button("编辑记忆", id="edit-mem-btn", variant="default")
            yield Button("🚀  启动 Claude", id="launch-btn", variant="primary")
        yield Static("无项目", id="status-bar")
        yield Footer()

    def on_mount(self) -> None:
        self._projects = Project.load_all()
        self._rebuild_project_bar()
        if self._projects:
            self._select(self._projects[0])

    # ── Project bar ──────────────────────────────────────────────────────────

    def _rebuild_project_bar(self) -> None:
        bar = self.query_one("#project-bar", Horizontal)
        # Remove old project buttons
        for btn in bar.query(".proj-btn"):
            btn.remove()
        add_btn = bar.query_one("#add-btn")
        for p in self._projects:
            btn = Button(p.name, id=f"proj-{p.id}", classes="proj-btn")
            bar.mount(btn, before=add_btn)

    def _select(self, project: Project) -> None:
        self._active = project
        # Update button styles
        for btn in self.query(".proj-btn"):
            btn.remove_class("active")
        try:
            self.query_one(f"#proj-{project.id}").add_class("active")
        except Exception:
            pass
        # Update memory view
        memory = load_memory(project)
        self.query_one("#memory-view", Markdown).update(memory)
        self.query_one("#status-bar", Static).update(
            f"项目: {project.name}  |  路径: {project.path}"
            + ("  |  有记忆 ✓" if project.has_memory() else "  |  新项目")
        )

    # ── Event handlers ───────────────────────────────────────────────────────

    def on_button_pressed(self, event: Button.Pressed) -> None:
        btn_id = event.button.id or ""

        if btn_id == "add-btn":
            self.action_add_project()
        elif btn_id == "launch-btn":
            self.action_launch()
        elif btn_id == "edit-mem-btn":
            self.action_edit_memory()
        elif btn_id.startswith("proj-"):
            pid = btn_id[5:]
            for p in self._projects:
                if p.id == pid:
                    self._select(p)
                    break

    # ── Actions ──────────────────────────────────────────────────────────────

    def action_add_project(self) -> None:
        def on_result(project: Project | None) -> None:
            if project:
                self._projects.insert(0, project)
                self._rebuild_project_bar()
                self._select(project)
        self.push_screen(AddProjectScreen(), on_result)

    def action_edit_memory(self) -> None:
        if not self._active:
            return
        current = load_memory(self._active)
        def on_result(content: str | None) -> None:
            if content is not None and self._active:
                save_memory(self._active, content)
                self.query_one("#memory-view", Markdown).update(content)
        self.push_screen(EditMemoryScreen(current), on_result)

    def action_launch(self) -> None:
        if not self._active:
            self.notify("请先选择项目", severity="warning")
            return
        if not has_claude_cli():
            self.notify("`claude` CLI 未找到，请先安装 Claude Code", severity="error")
            return
        project = self._active
        project.last_active = datetime.now()
        project.save_meta()
        # Exit TUI and hand off to claude
        self.exit(project)
