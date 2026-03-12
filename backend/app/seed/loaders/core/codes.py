from sqlalchemy.orm import Session

from ....models import Code


def sync_codes(db: Session) -> None:
    """Replace all CODE rows with the core dataset definitions."""
    from ...datasets.core.codes import RECORDS as code_records

    db.query(Code).delete()
    for entry in code_records:
        db.add(Code(**entry))
    db.commit()
