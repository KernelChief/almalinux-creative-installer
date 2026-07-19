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

const {Clutter, GLib, Gio, Gtk, St} = imports.gi;
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
            PinnedAppsColumns: 1,
            DefaultMenuWidth: 525,
            DefaultIconGridStyle: "SmallIconGrid",
            VerticalMainBox: false,
            DefaultCategoryIconSize: Constants.MEDIUM_ICON_SIZE,
            DefaultApplicationIconSize: Constants.LARGE_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.MEDIUM_ICON_SIZE,
        });
    }
    createLayout(){  
        super.createLayout();   
        this.actionsBox = new St.BoxLayout({
            x_expand: false,
            y_expand: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.FILL,
            vertical: true
        });
        this.actionsBox.style = "margin: 0px 5px 0px 10px; spacing: 10px;";
        this.mainBox.add_child(this.actionsBox);

        this.pinnedAppsButton = new MW.PinnedAppsButton(this);
        this.pinnedAppsButton.actor.y_expand = true;
        this.pinnedAppsButton.actor.y_align= Clutter.ActorAlign.START;
        this.pinnedAppsButton.actor.margin = 5;
        this.actionsBox.add_child(this.pinnedAppsButton.actor);
        let userButton = new MW.UserMenuItem(this, Constants.DisplayType.BUTTON);
        this.actionsBox.add_child(userButton.actor);
        let path = GLib.get_user_special_dir(imports.gi.GLib.UserDirectory.DIRECTORY_DOCUMENTS);
        if (path != null){
            let placeInfo = new MW.PlaceInfo(Gio.File.new_for_path(path), _("Documents"));
            let placeMenuItem = new MW.PlaceMenuItem(this, placeInfo, Constants.DisplayType.BUTTON);
            this.actionsBox.add_child(placeMenuItem.actor);
        }
        let settingsButton = new MW.SettingsButton(this);
        settingsButton.actor.expand = false;
        settingsButton.actor.margin = 5;
        this.actionsBox.add_child(settingsButton.actor);
        this.leaveButton = new MW.LeaveButton(this);
        this.leaveButton.actor.expand = false;
        this.leaveButton.actor.margin = 5;
        this.actionsBox.add_child(this.leaveButton.actor);

        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });
        this.mainBox.add_child(this.subMainBox);

        let userMenuBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            vertical: false,
        })
        this.user = new MW.UserMenuIcon(this, 55, true);
        this.user.actor.x_align = Clutter.ActorAlign.CENTER;
        this.user.actor.y_align = Clutter.ActorAlign.CENTER;
        this.user.label.x_align = Clutter.ActorAlign.CENTER;
        this.user.label.style = "margin-left: 10px;"
        userMenuBox.add_child(this.user.actor);
        userMenuBox.add_child(this.user.label);
        this.subMainBox.add_child(userMenuBox);

        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 15px 10px 10px 10px;";
        this.subMainBox.add_child(this.searchBox.actor);

        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class:  this.disableFadeEffect ? '' : 'vfade',
        });

        this.applicationsScrollBox.add_actor( this.applicationsBox);
        this.subMainBox.add_child(this.applicationsScrollBox);
        
        this.updateWidth();
        this.loadCategories();
        this.loadPinnedApps();

        this._createPinnedAppsMenu();
        this.setDefaultMenuView();
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
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

    loadPinnedApps(){
        this.layoutProperties.DisplayType = Constants.DisplayType.LIST;
        super.loadPinnedApps();
        this.layoutProperties.DisplayType = Constants.DisplayType.GRID;
    }

    _createPinnedAppsMenu(){
        this.dummyCursor = new St.Widget({ width: 0, height: 0, opacity: 0 });
        Main.uiGroup.add_child(this.dummyCursor);
        this.pinnedAppsMenu = new PopupMenu.PopupMenu(this.dummyCursor, 0, St.Side.TOP);
        this.pinnedAppsMenu.blockSourceEvents = true;
        this.section = new PopupMenu.PopupMenuSection();
        this.pinnedAppsMenu.addMenuItem(this.section);  
        
        this.leftPanelPopup = new St.BoxLayout({
            vertical: true,
            style_class: 'margin-box'
        });   
        this.leftPanelPopup._delegate = this.leftPanelPopup;
        let headerBox = new St.BoxLayout({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: true
        });    
        this.leftPanelPopup.add_child(headerBox);

        this.backButton = new MW.BackMenuItem(this);
        this.backButton.connect("activate", () => this.togglePinnedAppsMenu());
        headerBox.add_child(this.backButton.actor);
        let separator = new MW.ArcMenuSeparator(Constants.SeparatorStyle.MEDIUM, Constants.SeparatorAlignment.HORIZONTAL);
        headerBox.add_child(separator);
        headerBox.add_child(this.createLabelRow(_("Pinned Apps")));

        this.pinnedAppsScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class:  this.disableFadeEffect ? '' : 'small-vfade',
            overlay_scrollbars: true,
            reactive:true
        });   
        
        this.leftPanelPopup.add_child(this.pinnedAppsScrollBox);
       
        this.pinnedAppsBox = new St.BoxLayout({
            vertical: true
        });     
        this.pinnedAppsScrollBox.add_actor(this.pinnedAppsBox);

        let layout = new Clutter.GridLayout({ 
            orientation: Clutter.Orientation.VERTICAL,
            column_spacing: 0,
            row_spacing: 0 
        });
        this.pinnedAppsGrid = new St.Widget({ 
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            layout_manager: layout 
        });
        layout.forceGridColumns = 1;
        layout.hookup_style(this.pinnedAppsGrid);

        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let scaleFactor = themeContext.scale_factor;
        let height = Math.round(this._settings.get_int('menu-height') / scaleFactor) - 1;
        this.leftPanelPopup.style = `height: ${height}px`;        
        this.section.actor.add_child(this.leftPanelPopup); 
        this.displayPinnedApps();
        this.subMenuManager.addMenu(this.pinnedAppsMenu);
        this.pinnedAppsMenu.actor.hide();
        Main.uiGroup.add_child(this.pinnedAppsMenu.actor);
        this.pinnedAppsMenu.connect('open-state-changed', (menu, open) => {
            if(open){
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.pinnedAppsButton.tooltip){
                    this.pinnedAppsButton.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
            else{
                this.pinnedAppsButton.active = false;
                this.pinnedAppsButton.sync_hover();
                this.pinnedAppsButton.hovered = this.pinnedAppsButton.hover;
            }
        });
    }

    togglePinnedAppsMenu(){
        let appsScrollBoxAdj = this.pinnedAppsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);

        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.pinnedAppsMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.pinnedAppsMenu.actor.add_style_class_name(customStyle ? 'arc-menu' : 'popup-menu');
        this.pinnedAppsButton.tooltip.hide();

        let themeNode = this.arcMenu.actor.get_theme_node();
        let backgroundColor = themeNode.get_color('-arrow-background-color');
        let borderWidth = themeNode.get_length('-arrow-border-width');
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        borderRadius = borderRadius / scaleFactor;

        let drawBoxShadow = true;
        if(backgroundColor?.alpha === 0){
            backgroundColor = themeNode.get_color('background-color');
            if(backgroundColor?.alpha === 0){
                drawBoxShadow = false;
            }
        }

        let styleProperties, shadowColor;
        if(drawBoxShadow){
            shadowColor = backgroundColor.shade(.35);
            backgroundColor = Utils.clutterColorToRGBA(backgroundColor);
            shadowColor = Utils.clutterColorToRGBA(shadowColor);
            styleProperties = "box-shadow: 3px 0px 2px " + shadowColor + "; background-color: " + backgroundColor + ";";
        }

        this.pinnedAppsMenu.actor.style = "-boxpointer-gap: 0px; -arrow-border-color: transparent; -arrow-border-width: 0px; width: 250px;"
                                            +"-arrow-base: 0px; -arrow-rise: 0px; -arrow-background-color: transparent;"
                                            +"border-radius: " + borderRadius + "px;" + styleProperties;

        this.arcMenu.actor.get_allocation_box();
        let [x, y] = this.arcMenu.actor.get_transformed_position();
        let rise = themeNode.get_length('-arrow-rise');
    
        if(this.arcMenu._arrowSide === St.Side.TOP)
            y += rise + 1;
        else 
            y += 1;

        if(this.arcMenu._arrowSide === St.Side.LEFT)
            x = x + (borderRadius * 2) + rise + 1;
        else
            x = x + (borderRadius * 2);

        this.dummyCursor.set_position(Math.round(x + borderWidth), Math.round(y + borderWidth));
        this.pinnedAppsMenu.toggle();
        if(this.pinnedAppsMenu.isOpen){
            this.activeMenuItem = this.backButton;
            this.backButton.grab_key_focus();
        }
    }
    
    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.displayAllApps();
        this.activeMenuItem = this.applicationsGrid.layout_manager.get_child_at(0, 0);
        if(!this.applicationsBox.contains(this.applicationsGrid))
            this.applicationsBox.add_child(this.applicationsGrid);
        let appsScrollBoxAdj = this.pinnedAppsScrollBox.get_vscroll_bar().get_adjustment();
        appsScrollBoxAdj.set_value(0);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    loadCategories() {
        this.categoryDirectories = null;
        this.categoryDirectories = new Map(); 
        this.hasPinnedApps = true;
        super.loadCategories();
    }
    
    _clearActorsFromBox(box){
        super._clearActorsFromBox(box);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    displayPinnedApps() {
        this._clearActorsFromBox(this.pinnedAppsBox);
        this.layoutProperties.GridColumns = 1;
        this._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.pinnedAppsGrid);
        if(!this.pinnedAppsBox.contains(this.pinnedAppsGrid))
            this.pinnedAppsBox.add_child(this.pinnedAppsGrid);
        this.updateStyle();  
        this.layoutProperties.GridColumns = 5;
    }
}
