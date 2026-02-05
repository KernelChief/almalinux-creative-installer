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
A small Qt UI to install creative applications via DNF or local installers,
using pkexec + polkit for privileged operations.

%global __strip /bin/true

%prep
%setup -q

%build
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --no-cache-dir qtpy PySide2
deactivate

%install
rm -rf %{buildroot}

install -D -m 0755 src/packaging/almalinux-creative-installer-wrapper.sh \
  %{buildroot}%{_bindir}/almalinux-creative-installer

install -D -m 0755 src/almalinux-creative-installer-helper \
  %{buildroot}%{_libexecdir}/almalinux-creative-installer-helper

install -D -m 0644 src/org.almalinux.creativeinstaller.policy \
  %{buildroot}%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy

install -D -m 0644 src/almalinux-creative-installer.desktop \
  %{buildroot}%{_datadir}/applications/almalinux-creative-installer.desktop

install -D -m 0644 LICENSE \
  %{buildroot}%{_datadir}/licenses/%{name}/LICENSE

install -D -m 0755 src/almalinux-creative-installer \
  %{buildroot}%{_libexecdir}/almalinux-creative-installer/app/almalinux-creative-installer

cp -a venv %{buildroot}%{_libexecdir}/almalinux-creative-installer/venv

%files
%{_bindir}/almalinux-creative-installer
%{_libexecdir}/almalinux-creative-installer/
%{_libexecdir}/almalinux-creative-installer-helper
%{_datadir}/polkit-1/actions/org.almalinux.creativeinstaller.policy
%{_datadir}/applications/almalinux-creative-installer.desktop
%{_datadir}/licenses/%{name}/LICENSE

%changelog
* Thu Feb 05 2026 KernelChief - 2.0.0-1
- Bundle QtPy + PySide2 runtime for EL9 (no Nuitka)