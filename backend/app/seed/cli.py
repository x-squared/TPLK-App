from __future__ import annotations

import argparse
from typing import Sequence

from ..config import get_config
from ..database import SessionLocal
from . import get_seed_jobs, run_seed_profile
from .profiles import ENV_CATEGORIES, PROFILE_CATEGORIES, resolve_seed_categories


def _print_jobs() -> None:
    print("Registered seed jobs:")
    for job in get_seed_jobs():
        print(f"  - {job.key} [{job.category}] {job.description}")


def _run(args: argparse.Namespace) -> int:
    cfg = get_config()
    env = args.env or cfg.env
    profile = args.profile if args.profile is not None else cfg.seed_profile

    db = SessionLocal()
    try:
        result = run_seed_profile(db, app_env=env, seed_profile=profile)
    finally:
        db.close()

    print("Seed execution completed.")
    print(f"  environment: {result['environment']}")
    print(f"  categories:  {', '.join(result['categories']) if result['categories'] else '(none)'}")
    print(f"  jobs:        {', '.join(result['executed_jobs']) if result['executed_jobs'] else '(none)'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.seed",
        description="Manual seed operations",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run_cmd = sub.add_parser("run", help="Execute seeds for an environment/profile")
    run_cmd.add_argument(
        "--env",
        choices=sorted(ENV_CATEGORIES.keys()),
        help="Runtime environment used to resolve seed categories.",
    )
    run_cmd.add_argument(
        "--profile",
        choices=sorted(PROFILE_CATEGORIES.keys()),
        help="Explicit seed profile override.",
    )

    sub.add_parser("list", help="List registered seed jobs")
    sub.add_parser("resolve", help="Show resolved categories for current config")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "list":
        _print_jobs()
        return 0

    if args.command == "resolve":
        cfg = get_config()
        resolved_env, categories = resolve_seed_categories(cfg.env, cfg.seed_profile)
        print(f"environment={resolved_env}")
        print(f"categories={','.join(categories) if categories else '(none)'}")
        return 0

    if args.command == "run":
        return _run(args)

    parser.error(f"Unknown command: {args.command}")
    return 2
