# AlmaLinux Creative Installer — Roadmap

This document tracks the planned improvements to make AlmaLinux Creative Installer
the best onboarding tool for creative professionals (Media & Entertainment) on enterprise Linux.

---

## Phase 1 — Content & Quick Wins

### PR 1: Missing Apps
Add the most-requested creative applications that are currently absent:

| App | Category | Method |
|---|---|---|
| VLC | Animation & Video | Flatpak |
| OBS Studio | Animation & Video | Flatpak |
| HandBrake | Animation & Video | Flatpak |
| Shotcut | Animation & Video | Flatpak |
| Natron | Animation & Video | Flatpak |
| Inkscape | Image Processing | Flatpak |
| darktable | Image Processing | Flatpak |
| RawTherapee | Image Processing | Flatpak |
| digiKam | Image Processing | Flatpak |
| FontForge | Image Processing | Flatpak |
| DisplayCAL | Image Processing | Flatpak |
| FreeCAD | 3D | Flatpak |
| LMMS | Audio | Flatpak |
| Audacity | Audio | Flatpak |
| Carla | Audio | Flatpak |
| Hydrogen | Audio | Flatpak |

### PR 2: RPM Fusion Toggle
Add RPM Fusion Free/Non-Free status to the System Requirements panel with a one-click
enable button. Unlocks codec support (H.264, AAC, MP3) critical for video editors.

---

## Phase 2 — Architecture Cleanup

### PR 3: APPS → YAML Data File
Extract the embedded Python `APPS` list from the main script into `src/apps.yaml`.
- Enables community app contributions without Python knowledge
- Opens the door for translated descriptions
- Prerequisite for PR 7, PR 8, PR 10

### PR 4: Logging
Replace ad-hoc log display with Python's `logging` module.
Writes a persistent log to `~/.local/share/almalinux-creative-installer/install.log`
for better bug reporting.

---

## Phase 3 — UX Enhancements (GTK)

### PR 5: System Health Dashboard
Expand the System Requirements section with:
- Available disk space (warn if < 10 GB)
- RAM detection (warn if < 8 GB)
- GPU vendor detection via `lspci` (NVIDIA / AMD / Intel)
- Session type detection (Wayland vs X11)

### PR 6: Curated Bundles / Starter Packs
Add named installation profiles so users can install a complete workflow in one click:
- **Photography Suite** — darktable, RawTherapee, GIMP, Inkscape, digiKam
- **Video Production Suite** — Kdenlive, Natron, HandBrake, OBS Studio, VLC
- **3D & Animation Suite** — Blender, OpenToonz, MeshLab, FreeCAD
- **Music Production Suite** — Ardour, LMMS, Audacity, Carla, Hydrogen
- **Motion Graphics Suite** — Blender, Krita, Inkscape, Natron

### PR 7: Post-Install Guidance *(requires PR 3)*
After a successful installation, display a "What's Next" panel per app:
- Link to official documentation
- Known AlmaLinux gotchas (e.g. SELinux notes for Resolve)
- Suggested first steps

---

## Phase 4 — Qt Migration

### PR 8: Qt UI Rewrite *(requires PR 3, ideally PRs 5–7 merged)*
Replace the GTK3 Python UI with Qt for a look that matches the creative tools
users already know (Krita, Kdenlive, DaVinci Resolve, Blender are all Qt).

| Target | Framework | RPM Dependency |
|---|---|---|
| AlmaLinux 9 | PySide2 (Qt5) | `python3-pyside2` |
| AlmaLinux 10 | PySide6 (Qt6) | `python3-pyside6` |

The helper bash script and polkit policy remain unchanged.
A single Python compatibility shim handles both PySide versions:
```python
try:
    from PySide6 import QtWidgets, QtCore, QtGui
except ImportError:
    from PySide2 import QtWidgets, QtCore, QtGui
```

---

## Phase 5 — New Features (Qt-native)

### PR 9: First-Run Wizard *(requires PR 8)*
3-step onboarding flow using `QStackedWidget`:
1. "What do you do?" — role selection (Photographer, Video Editor, 3D Artist, Musician, All)
2. Bundle pre-selection based on role
3. Review & install

### PR 10: App Cards with Rich Info *(requires PR 8 + PR 3)*
Replace plain list rows with richer cards showing:
- App icon
- One-sentence description
- "Replaces Adobe X / similar to macOS Y" callout for switchers
- Estimated install size

### PR 11: Export / Import Profiles *(requires PR 8)*
Save and load a selected-apps list as a JSON "creative profile".
Designed for studio admins provisioning multiple workstations.

---

## Phase 6 — Quality

### PR 12: Test Suite + `--dry-run` *(requires PR 3)*
- Unit tests for YAML loading and app data validation
- Mock-based tests for helper invocation
- `--dry-run` CLI flag that simulates installs without executing system commands
- CI validation gate on the app data schema

---

## Dependency Graph

```
PR1 (apps)    ─┐
PR2 (RPM F.)  ─┤
PR3 (YAML)    ─┼─► PR7 (guidance) ─┐
PR4 (logging) ─┤                   ├─► PR8 (Qt) ─► PR9, PR10, PR11
PR5 (health)  ─┤                   │
PR6 (bundles) ─┘───────────────────┘
PR12 (tests)  ── any time after PR3
```

---

## Progress

| PR | Title | Status |
|---|---|---|
| 1 | Missing Apps | Planned |
| 2 | RPM Fusion Toggle | Planned |
| 3 | APPS → YAML Data File | Planned |
| 4 | Logging | Planned |
| 5 | System Health Dashboard | Planned |
| 6 | Curated Bundles | Planned |
| 7 | Post-Install Guidance | Planned |
| 8 | Qt Migration | Planned |
| 9 | First-Run Wizard | Planned |
| 10 | App Cards with Rich Info | Planned |
| 11 | Export / Import Profiles | Planned |
| 12 | Test Suite + --dry-run | Planned |
