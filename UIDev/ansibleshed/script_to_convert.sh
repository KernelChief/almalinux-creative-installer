#!/bin/bash

################################
### Nautilus

# Install Nautilus Extension
mkdir -p '/usr/share/nautilus-python/extensions'
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/nautilus-extensions/nautilus-copy-path' '/usr/share/nautilus-python/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/nautilus-extensions/nautilus-copy-path.py' '/usr/share/nautilus-python/extensions'

################################
### Install Gnome Extensions

# Install Dash to Panel
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/dash-to-panel@jderose9.github.com' '/usr/share/gnome-shell/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/dash-to-panel@jderose9.github.com/schemas/org.gnome.shell.extensions.dash-to-panel.gschema.xml' '/usr/share/glib-2.0/schemas'

# Install System Monitor
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/system-monitor@paradoxxx.zero.gmail.com' '/usr/share/gnome-shell/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/system-monitor@paradoxxx.zero.gmail.com/schemas/org.gnome.shell.extensions.system-monitor.gschema.xml' '/usr/share/glib-2.0/schemas'

# Install Arch Menu
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/arcmenu@arcmenu.com' '/usr/share/gnome-shell/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/arcmenu@arcmenu.com/schemas/org.gnome.shell.extensions.arcmenu.gschema.xml' '/usr/share/glib-2.0/schemas'

# Install Gnome 4x UI Improvements
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/gnome-ui-tune@itstime.tech' '/usr/share/gnome-shell/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/gnome-ui-tune@itstime.tech/schemas/org.gnome.shell.extensions.gnome-ui-tune.gschema.xml' '/usr/share/glib-2.0/schemas'

# Install Blur My Shell
cp -r '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/blur-my-shell@aunetx' '/usr/share/gnome-shell/extensions'
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/gnome-extensions/blur-my-shell@aunetx/schemas/org.gnome.shell.extensions.blur-my-shell.gschema.xml' '/usr/share/glib-2.0/schemas'

# Compile Schemas
glib-compile-schemas /usr/share/glib-2.0/schemas/

################################
### dconf

# Copy dconf profile file
cp '/Y/Ansible/Linux/EL9/3D/SHEDLook/01-shed_gnome_defaults' '/etc/dconf/db/local.d'

# Update dconf
dconf update
