from sqlalchemy.orm import Session

from ....models import Catalogue


def sync_catalogues_init(db: Session) -> None:
    """Replace all CATALOGUE rows with initial production dataset definitions."""
    from ...datasets.init.catalogues import RECORDS as catalogue_records

    db.query(Catalogue).delete()
    for entry in catalogue_records:
        db.add(Catalogue(**entry))
    db.commit()
