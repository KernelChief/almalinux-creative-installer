# 🎨 AlmaLinux Creative Installer

A small, opinionated GTK application for AlmaLinux that delivers **one-button installs**
for creative and Media & Entertainment (M&E) workstation software — without the usual
dependency headaches.

All software is installed using **supported system methods** only.

![AlmaLinux Creative Installer – main window](docs/screenshots/main.png)
*Main window showing system requirements, install status, and guided workflows.*

---

## 🚀 Quick Start (Recommended)

### 1️⃣ Download the RPM

Go to the GitHub Releases page:

https://github.com/KernelChief/almalinux-creative-installer/releases

Download **one RPM file** that matches your AlmaLinux version.

You will see files named like:

- almalinux-creative-installer-1.0.1-1.el9.noarch.rpm
- almalinux-creative-installer-1.0.1-1.el10.noarch.rpm

### 📌 Understanding the version number (X.X.X-X)

Example filename:

almalinux-creative-installer-1.0.1-1.el9.noarch.rpm

- 1.0.1 → application version  
- -1 → RPM release number  

Whenever this README refers to `X.X.X-X`, **replace it with the exact version shown in the filename you downloaded**.

Example:

If the filename is  
almalinux-creative-installer-1.0.1-1.el9.noarch.rpm  

Then:

- X.X.X-X = 1.0.1-1

---

### 2️⃣ Install the RPM

Open a terminal and change to the directory where the RPM was downloaded.

Run the command below, **replacing X.X.X-X with your version number**:

From the directory where you downloaded the file:

`sudo dnf install ./almalinux-creative-installer-X.X.X-X.rpm`


Example for AlmaLinux 9: sudo dnf install ./almalinux-creative-installer-1.0.1-1.el9.noarch.rpm


Example for AlmaLinux 10 (experimental): sudo dnf install ./almalinux-creative-installer-1.0.1-1.el10.noarch.rpm

This will:
- install the application
- register the polkit helper
- add a desktop entry

---

### 3️⃣ Launch the Application

The application itself runs **unprivileged**.

When a system change is required (installing or removing software, enabling repositories),
you will be prompted for authentication via **polkit**.

Polkit may temporarily cache authentication to avoid repeated prompts.
Once the application is closed, the authorization is discarded.

You can launch the application:

- From your desktop environment’s application menu:
  `AlmaLinux Creative Installer`
- Or from a terminal: 
  `almalinux-creative-installer`

---

## 📦 Installation Methods of softwares via the AlmaLinux Creative Installer

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

Some creative applications are not yet available (or not yet complete) in AlmaLinux 10 /
EPEL repositories at this time (for example: Blender and GIMP availability varies),
so results may differ.

---

## 🎬 Target Applications

This project focuses on real-world creative tools commonly used in studios,
post-production, and content creation environments:

- GIMP
- Krita (Flatpak workflow, upstream-recommended on EL)
- Blender
- DaVinci Resolve

Additional applications may be added as the project evolves.

---

## 🎞️ DaVinci Resolve: Guided Install Flow

DaVinci Resolve follows a guided workflow designed specifically for AlmaLinux:

1. Pre-install required system dependencies
2. Open the official Blackmagic Design download page
3. Prompt the user to select the downloaded installer (.run or .rpm)
4. Run the installer with elevated privileges

This respects vendor distribution models while keeping the process
simple, transparent, and repeatable.

---

## 🔐 Privilege & Security Model

- The graphical application runs **unprivileged**
- All system-modifying actions run via **polkit-protected helpers**
- Authentication is requested **only when required**

This keeps the UI safe, auditable, and aligned with system security best practices.

---

## 🛡️ Security & Quality

This repository follows basic security and code-quality best practices:

- **Dependabot** monitors dependencies and surfaces known vulnerabilities
- Code quality is reviewed during development using SonarQube-compatible static analysis tools (SonarLint)

These tools are advisory and do not imply certification or formal auditing.

---

## 🧹 Uninstalling the Application

To remove the application, run:

`sudo dnf remove almalinux-creative-installer`

---

## 🛠️ Building the RPM (Advanced / Contributors)

To build the RPM locally:

`sudo dnf install -y rpmdevtools rpm-build`
`./src/packaging/build-rpm.sh 1.0.1`

The resulting RPMs will be located in:
`~/rpmbuild/RPMS/`

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

This means:
- You are free to use, modify, and distribute this software
- Any redistributed or modified versions **must remain GPLv3**
- Source code must be made available when distributing binaries

See the `LICENSE` file for full terms.

