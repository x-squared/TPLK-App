from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ConceptualCase:
    id: str
    name: str
    checker: str
    diagram: str | None
    mapping: str | None
    rules: str | None
    source_file: str


_CONCEPTUAL_BLOCK = re.compile(r"```conceptual-case\s*(\{.*?\})\s*```", re.DOTALL)


def _parse_case(payload: dict, source_file: str) -> ConceptualCase:
    missing = [key for key in ("id", "name", "checker") if key not in payload]
    if missing:
        raise ValueError(f"{source_file}: missing required conceptual-case keys: {', '.join(missing)}")
    return ConceptualCase(
        id=str(payload["id"]),
        name=str(payload["name"]),
        checker=str(payload["checker"]),
        diagram=str(payload["diagram"]) if payload.get("diagram") is not None else None,
        mapping=str(payload["mapping"]) if payload.get("mapping") is not None else None,
        rules=str(payload["rules"]) if payload.get("rules") is not None else None,
        source_file=source_file,
    )


def parse_conceptual_cases(spec_root: Path) -> list[ConceptualCase]:
    conceptual_root = spec_root / "testing" / "conceptual"
    if not conceptual_root.exists():
        return []

    cases: list[ConceptualCase] = []
    for file_path in sorted(conceptual_root.glob("*.md")):
        raw = file_path.read_text(encoding="utf-8")
        for match in _CONCEPTUAL_BLOCK.finditer(raw):
            payload = json.loads(match.group(1))
            cases.append(_parse_case(payload, source_file=str(file_path.relative_to(spec_root))))
    return cases
