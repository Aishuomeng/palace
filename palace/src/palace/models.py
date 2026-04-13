"""Data models for Palace projects and memories."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

PALACE_DIR = Path.home() / ".palace"
PALACE_START = "<!-- PALACE:START -->"
PALACE_END = "<!-- PALACE:END -->"


@dataclass
class Project:
    name: str
    path: Path
    last_active: datetime | None = None
    description: str = ""
    fields: dict[str, str] = field(default_factory=dict)

    @property
    def id(self) -> str:
        return re.sub(r"[^a-z0-9_-]", "-", self.name.lower())

    @property
    def memory_path(self) -> Path:
        return PALACE_DIR / self.id / "memory.md"

    @property
    def meta_path(self) -> Path:
        return PALACE_DIR / self.id / "meta.json"

    @property
    def claude_md_path(self) -> Path:
        return self.path / "CLAUDE.md"

    def has_memory(self) -> bool:
        return self.memory_path.exists() and self.memory_path.stat().st_size > 0

    def save_meta(self) -> None:
        self.meta_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "name": self.name,
            "path": str(self.path),
            "last_active": self.last_active.isoformat() if self.last_active else None,
            "description": self.description,
            "fields": self.fields,
        }
        self.meta_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    @classmethod
    def load_all(cls) -> list[Project]:
        projects = []
        if not PALACE_DIR.exists():
            return projects
        for meta in PALACE_DIR.glob("*/meta.json"):
            try:
                data = json.loads(meta.read_text())
                p = cls(
                    name=data["name"],
                    path=Path(data["path"]),
                    last_active=datetime.fromisoformat(data["last_active"]) if data.get("last_active") else None,
                    description=data.get("description", ""),
                    fields=data.get("fields", {}),
                )
                projects.append(p)
            except Exception:
                continue
        projects.sort(key=lambda p: p.last_active or datetime.min, reverse=True)
        return projects
