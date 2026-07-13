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

const {Clutter, Gio, GLib, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(menuButton) {
        super(menuButton, {
            Search: true,
            DisplayType: Constants.DisplayType.LIST,
            SearchDisplayType: Constants.DisplayType.LIST,
            GridColumns: 1,
            ColumnSpacing: 0,
            RowSpacing: 0,
            DefaultMenuWidth: 450,
            VerticalMainBox: true,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }

    createLayout(){
        super.createLayout();

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            vertical: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START
        });
        this.leftTopBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: "padding-left: 10px; margin-left: 0.4em"
        });
        this.rightTopBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            style_class: 'popup-menu-item',
            style: "padding: 0px; margin: 0px; spacing: 0px;"
        });

        this.user = new MW.UserMenuIcon(this, 55, true);
        this.user.actor.x_expand = false;
        this.user.actor.y_expand = true;
        this.user.actor.x_align = Clutter.ActorAlign.CENTER;
        this.user.actor.y_align = Clutter.ActorAlign.CENTER;
        this.leftTopBox.add_child(this.user.actor);
        this.rightTopBox.add_child(this.user.label);
        this.user.label.style = "padding-left: 0.4em; margin: 0px 10px 0px 15px; font-weight: bold;";
        this.user.label.y_expand = false; 
        this.user.label.x_expand = true;
        this.user.label.x_align = Clutter.ActorAlign.START;
        this.rightTopBox.add_child(this.searchBox.actor);

        this.topBox.add_child(this.leftTopBox);
        this.topBox.add_child(this.rightTopBox);

        this.searchBarLocation = this._settings.get_enum('searchbar-default-top-location');

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: this.disableFadeEffect ? 'margin-box' : 'margin-box small-vfade',
            overlay_scrollbars: true,
            reactive:true,
        });
        
        this.applicationsBox = new St.BoxLayout({ 
            vertical: true
        });

        this.applicationsScrollBox.add_actor(this.applicationsBox);
    
        this.navigateBoxContainer = new St.BoxLayout({ 
            x_expand: true,
            y_expand: false,
            vertical: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START
        });
        this.navigateBox = new St.BoxLayout({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: "spacing: 6px;",
        });
        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_homogeneous: true,
            column_spacing: 10,
            row_spacing: 10
        });
        this.grid = new St.Widget({ 
            layout_manager: layout
        });
        layout.hookup_style(this.grid);
        this.navigateBox.add_child(this.grid);

        this.pinnedAppsButton = new MW.PlasmaMenuItem(this, _("Pinned Apps"), Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg');
        this.pinnedAppsButton.connect("activate", () => this.displayPinnedApps() );
        this.grid.layout_manager.attach(this.pinnedAppsButton, 0, 0, 1, 1);
        this.pinnedAppsButton.set_style_pseudo_class("active-item");

        this.applicationsButton = new MW.PlasmaMenuItem(this, _("Applications"), 'preferences-desktop-apps-symbolic');
        this.applicationsButton.connect("activate", () => this.displayCategories() );
        this.grid.layout_manager.attach(this.applicationsButton, 1, 0, 1, 1);

        this.computerButton = new MW.PlasmaMenuItem(this, _("Computer"), 'computer-symbolic');
        this.computerButton.connect("activate", () => this.displayComputerCategory() );
        this.grid.layout_manager.attach(this.computerButton, 2, 0, 1, 1);

        this.leaveButton = new MW.PlasmaMenuItem(this, _("Leave"), 'system-shutdown-symbolic');
        this.leaveButton.connect("activate", () => this.displayPowerItems() );
        this.grid.layout_manager.attach(this.leaveButton, 3, 0, 1, 1);

        this.categoryHeader = new MW.PlasmaCategoryHeader(this);
        this.categoryHeader.add_style_class_name('margin-box');

        if(this.searchBarLocation === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.style = "margin: 3px 10px 5px 10px;";
            this.topBox.style = 'padding-top: 0.5em;'
            
            this.navigateBoxContainer.add_child(this.navigateBox);
            let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
            this.navigateBoxContainer.add_child(separator);
            this.navigateBoxContainer.y_expand = false;
            this.navigateBoxContainer.y_align = Clutter.ActorAlign.START;
            this.mainBox.add_child(this.navigateBoxContainer);
            this.mainBox.add_child(this.applicationsScrollBox);
            separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
            this.mainBox.add_child(separator);

            this.mainBox.add_child(this.topBox);
        }
        else if(this.searchBarLocation === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 3px 10px 10px 10px;";
            
            this.mainBox.add_child(this.topBox);
            let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
            this.mainBox.add_child(separator);
            this.mainBox.add_child(this.applicationsScrollBox);
            this.navigateBoxContainer.y_expand = true;
            this.navigateBoxContainer.y_align = Clutter.ActorAlign.END;
            separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
            this.navigateBoxContainer.add_child(separator);
            this.navigateBoxContainer.add_child(this.navigateBox);
            this.mainBox.add_child(this.navigateBoxContainer);
        }
           
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcutsList = this._settings.get_value('application-shortcuts-list').deep_unpack();
        this.applicationShortcuts = [];
        for(let i = 0; i < applicationShortcutsList.length; i++){
            let applicationName = applicationShortcutsList[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcutsList[i][1], applicationShortcutsList[i][2], Constants.DisplayType.LIST);
            if(shortcutMenuItem.shouldShow)
                this.applicationShortcuts.push(shortcutMenuItem.actor);
        }

        let directoryShortcutsList = this._settings.get_value('directory-shortcuts-list').deep_unpack();
        this._loadPlaces(directoryShortcutsList);
        
        this.externalDevicesBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });	
        this._sections = { };
        this.placesManager = new PlaceDisplay.PlacesManager();
        for (let i = 0; i < Constants.SECTIONS.length; i++) {
            let id = Constants.SECTIONS[i];
            this._sections[id] = new St.BoxLayout({
                vertical: true
            });	
            this.placeManagerUpdatedID = this.placesManager.connect(`${id}-updated`, () => {
                this._redisplayPlaces(id);
            });

            this._createPlaces(id);
            this.externalDevicesBox.add_child(this._sections[id]);
        }
        this.updateWidth();
        this._createPowerItems();
        this.loadCategories();
        this.loadPinnedApps();
        this.setDefaultMenuView();
    }

    updateWidth(setDefaultMenuView){
        const widthAdjustment = this._settings.get_int("menu-width-adjustment");
        let menuWidth = this.layoutProperties.DefaultMenuWidth + widthAdjustment;
        //Set a 300px minimum limit for the menu width
        menuWidth = Math.max(300, menuWidth);
        this.applicationsScrollBox.style = `width: ${menuWidth}px;`;
        this.layoutProperties.MenuWidth = menuWidth;
        if(setDefaultMenuView)
            this.setDefaultMenuView();
    }

    setFrequentAppsList(categoryMenuItem){
        categoryMenuItem.appList = [];
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                categoryMenuItem.appList.push(mostUsed[i]);
                let item = this.applicationsMap.get(mostUsed[i]);
                if (!item) {
                    item = new MW.ApplicationMenuItem(this, mostUsed[i], this.layoutProperties.DisplayType);
                    this.applicationsMap.set(mostUsed[i], item);
                }
            }
        }
    }

    _clearActorsFromBox(box){
        this.categoryHeader.setActiveCategory(null);
        if(this.mainBox.contains(this.categoryHeader))
            this.mainBox.remove_child(this.categoryHeader);
        super._clearActorsFromBox(box);
    }

    clearActiveItem(){
        this.pinnedAppsButton.setActive(false);
        this.computerButton.setActive(false);
        this.applicationsButton.setActive(false);
        this.leaveButton.setActive(false);
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        this.hasPinnedApps = true;
        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum === Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum, Constants.DisplayType.LIST);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        

        super.loadCategories();
    }

    displayComputerCategory(){
        this._clearActorsFromBox(this.applicationsBox);
        this.applicationsBox.add_child(this.createLabelRow(_("Application Shortcuts")));
        for(let i = 0; i < this.applicationShortcuts.length; i++){
            this.applicationsBox.add_child(this.applicationShortcuts[i]);
        }
        this.applicationsBox.add_child(this.createLabelRow(_("Places")));
        for(let i = 0; i < this.directoryShortcuts.length; i++){
            this.applicationsBox.add_child(this.directoryShortcuts[i]);
        }
        this.applicationsBox.add_child(this.externalDevicesBox);
        this.activeMenuItem = this.applicationShortcuts[0];
    }

    _createPlaces(id) {
        let places = this.placesManager.get(id);

        if(id === 'bookmarks' && places.length > 0){
            this._sections[id].add_child(this.createLabelRow(_("Bookmarks")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i], Constants.DisplayType.LIST);
                this._sections[id].add_child(item); 
            } 
        }

        if(id === 'devices' && places.length > 0){
            this._sections[id].add_child(this.createLabelRow(_("Devices")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i], Constants.DisplayType.LIST);
                this._sections[id].add_child(item); 
            }
        }

        if(id === 'network' && places.length > 0){
            this._sections[id].add_child(this.createLabelRow(_("Network")));
            for (let i = 0; i < places.length; i++){
                let item = new PlaceDisplay.PlaceMenuItem(this, places[i], Constants.DisplayType.LIST);
                this._sections[id].add_child(item); 
            }
        }
    }   

    displayPinnedApps(){
        this.activeCategoryType = Constants.CategoryType.PINNED_APPS;
        super.displayPinnedApps();
    }

    _loadPlaces(directoryShortcutsList) {
        this.directoryShortcuts = [];
        for (let i = 0; i < directoryShortcutsList.length; i++) {
            let isContainedInCategory = false;
            let directory = directoryShortcutsList[i];
            let placeMenuItem = this.createMenuItem(directory, Constants.DisplayType.LIST, isContainedInCategory);
            this.directoryShortcuts.push(placeMenuItem);
        }
    }

    _createPowerItems(){
        this.lock = new MW.PowerMenuItem(this, Constants.PowerType.LOCK);
        this.logOut = new MW.PowerMenuItem(this, Constants.PowerType.LOGOUT);
        Utils.canHybridSleep((canHybridSleep, needsAuth) => {
            if(canHybridSleep){
                this.sleep = new MW.PowerMenuItem(this, Constants.PowerType.HYBRID_SLEEP);
            }
        });


        Utils.canHibernate((canHibernate, needsAuth) => {
            if(canHibernate){
                this.hibernate = new MW.PowerMenuItem(this, Constants.PowerType.HIBERNATE);
            }
        });
        this.suspend = new MW.PowerMenuItem(this, Constants.PowerType.SUSPEND);
        this.restart = new MW.PowerMenuItem(this, Constants.PowerType.RESTART);
        this.powerOff = new MW.PowerMenuItem(this, Constants.PowerType.POWER_OFF);
    }

    displayPowerItems(){
        this._clearActorsFromBox(this.applicationsBox);         
        this.applicationsBox.add_child(this.createLabelRow(_("Session")));
        this.applicationsBox.add_child(this.lock);
        this.applicationsBox.add_child(this.logOut);
        this.applicationsBox.add_child(this.createLabelRow(_("System")));
        this.applicationsBox.add_child(this.suspend);
        if(this.sleep)
            this.applicationsBox.insert_child_at_index(this.sleep, 4);

        if(this.hibernate)
            this.applicationsBox.insert_child_at_index(this.hibernate, 5);
        this.applicationsBox.add_child(this.restart);
        this.applicationsBox.add_child(this.powerOff);
        this.activeMenuItem = this.lock;
    }

    displayCategories(){
        this.activeCategoryType = Constants.CategoryType.CATEGORIES_LIST;        
        this._clearActorsFromBox(this.applicationsBox);

        this.categoryHeader.setActiveCategory(null);
        this._insertCategoryHeader();

        let isActiveMenuItemSet = false;
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.applicationsBox.add_child(categoryMenuItem.actor);	
            if(!isActiveMenuItemSet){
                isActiveMenuItemSet = true;
                this.activeMenuItem = categoryMenuItem;
            }	 
        }
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.clearActiveItem();
        this.pinnedAppsButton.set_style_pseudo_class("active-item");
        this.displayPinnedApps();
    }

    _insertCategoryHeader(){
        if(this.mainBox.contains(this.categoryHeader))
            this.mainBox.remove_child(this.categoryHeader);
        if(this.searchBarLocation === Constants.SearchbarLocation.BOTTOM)
            this.mainBox.insert_child_at_index(this.categoryHeader, 1);
        else
            this.mainBox.insert_child_at_index(this.categoryHeader, 2);
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this._insertCategoryHeader();
        this.categoryHeader.setActiveCategory(this.activeCategory);
        this._displayAppList(appList, category, this.applicationsGrid);
    }

    displayRecentFiles(){
        super.displayRecentFiles();
        this._insertCategoryHeader();
        this.activeCategoryType = Constants.CategoryType.RECENT_FILES; 
        this.categoryHeader.setActiveCategory(this.activeCategory);
    }

    _onSearchBoxChanged(searchBox, searchString){  
        super._onSearchBoxChanged(searchBox, searchString);  
        if(!searchBox.isEmpty()){
            this.clearActiveItem();
            this.activeCategoryType = Constants.CategoryType.SEARCH_RESULTS;   
        }            
    }

    destroy(){
        if(this.sleep)
            this.sleep.destroy();
        if(this.hibernate)
            this.hibernate.destroy();

        this.lock.destroy();
        this.logOut.destroy();
        this.suspend.destroy();
        this.restart.destroy();
        this.powerOff.destroy();
    
        super.destroy();
    }
}
