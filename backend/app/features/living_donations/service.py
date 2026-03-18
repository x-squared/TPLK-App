from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from ...models import Code, Episode, LivingDonationDonor, LivingDonationEpisode, LivingDonationEpisodeOrgan, Patient
from ...schemas import (
    LivingDonationDonorCreate,
    LivingDonationDonorUpdate,
    LivingDonationEpisodeCreate,
    LivingDonationEpisodeUpdate,
)

ALLOWED_DONATION_ORGAN_KEYS = {"KIDNEY", "LIVER"}
DONOR_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "REGISTERED": {"IN_EVALUATION", "DEFERRED", "REJECTED"},
    "IN_EVALUATION": {"ACTIVE", "DEFERRED", "REJECTED"},
    "ACTIVE": {"TRANSPLANTED"},
    "DEFERRED": {"IN_EVALUATION", "ACTIVE"},
    "TRANSPLANTED": {"CLOSED"},
    "REJECTED": {"CLOSED"},
    "CLOSED": set(),
}


def _living_donation_query(db: Session):
    return (
        db.query(LivingDonationEpisode)
        .options(
            joinedload(LivingDonationEpisode.recipient_episode).joinedload(Episode.patient),
            selectinload(LivingDonationEpisode.organs),
            selectinload(LivingDonationEpisode.donors).joinedload(LivingDonationDonor.donor_patient),
            selectinload(LivingDonationEpisode.donors).joinedload(LivingDonationDonor.relation),
            selectinload(LivingDonationEpisode.donors).joinedload(LivingDonationDonor.status),
        )
        .order_by(LivingDonationEpisode.id.desc())
    )


def _validated_recipient_episode_id(*, db: Session, recipient_episode_id: int | None) -> int | None:
    if recipient_episode_id is None:
        return None
    exists = db.query(Episode.id).filter(Episode.id == recipient_episode_id).first()
    if not exists:
        raise HTTPException(status_code=422, detail="Recipient episode not found")
    return recipient_episode_id


def _validated_living_donation_organ_ids(db: Session, organ_ids: list[int] | None) -> list[int]:
    if not organ_ids:
        return []
    unique_ids = list(dict.fromkeys(organ_ids))
    rows = (
        db.query(Code.id, Code.key)
        .filter(Code.type == "ORGAN", Code.id.in_(unique_ids))
        .all()
    )
    code_by_id = {row[0]: row[1] for row in rows}
    missing = [organ_id for organ_id in unique_ids if organ_id not in code_by_id]
    if missing:
        raise HTTPException(status_code=422, detail=f"Unknown organ ids: {missing}")
    invalid = [organ_id for organ_id in unique_ids if code_by_id.get(organ_id) not in ALLOWED_DONATION_ORGAN_KEYS]
    if invalid:
        raise HTTPException(status_code=422, detail="Only kidney and liver are allowed for living donation")
    return unique_ids


def _replace_living_donation_organs(*, db: Session, episode: LivingDonationEpisode, organ_ids: list[int]) -> None:
    requested_ids = list(dict.fromkeys(organ_ids))
    links_by_organ_id = {link.organ_id: link for link in episode.organ_links}
    now = date.today()

    for organ_id in requested_ids:
        link = links_by_organ_id.get(organ_id)
        if link:
            link.is_active = True
            link.date_inactivated = None
        else:
            db.add(
                LivingDonationEpisodeOrgan(
                    living_donation_episode_id=episode.id,
                    organ_id=organ_id,
                    is_active=True,
                    date_inactivated=None,
                )
            )

    for link in episode.organ_links:
        if link.organ_id in requested_ids:
            continue
        if link.is_active:
            link.is_active = False
            link.date_inactivated = now


def _validated_code_id(*, db: Session, code_id: int, expected_type: str, field_name: str) -> Code:
    code = db.query(Code).filter(Code.id == code_id, Code.type == expected_type).first()
    if not code:
        raise HTTPException(status_code=422, detail=f"{field_name} is invalid")
    return code


def _registered_status_code(db: Session) -> Code:
    code = (
        db.query(Code)
        .filter(Code.type == "LTPL_DONOR_STATUS", Code.key == "REGISTERED")
        .first()
    )
    if not code:
        raise HTTPException(
            status_code=500,
            detail="Missing required code LTPL_DONOR_STATUS.REGISTERED",
        )
    return code


def list_living_donations(*, db: Session) -> list[LivingDonationEpisode]:
    return _living_donation_query(db).all()


def list_recipient_episode_options(*, db: Session) -> list[Episode]:
    return (
        db.query(Episode)
        .options(joinedload(Episode.patient))
        .order_by(Episode.id.desc())
        .all()
    )


