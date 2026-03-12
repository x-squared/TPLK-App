from __future__ import annotations

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.features.episodes.workflow_service import (
    cancel_episode,
    close_episode,
    initialize_episode_workflow,
    start_listing_phase,
)
from app.models import Code, Episode, Patient


def _seed_episode_codes(db_session: Session) -> dict[str, Code]:
    codes = [
        Code(type="ORGAN", key="LIVER", pos=1, name_default="Liver"),
        Code(type="TPL_PHASE", key="EVALUATION", pos=1, name_default="Evaluation"),
        Code(type="TPL_PHASE", key="LISTING", pos=2, name_default="Listing"),
        Code(type="TPL_PHASE", key="FOLLOW_UP", pos=3, name_default="Follow-Up"),
        Code(type="TPL_STATUS", key="EVALUATION", pos=1, name_default="Evaluation"),
        Code(type="TPL_STATUS", key="TRANSPLANTABLE", pos=2, name_default="Transplantable"),
        Code(type="TPL_STATUS", key="CANCELLED", pos=3, name_default="Cancelled"),
    ]
    db_session.add_all(codes)
    db_session.commit()
    return {f"{code.type}.{code.key}": code for code in codes}


def _create_patient(db_session: Session) -> Patient:
    patient = Patient(
        pid="UT-EP-001",
        first_name="Unit",
        name="Patient",
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def _create_episode(*, db_session: Session, patient_id: int, organ_id: int) -> Episode:
    episode = Episode(
        patient_id=patient_id,
        organ_id=organ_id,
        start=date(2026, 3, 1),
    )
    db_session.add(episode)
    db_session.commit()
    db_session.refresh(episode)
    return episode


def test_initialize_episode_workflow_sets_default_phase_and_status(db_session: Session, user_factory) -> None:
    """A freshly created episode must start in evaluation phase/status."""
    codes = _seed_episode_codes(db_session)
    actor = user_factory(ext_id="WF_INIT")
    patient = _create_patient(db_session)
    episode = _create_episode(db_session=db_session, patient_id=patient.id, organ_id=codes["ORGAN.LIVER"].id)

    initialize_episode_workflow(episode=episode, changed_by_id=actor.id, db=db_session)
    db_session.commit()
    db_session.refresh(episode)

    assert (
        episode.phase_id == codes["TPL_PHASE.EVALUATION"].id
    ), "Workflow init must set episode phase to EVALUATION so later transitions have a deterministic start state."
    assert (
        episode.status_id == codes["TPL_STATUS.EVALUATION"].id
    ), "Workflow init must set episode status to EVALUATION to keep phase/status semantics aligned."
    assert episode.eval_start == episode.start, "Workflow init must default eval_start to episode.start when missing."


def test_start_listing_phase_transitions_to_listing_and_transplantable(db_session: Session, user_factory) -> None:
    """Starting listing moves phase/status and keeps evaluation chronology consistent."""
    codes = _seed_episode_codes(db_session)
    actor = user_factory(ext_id="WF_LISTING")
    patient = _create_patient(db_session)
    episode = _create_episode(db_session=db_session, patient_id=patient.id, organ_id=codes["ORGAN.LIVER"].id)
    initialize_episode_workflow(episode=episode, changed_by_id=actor.id, db=db_session)

    listing_start = date(2026, 3, 5)
    start_listing_phase(episode=episode, start_date=listing_start, changed_by_id=actor.id, db=db_session)
    db_session.commit()
    db_session.refresh(episode)

    assert (
        episode.phase_id == codes["TPL_PHASE.LISTING"].id
    ), "Starting listing must transition the phase to LISTING."
    assert (
        episode.status_id == codes["TPL_STATUS.TRANSPLANTABLE"].id
    ), "Starting listing must set status to TRANSPLANTABLE."
    assert episode.list_start == listing_start, "Listing start date must be persisted exactly as provided."
    assert (
        episode.eval_end == listing_start
    ), "When listing starts, evaluation end should be aligned to the same date if not already set later."


def test_close_episode_requires_follow_up_phase(db_session: Session, user_factory) -> None:
    """Closing is rejected outside follow-up to enforce explicit process order."""
    codes = _seed_episode_codes(db_session)
    actor = user_factory(ext_id="WF_CLOSE")
    patient = _create_patient(db_session)
    episode = _create_episode(db_session=db_session, patient_id=patient.id, organ_id=codes["ORGAN.LIVER"].id)
    initialize_episode_workflow(episode=episode, changed_by_id=actor.id, db=db_session)
    episode.phase_id = codes["TPL_PHASE.LISTING"].id
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        close_episode(
            episode=episode,
            end_date=date(2026, 3, 10),
            changed_by_id=actor.id,
            db=db_session,
        )

    assert exc_info.value.status_code == 422, "Closing outside follow-up must return 422 for actionable client handling."
    assert (
        "follow-up phase" in str(exc_info.value.detail).lower()
    ), "The close error should explain that follow-up phase is required."


def test_cancel_episode_marks_terminal_cancelled_status(db_session: Session, user_factory) -> None:
    """Cancelling an active episode sets terminal fields and cancellation status."""
    codes = _seed_episode_codes(db_session)
    actor = user_factory(ext_id="WF_CANCEL")
    patient = _create_patient(db_session)
    episode = _create_episode(db_session=db_session, patient_id=patient.id, organ_id=codes["ORGAN.LIVER"].id)
    initialize_episode_workflow(episode=episode, changed_by_id=actor.id, db=db_session)

    end_date = date(2026, 3, 9)
    cancel_episode(
        episode=episode,
        end_date=end_date,
        reason="Administrative cancel",
        changed_by_id=actor.id,
        db=db_session,
    )
    db_session.commit()
    db_session.refresh(episode)

    assert episode.closed is True, "Cancelling must set closed=True so the episode is treated as terminal."
    assert episode.end == end_date, "Cancelling must persist the provided end date."
    assert (
        episode.status_id == codes["TPL_STATUS.CANCELLED"].id
    ), "Cancelling must transition status to CANCELLED for downstream filtering/reporting."
    assert (
        episode.comment == "Administrative cancel"
    ), "Cancel reason should be retained in episode comment for auditability."
