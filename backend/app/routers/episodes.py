from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.episodes import (
    add_or_reactivate_episode_organ as add_or_reactivate_episode_organ_service,
    cancel_episode_workflow as cancel_episode_workflow_service,
    close_episode_workflow as close_episode_workflow_service,
    create_episode as create_episode_service,
    delete_episode as delete_episode_service,
    list_episodes as list_episodes_service,
    reject_episode_workflow as reject_episode_workflow_service,
    start_episode_listing as start_episode_listing_service,
    update_episode as update_episode_service,
    update_episode_organ as update_episode_organ_service,
)
from ..models import User
from ..schemas import (
    EpisodeCreate,
    EpisodeStartListingRequest,
    EpisodeCloseRequest,
    EpisodeRejectRequest,
    EpisodeCancelRequest,
    EpisodeListResponse,
    EpisodeOrganCreate,
    EpisodeOrganResponse,
    EpisodeOrganUpdate,
    EpisodeResponse,
    EpisodeUpdate,
)

router = APIRouter(prefix="/patients/{patient_id}/episodes", tags=["episodes"])


@router.get("/", response_model=list[EpisodeListResponse])
def list_episodes(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.patients")),
):
    return list_episodes_service(patient_id=patient_id, db=db)


@router.post("/", response_model=EpisodeResponse, status_code=201)
def create_episode(
    patient_id: int,
    payload: EpisodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return create_episode_service(
        patient_id=patient_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{episode_id}", response_model=EpisodeResponse)
def update_episode(
    patient_id: int,
    episode_id: int,
    payload: EpisodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_episode_service(
        patient_id=patient_id,
        episode_id=episode_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{episode_id}/workflow/start-listing", response_model=EpisodeResponse)
def start_episode_listing(
    patient_id: int,
    episode_id: int,
    payload: EpisodeStartListingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return start_episode_listing_service(
        patient_id=patient_id,
        episode_id=episode_id,
        start_date=payload.start,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{episode_id}/workflow/close", response_model=EpisodeResponse)
def close_episode_workflow(
    patient_id: int,
    episode_id: int,
    payload: EpisodeCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return close_episode_workflow_service(
        patient_id=patient_id,
        episode_id=episode_id,
        end_date=payload.end,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{episode_id}/workflow/reject", response_model=EpisodeResponse)
def reject_episode_workflow(
    patient_id: int,
    episode_id: int,
    payload: EpisodeRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return reject_episode_workflow_service(
        patient_id=patient_id,
        episode_id=episode_id,
        reason=payload.reason,
        end_date=payload.end,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{episode_id}/workflow/cancel", response_model=EpisodeResponse)
def cancel_episode_workflow(
    patient_id: int,
    episode_id: int,
    payload: EpisodeCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return cancel_episode_workflow_service(
        patient_id=patient_id,
        episode_id=episode_id,
        reason=payload.reason,
        end_date=payload.end,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{episode_id}/organs", response_model=EpisodeResponse, status_code=201)
def add_or_reactivate_episode_organ(
    patient_id: int,
    episode_id: int,
    payload: EpisodeOrganCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return add_or_reactivate_episode_organ_service(
        patient_id=patient_id,
        episode_id=episode_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{episode_id}/organs/{episode_organ_id}", response_model=EpisodeOrganResponse)
def update_episode_organ(
    patient_id: int,
    episode_id: int,
    episode_organ_id: int,
    payload: EpisodeOrganUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    return update_episode_organ_service(
        patient_id=patient_id,
        episode_id=episode_id,
        episode_organ_id=episode_organ_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{episode_id}", status_code=204)
def delete_episode(
    patient_id: int,
    episode_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.patients")),
):
    delete_episode_service(patient_id=patient_id, episode_id=episode_id, db=db)
