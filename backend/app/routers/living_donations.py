from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.living_donations import (
    add_living_donation_donor as add_living_donation_donor_service,
    close_living_donation as close_living_donation_service,
    create_living_donation as create_living_donation_service,
    get_living_donation_or_404 as get_living_donation_or_404_service,
    list_living_donations as list_living_donations_service,
    list_recipient_episode_options as list_recipient_episode_options_service,
    update_living_donation as update_living_donation_service,
    update_living_donation_donor as update_living_donation_donor_service,
)
from ..models import User
from ..schemas import (
    LivingDonationDonorCreate,
    LivingDonationDonorResponse,
    LivingDonationDonorUpdate,
    LivingDonationEpisodeCloseRequest,
    LivingDonationEpisodeCreate,
    LivingDonationEpisodeResponse,
    LivingDonationEpisodeUpdate,
    LivingDonationRecipientEpisodeRefResponse,
)

router = APIRouter(prefix="/living-donations", tags=["living-donations"])


@router.get("/", response_model=list[LivingDonationEpisodeResponse])
def list_living_donations(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return list_living_donations_service(db=db)


@router.get("/recipient-episodes", response_model=list[LivingDonationRecipientEpisodeRefResponse])
def list_recipient_episode_options(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return list_recipient_episode_options_service(db=db)


@router.get("/{living_donation_id}", response_model=LivingDonationEpisodeResponse)
def get_living_donation(
    living_donation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.donors")),
):
    return get_living_donation_or_404_service(living_donation_id=living_donation_id, db=db)


@router.post("/", response_model=LivingDonationEpisodeResponse, status_code=201)
def create_living_donation(
    payload: LivingDonationEpisodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return create_living_donation_service(payload=payload, changed_by_id=current_user.id, db=db)


@router.patch("/{living_donation_id}", response_model=LivingDonationEpisodeResponse)
def update_living_donation(
    living_donation_id: int,
    payload: LivingDonationEpisodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_living_donation_service(
        living_donation_id=living_donation_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{living_donation_id}/close", response_model=LivingDonationEpisodeResponse)
def close_living_donation(
    living_donation_id: int,
    payload: LivingDonationEpisodeCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return close_living_donation_service(
        living_donation_id=living_donation_id,
        end_date=payload.end,
        changed_by_id=current_user.id,
        db=db,
    )


@router.post("/{living_donation_id}/donors", response_model=LivingDonationDonorResponse, status_code=201)
def add_living_donation_donor(
    living_donation_id: int,
    payload: LivingDonationDonorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return add_living_donation_donor_service(
        living_donation_id=living_donation_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{living_donation_id}/donors/{donor_id}", response_model=LivingDonationDonorResponse)
def update_living_donation_donor(
    living_donation_id: int,
    donor_id: int,
    payload: LivingDonationDonorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.donors")),
):
    return update_living_donation_donor_service(
        living_donation_id=living_donation_id,
        donor_id=donor_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )
