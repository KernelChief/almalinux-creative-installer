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

# Read Name from the spec; Version comes from VERSION, tag ref, or main's tag.
NAME="$(awk -F: '/^Name:[[:space:]]*/ {gsub(/[[:space:]]+/, "", $2); print $2; exit}' "${SPEC}")"
VERSION="${VERSION:-}"
if [[ -z "${VERSION}" && "${GITHUB_REF_TYPE:-}" == "tag" && -n "${GITHUB_REF_NAME:-}" ]]; then
  VERSION="${GITHUB_REF_NAME#v}"
fi
if [[ -z "${VERSION}" ]]; then
  if git -C "${ROOT_DIR}" show-ref --verify --quiet refs/remotes/origin/main; then
    VERSION="$(git -C "${ROOT_DIR}" describe --tags --abbrev=0 origin/main 2>/dev/null || true)"
    VERSION="${VERSION#v}"
  elif git -C "${ROOT_DIR}" show-ref --verify --quiet refs/heads/main; then
    VERSION="$(git -C "${ROOT_DIR}" describe --tags --abbrev=0 main 2>/dev/null || true)"
    VERSION="${VERSION#v}"
  fi
fi
if [[ -z "${VERSION}" ]]; then
  VERSION="$(git -C "${ROOT_DIR}" describe --tags --abbrev=0 2>/dev/null || true)"
  VERSION="${VERSION#v}"
fi
VERSION="${VERSION#v}"

if [[ -z "${NAME}" || -z "${VERSION}" ]]; then
  echo "ERROR: Could not determine Name/Version. Set VERSION or ensure main has a tag (e.g., v1.0.4)." >&2
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

rpmbuild -ba --define "version ${VERSION}" "${SPEC}"

echo "Done."
echo "RPMs are in: ${HOME}/rpmbuild/RPMS/"

