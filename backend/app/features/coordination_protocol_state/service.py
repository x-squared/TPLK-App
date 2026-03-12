from __future__ import annotations

from ...enums import ProcurementSlotKey
from ...models import (
    Code,
    Coordination,
    CoordinationEpisode,
    CoordinationProcurementOrganRejection,
    CoordinationProcurementTypedData,
    Episode,
    Patient,
)
from ...schemas import (
    CoordinationProtocolStateOrganResponse,
    CoordinationProtocolStateResponse,
    CoordinationProtocolStateSlotResponse,
)
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

_DUAL_ASSIGNMENT_ORGAN_KEYS = {"KIDNEY", "LUNG"}


def _display_name(patient: Patient | None) -> str:
    if patient is None:
        return ""
    return f"{patient.first_name or ''} {patient.name or ''}".strip()


def _slot_keys_for_organ(organ: Code) -> list[ProcurementSlotKey]:
    organ_key = ((organ.key or "") or "").strip().upper()
    if organ_key in _DUAL_ASSIGNMENT_ORGAN_KEYS:
        return [ProcurementSlotKey.MAIN, ProcurementSlotKey.LEFT, ProcurementSlotKey.RIGHT]
    return [ProcurementSlotKey.MAIN]


def _expected_organ_ids_for_episode(episode: Episode | None) -> list[int]:
    if episode is None:
        return []
    organ_ids = [entry.id for entry in (episode.organs or []) if entry and entry.id is not None]
    if not organ_ids and episode.organ_id is not None:
        organ_ids = [episode.organ_id]
    return organ_ids


def get_coordination_protocol_state(*, coordination_id: int, db: Session) -> CoordinationProtocolStateResponse:
    coordination_exists = db.query(Coordination.id).filter(Coordination.id == coordination_id).first()
    if not coordination_exists:
        raise HTTPException(status_code=404, detail="Coordination not found")

    organs = (
        db.query(Code)
        .filter(Code.type == "ORGAN")
        .order_by(Code.pos.asc(), Code.id.asc())
        .all()
    )
    typed_rows = (
        db.query(CoordinationProcurementTypedData)
        .options(joinedload(CoordinationProcurementTypedData.recipient_episode).joinedload(Episode.patient))
        .filter(CoordinationProcurementTypedData.coordination_id == coordination_id)
        .all()
    )
    typed_rows_by_organ_slot: dict[tuple[int, str], CoordinationProcurementTypedData] = {}
    for row in typed_rows:
        slot_value = row.slot_key.value if hasattr(row.slot_key, "value") else str(row.slot_key)
        typed_rows_by_organ_slot[(row.organ_id, slot_value)] = row

    rejections = (
        db.query(CoordinationProcurementOrganRejection)
        .filter(CoordinationProcurementOrganRejection.coordination_id == coordination_id)
        .all()
    )
    rejection_by_organ_id = {row.organ_id: row for row in rejections}

    coordination_episode_rows = (
        db.query(CoordinationEpisode)
        .options(joinedload(CoordinationEpisode.episode).joinedload(Episode.patient))
        .filter(CoordinationEpisode.coordination_id == coordination_id)
        .order_by(CoordinationEpisode.id.asc())
        .all()
    )
    episode_rows_by_organ: dict[int, list[CoordinationEpisode]] = {}
    seen_episode_ids_by_organ: dict[int, set[int]] = {}
    for row in coordination_episode_rows:
        if row.is_organ_rejected:
            continue
        seen_for_organ = seen_episode_ids_by_organ.setdefault(row.organ_id, set())
        if row.episode_id in seen_for_organ:
            continue
        seen_for_organ.add(row.episode_id)
        episode_rows_by_organ.setdefault(row.organ_id, []).append(row)

    organ_rows: list[CoordinationProtocolStateOrganResponse] = []
    for organ in organs:
        rejection = rejection_by_organ_id.get(organ.id)
        slots = _slot_keys_for_organ(organ)
        slot_responses: list[CoordinationProtocolStateSlotResponse] = []
        fallback_rows = episode_rows_by_organ.get(organ.id, [])
        fallback_queue = [row for row in fallback_rows]
        typed_episode_ids = {
            row.recipient_episode_id
            for row in typed_rows
            if row.organ_id == organ.id and row.recipient_episode_id is not None
        }
        if typed_episode_ids:
            fallback_queue = [
                row
                for row in fallback_queue
                if row.episode_id not in typed_episode_ids
            ]

        for slot_key in slots:
            typed_row = typed_rows_by_organ_slot.get((organ.id, slot_key.value))
            episode = typed_row.recipient_episode if typed_row is not None else None
            if episode is None and fallback_queue:
                episode = fallback_queue.pop(0).episode
            patient = episode.patient if episode is not None else None
            slot_responses.append(
                CoordinationProtocolStateSlotResponse(
                    slot_key=slot_key,
                    episode_id=episode.id if episode is not None else None,
                    expected_organ_ids=_expected_organ_ids_for_episode(episode),
                    patient_id=patient.id if patient is not None else None,
                    recipient_name=_display_name(patient),
                    patient_pid=patient.pid if patient is not None else "",
                    patient_birth_date=patient.date_of_birth if patient is not None else None,
                    episode_fall_nr=(episode.fall_nr or "") if episode is not None else "",
                )
            )

        organ_rows.append(
            CoordinationProtocolStateOrganResponse(
                organ_id=organ.id,
                organ=organ,
                organ_rejected=bool(rejection.is_rejected) if rejection is not None else False,
                organ_rejection_comment=(rejection.rejection_comment or "") if rejection is not None else "",
                slots=slot_responses,
            )
        )

    return CoordinationProtocolStateResponse(
        coordination_id=coordination_id,
        organs=organ_rows,
    )
