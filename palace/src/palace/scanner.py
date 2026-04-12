"""Auto-scan filesystem for Claude Code projects."""
from __future__ import annotations

from pathlib import Path

from .models import Project

# Directories to skip when scanning
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".cache", "Library", "Applications",
}

# Markers that indicate a Claude Code project
PROJECT_MARKERS = ["CLAUDE.md", ".git"]


def scan(root: Path | None = None, depth: int = 3) -> list[Project]:
    """Scan for projects under root (default: home dir)."""
    if root is None:
        root = Path.home()

    found: list[Project] = []
    _walk(root, root, depth, found)

    # Deduplicate by path
    seen: set[Path] = set()
    unique: list[Project] = []
    for p in found:
        if p.path not in seen:
            seen.add(p.path)
            unique.append(p)

    unique.sort(key=lambda p: p.name.lower())
    return unique


def _walk(root: Path, current: Path, depth: int, found: list[Project]) -> None:
    if depth < 0:
        return
    try:
        entries = list(current.iterdir())
    except PermissionError:
        return

    for marker in PROJECT_MARKERS:
        if (current / marker).exists() and current != root:
            found.append(Project(name=current.name, path=current))
            return  # Don't recurse further into a found project

    for entry in entries:
        if entry.is_dir() and entry.name not in SKIP_DIRS and not entry.name.startswith("."):
            _walk(root, entry, depth - 1, found)
