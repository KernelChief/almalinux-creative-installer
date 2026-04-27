# SPDX-License-Identifier: GPL-3.0-only

Name:           almalinux-creative-installer
Version:        %{version}
Release:        %{?prerelease:0.%{prerelease}.1}%{!?prerelease:1}%{?dist}
Summary:        One-button creative app installer UI for AlmaLinux
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
Requires:       python3-pyqt5
%endif

Source0:        almalinux-creative-installer-%{version}.tar.gz

%description
A Qt-based UI to install creative applications via DNF or local installers,
using pkexec + polkit for privileged operations.
Uses PyQt5 on AlmaLinux 9 and PyQt6 on AlmaLinux 10.

%prep
%setup -q

%install
rm -rf %{buildroot}

# Install binaries and scripts
install -D -m 0755 src/almalinux-creative-installer %{buildroot}%{_bindir}/almalinux-creative-installer
install -D -m 0755 src/almalinux-creative-installer-helper %{buildroot}%{_libexecdir}/almalinux-creative-installer-helper

# Install python modules
mkdir -p %{buildroot}%{_datadir}/%{name}
install -p -m 0644 src/qtcompat.py %{buildroot}%{_datadir}/%{name}/qtcompat.py

# Install polkit policy
install -D -m 0644 src/org.almalinux.creativeinstaller.policy \
  %{buildroot}%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy

# Install desktop entry
install -D -m 0644 src/almalinux-creative-installer.desktop \
  %{buildroot}%{_datadir}/applications/almalinux-creative-installer.desktop

# Install license
install -D -m 0644 LICENSE \
  %{buildroot}%{_datadir}/licenses/%{name}/LICENSE

# Install icons
if [ -d src/icons/hicolor ]; then
  mkdir -p %{buildroot}%{_datadir}/icons/hicolor
  cp -a src/icons/hicolor/* %{buildroot}%{_datadir}/icons/hicolor/
fi

%files
%{_bindir}/almalinux-creative-installer
%{_libexecdir}/almalinux-creative-installer-helper
%dir %{_datadir}/%{name}
%{_datadir}/%{name}/qtcompat.py
%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy
%{_datadir}/applications/almalinux-creative-installer.desktop
%dir %{_datadir}/licenses/%{name}
%{_datadir}/licenses/%{name}/LICENSE
%{_datadir}/icons/hicolor/*/apps/almalinux-creative-installer.*

%changelog
* Sun Apr 26 2026 KernelChief - 1.0.15
- Rewrite UI from GTK to Qt (PyQt5/PyQt6)
- Add qtcompat.py for cross-version compatibility
- Update dependencies and file layout
