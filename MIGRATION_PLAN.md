# Qt6 Migration Plan (Phase 1)

## Goal
Migrate the AlmaLinux Creative Installer UI to Qt6 (PySide6) while preserving existing behavior and security model.

## Deliverables (Phase 1)
- Identify UI dependencies and usage
- Map legacy widgets/APIs to Qt6 equivalents
- List build/packaging changes for Qt6 (PySide6)

## Qt6 Component Mapping (PySide6)
| Legacy Component / API | Qt6 Equivalent | Notes |
| --- | --- | --- |
| Window | `QMainWindow` or `QWidget` | Use `QMainWindow` with central widget. |
| Header bar | `QHBoxLayout` + `QToolButton` | Custom header row used in current UI. |
| Box layouts | `QVBoxLayout` / `QHBoxLayout` | Prefer layout managers. |
| Frame | `QGroupBox` | Provides framed grouping with title. |
| Notebook | `QTabWidget` | Tabs for Apps/Logs. |
| List box | `QListWidget` / `QListView` + custom widgets | Custom rows via `QListWidgetItem` + `QWidget`. |
| Label | `QLabel` | Text + alignment via `setAlignment`. |
| Button | `QPushButton` | Use signals/slots. |
| Icon button | `QToolButton` + `QIcon::fromTheme` | Use icon theme with fallback glyph. |
| Spinner | `QProgressBar` (indeterminate) | Spinner-like progress indicator. |
| Text view | `QPlainTextEdit` | Read-only log output. |
| Scrolled window | Built-in scrolling for text widgets | `QPlainTextEdit` already scrolls. |
| Check button | `QCheckBox` | For Krita remove prompt. |
| Message dialog | `QMessageBox` | Warning prompts. |
| File chooser | `QFileDialog` | For Resolve installer selection. |
| CSS provider | Qt Style Sheets (`setStyleSheet`) | Replace CSS class usage. |
| Idle add | `Signal`/dispatcher + `partial` | Ensure UI updates on main thread. |

## Build / Packaging Changes
- **Python bindings**
  - Use `python3-pyside6` (PySide6).
  - Add Qt6 runtime packages (`qt6-qtbase-gui`, `qt6-qtbase`, `qt6-qtbase-common`, `qt6-qtbase-plugins` as needed).
- **Desktop integration**
  - Keep `.desktop` and polkit policy files unchanged (unless icon or Exec changes).
- **Readme**
  - Update README to reference Qt6 instead of GTK.
- **Build system**
  - No CMake present; RPM spec is primary build definition.
  - Ensure Python dependencies in spec match chosen Qt binding.

## Module-by-Module Migration Plan (Phase 2)
1. **src/almalinux-creative-installer**
   - Replace legacy GTK imports with Qt6 (PySide6).
   - Recreate UI using Qt6 widgets/layouts.
   - Replace idle updates with Qt main-thread dispatcher.
   - Ensure logging, dialogs, and file pickers match GTK flows.
2. **src/packaging/almalinux-creative-installer.spec**
   - Swap GTK dependencies for PySide6 + Qt6 runtime packages.
3. **README.md**
   - Update description to mention Qt6.

## Open Decisions
- Select spinner implementation (Qt built-in progress bar or custom widget).

## Success Criteria (Phase 1)
- MIGRATION_PLAN.md created with widget mapping and build changes.
- Plan reviewed and approved before starting Phase 2 implementation.
