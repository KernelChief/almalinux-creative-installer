#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENTRYPOINT="${ROOT_DIR}/src/almalinux-creative-installer"
DIST_DIR="${ROOT_DIR}/dist/binary"

if [[ ! -f "${ENTRYPOINT}" ]]; then
  echo "ERROR: entrypoint not found at ${ENTRYPOINT}" >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: python3 is required to build the binary." >&2
  exit 2
}

command -v pyinstaller >/dev/null 2>&1 || {
  echo "ERROR: pyinstaller is not installed. Install with pip." >&2
  exit 3
}

mkdir -p "${DIST_DIR}"

pyinstaller \
  --clean \
  --noconfirm \
  --onefile \
  --name almalinux-creative-installer \
  --distpath "${DIST_DIR}" \
  --workpath "${DIST_DIR}/build" \
  --specpath "${DIST_DIR}" \
  "${ENTRYPOINT}"

echo "Binary created at ${DIST_DIR}/almalinux-creative-installer"