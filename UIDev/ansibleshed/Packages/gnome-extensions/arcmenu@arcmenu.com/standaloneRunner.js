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

const {Clutter, GLib, Shell, St} = imports.gi;
const appSys = Shell.AppSystem.get_default();
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Utils = Me.imports.utils;
const _ = Gettext.gettext;

var StandaloneRunner = class Arc_Menu_StandaloneRunner{
    constructor(settings) {
        this._settings = settings;

        this.tooltipShowing = false;
        this.tooltipHidingID = null;
        this.tooltipShowingID = null;
        this.dtpNeedsRelease = false;

        this.dummyWidget = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_child(this.dummyWidget);

        //Create Main Menus - ArcMenu and arcMenu's context menu
        this.arcMenu = new ArcMenu(this.dummyWidget, 0.5, St.Side.TOP, this);
        this.arcMenu.connect('open-state-changed', this._onOpenStateChanged.bind(this));

        this.menuManager = new PopupMenu.PopupMenuManager(Main.panel);
        this.menuManager._changeMenu = (menu) => {};
        this.menuManager.addMenu(this.arcMenu);

        if(!this.rise){
            let themeNode = this.arcMenu.actor.get_theme_node();
            this.rise = themeNode.get_length('-arrow-rise');
        }
        
        let rect = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryMonitor.index);

        //Position the runner menu in the center of the current monitor, at top of screen.
        let positionX = Math.round(rect.x + (rect.width / 2));
        let positionY = rect.y + this.rise;
        this.dummyWidget.set_position(positionX, positionY);
        
        //Context Menus for applications and other menu items
        this.contextMenuManager = new PopupMenu.PopupMenuManager(this.dummyWidget);
        this.contextMenuManager._changeMenu = (menu) => {};
        this.contextMenuManager._onMenuSourceEnter = (menu) =>{
            if (this.contextMenuManager.activeMenu && this.contextMenuManager.activeMenu != menu)
                return Clutter.EVENT_STOP;

            return Clutter.EVENT_PROPAGATE;
        }

        //Sub Menu Manager - Control all other popup menus
        this.subMenuManager = new PopupMenu.PopupMenuManager(this.dummyWidget);
        this.subMenuManager._changeMenu = (menu) => {};
    }

    initiate(){
        this.initiateRecentlyInstalledApps();

        //Create Basic Layout
        this.createLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.createLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    initiateRecentlyInstalledApps(){
        if(this._installedChangedId){
            appSys.disconnect(this._installedChangedId);
            this._installedChangedId = null;
        }

        if(this._settings.get_boolean('disable-recently-installed-apps'))
            return;

        this._appList = this.listAllApps();
        //Update Categories on 'installed-changed' event-------------------------------------
        this._installedChangedId = appSys.connect('installed-changed', () => {
            this._newAppList = this.listAllApps();

            //Filter to find if a new application has been installed
            let newApps = this._newAppList.filter(app => !this._appList.includes(app));

            //A New Application has been installed
            //Save it in settings
            if(newApps.length){
                let recentApps = this._settings.get_strv('recently-installed-apps');
                let newRecentApps = [...new Set(recentApps.concat(newApps))];
                this._settings.set_strv('recently-installed-apps', newRecentApps);
                this.MenuLayout.reloadApplications();
            }
            
            this._appList = this._newAppList;
        });
    }

    listAllApps(){
        let appList = appSys.get_installed().filter(appInfo => {
            try {
                appInfo.get_id(); // catch invalid file encodings
            } catch (e) {
                return false;
            }
            return appInfo.should_show();
        });
        return appList.map(app => app.get_id());
    }

    createMenuLayout(){
        this._forcedMenuLocation = false;
        this.arcMenu.actor.style = null;
        this.arcMenu.removeAll();
        this.section = new PopupMenu.PopupMenuSection();
        this.arcMenu.addMenuItem(this.section);            
        this.mainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL
        });        
        this.mainBox._delegate = this.mainBox;
        this.section.actor.add_child(this.mainBox);

        const StandaloneRunner = true;
        this.MenuLayout = Utils.getMenuLayout(this, Constants.MenuLayout.RUNNER, StandaloneRunner);
        this.updateStyle();

        if(this.arcMenu.isOpen){
            if(this.MenuLayout.activeMenuItem)
                this.MenuLayout.activeMenuItem.active = true;
            else
                this.mainBox.grab_key_focus();
        }
    }

    reloadMenuLayout(){
        this._forcedMenuLocation = false;

        this.MenuLayout.destroy();
        this.MenuLayout = null;
        
        this.arcMenu.actor.style = null;

        const StandaloneRunner = true;
        this.MenuLayout = Utils.getMenuLayout(this, Constants.MenuLayout.RUNNER, StandaloneRunner);
    
        this.updateStyle();

        if(this.arcMenu.isOpen){
            if(this.MenuLayout.activeMenuItem)
                this.MenuLayout.activeMenuItem.active = true;
            else
                this.mainBox.grab_key_focus();
        }
    }

    updateStyle(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');

        this.arcMenu.actor.set_style_class_name(null);
        this.arcMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.arcMenu.actor.add_style_class_name(customStyle ? 'arc-menu' : 'popup-menu');

        if(this.MenuLayout)
            this.MenuLayout.updateStyle();   
    }

    toggleMenu(){
        if(this.contextMenuManager.activeMenu)
            this.contextMenuManager.activeMenu.toggle();
        if(this.subMenuManager.activeMenu)
            this.subMenuManager.activeMenu.toggle();

        if(!this.arcMenu.isOpen){
            this.MenuLayout.updateLocation();
            this.arcMenu.toggle();
            if(this.arcMenu.isOpen)
                this.mainBox.grab_key_focus();
        }
        else if(this.arcMenu.isOpen){
            this.arcMenu.toggle();
        }
    }

    getActiveMenu(){
        if(this.contextMenuManager.activeMenu)
            return this.contextMenuManager.activeMenu;
        else if(this.subMenuManager.activeMenu)
            return this.subMenuManager.activeMenu;
        else if(this.arcMenu.isOpen)
            return this.arcMenu;
        else
            return null;
    }

    destroy(){
        if(this.createLayoutID){
            GLib.source_remove(this.createLayoutID);
            this.createLayoutID = null;
        }

        if(this.updateMenuLayoutID){
            GLib.source_remove(this.updateMenuLayoutID);
            this.updateMenuLayoutID = null;
        }

        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }

        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }

        if(this._installedChangedId){
            appSys.disconnect(this._installedChangedId);
            this._installedChangedId = null;
        }

        if(this.MenuLayout)
            this.MenuLayout.destroy();
        if(this.arcMenu)
            this.arcMenu.destroy();
        if(this.dummyWidget){
            Main.uiGroup.remove_child(this.dummyWidget);
            this.dummyWidget.destroy();
        }
    }

    updateMenuLayout(){
        this.tooltipShowing = false;
        if (this.tooltipShowingID) {
            GLib.source_remove(this.tooltipShowingID);
            this.tooltipShowingID = null;
        }     
        if (this.tooltipHidingID) {
            GLib.source_remove(this.tooltipHidingID);
            this.tooltipHidingID = null;
        }    
        if(this.MenuLayout){
            this.MenuLayout.destroy();
            this.MenuLayout = null;
        }
        this.updateMenuLayoutID = GLib.timeout_add(0, 100, () => {
            this.createMenuLayout();
            this.updateMenuLayoutID = null;
            return GLib.SOURCE_REMOVE;
        });  
    }

    loadExtraPinnedApps(){
        if(this.MenuLayout)
            this.MenuLayout.loadExtraPinnedApps();
    }

    updateLocation(){
        if(this.MenuLayout)
            this.MenuLayout.updateLocation();
    }

    displayPinnedApps() {
        if(this.MenuLayout)
            this.MenuLayout.displayPinnedApps();
    }

    loadPinnedApps() {
        if(this.MenuLayout)
            this.MenuLayout.loadPinnedApps();
    }

    reload(){
        if(this.MenuLayout){
            this.reloadMenuLayout();
        }
    }

    shouldLoadPinnedApps(){
        if(this.MenuLayout)
            return this.MenuLayout.shouldLoadPinnedApps;
    }

    setDefaultMenuView(){
        if(this.MenuLayout)
            this.MenuLayout.setDefaultMenuView();
    }

    _onOpenStateChanged(menu, open) {
        if(open){                
            if(Main.panel.menuManager && Main.panel.menuManager.activeMenu)
                Main.panel.menuManager.activeMenu.toggle();
        }      
        else{ 
            if(!this.arcMenu.isOpen){
                if (this.tooltipShowingID) {
                    GLib.source_remove(this.tooltipShowingID);
                    this.tooltipShowingID = null;
                }     
                this.tooltipShowing = false;
                if(this.activeTooltip){
                    this.activeTooltip.hide();
                }

                if (this.tooltipHidingID) {
                    GLib.source_remove(this.tooltipHidingID);
                    this.tooltipHidingID = null;
                }
            }
        }
    }
};

