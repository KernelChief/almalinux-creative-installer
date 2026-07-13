# New Apps (O3DE, Unreal Engine 5.8, Unigine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three game engines to the installer catalog (Open 3D Engine via COPR, Unreal Engine 5.8 and Unigine via guided installs) plus a reusable BETA badge.

**Architecture:** Each app gets a bespoke install type in the single-file PyQt GUI (`src/almalinux-creative-installer`) and matching `install_<app>` / `remove_<app>` functions in the root helper (`src/almalinux-creative-installer-helper`), exactly like the existing `resolve` / `3dcoat` / `jangafx` / `gaffer` types. The BETA badge is a new optional `"beta": True` app field rendered as a chip next to the app name, same construction as the existing EL chip.

**Tech Stack:** Python 3 + PyQt5/PyQt6 (via `src/qtcompat.py`), Bash root helper dispatched over pkexec, dnf/COPR.

**Spec:** `docs/superpowers/specs/2026-07-01-new-apps-o3de-unreal-unigine-design.md`

## Global Constraints

- No em dashes in prose (README, docs, comments, commit messages). Use periods, commas, colons, or parentheses. The `→` arrow in UI subtitle strings is an existing convention and is fine.
- No `Co-Authored-By` trailers on commits.
- Branch: `feat/new-apps-o3de-unreal-unigine` (already created, spec committed).
- Commit with explicit paths only (`git add <paths>`); a stray modified `.gitignore` exists in the working tree and must NOT be committed.
- No test suite exists in this repo. Every task's test cycle is: `python3 -m py_compile src/almalinux-creative-installer` for the GUI and `bash -n src/almalinux-creative-installer-helper` for the helper, plus the behavior probes given per task. Run them exactly as written.
- Qt idioms in this codebase (both PyQt5 and PyQt6 compatible): `QMessageBox.StandardButton.Ok`, `QMessageBox.ButtonRole.ActionRole`, `msg.exec()`, `msg.clickedButton()` compared with `==`.
- Desktop entries go in the invoking user's `~/.local/share/applications` (JangaFX/Gaffer convention), NOT `/usr/share/applications`. This deviates from the spec text on purpose: follow the codebase convention.
- Helper style: `set -euo pipefail` is active; every function logs via `log "..."`; user resolution via `require_invoking_user` / `require_invoking_user_home`.

---

### Task 1: BETA chip + app entries + maintainer guide

**Files:**
- Modify: `src/almalinux-creative-installer` (constants ~line 33, maintainer guide comment ~lines 41-54, `APPS` ~line 99, `_make_app_row` ~line 1095)

**Interfaces:**
- Produces: app dicts with ids `"o3de"`, `"unreal"`, `"unigine"` and types of the same names; optional `"beta": True` field rendered as a chip. Later tasks wire buttons, subtitles, state, flows, and helper actions to these ids/types.

- [ ] **Step 1: Add URL constants**

In `src/almalinux-creative-installer`, directly after the `GAFFER_URL` line (line 33), add:

```python
UNREAL_URL  = "https://www.unrealengine.com/linux"
UNIGINE_URL = "https://developer.unigine.com/en/downloads"
UNIGINE_EULA_URL = "https://developer.unigine.com/en/eula"
```

(The EULA URL was verified live on 2026-07-01: HTTP 200.)

- [ ] **Step 2: Update the maintainer guide comment**

In the "HOW TO ADD / EDIT APPS" comment block, change line 45 from:

```python
# 2) Pick a supported "type": dnf, flatpak, resolve, 3dcoat
```

to:

```python
# 2) Pick a supported "type": dnf, flatpak, resolve, 3dcoat, o3de, unreal, unigine
```

and after the `"el"` bullet (line 52 ends `...both.`), add a new bullet before bullet 6:

```python
# 5b) Optional: add "beta": True for pre-release or experimental apps.
#    The row shows an amber BETA chip next to the app name.
```

- [ ] **Step 3: Add the three APPS entries**

Insert after the `godots` entry (line 99), before `appimagelauncher`:

```python
    {"id": "o3de",              "name": "Open 3D Engine",   "type": "o3de",    "icon_appid": "org.o3de.O3DE",                           "category": "Game Engines",        "el": [10], "beta": True},
    {"id": "unreal",            "name": "Unreal Engine 5.8","type": "unreal",  "icon_appid": "com.epicgames.UnrealEngine",              "category": "Game Engines",        "beta": True},
    {"id": "unigine",           "name": "Unigine",          "type": "unigine", "icon_appid": "com.unigine.Browser",                     "category": "Game Engines"},
```

Notes: `"el": [10]` on O3DE only (the COPR has only a `centos-stream-10-x86_64` chroot). Unreal and Unigine omit `el` (works on EL9 and EL10, existing convention). The `icon_appid` values match the PNG filenames Task 6 ships; if the PNGs are absent the UI falls back to a colored letter badge, which is acceptable.

