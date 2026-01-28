# 🎨 Alma Creative Installer

A small, opinionated GTK application for AlmaLinux that delivers **one-button installs**
for creative and Media & Entertainment (M&E) workstation software — without the usual
dependency headaches.

All software is installed using **supported system methods** only.

---

## 📦 Installation Methods

Alma Creative Installer uses the following approaches, depending on the software:

- ✅ DNF packages from system repositories
- ✅ Local RPM installers
- ✅ Local `.run` installers (vendor-distributed software)
- ⚠️ Flatpak is **avoided**, **except when upstream strongly recommends it on EL** (currently: **Krita**)

---

## 🧩 Supported Platforms

- ✅ **AlmaLinux 9** — supported
- 🧪 **AlmaLinux 10** — experimental  
  Some creative applications are not yet available (or not yet complete) in EL10/EPEL repos at this time (e.g. Blender/GIMP availability varies), so results may differ.

---

## 🎬 Target Applications

This project focuses on real-world creative tools commonly used in studios,
post-production, and content creation environments, including:

- 🖌️ GIMP
- 🎨 Krita *(Flatpak workflow)*
- 🧊 Blender
- 🎞️ DaVinci Resolve

Additional applications may be added as the project evolves.

---

## 🎞️ DaVinci Resolve: Guided Install Flow

DaVinci Resolve follows a guided, user-friendly workflow designed for AlmaLinux:

1️⃣ Pre-install required system dependencies  
2️⃣ Open the official Blackmagic Design download page  
3️⃣ Prompt the user to select the downloaded installer (`.run` or `.rpm`)  
4️⃣ Run the installer with elevated privileges

This approach respects vendor distribution models while keeping the process simple and repeatable.

---

## 🔐 Privilege & Security Model

- The graphical application runs **unprivileged**
- All system-modifying actions are executed via **polkit-protected helpers**
- Authentication is requested **only when required**

This keeps the UI safe, auditable, and aligned with system security best practices.

---

## 🛡️ Security & Quality

This repository follows basic security and code-quality best practices:

- 🔍 **SonarQube** analyzes code quality and potential issues
- 🔄 **Dependabot** monitors dependencies and surfaces known vulnerabilities

These tools are advisory and do not imply certification or formal auditing.

---

## 📜 License

MIT License. See the `LICENSE` file for details.