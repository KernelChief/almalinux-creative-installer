#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENTRYPOINT="${ROOT_DIR}/src/almalinux-creative-installer"
DIST_DIR="${ROOT_DIR}/dist/binary"
DEPLOY_CONFIG="${ROOT_DIR}/src/packaging/pyside6-deploy.spec"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "ERROR: Do not run pyside6-deploy as root. Use a normal user account." >&2
  exit 4
fi

if [[ ! -f "${ENTRYPOINT}" ]]; then
  echo "ERROR: entrypoint not found at ${ENTRYPOINT}" >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: python3 is required to build the binary." >&2
  exit 2
}

command -v pyside6-deploy >/dev/null 2>&1 || {
  echo "ERROR: pyside6-deploy is not installed. Install with pip." >&2
  exit 3
}

mkdir -p "${DIST_DIR}"

if [[ ! -f "${DEPLOY_CONFIG}" ]]; then
  echo "ERROR: pyside6-deploy config not found at ${DEPLOY_CONFIG}" >&2
  exit 5
fi

echo "Bundling entrypoint: ${ENTRYPOINT}"
echo "Using deploy config: ${DEPLOY_CONFIG}"

pyside6-deploy --config-file "${DEPLOY_CONFIG}"

echo "Binary created at ${DIST_DIR}/almalinux-creative-installer"