# Contributing to AlmaLinux Creative Installer

Thanks for your interest in contributing! This project is friendly to new
contributors and first‑time PRs. The goal is to keep the installer simple,
reliable, and easy to audit.

Please make sure to follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all
project interactions.

## How to contribute (issues first)

1. **Open an issue** describing the bug, feature, or improvement.
2. We’ll discuss scope and approach.
3. Submit a pull request once the plan is clear.

This helps avoid duplicated effort and keeps changes aligned with the project
direction.

## Development setup

There are no strict coding style requirements. Just keep changes readable and
focused.

## Adding or editing apps

The app list is data-driven in `src/almalinux-creative-installer` via `APPS`.

1. Add or update an item in `APPS` with a unique `id`.
2. Set a supported `type`: `dnf`, `flatpak`, or `resolve`.
3. Provide type-specific keys:
   - `dnf`: `pkg`
   - `flatpak`: `appid`
   - `resolve`: guided flow (no package key)
   Common UI keys are `name`, `emoji`, and `category`.
4. (Optional) Add the app `id` to `VERSION_SELECTABLE_APPS` if you want
   version/branch selection in the UI.
5. If you introduce a new type/action model, update app type handlers in
   `src/almalinux-creative-installer` and matching helper actions in
   `src/almalinux-creative-installer-helper`.

Keep app additions data-driven in `APPS` first; avoid hardcoding per-app logic
unless you are adding a genuinely new install/check model.

## Testing & building

Basic checks:
- Launch the UI and verify the flow you changed.
- Make sure logs show clean output.

Build the RPM locally:
```
sudo dnf install -y rpmdevtools rpm-build
./src/packaging/build-rpm.sh
```

Note: the build script uses the latest git tag (e.g., `v1.0.4`) as the RPM
version, so create a tag before building.

## Submitting a PR

- Keep PRs small and focused when possible.
- Explain what you changed and why.
- Include screenshots for UI changes.

## Questions

If you’re unsure about anything, open an issue and ask — it’s welcome.
