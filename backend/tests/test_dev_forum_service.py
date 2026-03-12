from __future__ import annotations

import pytest
from fastapi import HTTPException

import app.features.dev_forum.service as dev_forum_service
from app.features.dev_forum.service import (
    accept_review,
    claim_request,
    create_capture_request,
    create_capture_request_any_mode,
    decide_request,
    list_development_requests,
    list_review_requests,
    reject_review_and_create_follow_up,
)
from app.models import Code, DevRequest, Person, User
from app.schemas import DevRequestCaptureCreate, DevRequestDecisionUpdate


def _create_role(db_session, *, key: str, pos: int) -> Code:
    role = Code(type="ROLE", key=key, pos=pos, name_default=key)
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


def _create_user(db_session, *, ext_id: str, role: Code) -> User:
    person = Person(first_name=ext_id, surname="User")
    db_session.add(person)
    db_session.flush()
    user = User(
        ext_id=ext_id,
        name=f"{ext_id} User",
        person_id=person.id,
        role_id=role.id,
        roles=[role],
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_capture_payload(*, request_text: str) -> DevRequestCaptureCreate:
    return DevRequestCaptureCreate(
        capture_url="/patients/1?tab=episodes",
        capture_gui_part="patients",
        capture_state_json='{"path":"/patients/1","ids":[1]}',
        request_text=request_text,
    )


def test_create_claim_and_decide_dev_request_flow(db_session) -> None:
    """Developer request should flow from PENDING to IMPLEMENTED_REVIEW with decision metadata."""
    role_dev = _create_role(db_session, key="DEV", pos=1)
    role_user = _create_role(db_session, key="KOORD", pos=2)
    submitter = _create_user(db_session, ext_id="DEVF_SUBMIT", role=role_user)
    developer = _create_user(db_session, ext_id="DEVF_DEV", role=role_dev)

    created = create_capture_request(
        db=db_session,
        current_user_id=submitter.id,
        payload=_create_capture_payload(request_text="Please improve this section."),
    )
    assert created.status == "PENDING", "Capture must create request in PENDING state."
    assert created.submitter_user_id == submitter.id, "Capture must persist submitting user id for visibility rules."

    claimed = claim_request(db=db_session, current_user=developer, request_id=created.id)
    assert claimed.status == "IN_DEVELOPMENT", "Claiming must move request to IN_DEVELOPMENT."
    assert claimed.claimed_by_user_id == developer.id, "Claiming must assign claimed_by to current developer."

    decided = decide_request(
        db=db_session,
        current_user=developer,
        request_id=created.id,
        payload=DevRequestDecisionUpdate(
            decision="IMPLEMENTED",
            developer_note_text="Investigated and patched behavior.",
            developer_response_text="Implemented and verified.",
        ),
    )
    assert (
        decided.status == "IMPLEMENTED_REVIEW"
    ), "Implemented decision must route request into user review state IMPLEMENTED_REVIEW."
    assert decided.decision == "IMPLEMENTED", "Decision marker must be persisted for review context."
    assert decided.decided_by_user_id == developer.id, "Decided-by user must reflect the acting developer."


def test_review_reject_creates_linked_follow_up_request(db_session) -> None:
    """Rejecting a review should close source request and create a linked follow-up request."""
    role_dev = _create_role(db_session, key="DEV", pos=1)
    role_user = _create_role(db_session, key="KOORD", pos=2)
    submitter = _create_user(db_session, ext_id="DEVF_REVIEW_SUBMIT", role=role_user)
    developer = _create_user(db_session, ext_id="DEVF_REVIEW_DEV", role=role_dev)

    created = create_capture_request(
        db=db_session,
        current_user_id=submitter.id,
        payload=_create_capture_payload(request_text="Original request."),
    )
    claim_request(db=db_session, current_user=developer, request_id=created.id)
    decide_request(
        db=db_session,
        current_user=developer,
        request_id=created.id,
        payload=DevRequestDecisionUpdate(
            decision="REJECTED",
            developer_note_text="Not feasible right now.",
            developer_response_text="Rejected with explanation.",
        ),
    )

    follow_up = reject_review_and_create_follow_up(
        db=db_session,
        current_user_id=submitter.id,
        request_id=created.id,
        review_text="Still required because the original issue persists.",
    )
    source = db_session.query(DevRequest).filter(DevRequest.id == created.id).first()
    assert source is not None, "Source request must still exist after reopening workflow."
    assert source.status == "CLOSED_REOPENED", "Source request must move to CLOSED_REOPENED after user rejection."
    assert source.user_review_text == "Still required because the original issue persists.", (
        "Source request must retain user review feedback for auditability."
    )
    assert follow_up.parent_request_id == created.id, "Follow-up request must link back to source request."
    assert follow_up.status == "PENDING", "Follow-up request must restart workflow in PENDING state."


def test_review_accept_closes_request(db_session) -> None:
    """Accepting review should close request as accepted and set a closing timestamp."""
    role_dev = _create_role(db_session, key="DEV", pos=1)
    role_user = _create_role(db_session, key="KOORD", pos=2)
    submitter = _create_user(db_session, ext_id="DEVF_ACCEPT_SUBMIT", role=role_user)
    developer = _create_user(db_session, ext_id="DEVF_ACCEPT_DEV", role=role_dev)

    created = create_capture_request(
        db=db_session,
        current_user_id=submitter.id,
        payload=_create_capture_payload(request_text="Please implement this."),
    )
    claim_request(db=db_session, current_user=developer, request_id=created.id)
    decide_request(
        db=db_session,
        current_user=developer,
        request_id=created.id,
        payload=DevRequestDecisionUpdate(
            decision="IMPLEMENTED",
            developer_note_text="Done.",
            developer_response_text="Implemented.",
        ),
    )

    accepted = accept_review(db=db_session, current_user_id=submitter.id, request_id=created.id)
    assert accepted.status == "CLOSED_ACCEPTED", "Accepted review must close the request as CLOSED_ACCEPTED."
    assert accepted.closed_at is not None, "Accepted review must stamp closed_at for completion history."


def test_list_development_requests_hides_claimed_items_for_other_developers(db_session) -> None:
    """Side-panel style listing should hide requests claimed by another developer unless explicitly included."""
    role_dev = _create_role(db_session, key="DEV", pos=1)
    role_user = _create_role(db_session, key="KOORD", pos=2)
    submitter = _create_user(db_session, ext_id="DEVF_LIST_SUBMIT", role=role_user)
    owner_developer = _create_user(db_session, ext_id="DEVF_LIST_OWNER", role=role_dev)
    other_developer = _create_user(db_session, ext_id="DEVF_LIST_OTHER", role=role_dev)

    created = create_capture_request(
        db=db_session,
        current_user_id=submitter.id,
        payload=_create_capture_payload(request_text="Request that will be claimed."),
    )
    claim_request(db=db_session, current_user=owner_developer, request_id=created.id)

    hidden_from_other = list_development_requests(
        db=db_session,
        current_user=other_developer,
        include_claimed_by_other_developers=False,
        filter_claimed_by_user_id=None,
    )
    assert hidden_from_other == [], (
        "Development list should hide requests claimed by another developer in side-panel mode."
    )

    visible_when_including_claimed = list_development_requests(
        db=db_session,
        current_user=other_developer,
        include_claimed_by_other_developers=True,
        filter_claimed_by_user_id=None,
    )
    assert len(visible_when_including_claimed) == 1, (
        "Development list should include claimed requests when include_claimed_by_other_developers=True."
    )

    review_visibility = list_review_requests(db=db_session, current_user_id=submitter.id)
    assert review_visibility == [], "Submitter should not see item in review list before a developer decision is submitted."


def test_support_ticket_capture_can_create_dev_request_in_non_dev_mode(db_session, monkeypatch) -> None:
    """Support-ticket based capture must work even when environment is not DEV/TEST."""
    role_user = _create_role(db_session, key="KOORD", pos=1)
    submitter = _create_user(db_session, ext_id="DEVF_SUPPORT_CAPTURE", role=role_user)

    monkeypatch.setattr(
        dev_forum_service,
        "get_config",
        lambda: type("Cfg", (), {"env": "PROD"})(),
    )

    with pytest.raises(HTTPException):
        create_capture_request(
            db=db_session,
            current_user_id=submitter.id,
            payload=_create_capture_payload(request_text="Should be blocked in PROD for manual capture."),
        )

    captured = create_capture_request_any_mode(
        db=db_session,
        current_user_id=submitter.id,
        payload=_create_capture_payload(request_text="Error capture from support flow."),
    )
    assert captured.status == "PENDING", "Support-ticket capture must still create a pending dev request in non-DEV mode."
