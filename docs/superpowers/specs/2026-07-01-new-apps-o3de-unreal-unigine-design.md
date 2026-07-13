# Design: add O3DE, Unreal Engine 5.8, and Unigine

Date: 2026-07-01
Issues: #73 (Open 3D Engine), #70 (Unreal Engine 5.8), #67 (Unigine)
Branch: `feat/new-apps-o3de-unreal-unigine` (off `main`)

## Goal

Add three game engines to the installer catalog, following the bespoke
per-app install-type pattern already used by `resolve`, `3dcoat`,
`jangafx`, and `gaffer`. Introduce one new shared UI mechanism: a BETA
badge for pre-release or experimental apps.

Decisions already made during brainstorming:

- One combined branch for all three apps (like PR #65).
- Bespoke install types per app; no generic "copr" or "archive" type (YAGNI).
- BETA badge is a reusable flag; applied to O3DE and Unreal 5.8.
- O3DE auto-detects the latest versioned major from the COPR at install time.
- Unigine installs to `/opt/unigine` via the root helper, then chowns to the
  invoking user.
- No per-app `arch` field. PR #71 (arch gating) was closed intentionally per
  the maintainer's decision on issue #68; this design follows that decision.
- Unreal and Unigine run on EL9 and EL10: omit the `el` field (existing
  convention). O3DE is EL10-only (hard constraint: the COPR only has a
  `centos-stream-10-x86_64` chroot).

## Surfaces touched

Mirrors PR #65:

- `src/almalinux-creative-installer` (APPS entries, BETA pill, detection,
  guided flows, subtitles)
- `src/almalinux-creative-installer-helper` (install/remove functions,
  dispatch table)
- `README.md` and `docs/index.html` (app list updates)
- `src/icons/apps/` (three new icon PNGs)
- `src/packaging/build-rpm.sh` if the icon file list is explicit

## 1. BETA pill (shared mechanism)

- New optional app field `"beta": True`.
- Rendered as a small pill next to the app name in the list row, built the
  same way as the existing EL chip but amber-tinted, text `BETA`, tooltip
  "Pre-release / experimental build".
- Applied to O3DE (experimental EL10 COPR) and Unreal 5.8 (preview-1 build).

## 2. Open 3D Engine (`type: "o3de"`)

App entry: category "Game Engines", `"el": [10]`, `"beta": True`.

COPR facts (verified via the COPR API on 2026-07-01):

- Project: `hellaenergy/o3de`, maintained by a Red Hat employee.
- Chroots: `fedora-rawhide-x86_64`, `fedora-44-x86_64`,
  `centos-stream-10-x86_64`. No EL9, no epel-10 chroot.
- Packages use versioned-major naming: `o3deNNNN` where NNNN is YYMM
  (currently `o3de2605`). Majors are co-installable under
  `/opt/O3DE/<version>/`. There is no unversioned `o3de` package.
- An `o3de-dependencies` repo auto-enables alongside the main repo.

Helper `install_o3de`:

1. `dnf copr enable -y hellaenergy/o3de centos-stream-10-x86_64`. The
   explicit chroot argument is required: a bare `copr enable` on
   AlmaLinux 10 resolves to an epel-10 chroot that does not exist in this
   project.
2. Auto-detect the latest major: `dnf repoquery` for package names matching
   `o3de[0-9][0-9][0-9][0-9]`, sort, take the highest.
3. `dnf install -y` the detected package.

Helper `remove_o3de`: remove all installed `o3de[0-9]*` packages, then
`dnf copr remove hellaenergy/o3de`.

GUI detection: `rpm -qa` glob for `o3de[0-9]*` (no root needed).
Subtitle: "Installed via COPR (hellaenergy/o3de), latest release line".

## 3. Unreal Engine 5.8 (`type: "unreal"`)

App entry: category "Game Engines", no `el` field, `"beta": True`.

Guided install, 3DCoat-style:

1. Install opens https://www.unrealengine.com/linux (Epic account required
   for the download; account creation is the user's step).
2. User downloads `Linux_Unreal_Engine_5.8.0_preview-1.zip` and picks it in
   a file dialog (filter `*.zip`).
3. Helper `install_unreal <zip>`:
   - Validate the path (same checks as `install_local_file`).
   - Unzip to `/opt/unreal-engine/`.
   - `chown -R` to the invoking user (the editor writes into its own tree:
     DerivedDataCache, Intermediate; resolved via the existing PKEXEC_UID
     logic).
   - Write a desktop entry in `/usr/share/applications` pointing at
     `Engine/Binaries/Linux/UnrealEditor`.
   - Install the shipped icon into hicolor.

GUI detection: `/opt/unreal-engine` exists.
Remove: delete the tree, the desktop file, and the icon.
Subtitle: "Guided install: log in to Epic → download Linux zip → pick it
(EL9 and EL10)".

## 4. Unigine (`type: "unigine"`)

App entry: category "Game Engines", no `el` field, no beta flag.

Vendor installer quirks (from issue #67):

- The `.run` filename changes with each version.
- It shows an EULA in the terminal that the user must read and agree to.
- It creates the Browser (launcher) folder next to the `.run` file itself.
- It writes a `.desktop` entry with no name and no icon.
- Account creation happens inside the Browser app after install, per vendor
  policy.

Guided install with an EULA gate:

1. GUI shows an EULA consent dialog first: link to Unigine's EULA and an
   explicit "I agree" button. This satisfies "the user should be able to
   read and agree to it" because the root helper runs non-interactively
   under pkexec.
2. GUI opens https://developer.unigine.com/en/downloads; user picks the
   downloaded `.run` in a file dialog (filter `*.run`).
3. Helper `install_unigine <run>`:
   - Validate the path.
   - Copy the `.run` into `/opt/unigine/` and execute it there with
     auto-accept, so the Browser folder is created under `/opt/unigine`.
   - `chown -R` to the invoking user so the Browser can self-update.
   - Write our own desktop entry (with Name and our shipped icon) in
     `/usr/share/applications`. The vendor entry lands nameless in root's
     home under pkexec and is discarded.
   - Log a post-install note: create the Unigine account inside the
     Browser app.

Implementation-time verification item: the exact auto-accept mechanism for
the `.run` (a flag vs piped input) must be tested against the real
installer before the PR is finalized.

GUI detection: `/opt/unigine` exists and is non-empty.
Remove: delete the tree, the desktop file, and the icon.
Subtitle: "Guided install: agree to EULA → download .run → installs Browser
to /opt/unigine".

## 5. Icons

Ship three PNGs in `src/icons/apps/` following the existing naming
pattern, sourced from official project artwork:

- O3DE (o3de.org press kit)
- Unreal Engine (Epic branding asset)
- Unigine (vendor logo)

The list UI falls back to the colored-letter badge if a PNG is missing, so
icons are non-blocking.

## 6. Error handling

- O3DE: if `copr enable` or the repoquery finds no `o3deNNNN` package,
  fail with a clear log line (repo unreachable or chroot missing) rather
  than installing nothing silently.
- Unreal: reject non-zip picks; unzip failures leave no partial
  `/opt/unreal-engine` (extract to a temp dir, move into place).
- Unigine: if the `.run` exits nonzero, remove the partial
  `/opt/unigine` and report the exit code.

## 7. Testing and review gates

- O3DE: verify COPR enable + repoquery + install in an EL10 container.
- Unreal and Unigine: manual smoke test of the guided flows where
  feasible; at minimum, dry-run the helper functions with a dummy archive.
- Before the PR:
  1. Code-review pass against current architecture (helper dispatch table,
     badge rendering, EL gating, packaging file lists).
  2. `/security-review` on the branch. Sensitive spots are all in the root
     helper: COPR enable, archive extraction to `/opt` (zip-slip, path
     validation on user-picked files), `chown -R`, and executing a
     user-supplied `.run` as root.
