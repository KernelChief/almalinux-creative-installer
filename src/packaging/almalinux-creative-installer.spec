# SPDX-License-Identifier: MIT

Name:           almalinux-creative-installer
Version:        1.0.1
Release:        2%{?dist}
Summary:        One-button creative app installer UI for AlmaLinux
License:        MIT
URL:            https://github.com/KernelChief/almalinux-creative-installer
BuildArch:      noarch

Requires:       python3
Requires:       python3-gobject
Requires:       gtk3
Requires:       polkit
Requires:       xdg-utils

Source0:        almalinux-creative-installer-%{version}.tar.gz

%description
A small GTK UI to install creative applications via DNF or local installers,
using pkexec + polkit for privileged operations.

%prep
%setup -q

%install
rm -rf %{buildroot}

install -D -m 0755 src/almalinux-creative-installer %{buildroot}%{_bindir}/almalinux-creative-installer
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
* Wed Jan 28 2026 KernelChief
- Initial public release