var ArcMenu = class Arc_Menu_ArcMenu extends PopupMenu.PopupMenu{
    constructor(sourceActor, arrowAlignment, arrowSide, standaloneRunner) {
        super(sourceActor, arrowAlignment, arrowSide);
        this._settings = sourceActor._settings;
        this.standaloneRunner = standaloneRunner;
        Main.uiGroup.add_child(this.actor);
        this.actor.hide();
        this._boxPointer.set_offscreen_redirect(Clutter.OffscreenRedirect.ON_IDLE);
        this._menuClosedID = this.connect('menu-closed', () => this.standaloneRunner.setDefaultMenuView());
        this.connect('destroy', () => this._onDestroy());
    }

    open(animate){
        if(!this.isOpen)
            this.standaloneRunner.arcMenu.actor._muteInput = false;
        super.open(animate);
    }

    close(animate){
        if(this.isOpen){
            if(this.standaloneRunner.contextMenuManager.activeMenu)
                this.standaloneRunner.contextMenuManager.activeMenu.toggle();
            if(this.standaloneRunner.subMenuManager.activeMenu)
                this.standaloneRunner.subMenuManager.activeMenu.toggle();
        }

        super.close(animate);
    }

    _onDestroy(){
        if(this._menuClosedID){
            this.disconnect(this._menuClosedID)
            this._menuClosedID = null;
        }
    }
};
