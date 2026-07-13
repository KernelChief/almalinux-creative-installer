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

const {Clutter, Gtk, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(menuButton) {
        super(menuButton, {
            Search: true,
            DisplayType: Constants.DisplayType.GRID,
            SearchDisplayType: Constants.DisplayType.GRID,
            ColumnSpacing: 10,
            RowSpacing: 10,
            DefaultMenuWidth: 410,
            DefaultIconGridStyle: "SmallIconGrid",
            VerticalMainBox: false,
            SupportsCategoryOnHover: true,
            DefaultCategoryIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultApplicationIconSize: Constants.LARGE_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }
    createLayout(){
        super.createLayout();

        this.ravenPositionChangedID = this._settings.connect('changed::raven-position', () => this._updatePosition());

        this.dummyCursor = new St.Widget({ width: 1, height: 0, opacity: 0});
        Main.uiGroup.add_child(this.dummyCursor);
        this.updateLocation();

        //store old ArcMenu variables
        this.oldSourceActor = this.arcMenu.sourceActor;
        this.oldFocusActor = this.arcMenu.focusActor;
        this.oldArrowAlignment = this.arcMenu.actor._arrowAlignment;

        this.arcMenu.sourceActor = this.dummyCursor;
        this.arcMenu.focusActor = this.dummyCursor;
        this.arcMenu._boxPointer.setPosition(this.dummyCursor, 0);
        this.arcMenu.close();
        this.arcMenu._boxPointer.hide();

        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        if(homeScreen)
            this.activeCategory = _("Pinned Apps");
        else
            this.activeCategory = _("All Programs");

        this.arcMenu.actor.style = "-arrow-base: 0px; -arrow-rise: 0px; -boxpointer-gap: 0px; -arrow-border-radius: 0px"; 
        this.arcMenu.box.style = "padding-bottom: 0px; padding-top: 0px; margin: 0px;";
        this.actionsBoxContainer = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });

        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });
        this.actionsBoxContainer.add_child(this.actionsBox);
        this.actionsBox.style = "spacing: 5px;";
        this.actionsBoxContainerStyle =  "margin: 0px 0px 0px 0px; spacing: 10px; background-color: rgba(186, 196,201, 0.1); padding: 5px 5px;"+
                                         "border-color: rgba(186, 196,201, 0.2);";
        

        this.topBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false
        });

        //Sub Main Box -- stores left and right box
        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.subMainBox.add_child(this.topBox);
        this.mainBox.add_child(this.subMainBox);

        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 25px 10px 10px 10px;";
        this.topBox.add_child(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style: "padding-bottom: 10px;"
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: this.disableFadeEffect ? '' : 'vfade',
        });  
  
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.subMainBox.add_child(this.applicationsScrollBox);
   
        this.weatherBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
            vertical: true
        });
        
        this._weatherItem = new MW.WeatherSection(this);
        this._weatherItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";
        this._clocksItem = new MW.WorldClocksSection(this);
        this._clocksItem.x_expand = true;
        this._clocksItem.x_align = Clutter.ActorAlign.FILL;
        this._clocksItem.style = "border-radius:4px; padding: 10px; margin: 0px 25px 25px 25px;";

        this.weatherBox.add_child(this._clocksItem);
        this.weatherBox.add_child(this._weatherItem);
        
        this.appShortcuts = [];
        this.shortcutsBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: this.layoutProperties.ColumnSpacing,
            row_spacing: this.layoutProperties.RowSpacing
        });
        this.shortcutsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            layout_manager: layout 
        });
        layout.hookup_style(this.shortcutsGrid);

        this.shortcutsBox.add_child(this.shortcutsGrid);

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2], Constants.DisplayType.GRID);
            this.appShortcuts.push(shortcutMenuItem);
        }

        this.updateWidth();
        this._updatePosition();
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
        this.weatherBox.style = `width: ${menuWidth}px;`;
        this.layoutProperties.MenuWidth = menuWidth;
        if(setDefaultMenuView)
            this.setDefaultMenuView();
    }

    _updatePosition(){
        let ravenPosition = this._settings.get_enum('raven-position');
        if(this.mainBox.contains(this.actionsBoxContainer)){
            this.mainBox.remove_child(this.actionsBoxContainer);
        }
        if(ravenPosition === Constants.RavenPosition.LEFT){
            this.mainBox.insert_child_at_index(this.actionsBoxContainer, 0);
            this.actionsBoxContainer.style = "border-right-width: 1px;" + this.actionsBoxContainerStyle;
        }
        else if(ravenPosition === Constants.RavenPosition.RIGHT){
            this.mainBox.insert_child_at_index(this.actionsBoxContainer, 1);
            this.actionsBoxContainer.style = "border-left-width: 1px;" + this.actionsBoxContainerStyle;
        }
    }

    updateLocation(){     
        let ravenPosition = this._settings.get_enum('raven-position');
        
        let alignment = ravenPosition === Constants.RavenPosition.LEFT ? 0 : 1;
        this.arcMenu._boxPointer.setSourceAlignment(alignment);
        this.arcMenu._arrowAlignment = alignment;
        
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton);
        let monitorWorkArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let positionX = ravenPosition === Constants.RavenPosition.LEFT ? monitorWorkArea.x : monitorWorkArea.x + monitorWorkArea.width - 1;
        let positionY = this.arcMenu._arrowSide === St.Side.BOTTOM ? monitorWorkArea.y + monitorWorkArea.height : monitorWorkArea.y;
        
        this.dummyCursor.set_position(positionX, positionY);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        let screenHeight = monitorWorkArea.height;   
     
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderWidth = themeNode.get_length('-arrow-border-width');

        let height = Math.round((screenHeight - borderWidth * 2) / scaleFactor);
        this.mainBox.style = `height: ${height}px;`;
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        let homeScreen = this._settings.get_boolean('enable-unity-homescreen');
        if(homeScreen){
            this.activeCategory = _("Pinned Apps");
            this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
            this.displayPinnedApps();
        }
        else{
            this.activeCategory = _("All Programs");
            let isGridLayout = true;
            this.displayAllApps(isGridLayout);   
            this.activeCategoryType = Constants.CategoryType.ALL_PROGRAMS;
        }
        this.activeMenuItem = this.categoryDirectories.values().next().value;
        if(this.arcMenu.isOpen)
            this.activeMenuItem.active = true;
    }

    updateStyle(){
        super.updateStyle();

        this.arcMenu.actor.style = "-arrow-base: 0px; -arrow-rise: 0px; -boxpointer-gap: 0px; -arrow-border-radius: 0px;";
        this.arcMenu.box.style = "padding-bottom: 0px; padding-top: 0px; margin: 0px;";
        this.updateLocation();
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.HOME_SCREEN, Constants.DisplayType.BUTTON);
        this.categoryDirectories.set(Constants.CategoryType.HOME_SCREEN, categoryMenuItem);
        this.hasPinnedApps = true;

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(categoryEnum == Constants.CategoryType.PINNED_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum, Constants.DisplayType.BUTTON);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories(Constants.DisplayType.BUTTON);
        this.displayCategories();
    }

    displayCategories(){
        for(let categoryMenuItem of this.categoryDirectories.values()){
            this.actionsBox.add_child(categoryMenuItem.actor);	 
        }
    }

    displayPinnedApps() {
        if(this.activeCategoryType === Constants.CategoryType.HOME_SCREEN)
            this._clearActorsFromBox(this.applicationsBox);
        else
            this._clearActorsFromBox();
        this.activeCategory = _("Pinned Apps");
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
        this.activeCategory = _("Shortcuts");
        this._displayAppList(this.appShortcuts, Constants.CategoryType.HOME_SCREEN, this.shortcutsGrid);
        if(!this.applicationsBox.contains(this.shortcutsBox))
            this.applicationsBox.add_child(this.shortcutsBox);
        let actors = this.weatherBox.get_children();
        for (let i = 0; i < actors.length; i++) {
            this.weatherBox.remove_child(actors[i]);
        }
        if(this._settings.get_boolean('enable-clock-widget-raven')){
            this.weatherBox.add_child(this._clocksItem);
        }
        if(this._settings.get_boolean('enable-weather-widget-raven')){
            this.weatherBox.add_child(this._weatherItem);
        }
        if(!this.subMainBox.contains(this.weatherBox))
            this.subMainBox.add_child(this.weatherBox);
    }

    displayRecentFiles(){
        super.displayRecentFiles();
        let label = this._createLabelWithSeparator(_("Recent Files"));
        label.actor.style += "padding-left: 10px;";
        this.applicationsBox.insert_child_at_index(label, 0);
        this.activeCategoryType = Constants.CategoryType.RECENT_FILES;
        this.applicationsBox.add_style_class_name('margin-box');
    }

    displayCategoryAppList(appList, category){
        this._clearActorsFromBox();
        this._displayAppList(appList, category, this.applicationsGrid);
    }
    
    _clearActorsFromBox(box) {
        if(this.subMainBox.contains(this.weatherBox)){
            this.subMainBox.remove_child(this.weatherBox);
        }

        this.applicationsBox.remove_style_class_name('margin-box');
        super._clearActorsFromBox(box);
    }

    _displayAppList(apps, category, grid){      
        super._displayAppList(apps, category, grid);
        let label = this._createLabelWithSeparator(this.activeCategory);

        if(grid === this.applicationsGrid){
            label.actor.style += "padding-left: 10px;";
            this.applicationsBox.insert_child_at_index(label.actor, 0);
        }
        else{
            label.actor.style += "padding-left: 10px; padding-top: 20px;";
            this.applicationsBox.insert_child_at_index(label.actor, 2);
        }
    }
   
    destroy(){
        if(this._clocksItem)
            this._clocksItem.destroy();
        if(this._weatherItem)
            this._weatherItem.destroy();

        if(this.ravenPositionChangedID){
            this._settings.disconnect(this.ravenPositionChangedID);
            this.ravenPositionChangedID = null;
        }

        this.arcMenu.actor.style = null;
        this.arcMenu.box.style = null;
        this.arcMenu.sourceActor = this.oldSourceActor;
        this.arcMenu.focusActor = this.oldFocusActor;
        this.arcMenu._boxPointer.setPosition(this.oldSourceActor, this.oldArrowAlignment);
        this.arcMenu.close();
        this.arcMenu._boxPointer.hide();
        Main.uiGroup.remove_child(this.dummyCursor);
        this.dummyCursor.destroy();

        super.destroy();
    }
}
