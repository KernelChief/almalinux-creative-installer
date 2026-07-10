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
            SupportsCategoryOnHover: true,
            VerticalMainBox: true,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }
    createLayout(){
        super.createLayout();

        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.TOP){
            this.searchBox.style = "margin: 0px 10px 5px 10px;";
            this.mainBox.add_child(this.searchBox.actor);
        }

        //subMainBox stores left and right box
        this.subMainBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'margin-box'
        });
        this.mainBox.add_child(this.subMainBox);
        
        this.rightBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true,
            style_class: 'right-panel-plus70'
        });

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'right-panel-plus70 ' + (this.disableFadeEffect ? '' : 'small-vfade'),
        });
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add_child(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
        });

        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add_child(horizonalFlip ? this.rightBox : this.leftBox);  
        let verticalSeparator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.VERTICAL);
        this.subMainBox.add_child(verticalSeparator);
        this.subMainBox.add_child(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'left-panel-small ' + (this.disableFadeEffect ? '' : 'small-vfade'),
        });

        this.leftBox.add_child(this.categoriesScrollBox);

        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);
        
        this.actionsBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        this.actionsBox.style = "padding: 5px 0px 0px 0px;"
        this.leftBox.add_child(this.actionsBox);
        
        //create new section for Power, Lock, Logout, Suspend Buttons
        this.sessionBox = new St.BoxLayout({
            vertical: false,
            x_expand: false,
            y_expand: false,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER
        });	
        this.sessionBox.style = "spacing: 6px;";

        let powerOptions = this._settings.get_value("power-options").deep_unpack();
        for(let i = 0; i < powerOptions.length; i++){
            let powerType = powerOptions[i][0];
            let shouldShow = powerOptions[i][1];
            if(shouldShow){
                let powerButton = new MW.PowerButton(this, powerType);
                this.sessionBox.add_child(powerButton);
            }
        }
        this.leftBox.add_child(this.sessionBox);
        
        if(this._settings.get_enum('searchbar-default-top-location') === Constants.SearchbarLocation.BOTTOM){
            this.searchBox.style = "margin: 10px 10px 0px 10px;";
            this.mainBox.add_child(this.searchBox.actor); 
        }

        this.loadCategories();
        this.loadPinnedApps();
        this.loadExtraPinnedApps();

        this.setDefaultMenuView();
    }

    loadExtraPinnedApps(){
        this.actionsBox.destroy_all_children();
        let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
        this.actionsBox.add_child(separator);
        let pinnedApps = this._settings.get_strv('brisk-shortcuts-list');

        for(let i = 0;i < pinnedApps.length; i += 3){
            let isContainedInCategory = false;
            let placeMenuItem = this.createMenuItem([pinnedApps[i],pinnedApps[i+1], pinnedApps[i+2]], Constants.DisplayType.LIST, isContainedInCategory);     
            if(placeMenuItem){
                this.actionsBox.add_child(placeMenuItem.actor);
            }
        }
        separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
        this.actionsBox.add_child(separator);  
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayCategories();
        this.categoryDirectories.values().next().value.displayAppList();
        this.activeMenuItem = this.categoryDirectories.values().next().value;
        if(this.arcMenu.isOpen)
            this.activeMenuItem.active = true;
    }
    
    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 

        let extraCategories = this._settings.get_value("extra-categories").deep_unpack();

        for(let i = 0; i < extraCategories.length; i++){
            let categoryEnum = extraCategories[i][0];
            let shouldShow = extraCategories[i][1];
            if(shouldShow){
                let categoryMenuItem = new MW.CategoryMenuItem(this, categoryEnum, Constants.DisplayType.LIST);
                this.categoryDirectories.set(categoryEnum, categoryMenuItem);
            }
        }        

        super.loadCategories();
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
