from __future__ import annotations

from collections.abc import Callable
import importlib
import os
from pathlib import Path
import sys
from typing import TypeVar

T = TypeVar("T")
_APPMODULES_PATHS_CONFIGURED = False


def _candidate_appmodules_roots() -> list[Path]:
    env_candidates = [
        os.getenv("TPL_APPMODULES_ROOT", "").strip(),
        os.getenv("APPMODULES_ROOT", "").strip(),
    ]
    paths: list[Path] = []
    for raw in env_candidates:
        if raw:
            paths.append(Path(raw))

    # Default workspace layout: <workspace>/TPLK-App and <workspace>/AppModules
    workspace_base = Path(__file__).resolve().parents[6]
    paths.append(workspace_base / "AppModules")
    return paths


def _configure_appmodules_sys_path() -> None:
    global _APPMODULES_PATHS_CONFIGURED
    if _APPMODULES_PATHS_CONFIGURED:
        return
    _APPMODULES_PATHS_CONFIGURED = True

    for root in _candidate_appmodules_roots():
        if not root.exists() or not root.is_dir():
            continue
        # Each AppModules package exposes importable modules from its `src` folder.
        for src_dir in root.glob("*/src"):
            if not src_dir.is_dir():
                continue
            src_text = str(src_dir.resolve())
            if src_text not in sys.path:
                sys.path.insert(0, src_text)


def import_appmodules_symbol(module_name: str, symbol_name: str):
    _configure_appmodules_sys_path()
    try:
        module = importlib.import_module(module_name)
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Missing AppModules runtime dependency. "
            f"Could not import module `{module_name}` required by interfaces runtime. "
            "Install/configure AppModules packages (or set process PYTHONPATH) before startup."
        ) from exc
    try:
        return getattr(module, symbol_name)
    except AttributeError as exc:
        raise RuntimeError(
            "AppModules runtime dependency is incompatible. "
            f"Module `{module_name}` does not export `{symbol_name}`."
        ) from exc


def execute_sync_call(
    *,
    endpoint: str,
    call_fn: Callable[[float], T],
    timeout_ms: int = 3000,
    max_attempts: int = 3,
    idempotent: bool = True,
) -> T:
    create_call_attempt_observer = import_appmodules_symbol("call_observer", "create_call_attempt_observer")
    CallPolicy = import_appmodules_symbol("call_policy", "CallPolicy")
    RequestContext = import_appmodules_symbol("request_context", "RequestContext")
    execute = import_appmodules_symbol("sync_gateway", "execute")

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
