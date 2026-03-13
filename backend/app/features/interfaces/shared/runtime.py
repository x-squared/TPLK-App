from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
import os
import sys
from typing import TypeVar

T = TypeVar("T")


def ensure_appmodules_pythonpath() -> None:
    appspace_root = Path(__file__).resolve().parents[6]
    configured_root = os.getenv("APPMODULES_ROOT", str(appspace_root / "AppModules"))
    appmodules_root = Path(configured_root).resolve()
    apifoundation_src = appmodules_root / "AppApiFoundation" / "src"
    connectors_src = appmodules_root / "AppConnectors" / "src"
    observability_src = appmodules_root / "AppObservability" / "src"
    for path in (apifoundation_src, connectors_src, observability_src):
        path_str = str(path)
        if path.exists() and path_str not in sys.path:
            sys.path.insert(0, path_str)


def execute_sync_call(
    *,
    endpoint: str,
    call_fn: Callable[[float], T],
    timeout_ms: int = 3000,
    max_attempts: int = 3,
    idempotent: bool = True,
) -> T:
    ensure_appmodules_pythonpath()
    from call_observer import create_call_attempt_observer
    from call_policy import CallPolicy
    from request_context import RequestContext
    from sync_gateway import execute

    policy = CallPolicy(timeout_ms=timeout_ms, max_attempts=max_attempts, idempotent=idempotent)
    context = RequestContext.create(timeout_ms=timeout_ms)
    observer = create_call_attempt_observer()
    return execute(
        endpoint=endpoint,
        call_fn=call_fn,
        policy=policy,
        context=context,
        observe_attempt=observer,
    )
