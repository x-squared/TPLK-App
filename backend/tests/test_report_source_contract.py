from __future__ import annotations

from typing import get_args

from app.features.reports.engine import build_metadata_response
from app.features.reports.sources.episode import build_episode_source
from app.features.reports.sources import build_sources
from app.schema.report import ReportSourceKey


def test_report_source_registry_matches_schema_literal() -> None:
    """Report source registry keys must stay in sync with ReportSourceKey literals."""
    sources = build_sources()
    source_keys = set(sources.keys())
    literal_keys = set(get_args(ReportSourceKey))

    assert source_keys == literal_keys, (
        "Report source registry keys must exactly match app.schema.report.ReportSourceKey. "
        "Update backend/frontend source key unions and metadata contracts in the same change set."
    )


def test_report_metadata_builds_for_all_registered_sources() -> None:
    """Metadata builder should render all registered sources without schema validation errors."""
    sources = build_sources()
    metadata = build_metadata_response(sources)
    metadata_keys = {source.key for source in metadata.sources}

    assert metadata_keys == set(sources.keys()), (
        "Report metadata response must include every registered report source key."
    )


def test_episode_source_exposes_patient_responsible_coordinator_join() -> None:
    """Episode report source should provide a direct join for patient responsible coordinator fields."""
    source = build_episode_source()
    joins_by_key = {join.key: join for join in source.joins}
    coordinator_join = joins_by_key.get("PATIENT_RESP_COORD")

    assert coordinator_join is not None, (
        "EPISODE report source should expose PATIENT_RESP_COORD join for patient coordinator reporting."
    )
    assert {field.key for field in coordinator_join.fields} == {
        "patient_resp_coord_name",
        "patient_resp_coord_ext_id",
        "patient_resp_coord_role",
    }, (
        "PATIENT_RESP_COORD join should expose stable coordinator name, ext ID, and role fields."
    )
