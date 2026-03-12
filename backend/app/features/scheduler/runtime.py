from __future__ import annotations

import asyncio
import logging

from ...database import SessionLocal
from .service import run_due_jobs

logger = logging.getLogger(__name__)


class SchedulerRuntime:
    def __init__(self, poll_interval_seconds: int = 30):
        self._poll_interval_seconds = max(5, poll_interval_seconds)
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._task = asyncio.create_task(self._loop(), name="scheduler-runtime-loop")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def _loop(self) -> None:
        while True:
            try:
                db = SessionLocal()
                try:
                    executed = run_due_jobs(db=db)
                    if executed > 0:
                        logger.info("Scheduler executed %s due job(s).", executed)
                finally:
                    db.close()
            except Exception as exc:  # noqa: BLE001
                logger.exception("Scheduler runtime tick failed: %s", exc)
            await asyncio.sleep(self._poll_interval_seconds)
