from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIAGRAM = PROJECT_ROOT / "spec" / "domain" / "gen-domain.puml"
DEFAULT_MAPPING = PROJECT_ROOT / "spec" / "domain" / "domain-sync-mapping.json"
BACKEND_ROOT = PROJECT_ROOT / "backend"


CLASS_PATTERN = re.compile(r"^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*$")
EDGE_PATTERN = re.compile(
    r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\"[^\"]*\")?\s*(<--|-->|--)\s*(?:\"[^\"]*\")?\s*([A-Za-z_][A-Za-z0-9_]*)"
)


@dataclass(frozen=True)
class ParsedDiagram:
    classes: set[str]
    edges: set[tuple[str, str]]


@dataclass(frozen=True)
class ModelGraph:
    classes: set[str]
    edges: set[tuple[str, str]]


def _normalize_edge(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a <= b else (b, a)


def _load_mapping(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload.setdefault("entity_aliases", {})
    payload.setdefault("ignored_conceptual_edges", [])
    payload.setdefault("tracked_model_entities", [])
    return payload


def _parse_diagram(path: Path) -> ParsedDiagram:
    classes: set[str] = set()
    edges: set[tuple[str, str]] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("'"):
            continue
        class_match = CLASS_PATTERN.match(line)
        if class_match:
            classes.add(class_match.group(1))
            continue
        edge_match = EDGE_PATTERN.match(line)
        if edge_match:
            left = edge_match.group(1)
            right = edge_match.group(3)
            edges.add(_normalize_edge(left, right))
    return ParsedDiagram(classes=classes, edges=edges)


def _build_model_graph() -> ModelGraph:
    if str(BACKEND_ROOT) not in sys.path:
        sys.path.insert(0, str(BACKEND_ROOT))

    from app.database import Base  # pylint: disable=import-error
    from app import models as _models  # pylint: disable=import-error,unused-import

    classes: set[str] = set()
    edges: set[tuple[str, str]] = set()

    for mapper in Base.registry.mappers:
        source = mapper.class_.__name__
        classes.add(source)
        for relation in mapper.relationships:
            if relation.key.startswith("changed_by"):
                continue
            target = relation.mapper.class_.__name__
            edges.add(_normalize_edge(source, target))
    return ModelGraph(classes=classes, edges=edges)


def _map_conceptual_entity(entity: str, aliases: dict[str, str]) -> str:
    return aliases.get(entity, entity)


def _ignored_conceptual_edge(
    edge: tuple[str, str],
    ignored: list[list[str]],
) -> bool:
    ignored_set = {
        _normalize_edge(item[0], item[1])
        for item in ignored
        if isinstance(item, list) and len(item) == 2
    }
    return edge in ignored_set


def run_check(diagram_path: Path, mapping_path: Path) -> int:
    mapping = _load_mapping(mapping_path)
    aliases: dict[str, str] = mapping["entity_aliases"]
    ignored_edges: list[list[str]] = mapping["ignored_conceptual_edges"]
    tracked_model_entities: list[str] = mapping["tracked_model_entities"]

    parsed = _parse_diagram(diagram_path)
    model = _build_model_graph()

    errors: list[str] = []
    warnings: list[str] = []

    conceptual_to_model: dict[str, str] = {}
    for conceptual_entity in sorted(parsed.classes):
        model_entity = _map_conceptual_entity(conceptual_entity, aliases)
        conceptual_to_model[conceptual_entity] = model_entity
        if model_entity not in model.classes:
            errors.append(
                f"Missing model entity for conceptual class `{conceptual_entity}` -> `{model_entity}`."
            )

    for left, right in sorted(parsed.edges):
        if _ignored_conceptual_edge((left, right), ignored_edges):
            continue
        left_model = conceptual_to_model.get(left, _map_conceptual_entity(left, aliases))
        right_model = conceptual_to_model.get(right, _map_conceptual_entity(right, aliases))
        if _normalize_edge(left_model, right_model) not in model.edges:
            errors.append(
                "Missing model edge for conceptual relation "
                f"`{left} -- {right}` (mapped to `{left_model} -- {right_model}`)."
            )

    conceptual_mapped_entities = set(conceptual_to_model.values())
    for tracked in tracked_model_entities:
        if tracked not in model.classes:
            errors.append(f"Tracked model entity `{tracked}` not found in SQLAlchemy model registry.")
        elif tracked not in conceptual_mapped_entities:
            warnings.append(
                f"Tracked model entity `{tracked}` is not represented by any conceptual class."
            )

    if errors:
        print("Domain spec sync check FAILED")
        for item in errors:
            print(f"- ERROR: {item}")
        for item in warnings:
            print(f"- WARN: {item}")
        return 1

    print("Domain spec sync check PASSED")
    print(f"- Conceptual classes: {len(parsed.classes)}")
    print(f"- Conceptual relations checked: {len(parsed.edges)}")
    print(f"- Model classes discovered: {len(model.classes)}")
    print(f"- Model relations discovered: {len(model.edges)}")
    if warnings:
        for item in warnings:
            print(f"- WARN: {item}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Check conceptual domain spec against SQLAlchemy model graph.")
    parser.add_argument(
        "--diagram",
        type=Path,
        default=DEFAULT_DIAGRAM,
        help="Path to conceptual PlantUML diagram (default: spec/domain/gen-domain.puml).",
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=DEFAULT_MAPPING,
        help="Path to JSON mapping config (default: spec/domain/domain-sync-mapping.json).",
    )
    args = parser.parse_args()
    return run_check(diagram_path=args.diagram, mapping_path=args.mapping)


if __name__ == "__main__":
    raise SystemExit(main())
