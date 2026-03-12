from sqlalchemy.orm import Session

from ....models import Catalogue


def sync_catalogues(db: Session) -> None:
    """Replace all CATALOGUE rows with the core dataset definitions."""
    from ...datasets.core.catalogues import RECORDS as catalogue_records

    db.query(Catalogue).delete()
    for entry in catalogue_records:
        db.add(Catalogue(**entry))
    db.commit()
