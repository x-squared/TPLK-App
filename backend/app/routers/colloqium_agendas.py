from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import require_permission
from ..database import get_db
from ..features.colloqium_agendas import (
    create_colloqium_agenda as create_colloqium_agenda_service,
    delete_colloqium_agenda as delete_colloqium_agenda_service,
    list_colloqium_agendas as list_colloqium_agendas_service,
    update_colloqium_agenda as update_colloqium_agenda_service,
)
from ..models import User
from ..schemas import (
    ColloqiumAgendaCreate,
    ColloqiumAgendaResponse,
    ColloqiumAgendaUpdate,
)

router = APIRouter(prefix="/colloqium-agendas", tags=["colloqium-agendas"])


@router.get("/", response_model=list[ColloqiumAgendaResponse])
def list_colloqium_agendas(
    colloqium_id: int | None = None,
    episode_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("view.colloquiums")),
):
    return list_colloqium_agendas_service(
        colloqium_id=colloqium_id,
        episode_id=episode_id,
        db=db,
    )


@router.post("/", response_model=ColloqiumAgendaResponse, status_code=201)
def create_colloqium_agenda(
    payload: ColloqiumAgendaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return create_colloqium_agenda_service(
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.patch("/{colloqium_agenda_id}", response_model=ColloqiumAgendaResponse)
def update_colloqium_agenda(
    colloqium_agenda_id: int,
    payload: ColloqiumAgendaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    return update_colloqium_agenda_service(
        colloqium_agenda_id=colloqium_agenda_id,
        payload=payload,
        changed_by_id=current_user.id,
        db=db,
    )


@router.delete("/{colloqium_agenda_id}", status_code=204)
def delete_colloqium_agenda(
    colloqium_agenda_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit.colloquiums")),
):
    delete_colloqium_agenda_service(colloqium_agenda_id=colloqium_agenda_id, db=db)
