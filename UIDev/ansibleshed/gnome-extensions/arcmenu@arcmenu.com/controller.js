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
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Gio, GLib, Gtk, St} = imports.gi;
const Constants = Me.imports.constants;
const Helper = Me.imports.helper;
const Main = imports.ui.main;
const MenuButton = Me.imports.menuButton;
const {StandaloneRunner} = Me.imports.standaloneRunner;
const Utils = Me.imports.utils;

var MenuSettingsController = class {
    constructor(settings, settingsControllers, panel, panelIndex, arcMenuPlacement) {
        this._settings = settings;
        if(this._settings.get_boolean('reload-theme'))
            this._settings.reset('reload-theme');
        this.panel = panel;
        this.arcMenuPlacement = arcMenuPlacement;

        global.toggleArcMenu = () => this.toggleMenus();

        this.currentMonitorIndex = 0;
        this._activitiesButton = Main.panel.statusArea.activities;
        this.isPrimary = panelIndex === 0 ? true : false;

        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL) {
            this._menuButton = new MenuButton.MenuButton(settings, this.arcMenuPlacement, panel);
        }
        else if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH) {
            this._menuButton = new MenuButton.MenuButton(settings, this.arcMenuPlacement, panel, panelIndex);
            this.menuButtonAdjustedActor = this._menuButton.container;
        }

        this._settingsControllers = settingsControllers

        if(this.isPrimary){
            this._menuHotKeybinder = new Helper.MenuHotKeybinder();
            this._keybindingManager = new Helper.KeybindingManager(this._settings); 
            this._hotCornerManager = new Helper.HotCornerManager(this._settings,() => this.toggleMenus());
        }
        this._applySettings();
    }

    // Load and apply the settings from the arc-menu settings
    _applySettings() {
        if(this.isPrimary){
            this._updateHotCornerManager();
            this._updateHotKeyBinder();
        }
            
        this._setButtonAppearance();
        this._setButtonText();
        this._setButtonIcon();
        this._setButtonIconSize();
        this._setButtonIconPadding();
        this._configureActivitiesButton();
    }
    // Bind the callbacks for handling the settings changes to the event signals
    bindSettingsChanges() {
        this.settingsChangeIds = [
            this._settings.connect('changed::hot-corners', this._updateHotCornerManager.bind(this)),
            this._settings.connect('changed::menu-hotkey', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::runner-menu-hotkey', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::enable-standlone-runner-menu', this._updateHotKeyBinder.bind(this)),
            this._settings.connect('changed::position-in-panel', this._setButtonPosition.bind(this)),
            this._settings.connect('changed::menu-button-position-offset', this._setButtonPosition.bind(this)),
            this._settings.connect('changed::menu-position-alignment', this._setMenuPositionAlignment.bind(this)),
            this._settings.connect('changed::menu-button-appearance', this._setButtonAppearance.bind(this)),
            this._settings.connect('changed::custom-menu-button-text', this._setButtonText.bind(this)),
            this._settings.connect('changed::menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::distro-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::arc-menu-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon', this._setButtonIcon.bind(this)),
            this._settings.connect('changed::custom-menu-button-icon-size', this._setButtonIconSize.bind(this)),
            this._settings.connect('changed::button-padding', this._setButtonIconPadding.bind(this)),
            this._settings.connect('changed::enable-menu-button-arrow', this._setMenuButtonArrow.bind(this)),
            this._settings.connect('changed::enable-custom-arc-menu', this._updateStyle.bind(this)),
            this._settings.connect('changed::remove-menu-arrow', this._updateStyle.bind(this)),
            this._settings.connect('changed::disable-searchbox-border', this._updateStyle.bind(this)),
            this._settings.connect('changed::indicator-color', this._updateStyle.bind(this)),
            this._settings.connect('changed::indicator-text-color', this._updateStyle.bind(this)),
            this._settings.connect('changed::directory-shortcuts-list', this._reload.bind(this)),
            this._settings.connect('changed::application-shortcuts-list', this._reload.bind(this)),
            this._settings.connect('changed::disable-recently-installed-apps', this._initiateRecentlyInstalledApps.bind(this)),
            this._settings.connect('changed::extra-categories', this._reload.bind(this)),
            this._settings.connect('changed::power-options', this._reload.bind(this)),
            this._settings.connect('changed::show-external-devices', this._reload.bind(this)),
            this._settings.connect('changed::show-bookmarks', this._reload.bind(this)),
            this._settings.connect('changed::disable-user-avatar', this._reload.bind(this)),
            this._settings.connect('changed::enable-activities-shortcut', this._reload.bind(this)),
            this._settings.connect('changed::enable-horizontal-flip', this._reload.bind(this)),
            this._settings.connect('changed::searchbar-default-bottom-location', this._reload.bind(this)),
            this._settings.connect('changed::searchbar-default-top-location', this._plasmaMenuReloadTheme.bind(this)),
            this._settings.connect('changed::searchbar-default-top-location', this._reload.bind(this)),
            this._settings.connect('changed::multi-lined-labels', this._reload.bind(this)),
            this._settings.connect('changed::apps-show-extra-details', this._reload.bind(this)),
            this._settings.connect('changed::show-search-result-details', this._reload.bind(this)),
            this._settings.connect('changed::search-provider-open-windows', this._reload.bind(this)),
            this._settings.connect('changed::search-provider-recent-files', this._reload.bind(this)),
            this._settings.connect('changed::disable-scrollview-fade-effect', this._reload.bind(this)),
            this._settings.connect('changed::menu-height', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::menu-width-adjustment', this._updateMenuHeight.bind(this)),
            this._settings.connect('changed::reload-theme', this._reloadTheme.bind(this)),
            this._settings.connect('changed::pinned-app-list',this._updatePinnedApps.bind(this)),
            this._settings.connect('changed::enable-weather-widget-unity',this._updatePinnedApps.bind(this)),
            this._settings.connect('changed::enable-clock-widget-unity',this._updatePinnedApps.bind(this)),
            this._settings.connect('changed::enable-weather-widget-raven',this._updatePinnedApps.bind(this)),
            this._settings.connect('changed::enable-clock-widget-raven',this._updatePinnedApps.bind(this)),
            this._settings.connect('changed::brisk-shortcuts-list',this._updateExtraPinnedApps.bind(this)),
            this._settings.connect('changed::mint-pinned-app-list',this._updateExtraPinnedApps.bind(this)),
            this._settings.connect('changed::mint-separator-index',this._updateExtraPinnedApps.bind(this)),
            this._settings.connect('changed::unity-pinned-app-list',this._updateExtraPinnedApps.bind(this)),
            this._settings.connect('changed::unity-separator-index',this._updateExtraPinnedApps.bind(this)),
            this._settings.connect('changed::windows-disable-frequent-apps', this._reload.bind(this)),
            this._settings.connect('changed::windows-disable-pinned-apps', this._reload.bind(this)),
            this._settings.connect('changed::default-menu-view', this._reload.bind(this)),
            this._settings.connect('changed::default-menu-view-tognee',this._reload.bind(this)),
            this._settings.connect('changed::alphabetize-all-programs',this._reload.bind(this)),
            this._settings.connect('changed::enable-unity-homescreen',this._setDefaultMenuView.bind(this)),
            this._settings.connect('changed::menu-layout', this._updateMenuLayout.bind(this)),
            this._settings.connect('changed::menu-item-grid-icon-size', this._reload.bind(this)),
            this._settings.connect('changed::menu-item-icon-size', this._reload.bind(this)),
            this._settings.connect('changed::button-item-icon-size', this._reload.bind(this)),
            this._settings.connect('changed::quicklinks-item-icon-size', this._reload.bind(this)),
            this._settings.connect('changed::misc-item-icon-size', this._reload.bind(this)),
            this._settings.connect('changed::runner-position', this.updateLocation.bind(this)),
            this._settings.connect('changed::runner-show-frequent-apps', this._reload.bind(this)),
            this._settings.connect('changed::enable-sub-menus', this._reload.bind(this)),
            this._settings.connect('changed::show-activities-button', this._configureActivitiesButton.bind(this)),
            this._settings.connect('changed::force-menu-location', this._forceMenuLocation.bind(this)),
            this._settings.connect('changed::category-icon-type', this._reload.bind(this)),
            this._settings.connect('changed::shortcut-icon-type', this._reload.bind(this)),
            this._settings.connect('changed::arcmenu-extra-categories-links', this._reload.bind(this)),
            this._settings.connect('changed::arcmenu-extra-categories-links-location', this._reload.bind(this)),
        ];
    }

    _reload(){
        this._menuButton.reload();
        if(this.runnerMenu)
            this.runnerMenu.reload();
    }

    _forceMenuLocation(){
        this._menuButton.forceMenuLocation();
    }

    _initiateRecentlyInstalledApps(){
        this._menuButton.initiateRecentlyInstalledApps();
        this._menuButton.reload();
        if(this.runnerMenu){
            this.runnerMenu.initiateRecentlyInstalledApps();
            this.runnerMenu.reload();
        } 
    }

    _plasmaMenuReloadTheme(){
        if(this._settings.get_enum('menu-layout') === Constants.MenuLayout.PLASMA){
            if(this._settings.get_boolean('reload-theme'))
                this._settings.reset('reload-theme');
            this._settings.set_boolean('reload-theme', true);
        }
    }

    updateLocation(){
        this._menuButton.updateLocation();
        if(this.runnerMenu)
            this.runnerMenu.updateLocation();
    }

    _updateMenuLayout(){
        this._menuButton.updateMenuLayout();
    }

    _setDefaultMenuView(){
        this._menuButton.setDefaultMenuView();
    }

    toggleStandaloneRunner(){
        this._closeAllArcMenus();
        if(this.runnerMenu)
            this.runnerMenu.toggleMenu();
    }

    toggleMenus(){
        if(this.runnerMenu && this.runnerMenu.arcMenu.isOpen)
            this.runnerMenu.toggleMenu();
        if(global.dashToPanel || this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            const MultipleArcMenus = this._settingsControllers.length > 1;
            const ShowArcMenuOnPrimaryMonitor = this._settings.get_boolean('hotkey-open-primary-monitor');
            if(MultipleArcMenus && ShowArcMenuOnPrimaryMonitor)
                this._toggleMenuOnMonitor(Main.layoutManager.primaryMonitor);
            else if(MultipleArcMenus && !ShowArcMenuOnPrimaryMonitor)
                this._toggleMenuOnMonitor(Main.layoutManager.currentMonitor);
            else
                this._menuButton.toggleMenu();
        }
        else
            this._menuButton.toggleMenu();
    }

    _toggleMenuOnMonitor(monitor){
        for (let i = 0; i < this._settingsControllers.length; i++) {
            let menuButton = this._settingsControllers[i]._menuButton;
            let monitorIndex = this._settingsControllers[i].monitorIndex;
            if(monitor.index === monitorIndex)
                this.currentMonitorIndex = i;
            else{
                if(menuButton.arcMenu.isOpen)
                    menuButton.toggleMenu();
                if(menuButton.arcMenuContextMenu.isOpen)
                    menuButton.toggleArcMenuContextMenu();
            }
        } 
        //open the current monitors menu
        this._settingsControllers[this.currentMonitorIndex]._menuButton.toggleMenu();
    }

    _closeAllArcMenus(){
        for (let i = 0; i < this._settingsControllers.length; i++) {
            let menuButton = this._settingsControllers[i]._menuButton;
            if(menuButton.arcMenu.isOpen)
                menuButton.toggleMenu();
            if(menuButton.arcMenuContextMenu.isOpen)
                menuButton.toggleArcMenuContextMenu();
        }
    }

    _reloadTheme(){
        if(this.isPrimary && this._settings.get_boolean('reload-theme')) {
            this._settings.reset('reload-theme');

            let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            Utils.createStylesheet(this._settings);
            let stylesheet = Utils.getStylesheet();
            if(Me.stylesheet)
                theme.unload_stylesheet(Me.stylesheet);
            Me.stylesheet = stylesheet;
            theme.load_stylesheet(Me.stylesheet);

            for (let i = 0; i < this._settingsControllers.length; i++) {
                let menuButton = this._settingsControllers[i]._menuButton;
                menuButton.updateStyle();
            }
            if(this.runnerMenu)
                this.runnerMenu.updateStyle();
        }
    }

    _updateStyle() {
        this._menuButton.updateStyle();
        if(this.runnerMenu)
            this.runnerMenu.updateStyle();
    }

    _updateMenuHeight(){
        this._menuButton.updateHeight();
    }

    _updatePinnedApps(){
        if(this._menuButton.shouldLoadPinnedApps())
            this._menuButton.loadPinnedApps();

        //If the active category is Pinned Apps, redisplay the new Pinned Apps
        const activeCategory = this._menuButton.MenuLayout?.activeCategoryType;
        if(!activeCategory)
            return;
        if(activeCategory === Constants.CategoryType.PINNED_APPS || activeCategory === Constants.CategoryType.HOME_SCREEN)
            this._menuButton.displayPinnedApps();  
    }

    _updateExtraPinnedApps(){
        let layout = this._settings.get_enum('menu-layout');
        if(layout == Constants.MenuLayout.UNITY || layout == Constants.MenuLayout.MINT || layout == Constants.MenuLayout.BRISK){
            if(this._menuButton.shouldLoadPinnedApps())
                this._menuButton.loadExtraPinnedApps();
        }
    }

    _updateHotCornerManager() {
        if (this.isPrimary) {
            let hotCornerAction = this._settings.get_enum('hot-corners');
            if (hotCornerAction === Constants.HotCornerAction.DEFAULT) {
                this._hotCornerManager.restoreDefaultHotCorners();
            } 
            else if(hotCornerAction === Constants.HotCornerAction.DISABLED) {
                this._hotCornerManager.disableHotCorners();
            }
            else if(hotCornerAction === Constants.HotCornerAction.TOGGLE_ARCMENU) {
                this._hotCornerManager.modifyHotCorners();
            }
            else if(hotCornerAction === Constants.HotCornerAction.CUSTOM) {
                this._hotCornerManager.modifyHotCorners();
            }
        }
    }

    _updateHotKeyBinder() {
        if (this.isPrimary) {
            const RunnerHotKey = this._settings.get_enum('runner-menu-hotkey');
            const HotKey = this._settings.get_enum('menu-hotkey');
            const EnableStandaloneRunnerMenu = this._settings.get_boolean('enable-standlone-runner-menu');

            this._keybindingManager.unbind('ToggleArcMenu');
            this._keybindingManager.unbind('ToggleRunnerMenu');
            this._menuHotKeybinder.disableHotKey();
            this._menuKeyBindingKey = null;
            this._runnerKeyBindingKey = null;

            if(EnableStandaloneRunnerMenu){
                if(!this.runnerMenu){
                    this.runnerMenu = new StandaloneRunner(this._settings);
                    this.runnerMenu.initiate();
                }
            
                if(RunnerHotKey === Constants.RunnerHotKey.CUSTOM){
                    this._keybindingManager.bind('ToggleRunnerMenu', 'toggle-runner-menu', () => this._onHotkey(() => this.toggleStandaloneRunner()));
                    this._runnerKeyBindingKey = this._settings.get_strv('toggle-runner-menu').toString();
                }
                else if(RunnerHotKey === Constants.RunnerHotKey.SUPER_L){
                    this._menuHotKeybinder.enableHotKey(() => this.toggleStandaloneRunner());
                }
            }
            else if(this.runnerMenu){
                this.runnerMenu.destroy();
                this.runnerMenu = null;
            }

            if(HotKey === Constants.HotKey.CUSTOM){
                this._keybindingManager.bind('ToggleArcMenu', 'toggle-arcmenu', () => this._onHotkey(() => this.toggleMenus()));
                this._menuKeyBindingKey = this._settings.get_strv('toggle-arcmenu').toString();
            }
            else if(HotKey === Constants.HotKey.SUPER_L){
                this._menuHotKeybinder.disableHotKey();
                this._menuHotKeybinder.enableHotKey(() => this.toggleMenus());
            }

            if(this._menuKeyBindingKey){
                this._menuKeyBindingKey = Gtk.accelerator_parse(this._menuKeyBindingKey)[0];
            }
            if(this._runnerKeyBindingKey){
                this._runnerKeyBindingKey = Gtk.accelerator_parse(this._runnerKeyBindingKey)[0];
            }
        }
    }

    _onHotkey(callback) {
        if(this._settings.get_boolean('disable-hotkey-onkeyrelease'))
            callback();
        else
            this._onHotkeyRelease(callback);
    }

    _onHotkeyRelease(callback) {
        let activeMenu = this._settingsControllers[this.currentMonitorIndex]._menuButton.getActiveMenu() || ((this.runnerMenu && this.runnerMenu.arcMenu.isOpen) ? this.runnerMenu.arcMenu : null);
        let focusPanel;

        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL)
            focusPanel = this.panel;
        else
            focusPanel = this.panel._allDocks[0].dash;

        let focusTarget = activeMenu ? 
                          (activeMenu.actor || activeMenu) : focusPanel;
        
        this.disconnectKeyRelease();

        this.keyInfo = {
            pressId: focusTarget.connect('key-press-event', () => this.disconnectKeyRelease()),
            releaseId: focusTarget.connect('key-release-event', (actor, event) => {
                this.disconnectKeyRelease();

                if (this._menuKeyBindingKey === event.get_key_symbol()) {
                    callback();
                }

                if (this._runnerKeyBindingKey === event.get_key_symbol()) {
                    callback();
                }
            }),
            target: focusTarget
        };

        focusTarget.grab_key_focus();
    }

    disconnectKeyRelease() {
        if (this.keyInfo && this.keyInfo.target) {
            this.keyInfo.target.disconnect(this.keyInfo.pressId);
            this.keyInfo.target.disconnect(this.keyInfo.releaseId);
            this.keyInfo = 0;
        }
    }

    // Place the menu button to main panel as specified in the settings
    _setButtonPosition() {
        if (this._isButtonEnabled()) {
            this._removeMenuButtonFromMainPanel();
            this._addMenuButtonToMainPanel();
            this._setMenuPositionAlignment();
        }
    }

    _setMenuPositionAlignment(){
        this._menuButton.setMenuPositionAlignment();
    }
    
    // Change the menu button appearance as specified in the settings
    _setButtonAppearance() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            this._menuButton.container.set_width(-1);
            this._menuButton.container.set_height(-1);
            menuButtonWidget.actor.show();
            switch (this._settings.get_enum('menu-button-appearance')) {
                case Constants.MenuButtonAppearance.TEXT:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.showPanelText();
                    break;
                case Constants.MenuButtonAppearance.ICON_TEXT:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
                    menuButtonWidget.showPanelText();
                    menuButtonWidget.setPanelTextStyle('padding-left: 5px;');
                    break;
                case Constants.MenuButtonAppearance.TEXT_ICON:
                    menuButtonWidget.hidePanelIcon();
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelText();
                    menuButtonWidget.setPanelTextStyle('padding-right: 5px;');
                    menuButtonWidget.showPanelIcon();
                    break;
                case Constants.MenuButtonAppearance.NONE:
                    menuButtonWidget.actor.hide();
                    this._menuButton.container.set_width(0);
                    this._menuButton.container.set_height(0);
                    break;
                case Constants.MenuButtonAppearance.ICON: /* falls through */
                default:
                    menuButtonWidget.hidePanelText();
                    menuButtonWidget.showPanelIcon();
            }
            this._setMenuButtonArrow();
        }
    }
    _setMenuButtonArrow() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            if (this._settings.get_boolean('enable-menu-button-arrow')) {
                menuButtonWidget.hideArrowIcon();
                menuButtonWidget.showArrowIcon();
            } else {
                menuButtonWidget.hideArrowIcon();
            }
        }
    }

    // Update the text of the menu button as specified in the settings
    _setButtonText() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            // Update the text of the menu button
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            let label = menuButtonWidget.getPanelLabel();

            let customTextLabel = this._settings.get_string('custom-menu-button-text');
            label.set_text(customTextLabel);
        }
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIcon() {
        let path = this._settings.get_string('custom-menu-button-icon');
        let menuButtonWidget = this._menuButton.menuButtonWidget;
        let stIcon = menuButtonWidget.getPanelIcon();
        
        let iconString = Utils.getMenuButtonIcon(this._settings, path);
        stIcon.set_gicon(Gio.icon_new_for_string(iconString));
    }

    // Update the icon of the menu button as specified in the settings
    _setButtonIconSize() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let menuButtonWidget = this._menuButton.menuButtonWidget;
            let stIcon = menuButtonWidget.getPanelIcon();
            let iconSize = this._settings.get_double('custom-menu-button-icon-size');
            let size = iconSize;
            stIcon.icon_size = size;
        }
    }

    _setButtonIconPadding() {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            let padding = this._settings.get_int('button-padding');
            if(padding > -1)
                this._menuButton.style = "-natural-hpadding: " + (padding  * 2 ) + "px; -minimum-hpadding: " + padding + "px;";
            else
                this._menuButton.style = null;

            let parent = this._menuButton.get_parent();
            if(!parent)
                return;
            let children = parent.get_children();
            let actorIndex = 0;

            if (children.length > 1) {
                actorIndex = children.indexOf(this._menuButton);
            }

            parent.remove_child(this._menuButton);
            parent.insert_child_at_index(this._menuButton, actorIndex);
        }
    }

    // Get the current position of the menu button and its associated position order
    _getMenuPosition() {
        let offset = this._settings.get_int('menu-button-position-offset');
        switch (this._settings.get_enum('position-in-panel')) {
            case Constants.MenuPosition.CENTER:
                return [offset, 'center'];
            case Constants.MenuPosition.RIGHT:
                // get number of childrens in rightBox (without arcmenu)
                let n_children = Main.panel._rightBox.get_n_children();
                n_children -= Main.panel.statusArea.ArcMenu !== undefined;
                // position where icon should go,
                // offset = 0, icon should be last
                // offset = 1, icon should be second last
                const order = Math.clamp(n_children - offset, 0, n_children);
                return [order, 'right'];
            case Constants.MenuPosition.LEFT:
            default:
                return [offset, 'left'];
        }
    }

    _configureActivitiesButton(){
        let isActivitiesButtonPresent = Main.panel.statusArea.activities && Main.panel.statusArea.activities.container && Main.panel._leftBox.contains(Main.panel.statusArea.activities.container);
        let showActivities = this._settings.get_boolean('show-activities-button'); 
        
        let container = Main.panel.statusArea.activities.container;
        let parent = container.get_parent();
        let index = 0;
        if(this._settings.get_enum('position-in-panel') === Constants.MenuPosition.LEFT && 
            this.arcMenuPlacement === Constants.ArcMenuPlacement.PANEL && 
            this._settings.get_int('menu-button-position-offset') == 0)
            index = 1;

        if(showActivities && !isActivitiesButtonPresent){
            parent ? parent.remove_child(container) : null;
            Main.panel._leftBox.insert_child_at_index(this._activitiesButton.container, index);
        }                          
        else if(!showActivities && isActivitiesButtonPresent)
            Main.panel._leftBox.remove_child(Main.panel.statusArea.activities.container);
    }

    // Check if the activities button is present on the main panel
    _isActivitiesButtonPresent() {
        return (this._activitiesButton &&
            this._activitiesButton.container &&
            Main.panel._leftBox.contains(this._activitiesButton.container));
    }

    // Add or restore the activities button on the main panel
    _addActivitiesButtonToMainPanel() {
        if (!this._isActivitiesButtonPresent()) {
            // Retsore the activities button at the default position
            let parent = this._activitiesButton.container.get_parent();
            if(!parent)
                Main.panel._leftBox.insert_child_at_index(this._activitiesButton.container, 0);
        }
    }

    // Add the menu button to the main panel
    _addMenuButtonToMainPanel() {
        let [position, box] = this._getMenuPosition();
        this.panel.addToStatusArea('ArcMenu', this._menuButton, position, box);
    }

    // Remove the menu button from the main panel
    _removeMenuButtonFromMainPanel() {
        this.panel.menuManager.removeMenu(this._menuButton.arcMenu);
        this.panel.menuManager.removeMenu(this._menuButton.arcMenuContextMenu);
        this.panel.statusArea['ArcMenu'] = null;
    }

    // Enable the menu button
    enableButton(index) {
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.DASH){
            this.dashIndex = index;
            this.reEstablishDash();
        }
        if(this.arcMenuPlacement == Constants.ArcMenuPlacement.PANEL){
            this._addMenuButtonToMainPanel();
        }

        this._menuButton.initiate();
    }

    reEstablishDash(){
        const DashToDock = this.panel._allDocks[this.dashIndex].dash;
        if(!DashToDock){
            global.log("ArcMenu Error - Failed to place ArcMenu in Dash-to-Dock");
            return;
        }
            
        const DashContainer = DashToDock._dashContainer;

        DashToDock.arcMenuEnabled = true;
        this.oldShowAppsIcon = DashToDock._showAppsIcon;

        DashContainer.remove_child(DashToDock._showAppsIcon);
        DashToDock._showAppsIcon = this.menuButtonAdjustedActor;
        DashContainer.add_child(DashToDock._showAppsIcon);

        this._setButtonIcon();
        const IconSize = DashToDock.iconSize;
        this._menuButton.menuButtonWidget.icon.setIconSize(IconSize);
      
        DashToDock.updateShowAppsButton();
        
        this.hoverID = this.menuButtonAdjustedActor.child.connect('notify::hover', () => {
            DashToDock._syncLabel(this.menuButtonAdjustedActor, null);
        });

        this.hidingID = Main.overview.connect('hiding', () => {
            DashToDock._labelShowing = false;
            this.menuButtonAdjustedActor.hideLabel();
        });

        if(this.isPrimary){
            this.oldDashOnDestroy = this.panel._deleteDocks;
            this.panel._deleteDocks = () => {
                if(this.hoverID){
                    this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                    this.hoverID = null;
                }
    
                if(this.hidingID){
                    Main.overview.disconnect(this.hidingID);
                    this.hidingID = null;
                }

                const AllDocks = this.panel._allDocks;

                if(!AllDocks.length)
                    return;
                
                AllDocks.forEach(dock => {
                    let dash = dock.dash;
                    if(dash._dashContainer.contains(dash._showAppsIcon))
                        dash._dashContainer.remove_child(dash._showAppsIcon);
                    dash._showAppsIcon = this.oldShowAppsIcon;
                    dash._dashContainer.add_child(dash._showAppsIcon);
                    dash.arcMenuEnabled = false;
                });

                this.oldDashOnDestroy.call(this.panel, ...arguments);
                this.panel._deleteDocks = this.oldDashOnDestroy;
            };
        }
    }

    _disableButton() {
        this._removeMenuButtonFromMainPanel();
        this._addActivitiesButtonToMainPanel();
        this._menuButton.destroy();
    }

    _isButtonEnabled() {
        return this.panel.statusArea['ArcMenu'] !== null;
    }

    destroy() {
        if(this.runnerMenu){
            this.runnerMenu.destroy();
        }
        this.settingsChangeIds.forEach(id => this._settings.disconnect(id));
        
        if(this.arcMenuPlacement === Constants.ArcMenuPlacement.DASH){
            if(this.panel === null || this.panel._allDocks.length === 0){
                this._menuButton.destroy();
            }
            else{
                const DashToDock = this.panel._allDocks[this.dashIndex].dash;
                const DashContainer = DashToDock._dashContainer;
                if(this.panel._allDocks[this.dashIndex] && DashToDock && DashToDock.arcMenuEnabled){
                    if(this.hoverID){
                        this.menuButtonAdjustedActor.child.disconnect(this.hoverID);
                        this.hoverID = null;
                    }
    
                    if(this.hidingID){
                        Main.overview.disconnect(this.hidingID);
                        this.hidingID = null;
                    }
    
                    if(this.panel._allDocks[this.dashIndex]){
                        DashToDock.arcMenuEnabled = false;
                        if(DashContainer.contains(DashToDock._showAppsIcon))
                            DashContainer.remove_child(DashToDock._showAppsIcon);
                        DashToDock._showAppsIcon = this.oldShowAppsIcon;
                        DashContainer.add_child(DashToDock._showAppsIcon);
                        this.panel._deleteDocks = this.oldDashOnDestroy;
                        DashToDock.updateShowAppsButton();
                    }
                }
                this._addActivitiesButtonToMainPanel();
                this._menuButton.destroy();
            }
        }
        else if(this.panel == undefined)
            this._menuButton.destroy();
        else if (this._isButtonEnabled()) {
            this._disableButton();
        }

        if(this.isPrimary){
            this.disconnectKeyRelease();
            this._menuHotKeybinder.destroy();
            this._keybindingManager.destroy();
            this._hotCornerManager.destroy();
        }
        this._settings = null;
        this._activitiesButton = null;
        this._menuButton = null;
        delete global.toggleArcMenu;
  }
};
