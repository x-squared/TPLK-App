from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm.exc import StaleDataError

from . import models
from .audit_context import clear_current_changed_by_id
from .audit_hooks import register_audit_hooks
from .config import get_config
from .database import Base, engine
from .db_schema import SchemaRuntime, verify_schema_drift
from .enums import CoordinationStatusKey, FavoriteTypeKey, PriorityKey, TaskScopeKey, TaskStatusKey
from .features.scheduler import SchedulerRuntime
from .routers import register_routers

logger = logging.getLogger(__name__)
scheduler_runtime = SchedulerRuntime(poll_interval_seconds=30)


def ensure_strong_enum_code_alignment() -> None:
    expected_by_type: dict[str, set[str]] = {
        "COORDINATION_STATUS": {item.value for item in CoordinationStatusKey},
        "FAVORITE_TYPE": {item.value for item in FavoriteTypeKey},
        "TASK_SCOPE": {item.value for item in TaskScopeKey},
        "TASK_STATUS": {item.value for item in TaskStatusKey},
        "PRIORITY": {item.value for item in PriorityKey},
    }
    with engine.begin() as conn:
        code_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='CODE'")
        ).scalar_one_or_none()
        if not code_table_exists:
            return
        for code_type, expected_keys in expected_by_type.items():
            rows = conn.execute(
                text('SELECT "KEY" FROM "CODE" WHERE "TYPE" = :code_type'),
                {"code_type": code_type},
            ).all()
            actual_keys = {row[0] for row in rows}
            if not actual_keys:
                continue
            if actual_keys != expected_keys:
                missing = sorted(expected_keys - actual_keys)
                extra = sorted(actual_keys - expected_keys)
                raise RuntimeError(
                    f"CODE.{code_type} is out of sync with enum definition. "
                    f"Missing={missing}, Extra={extra}"
                )


def ensure_required_contact_code_families() -> None:
    with engine.begin() as conn:
        code_table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='CODE'")
        ).scalar_one_or_none()
        if not code_table_exists:
            return
        contact_count = conn.execute(
            text('SELECT COUNT(*) FROM "CODE" WHERE "TYPE" = :code_type'),
            {"code_type": "CONTACT"},
        ).scalar_one()
        contact_use_count = conn.execute(
            text('SELECT COUNT(*) FROM "CODE" WHERE "TYPE" = :code_type'),
            {"code_type": "CONTACT_USE"},
        ).scalar_one()
        if int(contact_count) > 0 and int(contact_use_count) == 0:
            raise RuntimeError(
                "Required reference codes are incomplete: CODE.CONTACT exists but CODE.CONTACT_USE is empty. "
                "Run a full seed profile (for example `python -m app.db_admin --mode refresh --env DEV` "
                "or `python -m app.db_data --mode seed --seed-profile CORE_SAMPLE --env DEV`)."
            )


def ensure_database_schema_compatible() -> None:
    drift = verify_schema_drift(SchemaRuntime(engine=engine, base=Base))
    if not drift.has_drift:
        return

    detail_parts: list[str] = []
    if drift.missing_tables:
        detail_parts.append("missing tables: " + ", ".join(drift.missing_tables))
    if drift.missing_columns:
        detail_parts.append("missing columns: " + ", ".join(drift.missing_columns))
    if drift.type_mismatches:
        detail_parts.append("type mismatches: " + ", ".join(drift.type_mismatches))
    if drift.nullable_mismatches:
        detail_parts.append("nullable mismatches: " + ", ".join(drift.nullable_mismatches))
    if drift.missing_indexes:
        detail_parts.append("missing indexes: " + ", ".join(drift.missing_indexes))
    if drift.missing_unique_constraints:
        detail_parts.append("missing unique constraints: " + ", ".join(drift.missing_unique_constraints))
    if drift.missing_foreign_keys:
        detail_parts.append("missing foreign keys: " + ", ".join(drift.missing_foreign_keys))
    detail = "; ".join(detail_parts)
    raise RuntimeError(
        "Database schema does not match current model metadata "
        f"({detail}). Run explicit migration scripts "
        "(`python -m app.db_schema --mode migrate --env <ENV>` or "
        "`python -m app.db_admin --mode refresh --env <ENV>`)."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = models
    register_audit_hooks()
    ensure_database_schema_compatible()
    ensure_strong_enum_code_alignment()
    ensure_required_contact_code_families()
    logger.info("Startup checks passed: schema compatibility and code alignment verified.")
    await scheduler_runtime.start()
    yield
    await scheduler_runtime.stop()


app = FastAPI(title="TPL App", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_config().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routers(app)


@app.middleware("http")
async def reset_audit_user_context(request: Request, call_next):
    clear_current_changed_by_id()
    try:
        return await call_next(request)
    finally:
        clear_current_changed_by_id()


@app.exception_handler(StaleDataError)
async def handle_stale_data_error(_: Request, __: StaleDataError):
    return JSONResponse(
        status_code=409,
        content={"detail": "Record was modified by another user. Reload and try again."},
    )


@app.get("/api/health")
def health_check():
    env = get_config().env.strip().upper()
    return {
        "status": "ok",
        "env": env,
        "dev_tools_enabled": env in {"DEV", "TEST"},
    }
