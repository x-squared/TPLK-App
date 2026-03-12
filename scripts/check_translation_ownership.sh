#!/usr/bin/env bash
set -euo pipefail

python3 ../AppModules/AppI18n/scripts/check_translation_ownership.py \
  --file ./frontend/src/i18n/translations.tpl.json \
  --forbid-prefix devForum
