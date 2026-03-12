from __future__ import annotations

from .coordination import build_coordination_source
from .coordination_procurement import build_coordination_procurement_source
from .episode import build_episode_source
from .medical_value import build_medical_value_source
from .patient import build_patient_source
from ..types import SourceDef


def build_sources() -> dict[str, SourceDef]:
    sources = (
        build_patient_source(),
        build_episode_source(),
        build_medical_value_source(),
        build_coordination_source(),
        build_coordination_procurement_source(),
    )
    return {source.key: source for source in sources}
