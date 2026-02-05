#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/usr/libexec/almalinux-creative-installer"
VENV_PY="${APP_DIR}/venv/bin/python"
APP_ENTRY="${APP_DIR}/app/almalinux-creative-installer"

if [[ -d "${APP_DIR}/venv/lib/python"*/site-packages/PySide6 ]]; then
  export QT_API="pyside6"
elif [[ -d "${APP_DIR}/venv/lib/python"*/site-packages/PySide2 ]]; then
  export QT_API="pyside2"
fi

exec "${VENV_PY}" "${APP_ENTRY}" "$@"