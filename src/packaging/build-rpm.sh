#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC="${ROOT_DIR}/src/packaging/almalinux-creative-installer.spec"

command -v rpmdev-setuptree >/dev/null 2>&1 || {
  echo "ERROR: rpmdevtools not installed. Install: sudo dnf install rpmdevtools" >&2
  exit 1
}

if [[ ! -f "${SPEC}" ]]; then
  echo "ERROR: Spec not found: ${SPEC}" >&2
  exit 2
fi

# Read Name and Version from the spec (single source of truth)
NAME="$(awk -F: '/^Name:[[:space:]]*/ {gsub(/[[:space:]]+/, "", $2); print $2; exit}' "${SPEC}")"
VERSION="$(awk -F: '/^Version:[[:space:]]*/ {gsub(/[[:space:]]+/, "", $2); print $2; exit}' "${SPEC}")"

if [[ -z "${NAME}" || -z "${VERSION}" ]]; then
  echo "ERROR: Could not parse Name/Version from spec: ${SPEC}" >&2
  exit 3
fi

rpmdev-setuptree >/dev/null 2>&1 || true

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

SRC_DIR="${TMPDIR}/${NAME}-${VERSION}"
mkdir -p "${SRC_DIR}"

rsync -a \
  --exclude ".git" \
  --exclude ".github" \
  --exclude ".idea" \
  --exclude "*/__pycache__" \
  --exclude "*.pyc" \
  --exclude "*.pyo" \
  --exclude "*.rpm" \
  --exclude "rpmbuild" \
  "${ROOT_DIR}/" "${SRC_DIR}/"

TARBALL="${HOME}/rpmbuild/SOURCES/${NAME}-${VERSION}.tar.gz"
tar -C "${TMPDIR}" -czf "${TARBALL}" "${NAME}-${VERSION}"

echo "Created source tarball: ${TARBALL}"
echo "Building ${NAME} version ${VERSION} using spec: ${SPEC}"

rpmbuild -ba "${SPEC}"

echo "Done."
echo "RPMs are in: ${HOME}/rpmbuild/RPMS/"
