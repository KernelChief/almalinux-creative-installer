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
const MW = Me.imports.menuWidgets;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(menuButton) {
        super(menuButton, {
            Search: false,
            DisplayType: Constants.DisplayType.LIST,
            SearchDisplayType: Constants.DisplayType.LIST,
            GridColumns: 1,
            ColumnSpacing: 0,
            RowSpacing: 0,
            SupportsCategoryOnHover: true,
            VerticalMainBox: true,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.SMALL_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }
    createLayout(){
        super.createLayout();
        this.subMainBox= new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: false,
            style_class: 'margin-box'
        });
        this.mainBox.add_child(this.subMainBox);

        this.rightBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true,
            style_class: 'right-panel-plus45'
        });

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });
        this.applicationsScrollBox = this._createScrollBox({
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class: 'right-panel-plus45 ' + (this.disableFadeEffect ? '' : 'small-vfade'),
        }); 
        
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.rightBox.add_child(this.applicationsScrollBox);

        this.leftBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true,
            style_class: 'left-panel'
        });
        
        let horizonalFlip = this._settings.get_boolean("enable-horizontal-flip");
        this.subMainBox.add_child(horizonalFlip ? this.rightBox : this.leftBox);  
        let verticalSeparator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.VERTICAL);
        this.subMainBox.add_child(verticalSeparator);
        this.subMainBox.add_child(horizonalFlip ? this.leftBox : this.rightBox);

        this.categoriesScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-panel ' + (this.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });

        this.leftBox.add_child(this.categoriesScrollBox);
        this.categoriesBox = new St.BoxLayout({ vertical: true });
        this.categoriesScrollBox.add_actor(this.categoriesBox);

        this.activitiesBox = new St.BoxLayout({ 
            vertical: true,
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.END
        });
        let activities = new MW.ActivitiesMenuItem(this);
        this.activitiesBox.add_child(activities.actor);
        this.leftBox.add_child(this.activitiesBox);

        this.loadCategories();
        this.loadPinnedApps();

        this.setDefaultMenuView(); 
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

        for(let categoryMenuItem of this.categoryDirectories.values()){
            categoryMenuItem.actor.style = "padding-top: 8px; padding-bottom: 8px;";
            categoryMenuItem._iconBin.visible = false;
        }
    }
    
    displayCategories(){
        super.displayCategories(this.categoriesBox);
    }
}
