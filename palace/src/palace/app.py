"""
Claude Code 记忆宫殿 — pixel/retro AI terminal aesthetic.

Layout:
  ┌─ header ──────────────────────────────────────────┐
  │ PALACE v0.1          [proj1] [proj2] [+ NEW]       │
  ├─ info panel ──────────────────────────────────────┤
  │  PROJECT: btc-trader   /Users/sea-file/btc-trader  │
  │  ┌──────────────────────────────────────────────┐  │
  │  │ SERVER    54.227.17.224           [✎] [✕]   │  │
  │  │ API_KEY   fdc36156-c616...        [✎] [✕]   │  │
  │  │ STATUS    停止中，待修复           [✎] [✕]   │  │
  │  └──────────────────────────────────────────────┘  │
  │  [+ ADD FIELD]                          [SAVE]      │
  ├─ terminal panel ──────────────────────────────────┤
  │  > last session  2026-04-12 01:40                  │
  │  > 对话记录: 已读取 memory.md                      │
  │                                                    │
  │  [▶  LAUNCH CLAUDE]                               │
  └───────────────────────────────────────────────────┘
"""
from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.screen import ModalScreen
from textual.widgets import (
    Button, Footer, Header, Input, Label, ListItem,
    ListView, Log, Static, TextArea,
)

from rich.text import Text

from .models import Project
from .memory import load_memory, save_memory, inject_into_claude_md, remove_from_claude_md
from .runner import has_claude_cli
from .scanner import scan


# ── Palette ───────────────────────────────────────────────────────────────────

PALETTE = """
$bg:        #0a0e1a;
$panel:     #0f1629;
$border:    #1e3a5f;
$cyan:      #00d4ff;
$purple:    #7c3aed;
$green:     #00ff9f;
$yellow:    #ffd166;
$red:       #ff4d6d;
$muted:     #4a5568;
$text:      #ccd6f6;
$text-dim:  #8892b0;
"""


# ── Add Project Modal ─────────────────────────────────────────────────────────

