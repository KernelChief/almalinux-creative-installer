# SPDX-License-Identifier: GPL-3.0-only

Name:           almalinux-creative-installer
%{!?app_version:%global app_version 1.0.5}
Version:        %{app_version}
Release:        1%{?dist}
Summary:        One-click creative app installer UI for AlmaLinux
License:        GPL-3.0-only
URL:            https://github.com/KernelChief/almalinux-creative-installer
BuildArch:      noarch

Requires:       python3
Requires:       polkit
Requires:       xdg-utils
Requires:       rsync

# Qt binding — PyQt6 on EL10+, PyQt5 on EL9
%if 0%{?rhel} >= 10
Requires:       python3-pyqt6
%else
Requires:       python3-qt5
%endif

# Use the GitHub-generated tarball URL
Source0:        https://github.com/KernelChief/almalinux-creative-installer/archive/refs/tags/v%{version}.tar.gz

%description
AlmaLinux Creative Installer is a Qt-based graphical application that
provides one-click install and remove actions for creative software
(image editors, 3D tools, video editors, audio apps, and more).

Privileged operations run via a polkit-protected helper.
Uses PyQt5 (python3-qt5) on AlmaLinux 9 and PyQt6 on AlmaLinux 10.

%prep
# GitHub tarballs unpack into a directory named 'project-version'
%setup -q -n almalinux-creative-installer-%{version}

%install
rm -rf %{buildroot}

install -D -m 0755 src/almalinux-creative-installer \
  %{buildroot}%{_bindir}/almalinux-creative-installer
install -D -m 0755 src/almalinux-creative-installer-helper \
  %{buildroot}%{_libexecdir}/almalinux-creative-installer-helper

# Python compatibility shim
install -D -m 0644 src/qtcompat.py \
  %{buildroot}%{_datadir}/%{name}/qtcompat.py

# Bundled app icons (Flathub AppStream fallback)
if [ -d src/icons/apps ]; then
  mkdir -p %{buildroot}%{_datadir}/%{name}/icons/apps
  install -p -m 0644 src/icons/apps/*.png \
    %{buildroot}%{_datadir}/%{name}/icons/apps/
fi

# Polkit policy
install -D -m 0644 src/org.almalinux.creativeinstaller.policy \
  %{buildroot}%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy

# Desktop entry
install -D -m 0644 src/almalinux-creative-installer.desktop \
  %{buildroot}%{_datadir}/applications/almalinux-creative-installer.desktop

# License
install -D -m 0644 LICENSE \
  %{buildroot}%{_datadir}/licenses/%{name}/LICENSE

# App icon (hicolor)
if [ -d src/icons/hicolor ]; then
  mkdir -p %{buildroot}%{_datadir}/icons/hicolor
  cp -a src/icons/hicolor/* %{buildroot}%{_datadir}/icons/hicolor/
fi

%files
%{_bindir}/almalinux-creative-installer
%{_libexecdir}/almalinux-creative-installer-helper
%dir %{_datadir}/%{name}
%{_datadir}/%{name}/qtcompat.py
%dir %{_datadir}/%{name}/icons
%dir %{_datadir}/%{name}/icons/apps
%{_datadir}/%{name}/icons/apps/*.png
%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy
%{_datadir}/applications/almalinux-creative-installer.desktop
%dir %{_datadir}/licenses/%{name}
%{_datadir}/licenses/%{name}/LICENSE
%{_datadir}/icons/hicolor/*/apps/almalinux-creative-installer.*

%changelog
* Mon Apr 27 2026 KernelChief - 1.0.5-1
- Qt migration: PyQt5 on EL9, PyQt6 on EL10 via qtcompat.py shim
- Real app icons from Flathub AppStream cache with bundled fallback
- EL version badges per app; incompatible apps shown as Not compatible
- Installed-only filter toggle in Apps tab
- DE-aware dark/light theme detection (GNOME gsettings, KDE kdeglobals)
- RPM Fusion and NVIDIA repo toggles in Setup tab
- Switch to GitHub tarball Source0 for COPR compatibility
* Sun Apr 26 2026 KernelChief - 1.0.4-1
- Initial Qt release (EL9 + EL10)