- [ ] **Step 4: Render the BETA chip**

In `_make_app_row`, the EL chip block ends with `name_row.addWidget(el_chip)` followed by `name_row.addStretch()` (line 1096). Insert between them, at the same indent level as the `el_versions = app.get("el")` statement:

```python
        if app.get("beta"):
            beta_chip = QLabel("BETA")
            beta_chip.setStyleSheet(
                "background: rgba(230,160,50,0.20); color: #d29a3d;"
                " border-radius: 4px; padding: 1px 5px;"
                " font-size: 10px; font-weight: 600;"
            )
            beta_chip.setToolTip("Pre-release / experimental build")
            name_row.addWidget(beta_chip)
```

The fixed amber (#d29a3d) reads on both the dark and light themes, mirroring how the EL chip uses one fixed rgba background.

- [ ] **Step 5: Verify syntax**

Run: `python3 -m py_compile src/almalinux-creative-installer && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add src/almalinux-creative-installer
git commit -m "feat(ui): add BETA chip and catalog entries for O3DE, Unreal Engine 5.8, Unigine"
```

---

### Task 2: Open 3D Engine (GUI wiring + helper)

**Files:**
- Modify: `src/almalinux-creative-installer` (button wiring ~line 1159, `_subtitle_for_app` ~line 1213, `refresh_app_state` ~line 1443, new methods after `remove_gaffer_flow` ~line 2358)
- Modify: `src/almalinux-creative-installer-helper` (new functions after `remove_3dcoat` ~line 871, dispatcher ~line 922, usage text ~line 934)

**Interfaces:**
- Consumes: app id `"o3de"` / type `"o3de"` from Task 1; existing `run_helper_with_callback(args, on_success, app_id, progress_segment)`, `set_app_busy`, `_set_app_progress_fraction`, `_finish_app_action`, `_set_status_badge`.
- Produces: GUI methods `_o3de_installed()`, `install_o3de_flow()`, `remove_o3de_flow()`; helper actions `install_o3de` (no args), `remove_o3de` (no args).

- [ ] **Step 1: Wire the row buttons**

In `_make_app_row`, after the `elif app["type"] == "gaffer":` block (line 1159), add:

```python
        elif app["type"] == "o3de":
            install_btn.clicked.connect(lambda: self.install_o3de_flow())
            remove_btn.clicked.connect(lambda: self.remove_o3de_flow())
```

- [ ] **Step 2: Add the subtitle**

In `_subtitle_for_app`, after the `gaffer` case (line 1213), add:

```python
        if app["type"] == "o3de":
            return "Installed via COPR (hellaenergy/o3de), latest release line"
```

- [ ] **Step 3: Add the state branch**

In `refresh_app_state`, after the `gaffer` branch (ends line 1443), add:

```python
        if app["type"] == "o3de":
            installed = self._o3de_installed()
            self._set_status_badge(w["status"], "Installed" if installed else "Not installed",
                                   "installed" if installed else "missing")
            w["install"].setEnabled(not installed)
            w["remove"].setEnabled(installed)
            return
```

("Not installed"/"missing" rather than "Guided install"/"available": O3DE is a one-click dnf-style install, not a guided flow.)

- [ ] **Step 4: Add detection and flows**

After `remove_gaffer_flow` (line 2358), before the `_THEME_COLORS` module globals, add:

```python

    def _o3de_installed(self):
        out = subprocess.run(
            ["rpm", "-qa", "--qf", "%{NAME}\n", "o3de*"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
        ).stdout
        return any(re.fullmatch(r"o3de\d{4}", line.strip()) for line in out.splitlines())

    def install_o3de_flow(self):
        self.set_app_busy("o3de", True, "Installing…")
        self._set_app_progress_fraction("o3de", 0.02)
        self.run_helper_with_callback(
            ["install_o3de"],
            on_success=lambda: self._finish_app_action("o3de"),
            app_id="o3de",
            progress_segment=(0.02, 0.98),
        )

    def remove_o3de_flow(self):
        if not self._o3de_installed():
            self.append_log("ℹ️ Open 3D Engine does not appear to be installed.\n")
            self.refresh_app_state("o3de")
            return
        reply = QMessageBox.question(
            self, "Uninstall Open 3D Engine?",
            "This will remove all installed o3de packages and disable the hellaenergy/o3de COPR repo.",
            QMessageBox.StandardButton.Ok | QMessageBox.StandardButton.Cancel,
        )
        if reply != QMessageBox.StandardButton.Ok:
            return
        self.set_app_busy("o3de", True, "Removing…")
        self._set_app_progress_fraction("o3de", 0.02)
        self.run_helper_with_callback(
            ["remove_o3de"],
            on_success=lambda: self._finish_app_action("o3de"),
            app_id="o3de",
            progress_segment=(0.02, 0.98),
        )
```

(`re` and `subprocess` are already imported at module top.)

- [ ] **Step 5: Add the helper functions**

In `src/almalinux-creative-installer-helper`, after `remove_3dcoat` (line 871), before the Dispatcher comment, add:

```bash
# -------------------------------------------------
# Open 3D Engine (COPR)
# -------------------------------------------------
O3DE_COPR="hellaenergy/o3de"
# The COPR publishes EL builds only for the centos-stream-10 chroot; a bare
# "copr enable" on AlmaLinux 10 would look for epel-10, which does not exist
# in this project, so the chroot must be passed explicitly.
O3DE_COPR_CHROOT="centos-stream-10-x86_64"

install_o3de() {
  log "Ensuring dnf copr plugin..."
  dnf -y install 'dnf-command(copr)'

  log "Enabling COPR ${O3DE_COPR} (chroot ${O3DE_COPR_CHROOT})..."
  dnf -y copr enable "${O3DE_COPR}" "${O3DE_COPR_CHROOT}"

  # Packages use versioned-major naming (o3deNNNN, NNNN = YYMM). Majors are
  # co-installable; install the newest release line.
  log "Detecting the latest Open 3D Engine release line..."
  local latest
  latest="$(dnf -q repoquery --qf '%{name}\n' 'o3de[0-9][0-9][0-9][0-9]' 2>/dev/null \
              | grep -E '^o3de[0-9]{4}$' | sort -u -V | tail -1 || true)"
  if [[ -z "${latest}" ]]; then
    echo "ERROR: no o3deNNNN package found in ${O3DE_COPR} (repo unreachable or chroot missing)." >&2
    exit 4
  fi

  log "Installing ${latest}..."
  dnf -y install "${latest}"
  log "Open 3D Engine installed (${latest})."
}

remove_o3de() {
  log "Removing Open 3D Engine packages..."
  local pkgs
  mapfile -t pkgs < <(rpm -qa --qf '%{NAME}\n' 'o3de*' | grep -E '^o3de[0-9]{4}(-devel)?$' || true)
  if (( ${#pkgs[@]} )); then
    dnf -y remove "${pkgs[@]}"
  else
    log "No o3de packages installed."
  fi

  log "Disabling COPR ${O3DE_COPR}..."
  dnf -y copr remove "${O3DE_COPR}" || true
  log "Open 3D Engine removed."
}
```

- [ ] **Step 6: Register in the dispatcher and usage text**

In the dispatcher `case` block, after the Gaffer pair (line 922), add:

```bash
  # Open 3D Engine
  install_o3de)          install_o3de;;
  remove_o3de)           remove_o3de;;
```

In the usage heredoc at the bottom of the file, after the Gaffer action lines, add exactly:

```
  install_o3de
  remove_o3de
```

- [ ] **Step 7: Verify syntax**

Run: `python3 -m py_compile src/almalinux-creative-installer && bash -n src/almalinux-creative-installer-helper && echo OK`
Expected: `OK`

Also run shellcheck if available (non-blocking):
`shellcheck -x src/almalinux-creative-installer-helper || true`

- [ ] **Step 8: Commit**

```bash
git add src/almalinux-creative-installer src/almalinux-creative-installer-helper
git commit -m "feat(o3de): install Open 3D Engine from the hellaenergy COPR, latest release line (closes #73)"
```

---

### Task 3: Unreal Engine 5.8 (GUI wiring + helper)

**Files:**
- Modify: `src/almalinux-creative-installer` (button wiring, subtitle, state branch, flows; same anchor points as Task 2)
- Modify: `src/almalinux-creative-installer-helper` (new functions + dispatcher + usage)

**Interfaces:**
- Consumes: app id `"unreal"` / type `"unreal"`, `UNREAL_URL` from Task 1; same GUI helpers as Task 2.
- Produces: GUI methods `_unreal_installed()`, `install_unreal_flow()`, `pick_unreal_zip()`, `remove_unreal_flow()`; helper actions `install_unreal <zip>`, `remove_unreal`.

- [ ] **Step 1: Wire the row buttons**

After the `o3de` elif added in Task 2:

```python
        elif app["type"] == "unreal":
            install_btn.clicked.connect(lambda: self.install_unreal_flow())
            remove_btn.clicked.connect(lambda: self.remove_unreal_flow())
```

- [ ] **Step 2: Add the subtitle**

After the `o3de` subtitle case:

```python
        if app["type"] == "unreal":
            return "Guided install: log in to Epic → download Linux zip → extracts to /opt/unreal-engine (EL9 and EL10)"
```

- [ ] **Step 3: Add the state branch**

After the `o3de` branch in `refresh_app_state`:

```python
        if app["type"] == "unreal":
            installed = self._unreal_installed()
            self._set_status_badge(w["status"], "Installed" if installed else "Guided install",
                                   "installed" if installed else "available")
            w["install"].setEnabled(not installed)
            w["remove"].setEnabled(installed)
            return
```

- [ ] **Step 4: Add detection and flows**

After the `remove_o3de_flow` method added in Task 2:

```python

    def _unreal_installed(self):
        return Path("/opt/unreal-engine/Engine/Binaries/Linux/UnrealEditor").is_file()

    def install_unreal_flow(self):
        self.set_app_busy("unreal", True, "Waiting for file…")
        self._set_app_progress_fraction("unreal", 0.02)
        if shutil.which("xdg-open"):
            subprocess.Popen(["xdg-open", UNREAL_URL])
            self.append_log("Opened the Unreal Engine Linux page (Epic account required).\n")
        self.append_log(
            "Download the Linux zip (e.g. Linux_Unreal_Engine_5.8.0_preview-1.zip), then select it below.\n"
        )
        self.pick_unreal_zip()

    def pick_unreal_zip(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Unreal Engine Linux zip",
            "",
            "Zip archives (*.zip);;All files (*)",
        )
        if not path:
            self._finish_app_action("unreal")
            return
        self._set_app_progress_fraction("unreal", 0.05)
        self.run_helper_with_callback(
            ["install_unreal", path],
            on_success=lambda: self._finish_app_action("unreal"),
            app_id="unreal",
            progress_segment=(0.05, 0.98),
        )

    def remove_unreal_flow(self):
        if not self._unreal_installed():
            self.append_log("ℹ️ Unreal Engine does not appear to be installed.\n")
            self.refresh_app_state("unreal")
            return
        reply = QMessageBox.question(
            self, "Uninstall Unreal Engine?",
            "This will remove /opt/unreal-engine and the desktop entry.",
            QMessageBox.StandardButton.Ok | QMessageBox.StandardButton.Cancel,
        )
        if reply != QMessageBox.StandardButton.Ok:
            return
        self.set_app_busy("unreal", True, "Removing…")
        self._set_app_progress_fraction("unreal", 0.02)
        self.run_helper_with_callback(
            ["remove_unreal"],
            on_success=lambda: self._finish_app_action("unreal"),
            app_id="unreal",
            progress_segment=(0.02, 0.98),
        )
```

- [ ] **Step 5: Add the helper functions**

After `remove_o3de` in the helper:

```bash
# -------------------------------------------------
# Unreal Engine (guided zip install)
# -------------------------------------------------
install_unreal() {
  local zip_path="${1:-}"
  local install_dir="/opt/unreal-engine"
  local tmp_dir

  [[ -n "${zip_path}" ]] || { echo "ERROR: missing zip path" >&2; exit 2; }
  [[ -f "${zip_path}" ]] || { echo "ERROR: zip not found: ${zip_path}" >&2; exit 2; }
  case "${zip_path}" in
    *.zip) ;;
    *) echo "ERROR: expected a .zip archive, got: ${zip_path}" >&2; exit 2;;
  esac

  log "Ensuring unzip is available..."
  command -v unzip >/dev/null 2>&1 || dnf -y install unzip

  local user home
  user="$(require_invoking_user)"
  home="$(require_invoking_user_home)"

  # Extract under /opt, not /tmp: the engine is tens of GB and /tmp is
  # commonly a size-limited tmpfs. Same filesystem also makes mv instant.
  tmp_dir="$(mktemp -d /opt/.unreal-tmp-XXXXXX)"
  # shellcheck disable=SC2064
  trap "rm -rf '${tmp_dir}'" EXIT

  log "Extracting Unreal Engine archive (large, this can take several minutes)..."
  unzip -q "${zip_path}" -d "${tmp_dir}"

  # The zip either contains Engine/ at the root or a single top-level
  # versioned folder (e.g. Linux_Unreal_Engine_5.8.0_preview-1/).
  local src_dir
  if [[ -d "${tmp_dir}/Engine" ]]; then
    src_dir="${tmp_dir}"
  else
    src_dir="$(find "${tmp_dir}" -maxdepth 1 -mindepth 1 -type d | head -1)"
  fi
  if [[ -z "${src_dir}" || ! -d "${src_dir}/Engine" ]]; then
    echo "ERROR: no Engine/ directory found in the archive." >&2
    exit 2
  fi

  local editor="Engine/Binaries/Linux/UnrealEditor"
  [[ -f "${src_dir}/${editor}" ]] || { echo "ERROR: ${editor} not found in the archive." >&2; exit 2; }

  log "Installing to ${install_dir}..."
  rm -rf "${install_dir}"
  mv "${src_dir}" "${install_dir}"
  chmod +x "${install_dir}/${editor}"

  # The editor writes into its own tree (DerivedDataCache, Intermediate),
  # so the invoking user must own it.
  log "Setting ownership (large tree, this can take a moment)..."
  chown -R "${user}:${user}" "${install_dir}"

  local desktop_dir="${home}/.local/share/applications"
  mkdir -p "${desktop_dir}"
  chown "${user}:${user}" "${desktop_dir}"
  local icon_png="/usr/share/almalinux-creative-installer/icons/apps/com.epicgames.UnrealEngine.png"
  cat > "${desktop_dir}/UnrealEngine.desktop" <<EOF
[Desktop Entry]
Name=Unreal Engine 5.8 (preview)
Comment=Unreal Editor
Exec=${install_dir}/${editor}
Icon=${icon_png}
Type=Application
Terminal=false
Categories=Development;Graphics;
StartupWMClass=UnrealEditor
EOF
  chown "${user}:${user}" "${desktop_dir}/UnrealEngine.desktop"

  log "Unreal Engine installation complete. First launch compiles shaders and can take a long time."
}

remove_unreal() {
  local user home
  user="$(require_invoking_user)"
  home="$(require_invoking_user_home)"

  log "Removing Unreal Engine..."

  if [[ -d /opt/unreal-engine ]]; then
    rm -rf /opt/unreal-engine
    log "Removed /opt/unreal-engine"
  fi

  local desktop="${home}/.local/share/applications/UnrealEngine.desktop"
  if [[ -f "${desktop}" ]]; then
    rm -f "${desktop}"
    log "Removed desktop entry"
  fi

  log "Unreal Engine removed."
}
```

Note on `mv "${src_dir}" "${install_dir}"` when `src_dir == tmp_dir`: after the mv, `tmp_dir` no longer exists, so the EXIT trap's `rm -rf` is a harmless no-op on a nonexistent path. Do not "fix" this.

- [ ] **Step 6: Register in the dispatcher and usage text**

```bash
  # Unreal Engine
  install_unreal)        install_unreal "${2:-}";;
  remove_unreal)         remove_unreal;;
```

In the usage heredoc, after the O3DE action lines, add exactly:

```
  install_unreal <zip>
  remove_unreal
```

- [ ] **Step 7: Verify syntax + a dry helper probe**

Run: `python3 -m py_compile src/almalinux-creative-installer && bash -n src/almalinux-creative-installer-helper && echo OK`
Expected: `OK`

Probe the validation path without root (must fail cleanly before any privileged work):

Run: `bash src/almalinux-creative-installer-helper install_unreal /nonexistent.zip; echo "exit=$?"`
Expected: `ERROR: zip not found: /nonexistent.zip` and `exit=2`

Run: `bash src/almalinux-creative-installer-helper install_unreal /etc/hostname; echo "exit=$?"`
Expected: `ERROR: expected a .zip archive...` and `exit=2`

- [ ] **Step 8: Commit**

```bash
git add src/almalinux-creative-installer src/almalinux-creative-installer-helper
git commit -m "feat(unreal): guided Unreal Engine 5.8 install from the Epic Linux zip (closes #70)"
```

---

### Task 4: Unigine (GUI wiring with EULA gate + helper)

**Files:**
- Modify: `src/almalinux-creative-installer` (button wiring, subtitle, state branch, flows)
- Modify: `src/almalinux-creative-installer-helper` (new functions + dispatcher + usage)

**Interfaces:**
- Consumes: app id `"unigine"` / type `"unigine"`, `UNIGINE_URL`, `UNIGINE_EULA_URL` from Task 1.
- Produces: GUI methods `_unigine_installed()`, `install_unigine_flow()`, `pick_unigine_run()`, `remove_unigine_flow()`; helper actions `install_unigine <run>`, `remove_unigine`.

- [ ] **Step 1: Wire the row buttons**

After the `unreal` elif:

```python
        elif app["type"] == "unigine":
            install_btn.clicked.connect(lambda: self.install_unigine_flow())
            remove_btn.clicked.connect(lambda: self.remove_unigine_flow())
```

- [ ] **Step 2: Add the subtitle**

After the `unreal` subtitle case:

```python
        if app["type"] == "unigine":
            return "Guided install: agree to EULA → pick vendor .run → SDK Browser in /opt/unigine"
```

- [ ] **Step 3: Add the state branch**

After the `unreal` branch in `refresh_app_state`:

```python
        if app["type"] == "unigine":
            installed = self._unigine_installed()
            self._set_status_badge(w["status"], "Installed" if installed else "Guided install",
                                   "installed" if installed else "available")
            w["install"].setEnabled(not installed)
            w["remove"].setEnabled(installed)
            return
```

- [ ] **Step 4: Add detection and flows (with the EULA gate)**

After the `remove_unreal_flow` method:

```python

    def _unigine_installed(self):
        base = Path("/opt/unigine")
        return base.is_dir() and any(base.iterdir())

    def install_unigine_flow(self):
        msg = QMessageBox(self)
        msg.setWindowTitle("UNIGINE SDK License Agreement")
        msg.setTextFormat(Qt.TextFormat.RichText)
        msg.setText(
            'Installing Unigine runs the vendor installer, which is governed by the '
            '<a href="{}">UNIGINE SDK License Agreement</a>.'.format(UNIGINE_EULA_URL)
        )
        msg.setInformativeText(
            "The vendor installer normally shows this EULA in a terminal. Because the "
            "install runs unattended here, it will be accepted on your behalf.\n\n"
            'Click "I Agree" only if you have read and accept the EULA.'
        )
        msg.setIcon(QMessageBox.Icon.Question)
        btn_agree = msg.addButton("I Agree", QMessageBox.ButtonRole.AcceptRole)
        msg.addButton(QMessageBox.StandardButton.Cancel)
        msg.exec()
        if msg.clickedButton() != btn_agree:
            return

        self.set_app_busy("unigine", True, "Waiting for file…")
        self._set_app_progress_fraction("unigine", 0.02)
        if shutil.which("xdg-open"):
            subprocess.Popen(["xdg-open", UNIGINE_URL])
            self.append_log("Opened the UNIGINE downloads page.\n")
        self.append_log(
            "Download the Linux .run installer (the filename changes with each version), then select it below.\n"
        )
        self.pick_unigine_run()

    def pick_unigine_run(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select UNIGINE .run installer",
            "",
            "Run installers (*.run);;All files (*)",
        )
        if not path:
            self._finish_app_action("unigine")
            return
        self._set_app_progress_fraction("unigine", 0.05)
        self.run_helper_with_callback(
            ["install_unigine", path],
            on_success=lambda: self._finish_app_action("unigine"),
            app_id="unigine",
            progress_segment=(0.05, 0.98),
        )

    def remove_unigine_flow(self):
        if not self._unigine_installed():
            self.append_log("ℹ️ Unigine does not appear to be installed.\n")
            self.refresh_app_state("unigine")
            return
        reply = QMessageBox.question(
            self, "Uninstall Unigine?",
            "This will remove /opt/unigine (including the SDK Browser and any SDKs "
            "downloaded into it) and the desktop entry.",
            QMessageBox.StandardButton.Ok | QMessageBox.StandardButton.Cancel,
        )
        if reply != QMessageBox.StandardButton.Ok:
            return
        self.set_app_busy("unigine", True, "Removing…")
        self._set_app_progress_fraction("unigine", 0.02)
        self.run_helper_with_callback(
            ["remove_unigine"],
            on_success=lambda: self._finish_app_action("unigine"),
            app_id="unigine",
            progress_segment=(0.02, 0.98),
        )
```

- [ ] **Step 5: Add the helper functions**

After `remove_unreal` in the helper:

```bash
# -------------------------------------------------
# Unigine (guided .run install)
# -------------------------------------------------
install_unigine() {
  local run_path="${1:-}"
  local install_dir="/opt/unigine"

  [[ -n "${run_path}" ]] || { echo "ERROR: missing .run path" >&2; exit 2; }
  [[ -f "${run_path}" ]] || { echo "ERROR: file not found: ${run_path}" >&2; exit 2; }
  case "${run_path}" in
    *.run) ;;
    *) echo "ERROR: expected a .run installer, got: ${run_path}" >&2; exit 2;;
  esac

  local user home
  user="$(require_invoking_user)"
  home="$(require_invoking_user_home)"

  log "Preparing ${install_dir}..."
  rm -rf "${install_dir}"
  mkdir -p "${install_dir}"

  # The vendor installer creates the SDK Browser folder next to the .run
  # file, so run it from inside the install dir.
  local run_copy
  run_copy="${install_dir}/$(basename "${run_path}")"
  cp "${run_path}" "${run_copy}"
  chmod +x "${run_copy}"

  # The installer shows its EULA on the terminal and asks for confirmation.
  # The GUI already collected explicit agreement, so feed the acceptance
  # here. "yes" dies with SIGPIPE when the installer stops reading, which
  # pipefail would misreport as failure, so toggle it around the pipeline.
  log "Running the UNIGINE installer (EULA accepted in the GUI)..."
  local status=0
  set +o pipefail
  ( cd "${install_dir}" && yes | "${run_copy}" ) || status=$?
  set -o pipefail
  rm -f "${run_copy}"
  if (( status != 0 )); then
    echo "ERROR: UNIGINE installer exited with status ${status}." >&2
    rm -rf "${install_dir}"
    exit 1
  fi

  # Locate the Browser (launcher) executable the installer created.
  local browser_exe
  browser_exe="$(find "${install_dir}" -maxdepth 3 -type f -perm -u+x \
                   \( -iname '*browser*' -o -iname '*launcher*' \) 2>/dev/null | sort | head -1)"
  if [[ -z "${browser_exe}" ]]; then
    browser_exe="$(find "${install_dir}" -maxdepth 3 -type f -perm -u+x \
                     ! -name '*.so*' ! -name '*.run' 2>/dev/null | sort | head -1)"
  fi
  if [[ -z "${browser_exe}" ]]; then
    echo "ERROR: UNIGINE Browser executable not found under ${install_dir}." >&2
    exit 2
  fi
  log "Found Browser executable: ${browser_exe}"

  # The Browser self-updates and downloads SDKs into its own folder, so the
  # invoking user must own the tree.
  chown -R "${user}:${user}" "${install_dir}"

  # Under pkexec the vendor writes its nameless, iconless desktop entry into
  # root's home. Discard it and write a proper one for the invoking user.
  rm -f /root/.local/share/applications/*nigine*.desktop 2>/dev/null || true

  local desktop_dir="${home}/.local/share/applications"
  mkdir -p "${desktop_dir}"
  chown "${user}:${user}" "${desktop_dir}"
  local icon_png="/usr/share/almalinux-creative-installer/icons/apps/com.unigine.Browser.png"
  cat > "${desktop_dir}/UnigineBrowser.desktop" <<EOF
[Desktop Entry]
Name=UNIGINE SDK Browser
Comment=UNIGINE engine launcher
Exec=${browser_exe}
Icon=${icon_png}
Type=Application
Terminal=false
Categories=Development;Graphics;
EOF
  chown "${user}:${user}" "${desktop_dir}/UnigineBrowser.desktop"

  log "UNIGINE installed. Create your UNIGINE account inside the SDK Browser (vendor policy)."
}

remove_unigine() {
  local user home
  user="$(require_invoking_user)"
  home="$(require_invoking_user_home)"

  log "Removing Unigine..."

  if [[ -d /opt/unigine ]]; then
    rm -rf /opt/unigine
    log "Removed /opt/unigine"
  fi

  local desktop="${home}/.local/share/applications/UnigineBrowser.desktop"
  if [[ -f "${desktop}" ]]; then
    rm -f "${desktop}"
    log "Removed desktop entry"
  fi

  log "Unigine removed."
}
```

- [ ] **Step 6: Register in the dispatcher and usage text**

```bash
  # Unigine
  install_unigine)       install_unigine "${2:-}";;
  remove_unigine)        remove_unigine;;
```

In the usage heredoc, after the Unreal action lines, add exactly:

```
  install_unigine <run>
  remove_unigine
```

- [ ] **Step 7: Verify syntax + validation probes**

Run: `python3 -m py_compile src/almalinux-creative-installer && bash -n src/almalinux-creative-installer-helper && echo OK`
Expected: `OK`

Run: `bash src/almalinux-creative-installer-helper install_unigine /etc/hostname; echo "exit=$?"`
Expected: `ERROR: expected a .run installer...` and `exit=2`

- [ ] **Step 8: Commit**

```bash
git add src/almalinux-creative-installer src/almalinux-creative-installer-helper
git commit -m "feat(unigine): guided Unigine install with GUI EULA gate (closes #67)"
```

**KNOWN VERIFICATION GAP (carry to the manual QA step, Task 7):** the auto-accept behavior of the real UNIGINE `.run` (whether `yes |` satisfies its EULA prompt, and the actual name of the Browser executable/folder) has not been tested against a real installer. This must be exercised manually before merge.

---

### Task 5: README and website updates

**Files:**
- Modify: `README.md` (EL availability table ~line 191, Game Engines bullets ~line 245)
- Modify: `docs/index.html` (Game Development card ~lines 1035-1048)

**Interfaces:**
- Consumes: final app names and install methods from Tasks 2-4.

- [ ] **Step 1: README EL table rows**

After the `| Natron ... |` row (line 191), add:

```markdown
| Open 3D Engine    | ❌  | ✅   | Via COPR (hellaenergy/o3de), BETA |
| Unreal Engine 5.8 | ✅  | ✅   | Guided vendor install (Epic account), preview build |
| Unigine           | ✅  | ✅   | Guided vendor install (.run) |
```

- [ ] **Step 2: README Game Engines bullets**

Under `- **Game Engines**` (after the `Godots` bullet, line 245), add:

```markdown
  - Open 3D Engine *(via COPR, EL10 only, BETA)*
  - Unreal Engine 5.8 *(guided vendor install, preview build)*
  - Unigine *(guided vendor install)*
```

- [ ] **Step 3: Website Game Development card**

In `docs/index.html`, change the count on line 1040 from `<div class="count">3 apps</div>` to `<div class="count">6 apps</div>`, and after `<span class="app-tag">Asset Manager Studio</span>` (line 1046) add:

```html
          <span class="app-tag">Open 3D Engine</span>
          <span class="app-tag">Unreal Engine 5.8</span>
          <span class="app-tag">Unigine</span>
```

- [ ] **Step 4: Verify**

Run: `grep -c "Open 3D Engine" README.md docs/index.html`
Expected: `README.md:2` and `docs/index.html:1`

- [ ] **Step 5: Commit**

```bash
git add README.md docs/index.html
git commit -m "docs: list O3DE, Unreal Engine 5.8, and Unigine in README and site"
```

---

### Task 6: App icons (best effort, non-blocking)

**Files:**
- Create: `src/icons/apps/org.o3de.O3DE.png`
- Create: `src/icons/apps/com.epicgames.UnrealEngine.png`
- Create: `src/icons/apps/com.unigine.Browser.png`

**Interfaces:**
- Consumes: `icon_appid` values from Task 1. The RPM packaging globs `src/icons/apps/*.png`, so no packaging changes are needed.

- [ ] **Step 1: Source official logos**

Try, in order, for each app; stop at the first that yields a valid PNG around 64x64 or larger:

- O3DE: the o3de GitHub org avatar: `curl -fLo /tmp/o3de.png https://avatars.githubusercontent.com/u/84449732?s=128`
- Unreal: the EpicGames GitHub org avatar: `curl -fLo /tmp/unreal.png https://avatars.githubusercontent.com/u/3732406?s=128`
- Unigine: the Unigine GitHub org avatar: `curl -fLo /tmp/unigine.png https://avatars.githubusercontent.com/u/40636663?s=128`

Verify each with: `file /tmp/<name>.png` (expected: `PNG image data`). If a download fails or is not a PNG, skip that icon: the UI falls back to a colored letter badge and nothing breaks.

- [ ] **Step 2: Install into the repo**

```bash
cp /tmp/o3de.png    src/icons/apps/org.o3de.O3DE.png
cp /tmp/unreal.png  src/icons/apps/com.epicgames.UnrealEngine.png
cp /tmp/unigine.png src/icons/apps/com.unigine.Browser.png
```

(Only the ones that downloaded successfully.)

- [ ] **Step 3: Commit whatever landed**

```bash
git add src/icons/apps/org.o3de.O3DE.png src/icons/apps/com.epicgames.UnrealEngine.png src/icons/apps/com.unigine.Browser.png
git commit -m "feat(icons): bundle O3DE, Unreal Engine, and Unigine app icons"
```

If none landed, skip this commit entirely and note it in the final report.

---

### Task 7: End-to-end verification

**Files:** none modified; verification only.

- [ ] **Step 1: Full syntax pass**

Run:
```bash
python3 -m py_compile src/almalinux-creative-installer && \
bash -n src/almalinux-creative-installer-helper && echo SYNTAX-OK
```
Expected: `SYNTAX-OK`

- [ ] **Step 2: O3DE COPR logic in an EL10 container (needs network)**

```bash
podman run --rm quay.io/almalinuxorg/almalinux:10 bash -c "
  dnf -y -q install 'dnf-command(copr)' &&
  dnf -y -q copr enable hellaenergy/o3de centos-stream-10-x86_64 &&
  dnf -q repoquery --qf '%{name}\n' 'o3de[0-9][0-9][0-9][0-9]' | grep -E '^o3de[0-9]{4}$' | sort -u -V | tail -1
"
```
Expected: prints the newest release line (currently `o3de2605`). If podman is unavailable, record that this check was skipped and why.

- [ ] **Step 3: GUI smoke test (requires a desktop session)**

Run `src/almalinux-creative-installer` locally and confirm:
- The three new rows appear under Game Engines.
- O3DE shows the EL10 chip plus the BETA chip; on an EL9 host it shows "Not compatible".
- Unreal shows the BETA chip and "Guided install"; Unigine shows "Guided install".
- Clicking Install on Unigine shows the EULA dialog first, and Cancel aborts cleanly.

If no desktop session is available, record the gap; this becomes part of manual QA.

- [ ] **Step 4: Manual QA items that need real artifacts (record, do not block)**

- Unigine: run a real vendor `.run` through the helper; confirm `yes |` satisfies the EULA prompt and the Browser executable discovery finds the right binary. Adjust `install_unigine` if the vendor prompt differs.
- Unreal: confirm the 5.8 preview zip layout (top-level folder vs root `Engine/`) against the real download.

---

### Task 8: Pre-PR review gates

Not part of this plan's code. After all tasks above are complete and committed:

1. Run a code-review pass over the branch diff (the repo's `/code-review` skill).
2. Run `/security-review` on the branch. Expected sensitive areas: root helper COPR enable, archive extraction under `/opt`, `chown -R`, executing a user-supplied `.run` as root behind the GUI EULA gate and pkexec authentication.
3. Fix findings, then open the PR referencing #73, #70, #67 (do not push without the user's go-ahead).