class AddProjectScreen(ModalScreen[Project | None]):
    DEFAULT_CSS = """
    AddProjectScreen { align: center middle; }
    #dlg {
        width: 72; height: auto; max-height: 36;
        border: double #00d4ff;
        background: #0f1629;
        padding: 1 2;
    }
    #dlg Label { color: #00d4ff; margin-bottom: 0; }
    #dlg Input { margin-bottom: 1; border: solid #1e3a5f; }
    #scan { height: 10; border: solid #1e3a5f; margin: 1 0; }
    #dlg-btns { margin-top: 1; }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="dlg"):
            yield Label("┌─ ADD PROJECT ──────────────────────┐")
            yield Label("NAME")
            yield Input(placeholder="my-project", id="name")
            yield Label("PATH")
            yield Input(placeholder="/path/to/project", id="path")
            yield Label("── OR PICK FROM SCAN ───────────────")
            yield ListView(id="scan")
            with Horizontal(id="dlg-btns"):
                yield Button("[ CONFIRM ]", variant="primary", id="ok")
                yield Button("[ CANCEL ]", id="cancel")

    def on_mount(self) -> None:
        found = scan(depth=2)
        lv = self.query_one("#scan", ListView)
        for p in found[:25]:
            lv.append(ListItem(Label(f" {p.name:<20} {p.path}")))
        self._found = found[:25]

    def on_list_view_selected(self, e: ListView.Selected) -> None:
        idx = e.list_view.index
        if idx is not None and idx < len(self._found):
            p = self._found[idx]
            self.query_one("#name", Input).value = p.name
            self.query_one("#path", Input).value = str(p.path)

    def on_button_pressed(self, e: Button.Pressed) -> None:
        if e.button.id == "cancel":
            self.dismiss(None)
            return
        name = self.query_one("#name", Input).value.strip()
        path_s = self.query_one("#path", Input).value.strip()
        if not name or not path_s:
            return
        p = Project(name=name, path=Path(path_s).expanduser(), last_active=datetime.now())
        p.save_meta()
        self.dismiss(p)


# ── Field Row Widget ──────────────────────────────────────────────────────────

class FieldRow(Horizontal):
    """One editable key-value row."""

    DEFAULT_CSS = """
    FieldRow {
        height: 3;
        margin-bottom: 0;
        border: solid #1e3a5f;
        background: #0a0e1a;
        padding: 0 1;
    }
    FieldRow:hover { border: solid #00d4ff; }
    FieldRow #fkey {
        width: 18;
        color: #00ff9f;
        border: none;
        background: transparent;
    }
    FieldRow #sep { width: 3; color: #4a5568; content-align: center middle; }
    FieldRow #fval {
        width: 1fr;
        color: #ccd6f6;
        border: none;
        background: transparent;
    }
    FieldRow #del-btn {
        width: 5; min-width: 5;
        color: #ff4d6d;
        background: transparent;
        border: none;
        margin-left: 1;
    }
    """

    def __init__(self, key: str, value: str, **kwargs):
        super().__init__(**kwargs)
        self._key = key
        self._value = value

    def compose(self) -> ComposeResult:
        yield Input(value=self._key, id="fkey", placeholder="KEY")
        yield Static("  │", id="sep")
        yield Input(value=self._value, id="fval", placeholder="value...")
        yield Button("✕", id="del-btn")

    def get_kv(self) -> tuple[str, str]:
        return (
            self.query_one("#fkey", Input).value.strip(),
            self.query_one("#fval", Input).value.strip(),
        )

    def on_button_pressed(self, e: Button.Pressed) -> None:
        if e.button.id == "del-btn":
            self.remove()


# ── Main App ──────────────────────────────────────────────────────────────────

class PalaceApp(App):

    TITLE = ""
    CSS = f"""
    {PALETTE}

    Screen {{
        background: $bg;
        layout: vertical;
    }}

    /* ── top bar ── */
    #topbar {{
        height: 3;
        background: $panel;
        border-bottom: solid $border;
        layout: horizontal;
        padding: 0 1;
        align: left middle;
    }}
    #app-title {{
        width: auto;
        color: $cyan;
        text-style: bold;
        margin-right: 2;
    }}
    .proj-tab {{
        height: 3; min-width: 12; max-width: 20;
        background: $bg;
        color: $text-dim;
        border: none;
        margin-right: 1;
        text-style: none;
    }}
    .proj-tab.active {{
        background: $border;
        color: $cyan;
        text-style: bold;
    }}
    #new-proj-btn {{
        height: 3; min-width: 8;
        background: $bg;
        color: $green;
        border: none;
    }}

    /* ── info panel ── */
    #info-panel {{
        height: auto;
        max-height: 22;
        background: $panel;
        border-bottom: solid $border;
        padding: 0 2;
    }}
    #proj-header {{
        height: 2;
        color: $cyan;
        text-style: bold;
        padding-top: 1;
    }}
    #fields-scroll {{
        height: auto;
        max-height: 13;
        margin: 0;
    }}
    #field-actions {{
        height: 3;
        layout: horizontal;
        align: right middle;
        padding: 0 0 1 0;
    }}
    #add-field-btn {{
        min-width: 14; height: 3;
        background: $bg;
        color: $yellow;
        border: solid $border;
        margin-right: 1;
    }}
    #save-btn {{
        min-width: 10; height: 3;
        background: $purple;
        color: white;
        border: solid $purple;
    }}

    /* ── memory panel ── */
    #mem-panel {{
        height: 1fr;
        background: $bg;
        border-bottom: solid $border;
        padding: 0 2;
    }}
    #mem-label {{
        height: 2;
        color: $muted;
        padding-top: 1;
    }}
    #mem-area {{
        height: 1fr;
        border: solid $border;
        background: $panel;
        color: $text;
    }}
    #mem-area:focus {{ border: solid $cyan; }}

    /* ── terminal panel ── */
    #term-panel {{
        height: 10;
        background: $bg;
        padding: 0 2;
        layout: vertical;
    }}
    #term-label {{
        height: 2;
        color: $muted;
        padding-top: 1;
    }}
    #term-log {{
        height: 1fr;
        background: $panel;
        border: solid $border;
        color: $green;
        scrollbar-color: $border;
    }}
    #launch-btn {{
        height: 3;
        margin-top: 1;
        background: $cyan;
        color: $bg;
        text-style: bold;
        border: none;
        width: 1fr;
    }}
    #launch-btn:hover {{ background: $green; }}
    #launch-btn:disabled {{ background: $muted; color: $bg; }}
    """

    BINDINGS = [
        Binding("ctrl+n", "add_project", "New Project"),
        Binding("ctrl+s", "save_fields", "Save"),
        Binding("ctrl+l", "launch", "Launch Claude"),
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def __init__(self):
        super().__init__()
        self._projects: list[Project] = []
        self._active: Project | None = None

    # ── compose ──────────────────────────────────────────────────────────────

    def compose(self) -> ComposeResult:
        # Top bar
        with Horizontal(id="topbar"):
            yield Static("▌PALACE v0.1 ▐", id="app-title")
            yield Button("＋ NEW", id="new-proj-btn")

        # Info panel
        with Container(id="info-panel"):
            yield Static("", id="proj-header")
            with ScrollableContainer(id="fields-scroll"):
                pass  # FieldRows mounted dynamically
            with Horizontal(id="field-actions"):
                yield Button("＋ ADD FIELD", id="add-field-btn")
                yield Button("SAVE ▸", id="save-btn")

        # Memory panel
        with Container(id="mem-panel"):
            yield Static("── MEMORY (Claude reads this) ─────────────────", id="mem-label")
            yield TextArea("", id="mem-area", language=None)

        # Terminal panel
        with Container(id="term-panel"):
            yield Static("── TERMINAL ────────────────────────────────────", id="term-label")
            yield Log(id="term-log", auto_scroll=True)
            yield Button("▶  LAUNCH CLAUDE IN THIS PROJECT", id="launch-btn", disabled=True)

        yield Footer()

    # ── mount ─────────────────────────────────────────────────────────────────

    def on_mount(self) -> None:
        self._projects = Project.load_all()
        self._rebuild_tabs()
        if self._projects:
            self._select(self._projects[0])
        log = self.query_one("#term-log", Log)
        log.write_line("┌─────────────────────────────────────────┐")
        log.write_line("│  PALACE — Claude Code 记忆宫殿          │")
        log.write_line("│  select a project, then press CTRL+L    │")
        log.write_line("└─────────────────────────────────────────┘")

    # ── project tabs ──────────────────────────────────────────────────────────

    def _rebuild_tabs(self) -> None:
        topbar = self.query_one("#topbar", Horizontal)
        for b in topbar.query(".proj-tab"):
            b.remove()
        new_btn = topbar.query_one("#new-proj-btn")
        for p in self._projects:
            label = p.name[:14] + "…" if len(p.name) > 14 else p.name
            btn = Button(label, id=f"tab-{p.id}", classes="proj-tab")
            topbar.mount(btn, before=new_btn)

    def _select(self, project: Project) -> None:
        self._active = project

        # Tab highlight
        for b in self.query(".proj-tab"):
            b.remove_class("active")
        try:
            self.query_one(f"#tab-{project.id}").add_class("active")
        except Exception:
            pass

        # Header
        path_str = str(project.path)
        if len(path_str) > 48:
            path_str = "…" + path_str[-47:]
        self.query_one("#proj-header", Static).update(
            Text(f"PROJECT ▸ {project.name}   [{path_str}]")
        )

        # Fields
        scroll = self.query_one("#fields-scroll", ScrollableContainer)
        for row in scroll.query(FieldRow):
            row.remove()
        if project.fields:
            for k, v in project.fields.items():
                scroll.mount(FieldRow(k, v))
        else:
            scroll.mount(FieldRow("", ""))

        # Memory
        mem = load_memory(project)
        self.query_one("#mem-area", TextArea).load_text(mem)

        # Launch button
        self.query_one("#launch-btn", Button).disabled = not has_claude_cli()

        # Log
        log = self.query_one("#term-log", Log)
        last = project.last_active.strftime("%Y-%m-%d %H:%M") if project.last_active else "never"
        log.write_line(f"  ▸ switched to [{project.name}]  last active: {last}")
        if project.has_memory():
            log.write_line("  ▸ memory.md found — Claude will read it on launch")
        else:
            log.write_line("  ▸ no memory yet — add fields and notes above")

    # ── events ───────────────────────────────────────────────────────────────

    def on_button_pressed(self, e: Button.Pressed) -> None:
        bid = e.button.id or ""
        if bid.startswith("tab-"):
            pid = bid[4:]
            for p in self._projects:
                if p.id == pid:
                    self._select(p)
                    return
        elif bid == "new-proj-btn":
            self.action_add_project()
        elif bid == "add-field-btn":
            self.action_add_field()
        elif bid == "save-btn":
            self.action_save_fields()
        elif bid == "launch-btn":
            self.action_launch()

    # ── actions ──────────────────────────────────────────────────────────────

    def action_add_project(self) -> None:
        def on_result(p: Project | None) -> None:
            if p:
                self._projects.insert(0, p)
                self._rebuild_tabs()
                self._select(p)
        self.push_screen(AddProjectScreen(), on_result)

    def action_add_field(self) -> None:
        scroll = self.query_one("#fields-scroll", ScrollableContainer)
        scroll.mount(FieldRow("", ""))
        scroll.scroll_end()

    def action_save_fields(self) -> None:
        if not self._active:
            return
        fields: dict[str, str] = {}
        for row in self.query_one("#fields-scroll").query(FieldRow):
            k, v = row.get_kv()
            if k:
                fields[k] = v
        self._active.fields = fields
        # Save memory from TextArea
        mem_content = self.query_one("#mem-area", TextArea).text
        save_memory(self._active, mem_content)
        self._active.save_meta()
        log = self.query_one("#term-log", Log)
        log.write_line(f"  ▸ saved {len(fields)} fields + memory for [{self._active.name}]")
        self.notify("Saved ✓", severity="information", timeout=2)

    def action_launch(self) -> None:
        if not self._active:
            self.notify("No project selected", severity="warning")
            return
        # Save first
        self.action_save_fields()
        project = self._active
        project.last_active = datetime.now()
        project.save_meta()
        inject_into_claude_md(project)
        log = self.query_one("#term-log", Log)
        log.write_line(f"  ▸ injecting memory into CLAUDE.md …")
        log.write_line(f"  > launching claude in {project.path}")
        log.write_line("  ▸ TUI will resume when you exit claude")

        with self.suspend():
            subprocess.run(["claude"], cwd=str(project.path))

        remove_from_claude_md(project)
        log.write_line("  ▸ back in palace — session ended")
        log.write_line(f"  ▸ {datetime.now().strftime('%Y-%m-%d %H:%M')}")
