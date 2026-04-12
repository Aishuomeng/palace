"""Launch Claude Code in a project directory."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

from .models import Project
from .memory import inject_into_claude_md, remove_from_claude_md


def launch_claude(project: Project) -> None:
    """
    Inject memory into CLAUDE.md, then exec `claude` in project dir.
    This replaces the current process — returns only when claude exits.
    """
    inject_into_claude_md(project)

    try:
        subprocess.run(
            ["claude"],
            cwd=str(project.path),
            env={**os.environ, "PALACE_PROJECT": project.id},
        )
    finally:
        remove_from_claude_md(project)


def has_claude_cli() -> bool:
    """Check if the `claude` CLI is available."""
    import shutil
    return shutil.which("claude") is not None
