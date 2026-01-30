# Contributing to AlmaLinux Creative Installer

Thanks for your interest in contributing! This project is friendly to new
contributors and first‑time PRs. The goal is to keep the installer simple,
reliable, and easy to audit.

## How to contribute (issues first)

1. **Open an issue** describing the bug, feature, or improvement.
2. We’ll discuss scope and approach.
3. Submit a pull request once the plan is clear.

This helps avoid duplicated effort and keeps changes aligned with the project
direction.

## Development setup

There are no strict coding style requirements. Just keep changes readable and
focused.

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
