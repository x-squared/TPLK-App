from sqlalchemy.orm import Session

from ....models import Code, Information, InformationContext, InformationUser


def sync_information_core(db: Session) -> None:
    """Load production-safe information rows."""
    from ...datasets.core.information import RECORDS

    db.query(InformationUser).delete()
    db.query(InformationContext).delete()
    db.query(Information).delete()
    db.flush()

    context_by_key = {
        code.key: code
        for code in db.query(Code).filter(Code.type.in_(["ORGAN", "INFORMATION_AREA"])).all()
    }
    general_area = context_by_key.get("GENERAL")

    for entry in RECORDS:
        raw = dict(entry)
        context_key = raw.pop("context_key", None)
        context_keys = list(raw.pop("context_keys", []) or [])
        if context_key and context_key not in context_keys:
            context_keys.insert(0, context_key)
        if not any(context_by_key.get(key) and context_by_key[key].type == "INFORMATION_AREA" for key in context_keys):
            if general_area is not None:
                context_keys.insert(0, "GENERAL")
        context_ids = [context_by_key[key].id for key in context_keys if key in context_by_key]
        context = context_by_key.get(context_key) if context_key else None
        item = Information(
            context_id=context_ids[0] if context_ids else (context.id if context else None),
            **raw,
        )
        item.context_links = [
            InformationContext(context_id=context_id, pos=pos)
            for pos, context_id in enumerate(context_ids)
        ]
        db.add(item)

    db.commit()
