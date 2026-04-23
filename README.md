#  <img src="src/icons/hicolor/256x256/apps/almalinux-creative-installer.png" alt="AlmaLinux Creative Installer icon" width="28" valign="middle"> AlmaLinux Creative Installer
## Lowering the barrier between enterprise Linux and creative professionals.

[![Last Commit](https://img.shields.io/github/last-commit/KernelChief/almalinux-creative-installer)](https://github.com/KernelChief/almalinux-creative-installer/commits)
[![Repo Size](https://img.shields.io/github/repo-size/KernelChief/almalinux-creative-installer)](https://github.com/KernelChief/almalinux-creative-installer)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Made%20with-Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Shell](https://img.shields.io/badge/Script-Shell-4EAA25?logo=gnu-bash&logoColor=white)](https://www.gnu.org/software/bash/)
[![AlmaLinux](https://img.shields.io/badge/Platform-AlmaLinux-blue?logo=almalinux&logoColor=white)](https://almalinux.org/)
[![Discussed in AlmaLinux M&E SIG](https://img.shields.io/badge/Discussed%20in-AlmaLinux%20M%26E%20SIG-0E3A6D?logo=almalinux&logoColor=white)](https://wiki.almalinux.org/sigs/MediaAndEntertainmentSIG.html)
[![Join the AlmaLinux M&E SIG](https://img.shields.io/badge/Join-AlmaLinux%20M%26E%20SIG-2EA44F?logo=almalinux&logoColor=white)](https://chat.almalinux.org/almalinux/channels/sig-media-entertainment)
[![Buy Me A Coffee](https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-orange?logo=buy-me-a-coffee)](https://www.buymeacoffee.com/ttheroux)
[![Stars](https://img.shields.io/github/stars/KernelChief/almalinux-creative-installer?style=social)](https://github.com/KernelChief/almalinux-creative-installer/stargazers)

AlmaLinux is stable, secure, and production-ready but setting it up for design, animation, video editing, or digital art can feel overwhelming. AlmaLinux Creative Installer bridges that gap.

This small, opinionated GTK application provides a clean graphical interface for freelancers, students, and beginners to install essential creative software with one click. No deep Linux knowledge required. No dependency headaches. No intimidating terminal sessions.

All applications are installed using supported system methods only, keeping your workstation stable, secure, and production-ready. It’s the easiest way to focus on creativity, not configuration.

This project was created by the maintainer and was requested/discussed in the
**AlmaLinux Media & Entertainment SIG (M&E SIG)**.
If this mission resonates with you, please consider joining the SIG:
https://chat.almalinux.org/almalinux/channels/sig-media-entertainment

![AlmaLinux Creative Installer – main window](docs/screenshots/main.png)
*Main window showing system requirements, install status, and guided workflows.*

![AlmaLinux Creative Installer – logs window](docs/screenshots/logs.png)
*Logs window showing the live log while installing, removing apps / repos. Able to show enabled repos for debug and clear log in that window with button*

---

## 📚 Quick Navigation

- [🚀 Quick Start](#quick-start-recommended)
- [📦 Installation Methods](#-installation-methods-of-softwares-via-the-almalinux-creative-installer)
- [📦 Install AppImage Apps (Beginner Guide)](#-install-appimage-apps-beginner-guide)
- [🧩 Supported Platforms](#-supported-platforms)
- [🎬 Target Applications](#-target-applications)
- [🎞️ DaVinci Resolve Guided Flow](#-davinci-resolve-guided-install-flow)
- [🔐 Privilege & Security Model](#-privilege--security-model)
- [❓ FAQ](#-faq)
- [🧰 Troubleshooting](#-troubleshooting)
- [🤝 Community](#-community)
- [📜 License](#-license)

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
- Flatpak (Flathub) for apps where upstream recommends it on EL or where DNF packages are unavailable/outdated
- Local RPM installers
- Local .run installers (vendor-distributed software)

---

## 📦 Install AppImage Apps (Beginner Guide)

> ⚠️ **Current limitation:** AppImageLauncher is currently supported on **AlmaLinux 10 only**.
> On AlmaLinux 9, AppImageLauncher may fail to run due to upstream glibc version requirements.

If you want to use an AppImage application, this is the easiest way:

1. Open **AlmaLinux Creative Installer**.
2. Find **AppImageLauncher** in the app list.
3. Click **Install**.
4. Download any AppImage you want from its official website.
5. Double-click the downloaded `.AppImage` file.
6. If prompted, choose **Execute**.
7. AppImageLauncher will guide you through the rest.

That’s it — after this, launching AppImages is much simpler for beginners.

---

## 🧩 Supported Platforms

- AlmaLinux 9 — officially supported
- AlmaLinux 10 — experimental

### AppImageLauncher support

- AlmaLinux 10 — supported (current beta package target)
- AlmaLinux 9 — currently unsupported for AppImageLauncher due to binary compatibility constraints

Some creative applications are not yet available (or not yet complete) in AlmaLinux 10 /
EPEL repositories at this time (for example: Blender and GIMP availability varies),
so results may differ.

---

## 🎬 Target Applications

This project focuses on real-world creative tools commonly used in studios,
post-production, and content creation environments:

- **Image Processing**
  - GIMP
  - Krita
  - Inkscape
  - darktable
  - RawTherapee
  - digiKam
  - FontForge

- **3D**
  - Blender
  - MeshLab
  - PrusaSlicer
  - Material Maker
  - FreeCAD

- **Animation & Video**
  - Kdenlive (AlmaLinux 9 or AlmaLinux 10.2+)
  - OpenToonz
  - VLC
  - OBS Studio
  - HandBrake
  - Shotcut
  - DaVinci Resolve

- **Productivity**
  - Krusader (AlmaLinux 9; may not be available yet on AL10)
  - Scribus
  - draw.io
  - LibreOffice
  - OnlyOffice
  - AppImageLauncher (AlmaLinux 10+ only)

- **Game Engines**
  - Epic Asset Manager
  - Asset Manager Studio
  - Godots

- **Audio**
  - Ardour
  - Bitwig Studio
  - LMMS
  - Audacity
  - Carla
  - Hydrogen
  - Spotify

- **Communication**
  - Discord
  - Mattermost
  - Slack

> Note: This list may evolve over time. The in-app list is the source of truth.

---

## 🎞️ DaVinci Resolve: Guided Install Flow

DaVinci Resolve follows a guided workflow designed for AlmaLinux:

1. If SELinux is enforcing, prompt to set it to **permissive** or **disabled** (permanent).  
   A reboot is required for the change to fully apply before launching Resolve.
2. Pre-install required system dependencies (prompts for privileges if needed).
3. Open the official Blackmagic Design download page.
4. Unzip the downloaded DaVinci Resolve archive (the file picker won’t see it otherwise).
5. Prompt the user to select the installer (`.run` or `.rpm`).
6. Run the installer:
   - `.run` is executed as the **normal user** (vendor requirement).
   - `.rpm` is installed with elevated privileges.

Uninstalling Resolve runs the vendor uninstaller at `/opt/resolve/installer`
and must also be run as a normal user.

---

## 🔐 Privilege & Security Model

- The graphical application runs **unprivileged**
- All system-modifying actions run via **polkit-protected helpers**
- Authentication is requested **only when required**
- Vendor `.run` installers and uninstallers are executed as the **normal user**

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

---

## ❓ FAQ

**Why does DaVinci Resolve require SELinux permissive or disabled?**  
Resolve’s vendor installer and runtime expect permissive/disabled on EL.
The installer will prompt to set this **permanently** before continuing.

**Why does the SELinux prompt sometimes not appear?**  
If SELinux is already **permissive** or **disabled**, the prompt is skipped.
Check with `getenforce`.

**I rebooted and SELinux is still permissive. Why?**  
Check `/etc/selinux/config`. If it contains an invalid value like
`SELINUX=enforced`, the system falls back to permissive. Valid values are
`enforcing`, `permissive`, or `disabled`.

**Why does the Resolve `.run` installer/uninstaller run as a normal user?**  
Blackmagic’s installer explicitly refuses to run as root. The UI enforces this.

**Why are many apps installed via Flatpak?**  
Several upstreams (Krita, Inkscape, darktable, OBS Studio, etc.) recommend
Flatpak for Enterprise Linux to ensure up-to-date features and dependencies
that may lag or be absent in EL/EPEL repositories.

**Where is the Resolve uninstaller?**  
It is located at `/opt/resolve/installer` and must be run as a normal user.

**Why doesn’t the Resolve installer show in the file picker?**  
You must **unzip/extract** the downloaded archive first.

**Can I re-enable SELinux enforcing after uninstalling Resolve?**  
Yes. The UI prompts to restore enforcing after a successful uninstall.

---

## 🧰 Troubleshooting

**The Resolve installer/uninstaller won’t run over SSH.**  
Resolve’s `.run` uses interactive UI prompts. Run the installer from a graphical
desktop session as a normal user.

**The app shows old behavior after I updated the source.**  
The UI calls the installed helper at `/usr/libexec/almalinux-creative-installer-helper`.
If you’re running from source, make sure the system package is updated too.

**Flathub was added to my system. Is that expected?**  
Yes. Many apps (Krita, Inkscape, darktable, OBS Studio, and others) are installed
via Flatpak, and the installer adds Flathub system-wide to enable them.

**The RPM build script fails.**  
`build-rpm.sh` uses the **latest git tag** for the version. Create a tag like
`v1.0.5` before building.

---

## 🤝 Community

- Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
- Contribution guidelines: [CONTRIBUTING.md](CONTRIBUTING.md)
- Project context: Requested and discussed in the [AlmaLinux Media & Entertainment SIG (M&E SIG)](https://wiki.almalinux.org/sigs/MediaAndEntertainmentSIG.html)
- Want to help shape this space? **Join the SIG**: https://chat.almalinux.org/almalinux/channels/sig-media-entertainment

---

__Major thanks to [Cristian Slavik](https://github.com/crisslavik) (NOX Visual Effects) for the icon design and production.__\
LinkedIn: [](https://www.linkedin.com/in/crisslavik/)<https://www.linkedin.com/in/crisslavik/>

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

This means:
- You are free to use, modify, and distribute this software
- Any redistributed or modified versions **must remain GPLv3**
- Source code must be made available when distributing binaries

See the `LICENSE` file for full terms.

#Test Webhook
