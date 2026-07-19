/*
 * ArcMenu - A traditional application menu for GNOME 3
 *
 * ArcMenu Lead Developer and Maintainer
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * 
 * ArcMenu Founder, Former Maintainer, and Former Graphic Designer
 * LinxGem33 https://gitlab.com/LinxGem33 - (No Longer Active)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {GLib, Gio, St} = imports.gi;
const Constants = Me.imports.constants;
const Controller = Me.imports.controller;
const Config = imports.misc.config;
const ShellVersion = parseFloat(Config.PACKAGE_VERSION);

const Main = imports.ui.main;
const Util = imports.misc.util;
const Utils = Me.imports.utils;

// Initialize panel button variables
let settings;
let settingsControllers;
let extensionChangedId;
let dockToggleID;
let dockExtension;
let enableTimeoutID;

// Initialize menu language translations
function init() {
    ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);      
}

// Enable the extension
function enable() {
    if (ShellVersion < 3.39 && ShellVersion >= 3.36)
        throw new Error(`ArcMenu v${Me.metadata.version} does not work on GNOME Shell version ${ShellVersion}. Please visit https://extensions.gnome.org/extension/3628/arcmenu/ and download ArcMenu v17`);
    else if (ShellVersion < 3.36)
        throw new Error(`GNOME Shell version ${ShellVersion} is not supported. Please visit https://extensions.gnome.org/extension/1228/arc-menu/ which supports GNOME Shell versions 3.14 - 3.34`);

    enableTimeoutID = GLib.timeout_add(0, 300, () => {
        if(imports.gi.Meta.is_wayland_compositor())
            Me.metadata.isWayland = true;
        else
            Me.metadata.isWayland = false;

        settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        settings.connect('changed::multi-monitor', () => _multiMonitorChanged());
        settings.connect('changed::arc-menu-placement', () => _placementChanged());
        settingsControllers = [];

        let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        Utils.createStylesheet(settings);
        let stylesheet = Utils.getStylesheet();
        if(Me.stylesheet)
            theme.unload_stylesheet(Me.stylesheet);
        Me.stylesheet = stylesheet;
        theme.load_stylesheet(Me.stylesheet);
    
        let avaliablePlacementArray = settings.get_default_value('available-placement').deep_unpack();
        settings.set_value('available-placement', new GLib.Variant('ab', avaliablePlacementArray));
    
        _enableButtons();
        
        // dash to panel might get enabled after Arc-Menu
        extensionChangedId = Main.extensionManager.connect('extension-state-changed', (data, extension) => {
            if (extension.uuid === 'dash-to-panel@jderose9.github.com') {
                _disconnectDtpSignals();

                let arcMenuPlacement = settings.get_enum('arc-menu-placement');
                let isEnabled = extension.state === 1 ? true : false;

                setAvaliablePlacement(Constants.ArcMenuPlacement.DTP, isEnabled);

                if(isEnabled && (arcMenuPlacement === Constants.ArcMenuPlacement.PANEL || arcMenuPlacement === Constants.ArcMenuPlacement.DTP)){
                    _connectDtpSignals();
                    _enableButtons();
                }
            }

            if ((extension.uuid === "dash-to-dock@micxgx.gmail.com" || extension.uuid === "ubuntu-dock@ubuntu.com")) {
                _disconnectDtdSignals();

                let arcMenuPlacement = settings.get_enum('arc-menu-placement');
                let isEnabled = extension.state === 1 ? true : false;

                if(arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
                    if(!_getDockExtensions() || !isEnabled)
                        setAvaliablePlacement(Constants.ArcMenuPlacement.DASH, false);
                    else{
                        _connectDtdSignals();
                        setAvaliablePlacement(Constants.ArcMenuPlacement.DASH, true);
                    }
                    _disableButtons();
                    _enableButtons();
                }
            }
        });
    
        // listen to dash to panel / dash to dock if they are compatible and already enabled
        _connectDtdSignals();
        _connectDtpSignals();
        enableTimeoutID = null;
        return GLib.SOURCE_REMOVE;
    });
}

function disable() {
    if(enableTimeoutID){
        GLib.source_remove(enableTimeoutID);
        enableTimeoutID = null;
    }
    if(extensionChangedId){
        Main.extensionManager.disconnect(extensionChangedId);
        extensionChangedId = null;
    }

    _disconnectDtpSignals();
    _disconnectDtdSignals();

    _disableButtons();
    settingsControllers = null;

    settings.run_dispose();
    settings = null;
}

function setAvaliablePlacement(placement, state){
    let avaliablePlacementArray = settings.get_value('available-placement').deep_unpack();
    if(avaliablePlacementArray[placement] !== state){
        avaliablePlacementArray[placement] = state;
        settings.set_value('available-placement', new GLib.Variant('ab', avaliablePlacementArray));
    }
}

function _connectDtpSignals() {
    if(global.dashToPanel)
        global.dashToPanel._amPanelsCreatedId = global.dashToPanel.connect('panels-created', () => _enableButtons());
}

function _disconnectDtpSignals() {
    if(global.dashToPanel?._amPanelsCreatedId){
        global.dashToPanel.disconnect(global.dashToPanel._amPanelsCreatedId);
        delete global.dashToPanel._amPanelsCreatedId;
    }
}

function _connectDtdSignals(){
    dockExtension = _getDockExtensions();
    if(dockExtension){
        let dock = dockExtension.stateObj.dockManager;
        dockToggleID = dock.connect("toggled",() => {
            _disableButtons();
            _enableButtons();
        });
    }
}

function _disconnectDtdSignals() {
    if(dockExtension){
        let dock = dockExtension.stateObj.dockManager;
        if(dock && dockToggleID){
            dock.disconnect(dockToggleID);
            dockToggleID = null;
        }
    }
}

function _placementChanged() {
    let arcMenuPlacement = settings.get_enum('arc-menu-placement');

    _disconnectDtdSignals();
    _disconnectDtpSignals();

    if(arcMenuPlacement === Constants.ArcMenuPlacement.PANEL || arcMenuPlacement === Constants.ArcMenuPlacement.DTP)
        _connectDtpSignals();
    else if(arcMenuPlacement === Constants.ArcMenuPlacement.DASH)
        _connectDtdSignals();

    _disableButtons();
    _enableButtons();
}

function _multiMonitorChanged() {
    _disableButtons();
    _enableButtons();
}

function _getDockExtensions(){
    let dashToDock = Main.extensionManager.lookup("dash-to-dock@micxgx.gmail.com");
    let ubuntuDash = Main.extensionManager.lookup("ubuntu-dock@ubuntu.com");
    let dock;
    if(dashToDock?.stateObj?.dockManager)
        dock = dashToDock;
    if(ubuntuDash?.stateObj?.dockManager)
        dock = ubuntuDash;
    return dock;
}

function _enableButtons() {
    let avaliablePlacementArray = settings.get_value('available-placement').deep_unpack();
    avaliablePlacementArray[Constants.ArcMenuPlacement.PANEL] = false;

    let multiMonitor = settings.get_boolean('multi-monitor');
    let arcMenuPlacement = settings.get_enum('arc-menu-placement');

    dockExtension = _getDockExtensions();
    
    if(arcMenuPlacement == Constants.ArcMenuPlacement.DASH && dockExtension){
        avaliablePlacementArray[Constants.ArcMenuPlacement.DASH] = true;

        let dock = dockExtension.stateObj.dockManager;
        if(dock?._allDocks.length){
            let docksLength = multiMonitor ? dock._allDocks.length : 1;
            for(var index = 0; index < docksLength; index++){      
                if(!dock._allDocks[index].dash.arcMenuEnabled){
                    let settingsController = new Controller.MenuSettingsController(settings, settingsControllers, dock, 
                                                                                    index, Constants.ArcMenuPlacement.DASH);
                    settingsController.monitorIndex = dock._allDocks[index].dash._monitorIndex;
                    settingsController.enableButton(index);
                    settingsController.bindSettingsChanges();
                    settingsControllers.push(settingsController); 
                }
            }
        }
    }
    else{
        let isDtPLoaded = false;
        let panelArray = [Main.panel];
        if(global.dashToPanel && global.dashToPanel.panels){
            panelArray = global.dashToPanel.panels.map(pw => pw);
            isDtPLoaded = true;
        }

        let panelLength = multiMonitor ? panelArray.length : 1;
        for(var index = 0; index < panelLength; index++){
            let panel = isDtPLoaded ? panelArray[index].panel : panelArray[index];
            let panelParent = panelArray[index];

            let isPrimaryStandAlone = isDtPLoaded ? ('isPrimary' in panelParent && panelParent.isPrimary) && panelParent.isStandalone : false;

            if(arcMenuPlacement === Constants.ArcMenuPlacement.PANEL && isPrimaryStandAlone){
                avaliablePlacementArray[Constants.ArcMenuPlacement.PANEL] = true;
                panel = Main.panel;
            }

            if(isDtPLoaded)
                avaliablePlacementArray[Constants.ArcMenuPlacement.DTP] = true;
            else
                avaliablePlacementArray[Constants.ArcMenuPlacement.PANEL] = true;

            if (panel.statusArea['ArcMenu'])
                continue;
            else if (settingsControllers[index])
                _disableButton(settingsControllers[index], 1);
    
            let settingsController = new Controller.MenuSettingsController(settings, settingsControllers, panel, 
                                                                            index, Constants.ArcMenuPlacement.PANEL);

            settingsController.monitorIndex = panelParent.monitor?.index;
            
            if(isDtPLoaded)
                panel._amDestroyId = panel.connect('destroy', () => extensionChangedId ? _disableButton(settingsController, 1) : null);
    
            settingsController.enableButton();
            settingsController.bindSettingsChanges();
            settingsControllers.push(settingsController);
        }
    }

    if(!Utils.getArraysEqual(settings.get_value('available-placement').deep_unpack(), avaliablePlacementArray))
        settings.set_value('available-placement', new GLib.Variant('ab', avaliablePlacementArray));
}

function _disableButtons(){
    for (let i = settingsControllers.length - 1; i >= 0; --i) {
        let sc = settingsControllers[i];
        _disableButton(sc, 1);
    }
}

function _disableButton(controller, remove) {
    if(controller.panel._amDestroyId){
        controller.panel.disconnect(controller.panel._amDestroyId);
        delete controller.panel._amDestroyId;
    }

    controller.destroy();

    if(remove)
        settingsControllers.splice(settingsControllers.indexOf(controller), 1);
}
