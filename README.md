# 🎨 AlmaLinux Creative Installer

A small, opinionated GTK application for AlmaLinux that delivers **one-button installs**
for creative and Media & Entertainment (M&E) workstation software — without the usual
dependency headaches.

All software is installed using **supported system methods** only.

---

## 🚀 Quick Start (Recommended)

### 1️⃣ Download the RPM

Go to the GitHub Releases page and download the RPM matching your AlmaLinux version:

https://github.com/KernelChief/almalinux-creative-installer/releases/tag/v1.0.0

Choose **one**:

- almalinux-creative-installer-1.0.0-*.el9.noarch.rpm  → AlmaLinux 9
- almalinux-creative-installer-1.0.0-*.el10.noarch.rpm → AlmaLinux 10 (experimental)

---

### 2️⃣ Install the RPM

From the directory where you downloaded the file:

sudo dnf install ./almalinux-creative-installer-1.0.0-*.rpm

This will:
- install the application
- register the polkit helper
- add a desktop entry

---

### 3️⃣ Launch the application

You can launch it in either way:

- From your desktop environment’s application menu:
  AlmaLinux Creative Installer
- Or from a terminal:
  almalinux-creative-installer

---

## 📦 Installation Methods

AlmaLinux Creative Installer uses the following approaches, depending on the software:

- DNF packages from system repositories
- Local RPM installers
- Local .run installers (vendor-distributed software)
- Flatpak is avoided, except when upstream strongly recommends it on EL
  (currently: Krita)

---

## 🧩 Supported Platforms

- AlmaLinux 9 — officially supported
- AlmaLinux 10 — experimental

Some creative applications are not yet available (or not yet complete) in EL10/EPEL
repositories at this time (for example: Blender and GIMP availability may vary),
so results may differ.

---

## 🎬 Target Applications

This project focuses on real-world creative tools commonly used in studios,
post-production, and content creation environments, including:

- GIMP
- Krita (Flatpak workflow, upstream-recommended on EL)
- Blender
- DaVinci Resolve

Additional applications may be added as the project evolves.

---

## 🎞️ DaVinci Resolve: Guided Install Flow

DaVinci Resolve follows a guided, user-friendly workflow designed specifically
for AlmaLinux:

1. Pre-install required system dependencies
2. Open the official Blackmagic Design download page
3. Prompt the user to select the downloaded installer (.run or .rpm)
4. Run the installer with elevated privileges

This approach respects vendor distribution models while keeping the process
simple, transparent, and repeatable.

---

## 🔐 Privilege & Security Model

- The graphical application runs unprivileged
- All system-modifying actions are executed via polkit-protected helpers
- Authentication is requested only when required

This keeps the UI safe, auditable, and aligned with system security best practices.

---

## 🛡️ Security & Quality

This repository follows basic security and code-quality best practices:

- SonarQube analyzes code quality and potential issues
- Dependabot monitors dependencies and surfaces known vulnerabilities

These tools are advisory and do not imply certification or formal auditing.

---

## 🛠️ Building the RPM (Advanced / Contributors)

To build the RPM locally:

sudo dnf install -y rpmdevtools rpm-build
./src/packaging/build-rpm.sh 1.0.0

The resulting RPMs will be located in:

~/rpmbuild/RPMS/

---

## 📜 License

MIT License. See the LICENSE file for details.
