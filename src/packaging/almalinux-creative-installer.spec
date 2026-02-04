# SPDX-License-Identifier: GPL-3.0-only


Name:           almalinux-creative-installer
Version:        %{version}
Release:        1%{?dist}
Summary:        One-button creative app installer UI for AlmaLinux
License:        MIT
URL:            https://github.com/KernelChief/almalinux-creative-installer
BuildArch:      x86_64

Requires:       polkit
Requires:       xdg-utils

Source0:        almalinux-creative-installer-%{version}.tar.gz

%description
A small Qt6 UI to install creative applications via DNF or local installers,
using pkexec + polkit for privileged operations.

%global __strip /bin/true

%prep
%setup -q

%install
rm -rf %{buildroot}

install -D -m 0755 dist/binary/almalinux-creative-installer %{buildroot}%{_bindir}/almalinux-creative-installer
install -D -m 0755 src/almalinux-creative-installer-helper %{buildroot}%{_libexecdir}/almalinux-creative-installer-helper
install -D -m 0644 src/org.almalinux.creativeinstaller.policy \
  %{buildroot}%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy
install -D -m 0644 src/almalinux-creative-installer.desktop \
  %{buildroot}%{_datadir}/applications/almalinux-creative-installer.desktop
install -D -m 0644 LICENSE \
  %{buildroot}%{_datadir}/licenses/%{name}/LICENSE

%files
%{_bindir}/almalinux-creative-installer
%{_libexecdir}/almalinux-creative-installer-helper
%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy
%{_datadir}/applications/almalinux-creative-installer.desktop
%{_datadir}/licenses/%{name}/LICENSE

%changelog
* Tue Feb 03 2026 KernelChief - 2.0.0-1
- MAJOR RELEASE: Migrated entire UI from GTK3 to Qt6 (PySide6)
- Updated dependencies for AlmaLinux 9 and 10
- Added mandatory requirement for EPEL and CRB repositories in README.md
