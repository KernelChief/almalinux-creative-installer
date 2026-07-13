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

const {Clutter, Gtk, Shell, St} = imports.gi;
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
            VerticalMainBox: true,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }

    createLayout(){
        super.createLayout();

        if(this._settings.get_enum('searchbar-default-bottom-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 0px 10px 5px 10px;";
            this.mainBox.add_child(this.searchBox.actor);
        }

        this.buttonPressEventID = global.stage.connect("button-press-event", () => {
            if(this.arcMenu.isOpen && this.backButton.visible){
                let event = Clutter.get_current_event();
                if(event.get_button() === 8){
                    this.backButton.activate(event);
                }
            }
        });

        //subMainBox stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'margin-box'
        });
        this.mainBox.add_child(this.subMainBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'left-panel'
        });

        //Applications Box - Contains Favorites, Categories or programs
        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-panel ' + (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true,
            reactive:true
        });
        this.leftBox.add_child(this.applicationsScrollBox);
        this.applicationsBox = new St.BoxLayout({ vertical: true });
        this.applicationsScrollBox.add_actor(this.applicationsBox);

        this.navigateBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
        this.navigateBox.add_child(separator);

        this.backButton = new MW.BackMenuItem(this);
        this.navigateBox.add_child(this.backButton.actor);

        this.viewProgramsButton = new MW.ViewAllPrograms(this);
        this.navigateBox.add_child(this.viewProgramsButton.actor);
        this.leftBox.add_child(this.navigateBox);
        if(this._settings.get_enum('searchbar-default-bottom-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.style = "margin: 5px 10px 0px 10px;";
            this.leftBox.add_child(this.searchBox.actor);
        }

        this.rightBox = new St.BoxLayout({
            vertical: true,
            style_class: 'right-panel'
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add_child(horizonalFlip ? this.rightBox : this.leftBox);
        let verticalSeparator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.VERTICAL);
        this.subMainBox.add_child(verticalSeparator);
        this.subMainBox.add_child(horizonalFlip ? this.leftBox : this.rightBox);

        this.placesShortcuts = false;
        this.externalDevicesShorctus = false;
        this.networkDevicesShorctus = false;
        this.bookmarksShorctus = false;
        this.softwareShortcuts = false;

        if(!this._settings.get_boolean('disable-user-avatar')){
            this.user = new MW.UserMenuItem(this, Constants.DisplayType.LIST);
            this.rightBox.add_child(this.user.actor);
            separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.SHORT, Constants.SeparatorAlignment.HORIZONTAL);
            this.rightBox.add_child(separator);
        }

        this.shortcutsBox = new St.BoxLayout({
            vertical: true
        });

        this.shortcutsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'right-panel ' + (this.disableFadeEffect ? '' : 'small-vfade'),
        });

        this.shortcutsScrollBox.add_actor(this.shortcutsBox);
        this.rightBox.add_child(this.shortcutsScrollBox);

        // Add place shortcuts to menu (Home,Documents,Downloads,Music,Pictures,Videos)
        this._displayPlaces();

        //draw bottom right horizontal separator + logic to determine if should show
        let shouldDraw = false;
        if(this._settings.get_value('directory-shortcuts-list').deep_unpack().length > 0){
            this.placesShortcuts = true;
        }
        if(this._settings.get_value('application-shortcuts-list').deep_unpack().length > 0){
            this.softwareShortcuts = true;
        }

        //check to see if should draw separator
        if(this.placesShortcuts && (this._settings.get_boolean('show-external-devices') || this.softwareShortcuts || this._settings.get_boolean('show-bookmarks'))  )
            shouldDraw = true;
        if(shouldDraw){
            separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.SHORT, Constants.SeparatorAlignment.HORIZONTAL);
            this.shortcutsBox.add_child(separator);
        }

        //External Devices and Bookmarks Shortcuts
        this.externalDevicesBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true
        });
        this.shortcutsBox.add_child(this.externalDevicesBox);

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

        //Add Application Shortcuts to menu (Software, Settings, Tweaks, Terminal)
        let SOFTWARE_TRANSLATIONS = [_("Software"), _("Settings"), _("Tweaks"), _("Terminal"), _("Activities Overview"), _("ArcMenu Settings")];
        let applicationShortcuts = this._settings.get_value('application-shortcuts-list').deep_unpack();
        for(let i = 0; i < applicationShortcuts.length; i++){
            let applicationName = applicationShortcuts[i][0];
            let shortcutMenuItem = new MW.ShortcutMenuItem(this, _(applicationName), applicationShortcuts[i][1], applicationShortcuts[i][2], Constants.DisplayType.LIST);
            if(shortcutMenuItem.shouldShow)
                this.shortcutsBox.add_child(shortcutMenuItem.actor);
        }

        //create new section for Power, Lock, Logout, Suspend Buttons
        this.actionsBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            y_align: Clutter.ActorAlign.END,
            style: "spacing: 6px; padding: 0px;"
        });

        let powerOptions = this._settings.get_value("power-options").deep_unpack();
        for(let i = 0; i < powerOptions.length; i++){
            let powerType = powerOptions[i][0];
            let shouldShow = powerOptions[i][1];
            if(shouldShow){
                let powerButton = new MW.PowerButton(this, powerType);
                this.actionsBox.add_child(powerButton);
            }
        }
        this.rightBox.add_child(this.actionsBox);

        this.extraCategoriesLinksBox = new St.BoxLayout({
            vertical: true
        });
        this.extraCategoriesLinksBox.hide();
        this.extraCategoriesSeparator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);

        let extraCategoriesLinksLocation = this._settings.get_enum('arcmenu-extra-categories-links-location');
        if(extraCategoriesLinksLocation === Constants.MenuItemLocation.TOP)
            this.leftBox.insert_child_below(this.extraCategoriesLinksBox, this.applicationsScrollBox);
        else
            this.navigateBox.insert_child_above(this.extraCategoriesLinksBox, this.navigateBox.get_child_at_index(0));
        this.extraCategoriesLinksBox.add_child(this.extraCategoriesSeparator);

        this.loadCategories();
        this.loadPinnedApps();

        this.setDefaultMenuView();
    }

    _createExtraCategoriesLinks(){
        this.showExtraCategoriesLinksBox = false;
        let extraCategories = this._settings.get_value("arcmenu-extra-categories-links").deep_unpack();
        let defaultMenuView = this._settings.get_enum('default-menu-view');

        //Don't create extra categories quick links if
        //the default menu view is the categories list
        if(defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST)
            return;

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            //If ArcMenu layout set to "Pinned Apps" default view and Extra Categories "Pinned Apps" is enabled,
            //do not display "Pinned Apps" as an extra category -- Same for "Frequent Apps"
            if(categoryEnum == Constants.CategoryType.PINNED_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
                shouldShow = false;
            if(categoryEnum == Constants.CategoryType.FREQUENT_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
                shouldShow = false;
            if(categoryEnum == Constants.CategoryType.ALL_PROGRAMS && shouldShow && defaultMenuView === Constants.DefaultMenuView.ALL_PROGRAMS)
                shouldShow = false;
            if(shouldShow){
                let extraCategoryItem = this.categoryDirectories.get(categoryEnum);
                if(!extraCategoryItem)
                    continue;

                this.showExtraCategoriesLinksBox = true;
                if(extraCategoryItem.get_parent())
                    extraCategoryItem.get_parent().remove_child(extraCategoryItem);

                this.extraCategoriesLinksBox.insert_child_below(extraCategoryItem, this.extraCategoriesSeparator);
            }
        }
        if(this.showExtraCategoriesLinksBox)
            this.extraCategoriesLinksBox.show();
        else
            this.extraCategoriesLinksBox.hide();
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
            this.hasPinnedApps = true;

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            //If ArcMenu layout set to "Pinned Apps" default view and Extra Categories "Pinned Apps" is enabled,
            //do not display "Pinned Apps" as an extra category -- Same for "Frequent Apps"
            if(categoryEnum == Constants.CategoryType.PINNED_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
                shouldShow = false;
            if(categoryEnum == Constants.CategoryType.FREQUENT_APPS && shouldShow && defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
                shouldShow = false;
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum, Constants.DisplayType.LIST);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }

        super.loadCategories();

        this._createExtraCategoriesLinks();
    }

    displayPinnedApps(){
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS){
            if (this.showExtraCategoriesLinksBox) this.extraCategoriesLinksBox.show();
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }
        else if(defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST){
            this.extraCategoriesLinksBox.hide();
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        else if(defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS){
            this.extraCategoriesLinksBox.hide();
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        else if(defaultMenuView === Constants.DefaultMenuView.ALL_PROGRAMS){
            this.extraCategoriesLinksBox.hide();
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        super.displayPinnedApps();
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    displayAllApps(showBackButton = true){
        super.displayAllApps();
        this.viewProgramsButton.actor.hide();

        if(showBackButton){
            this.extraCategoriesLinksBox.hide();
            this.backButton.actor.show();
        }
        else{
            if (this.showExtraCategoriesLinksBox) this.extraCategoriesLinksBox.show();
            this.backButton.actor.hide();
        }
    }

    displayCategories(){
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS || defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS){
            this.extraCategoriesLinksBox.hide();
            this.viewProgramsButton.actor.hide();
            this.backButton.actor.show();
        }
        else{
            this.extraCategoriesLinksBox.hide();
            this.viewProgramsButton.actor.show();
            this.backButton.actor.hide();
        }

        super.displayCategories();
        this.activeCategoryType = Constants.CategoryType.CATEGORIES_LIST;
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        let defaultMenuView = this._settings.get_enum('default-menu-view');

        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS)
            this.displayPinnedApps();
        else if(defaultMenuView === Constants.DefaultMenuView.CATEGORIES_LIST)
            this.displayCategories();
        else if(defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
            this.displayFrequentApps();
        else if(defaultMenuView === Constants.DefaultMenuView.ALL_PROGRAMS)
            this.displayAllApps(false);
    }

    displayCategoryAppList(appList, category){
        super.displayCategoryAppList(appList, category);
        this.extraCategoriesLinksBox.hide();
        this.backButton.actor.show();
        this.viewProgramsButton.actor.hide();
    }

    displayFrequentApps(){
        this._clearActorsFromBox();
        if (this.showExtraCategoriesLinksBox) this.extraCategoriesLinksBox.show();
        this.viewProgramsButton.actor.show();
        this.backButton.actor.hide();
        let mostUsed = Shell.AppUsage.get_default().get_most_used();
        let appList = [];
        for (let i = 0; i < mostUsed.length; i++) {
            if (mostUsed[i] && mostUsed[i].get_app_info().should_show()){
                let isContainedInCategory = false;
                let item = new MW.ApplicationMenuItem(this, mostUsed[i], Constants.DisplayType.LIST, null, isContainedInCategory);
                appList.push(item);
            }
        }
        let activeMenuItemSet = false;
        for (let i = 0; i < appList.length; i++) {
            let item = appList[i];
            if(item.actor.get_parent())
                item.actor.get_parent().remove_child(item.actor);
            if (!item.actor.get_parent())
                this.applicationsBox.add_child(item.actor);
            if(!activeMenuItemSet){
                activeMenuItemSet = true;
                this.activeMenuItem = item;
            }
        }
    }

    displayRecentFiles(){
        this.extraCategoriesLinksBox.hide();
        this.backButton.actor.show();
        this.viewProgramsButton.actor.hide();
        super.displayRecentFiles();
    }

    _clearActorsFromBox(box){
        //keep track of the previous category for the back button.
        this.previousCategoryType = this.activeCategoryType;
        super._clearActorsFromBox(box);
    }

    _onSearchBoxChanged(searchBox, searchString){
        super._onSearchBoxChanged(searchBox, searchString);
        if(!searchBox.isEmpty()){
            this.extraCategoriesLinksBox.hide();
            this.backButton.actor.show();
            this.viewProgramsButton.actor.hide();
            this.activeCategoryType = Constants.CategoryType.SEARCH_RESULTS;
        }
    }

    destroy(){
        if(this.buttonPressEventID){
            global.stage.disconnect(this.buttonPressEventID);
            this.buttonPressEventID = null;
        }
        super.destroy()
    }
}
