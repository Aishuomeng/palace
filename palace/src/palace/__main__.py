"""Entry point: `palace` or `python -m palace`."""
from __future__ import annotations

import sys
from .app import PalaceApp
from .runner import launch_claude


def main() -> None:
    app = PalaceApp()
    result = app.run()
    # After TUI exits, if a project was selected → launch claude
    if result is not None:
        launch_claude(result)


if __name__ == "__main__":
    main()
