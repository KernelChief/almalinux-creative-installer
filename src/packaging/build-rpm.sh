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

# Read Name from the spec; Version comes from VERSION or tag ref.
NAME="$(awk -F: '/^Name:[[:space:]]*/ {gsub(/[[:space:]]+/, "", $2); print $2; exit}' "${SPEC}")"
VERSION="${VERSION:-}"
if [[ -z "${VERSION}" && "${GITHUB_REF_TYPE:-}" == "tag" && -n "${GITHUB_REF_NAME:-}" ]]; then
  VERSION="${GITHUB_REF_NAME#v}"
fi
if [[ -z "${VERSION}" && -n "${GITHUB_REF:-}" && "${GITHUB_REF}" == refs/tags/* ]]; then
  VERSION="${GITHUB_REF#refs/tags/}"
  VERSION="${VERSION#v}"
fi
VERSION="${VERSION#v}"

RPM_VERSION="${VERSION}"
RPM_PRERELEASE=""

# Convert semver prerelease versions like 2.0.2-beta.42 into RPM-friendly fields:
#   Version: 2.0.2
#   Release: 0.beta.42%{?dist}
if [[ "${VERSION}" == *-* ]]; then
  RPM_VERSION="${VERSION%%-*}"
  RPM_PRERELEASE="${VERSION#*-}"
  RPM_PRERELEASE="${RPM_PRERELEASE//-/.}"
fi

# Compute the RPM Release:
#   prerelease build -> 0.<prerelease>      (sorts BELOW the final release)
#   final build      -> ${APP_RELEASE:-1}   (1, or a hotfix repackage number)
if [[ -n "${RPM_PRERELEASE}" ]]; then
  RPM_RELEASE="0.${RPM_PRERELEASE}"
else
  RPM_RELEASE="${APP_RELEASE:-1}"
fi

if [[ -z "${NAME}" || -z "${VERSION}" || -z "${RPM_VERSION}" ]]; then
  echo "ERROR: Could not determine Name/Version. Set VERSION or run on a tag (e.g., v1.0.4)." >&2
  exit 3
fi

rpmdev-setuptree >/dev/null 2>&1 || true

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# Source tarball/layout must match spec %setup/%{version}, so use RPM_VERSION.
SRC_DIR="${TMPDIR}/${NAME}-${RPM_VERSION}"
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

TARBALL="${HOME}/rpmbuild/SOURCES/v${RPM_VERSION}.tar.gz"
tar -C "${TMPDIR}" -czf "${TARBALL}" "${NAME}-${RPM_VERSION}"

echo "Created source tarball: ${TARBALL}"
echo "Building ${NAME} ${RPM_VERSION}-${RPM_RELEASE} (from VERSION=${VERSION}) using spec: ${SPEC}"

# Bake the resolved version + release into a throwaway copy of the spec, then
# build from THAT. rpmbuild --define does not persist into the SRPM, so COPR
# (which rebuilds the SRPM with no --define) would otherwise fall back to the
# spec's hardcoded defaults and ship the same NVR every time. Editing a copy
# keeps the committed spec clean for local development.
SPEC_BUILD="${TMPDIR}/$(basename "${SPEC}")"
sed -e "s|^%{!?app_version:%global app_version .*}|%{!?app_version:%global app_version ${RPM_VERSION}}|" \
    -e "s|^%{!?app_release:%global app_release .*}|%{!?app_release:%global app_release ${RPM_RELEASE}}|" \
    "${SPEC}" > "${SPEC_BUILD}"

if ! grep -q "app_version ${RPM_VERSION}}" "${SPEC_BUILD}" \
   || ! grep -q "app_release ${RPM_RELEASE}}" "${SPEC_BUILD}"; then
  echo "ERROR: failed to bake version/release into spec copy." >&2
  exit 4
fi

rpmbuild -ba \
  --define "app_version ${RPM_VERSION}" \
  --define "app_release ${RPM_RELEASE}" \
  "${SPEC_BUILD}"

echo "Done."
echo "RPMs are in: ${HOME}/rpmbuild/RPMS/"

