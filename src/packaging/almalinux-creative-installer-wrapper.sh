#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/usr/libexec/almalinux-creative-installer"
exec "${APP_DIR}/almalinux-creative-installer" "$@"