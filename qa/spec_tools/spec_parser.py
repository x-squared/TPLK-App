from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


SPEC_BLOCK_RE = re.compile(r"```spec-case\s*(\{.*?\})\s*```", re.DOTALL)


@dataclass(frozen=True)
class SpecCase:
    id: str
    scope: str
    name: str
    method: str
    path: str
    expect_status: int
    expect_json_subset: dict | None
    expect_body_contains: list[str]
    source_file: str


def _normalize_case(payload: dict, source_file: str) -> SpecCase:
    req = payload.get("request") or {}
    expect = payload.get("expect") or {}
    return SpecCase(
        id=str(payload["id"]),
        scope=str(payload["scope"]),
        name=str(payload.get("name", payload["id"])),
        method=str(req.get("method", "GET")).upper(),
        path=str(req.get("path", "/")),
        expect_status=int(expect.get("status", 200)),
        expect_json_subset=expect.get("json_subset"),
        expect_body_contains=[str(item) for item in expect.get("body_contains", [])],
        source_file=source_file,
    )


def parse_spec_file(path: Path) -> list[SpecCase]:
    text = path.read_text(encoding="utf-8")
    out: list[SpecCase] = []
    for match in SPEC_BLOCK_RE.finditer(text):
        payload = json.loads(match.group(1))
        out.append(_normalize_case(payload, str(path)))
    return out


def parse_all_specs(spec_root: Path) -> list[SpecCase]:
    results: list[SpecCase] = []
    for path in sorted(spec_root.rglob("*.md")):
        results.extend(parse_spec_file(path))
    return results