def get_living_donation_or_404(*, living_donation_id: int, db: Session) -> LivingDonationEpisode:
    episode = _living_donation_query(db).filter(LivingDonationEpisode.id == living_donation_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Living donation process not found")
    return episode


def create_living_donation(
    *,
    payload: LivingDonationEpisodeCreate,
    changed_by_id: int,
    db: Session,
) -> LivingDonationEpisode:
    recipient_episode_id = _validated_recipient_episode_id(db=db, recipient_episode_id=payload.recipient_episode_id)
    organ_ids = _validated_living_donation_organ_ids(db, payload.organ_ids)
    row = LivingDonationEpisode(
        recipient_episode_id=recipient_episode_id,
        start=payload.start,
        end=payload.end,
        comment=payload.comment,
        changed_by_id=changed_by_id,
    )
    db.add(row)
    db.flush()
    _replace_living_donation_organs(db=db, episode=row, organ_ids=organ_ids)
    db.commit()
    return get_living_donation_or_404(living_donation_id=row.id, db=db)


def update_living_donation(
    *,
    living_donation_id: int,
    payload: LivingDonationEpisodeUpdate,
    changed_by_id: int,
    db: Session,
) -> LivingDonationEpisode:
    row = (
        db.query(LivingDonationEpisode)
        .options(selectinload(LivingDonationEpisode.organ_links))
        .filter(LivingDonationEpisode.id == living_donation_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Living donation process not found")

    if "end" in payload.model_fields_set and payload.end != row.end:
        raise HTTPException(status_code=422, detail="End date can only be changed via close endpoint")

    if "recipient_episode_id" in payload.model_fields_set:
        row.recipient_episode_id = _validated_recipient_episode_id(db=db, recipient_episode_id=payload.recipient_episode_id)
    if "start" in payload.model_fields_set:
        row.start = payload.start
    if payload.comment is not None:
        row.comment = payload.comment
    if payload.organ_ids is not None:
        organ_ids = _validated_living_donation_organ_ids(db, payload.organ_ids)
        _replace_living_donation_organs(db=db, episode=row, organ_ids=organ_ids)

    row.changed_by_id = changed_by_id
    db.commit()
    return get_living_donation_or_404(living_donation_id=living_donation_id, db=db)


def close_living_donation(
    *,
    living_donation_id: int,
    end_date: date,
    changed_by_id: int,
    db: Session,
) -> LivingDonationEpisode:
    row = db.query(LivingDonationEpisode).filter(LivingDonationEpisode.id == living_donation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Living donation process not found")
    row.end = end_date
    row.changed_by_id = changed_by_id
    db.commit()
    return get_living_donation_or_404(living_donation_id=living_donation_id, db=db)


def add_living_donation_donor(
    *,
    living_donation_id: int,
    payload: LivingDonationDonorCreate,
    changed_by_id: int,
    db: Session,
) -> LivingDonationDonor:
    episode = db.query(LivingDonationEpisode).filter(LivingDonationEpisode.id == living_donation_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Living donation process not found")
    donor = db.query(Patient.id).filter(Patient.id == payload.donor_patient_id).first()
    if not donor:
        raise HTTPException(status_code=422, detail="Donor patient not found")

    relation_id = None
    if payload.relation_id is not None:
        _validated_code_id(
            db=db,
            code_id=payload.relation_id,
            expected_type="LTPL_DONOR_RELATION",
            field_name="relation_id",
        )
        relation_id = payload.relation_id

    if payload.status_id is not None:
        status = _validated_code_id(
            db=db,
            code_id=payload.status_id,
            expected_type="LTPL_DONOR_STATUS",
            field_name="status_id",
        )
        if (status.key or "").upper() != "REGISTERED":
            raise HTTPException(status_code=422, detail="Initial donor status must be REGISTERED")
        status_id = status.id
    else:
        status_id = _registered_status_code(db).id

    row = LivingDonationDonor(
        living_donation_episode_id=living_donation_id,
        donor_patient_id=payload.donor_patient_id,
        relation_id=relation_id,
        status_id=status_id,
        comment=payload.comment,
        changed_by_id=changed_by_id,
    )
    db.add(row)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        if "EPISODE_LTPL_ID" in str(exc) and "DONOR_PATIENT_ID" in str(exc):
            raise HTTPException(status_code=409, detail="Donor is already linked to this process") from exc
        raise
    return (
        db.query(LivingDonationDonor)
        .options(
            joinedload(LivingDonationDonor.donor_patient),
            joinedload(LivingDonationDonor.relation),
            joinedload(LivingDonationDonor.status),
        )
        .filter(LivingDonationDonor.id == row.id)
        .first()
    )


def update_living_donation_donor(
    *,
    living_donation_id: int,
    donor_id: int,
    payload: LivingDonationDonorUpdate,
    changed_by_id: int,
    db: Session,
) -> LivingDonationDonor:
    row = (
        db.query(LivingDonationDonor)
        .options(joinedload(LivingDonationDonor.status))
        .filter(
            LivingDonationDonor.id == donor_id,
            LivingDonationDonor.living_donation_episode_id == living_donation_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Living donation donor not found")

    if "relation_id" in payload.model_fields_set:
        if payload.relation_id is None:
            row.relation_id = None
        else:
            _validated_code_id(
                db=db,
                code_id=payload.relation_id,
                expected_type="LTPL_DONOR_RELATION",
                field_name="relation_id",
            )
            row.relation_id = payload.relation_id

    if "status_id" in payload.model_fields_set and payload.status_id is not None and payload.status_id != row.status_id:
        next_status = _validated_code_id(
            db=db,
            code_id=payload.status_id,
            expected_type="LTPL_DONOR_STATUS",
            field_name="status_id",
        )
        current_key = (row.status.key or "").upper() if row.status else ""
        next_key = (next_status.key or "").upper()
        allowed = DONOR_STATUS_TRANSITIONS.get(current_key, set())
        if next_key not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid donor status transition from {current_key or 'UNKNOWN'} to {next_key}",
            )
        row.status_id = next_status.id

    if "comment" in payload.model_fields_set and payload.comment is not None:
        row.comment = payload.comment

    row.changed_by_id = changed_by_id
    db.commit()
    return (
        db.query(LivingDonationDonor)
        .options(
            joinedload(LivingDonationDonor.donor_patient),
            joinedload(LivingDonationDonor.relation),
            joinedload(LivingDonationDonor.status),
        )
        .filter(LivingDonationDonor.id == donor_id)
        .first()
    )
