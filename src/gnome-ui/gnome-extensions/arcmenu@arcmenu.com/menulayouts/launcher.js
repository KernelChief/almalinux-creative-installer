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

const {Clutter, GLib, Gio, Gtk, Shell, St} = imports.gi;
const BaseMenuLayout = Me.imports.menulayouts.baseMenuLayout;
const Constants = Me.imports.constants;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const MW = Me.imports.menuWidgets;
const PlaceDisplay = Me.imports.placeDisplay;
const PopupMenu = imports.ui.popupMenu;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;

const MORE_PROVIDERS_POP_UP = -1;
const MAX_VISIBLE_PROVIDERS = 4;

var createMenu = class extends BaseMenuLayout.BaseLayout{
    constructor(menuButton) {
        super(menuButton, {
            Search: true,
            SearchDisplayType: Constants.DisplayType.LIST,
            DisplayType: Constants.DisplayType.GRID,
            ColumnSpacing: 15,
            RowSpacing: 15,
            MenuWidth: 750,
            DefaultIconGridStyle: "LargeIconGrid",
            VerticalMainBox: true,
            DefaultCategoryIconSize: Constants.LARGE_ICON_SIZE,
            DefaultApplicationIconSize: Constants.LARGE_ICON_SIZE,
            DefaultQuickLinksIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultButtonsIconSize: Constants.EXTRA_SMALL_ICON_SIZE,
            DefaultPinnedIconSize: Constants.LARGE_ICON_SIZE,
        });
    }
    createLayout(){     
        super.createLayout();
        this.activeResult = null;
        this.searchProvidersBoxStyle = "padding: 0px 15px; margin-bottom: 10px; height: 50px; background-color: rgba(186, 196, 201, 0.1); border-color:rgba(186, 196, 201, 0.2); border-bottom-width: 1px;"
        this.themeNodeBorderRadius = "";
        this.searchProvidersBox = new St.BoxLayout({
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            vertical: false,
            style: this.searchProvidersBoxStyle + this.themeNodeBorderRadius
        });
        this.searchProvidersBox.clip_to_allocation = true;
        this.mainBox.add_child(this.searchProvidersBox);
        this.subMainBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            vertical: false,
            style_class: 'margin-box'
        });
        this.mainBox.add_child(this.subMainBox);

        this.searchBox.name = "ArcSearchEntryRound";
        this.searchBox.style = "margin: 0px 10px;";
        this.searchTermsChangedID = this.searchResults.connect('have-results', () => {
            this.searchResultsChangedEvent();
        });
        this.searchNoResultsID = this.searchResults.connect('no-results', () => {
            if(this.subMainBox.contains(this.searchResultDetailsScrollBox))
                this.subMainBox.remove_child(this.searchResultDetailsScrollBox);
        })
        
        this.applicationsBox = new St.BoxLayout({
            vertical: true
        });

        this.applicationsScrollBox = this._createScrollBox({
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class:  this.disableFadeEffect ? '' : 'vfade',
        }); 
        this.subMainBox.style = "width:750px; spacing: 8px;";  

        this.searchResultDetailsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            style: 'width: 415px; spacing: 20px;'
        });

        this.searchResultDetailsScrollBox = this._createScrollBox({
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            overlay_scrollbars: true,
            style_class:  this.disableFadeEffect ? '' : 'vfade',
        }); 

        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.searchResultDetailsScrollBox.add_actor(this.searchResultDetailsBox);
        this.subMainBox.add_child(this.applicationsScrollBox);
        this.mainBox.add_child(this.searchBox);
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
        this.arcMenu.box.style = "padding-top: 0px;";
        this.hasPinnedApps = true;
        this.loadPinnedApps();
        this.loadCategories();

        this.moreItem = this.createProviderMenuItem(_("More"), MORE_PROVIDERS_POP_UP);
        let arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        arrowIcon.y_expand = false;
        this.moreItem.add_child(arrowIcon);
        this._createMoreProvidersMenu();

        this.setDefaultMenuView();
    }

    loadPinnedApps(){
        super.loadPinnedApps();
    }

    loadCategories(){
        this.categoryDirectories = null;
        this.categoryDirectories = new Map();
        let categoryMenuItem = new MW.CategoryMenuItem(this, Constants.CategoryType.FREQUENT_APPS, Constants.DisplayType.LIST);
        this.categoryDirectories.set(Constants.CategoryType.FREQUENT_APPS, categoryMenuItem);

        super.loadCategories();
    }

    setDefaultMenuView(){
        super.setDefaultMenuView();
        this.moveProvidersMenuItems = [];
        this.moreProvidersBox.remove_all_children();
        this.searchResults.setProvider(Constants.CategoryType.SEARCH_RESULTS);
        if(this.subMainBox.contains(this.searchResultDetailsScrollBox))
            this.subMainBox.remove_child(this.searchResultDetailsScrollBox);
        this.displayPinnedApps();
        this.searchProvidersBox.remove_all_children();
        let allProvidersItem = this.createProviderMenuItem(_("All"), Constants.CategoryType.SEARCH_RESULTS);
        this.searchProvidersBox.add_child(allProvidersItem);
        let searchProviders = this.searchResults.getProviders();

        let currentItems = 1;
        for(let provider of searchProviders){
            provider = provider.appInfo ? provider : _("Applications");
            let item = this.createProviderMenuItem(provider, provider.appInfo ? null : Constants.CategoryType.ALL_PROGRAMS);

            if(currentItems < MAX_VISIBLE_PROVIDERS)
                this.searchProvidersBox.add_child(item);
            else{
                this.moveProvidersMenuItems.push(item);
                item.moreIndex = currentItems - MAX_VISIBLE_PROVIDERS;
                item.x_expand = true;
                item.x_align = Clutter.ActorAlign.FILL;
                this.moreProvidersBox.add_child(item);
            }
                
            currentItems++;
        }

        this.searchProvidersBox.add_child(this.moreItem);

        this.activeProvider = allProvidersItem;
        this.activeProvider.add_style_class_name("active-item");
        this.activeCategoryType = Constants.CategoryType.HOME_SCREEN;
    }

    createProviderMenuItem(provider, providerEnum){
        let providerName = provider.appInfo ? provider.appInfo.get_name() : provider;
    
        let providerMenuItem = new MW.ArcMenuPopupBaseMenuItem(this);
        providerMenuItem.name = "arc-menu-launcher-button";
        providerMenuItem.x_expand = false;
        providerMenuItem.remove_child(providerMenuItem._ornamentLabel);
        providerMenuItem.x_align = Clutter.ActorAlign.START;
        providerMenuItem.style = 'padding: 10px 14px; margin: 0px;';
        providerMenuItem.provider = provider;
        let label = new St.Label({
            text: _(providerName),
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
        });
        providerMenuItem.label = label;
        providerMenuItem.add_child(label);

        providerMenuItem.connect("activate", () => this.activateProviderMenuItem(providerMenuItem, providerEnum));
        return providerMenuItem;
    }

    activateProviderMenuItem(providerMenuItem, providerEnum){
        if(providerEnum && providerEnum === MORE_PROVIDERS_POP_UP){
            this.moreItem.add_style_class_name("active-item");
            this.toggleMoreProvidersMenu();
        }
        else{
            if(this.activeProvider)
                this.activeProvider.remove_style_class_name("active-item");

            if(this.moreProvidersMenu.isOpen)
                this.moreProvidersMenu.toggle();

            this.moreItem.remove_style_class_name("active-item");
            this.moreItem.active = false;

            let potentialMovedItem = this.searchProvidersBox.get_child_at_index(MAX_VISIBLE_PROVIDERS);

            if(potentialMovedItem.wasMoved)
                this.moveProviderMenuItem(potentialMovedItem, this.searchProvidersBox, this.moreProvidersBox, true);

            if(providerMenuItem.get_parent() === this.moreProvidersBox)
                this.moveProviderMenuItem(providerMenuItem, this.moreProvidersBox, this.searchProvidersBox, false);

            this.activeProvider = providerMenuItem;
            providerMenuItem.add_style_class_name("active-item");

            this.displayProviderPage(providerMenuItem.provider, providerEnum);
            this.searchResults.setProvider(providerMenuItem.provider.appInfo ? providerMenuItem.provider.appInfo.get_id() : providerEnum);

            if(!this.searchBox.isEmpty()){
                this._clearActorsFromBox();
                let searchString = this.searchBox.get_text();
                searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
                this.searchResults.setTerms([]);

                let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
                appsScrollBoxAdj.set_value(0);
                this.applicationsBox.add_child(this.searchResults);
                this.searchResults.setTerms(searchString.split(/\s+/));
                this.searchResults.highlightDefault(true);
                this.activeProvider.grab_key_focus();
            }
        }
    }

    moveProviderMenuItem(menuItem, currentBox, newBox, wasMoved){
        let expand = wasMoved ? true : false;
        let align = wasMoved ? Clutter.ActorAlign.FILL : Clutter.ActorAlign.START;
        let index = wasMoved ? menuItem.moreIndex : MAX_VISIBLE_PROVIDERS;

        currentBox.remove_child(menuItem);
        newBox.insert_child_at_index(menuItem, index);
        menuItem.x_expand = expand;
        menuItem.x_align = align;
        menuItem.wasMoved = !wasMoved;
    }

    displayProviderPage(provider, providerEnum){
        if(this.subMainBox.contains(this.searchResultDetailsScrollBox))
            this.subMainBox.remove_child(this.searchResultDetailsScrollBox);
        if(providerEnum){
            if(providerEnum === Constants.CategoryType.SEARCH_RESULTS)
                this.displayPinnedApps();
            if(providerEnum === Constants.CategoryType.ALL_PROGRAMS)
                this.displayFrequentApps();
            return;
        }
        this._clearActorsFromBox();
        let providerName = provider.appInfo ? provider.appInfo.get_name() : provider;
        let providerIcon = provider.appInfo ? provider.appInfo.get_icon() : Gio.icon_new_for_string('');

        this.setSearchHintText(providerName);

        let providerBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
        });
        let icon = new St.Icon({ 
            icon_size: 76,
            gicon: providerIcon,
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
        });
        let label = new St.Label({
            text: _("Search") + " " + _(providerName),
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_expand: false,
            y_align: Clutter.ActorAlign.START,
        });
        providerBox.add_child(icon);
        providerBox.add_child(label);
        this.applicationsBox.add_child(providerBox);
    }

    _createMoreProvidersMenu(){
        this.moreProvidersMenu = new PopupMenu.PopupMenu(this.moreItem, 0.5, St.Side.TOP);
        this.moreProvidersMenu.connect('open-state-changed', (menu, open) => {
            if(!open)
                this.moreItem.remove_style_class_name("active-item");
        });

        this.section = new PopupMenu.PopupMenuSection();
        this.moreProvidersMenu.addMenuItem(this.section);  
        
        this.moreProvidersBox = new St.BoxLayout({
            vertical: true
        });   
        
        this.moreProvidersScrollBox = this._createScrollBox({
            x_expand: true, 
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class:  this.disableFadeEffect ? '' : 'vfade',
            overlay_scrollbars: true,
            reactive: true
        }); 
        this.moreProvidersScrollBox._delegate = this.moreProvidersBoxScrollBox;
        this.moreProvidersScrollBox.add_actor(this.moreProvidersBox);
        this.moreProvidersScrollBox.clip_to_allocation = true;

        this.moreProvidersScrollBox.style = "max-height: 350px;";        
        this.section.actor.add_child(this.moreProvidersScrollBox); 
        this.subMenuManager.addMenu(this.moreProvidersMenu);
        this.moreProvidersMenu.actor.hide();
        Main.uiGroup.add_child(this.moreProvidersMenu.actor);
    }

    toggleMoreProvidersMenu(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.moreProvidersMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.moreProvidersMenu.actor.add_style_class_name( customStyle ? 'arc-menu' : 'popup-menu');

        this.moreProvidersMenu.toggle();
    }

    displayFrequentApps(){
        this._clearActorsFromBox();
        this.setSearchHintText(_("Applications"));
        let categoryMenuItem = this.categoryDirectories.get(Constants.CategoryType.FREQUENT_APPS);
        let label = this.createLabelRow(_("Frequent Apps"));
        this.applicationsBox.add_child(label);
        this.layoutProperties.GridColumns = 5;
        super._displayAppList(categoryMenuItem.appList, Constants.CategoryType.FREQUENT_APPS, this.applicationsGrid);
    }

    setSearchHintText(providerName){
        this.searchBox.hint_text = _("Search") + " " + _(providerName) + "…";
    }

    updateStyle(){
        super.updateStyle();
        let removeMenuArrow = this._settings.get_boolean('remove-menu-arrow'); 
        let themeNode = this.arcMenu.actor.get_theme_node();
        let borderRadius = themeNode.get_length('-arrow-border-radius');
        let monitorIndex = Main.layoutManager.findIndexForActor(this.menuButton);
        let scaleFactor = Main.layoutManager.monitors[monitorIndex].geometry_scale;
        borderRadius = borderRadius / scaleFactor;
        this.themeNodeBorderRadius = "border-radius: " + borderRadius + "px " + borderRadius + "px 0px 0px;";
        this.searchProvidersBox.style = this.searchProvidersBoxStyle + this.themeNodeBorderRadius;
        if(removeMenuArrow)
            this.arcMenu.box.style = "padding-top: 0px; margin: 0px;";
        else
            this.arcMenu.box.style = "padding-top: 0px;";
    }

    _clearActorsFromBox(box){
        super._clearActorsFromBox(box);
    }

    displayPinnedApps() {
        super._clearActorsFromBox();
        let label = this.createLabelRow(_("Pinned Apps"));
        this.searchBox.hint_text = _("Search…");
        this.applicationsBox.add_child(label);
        this.layoutProperties.GridColumns = 5;
        super._displayAppList(this.pinnedAppsArray, Constants.CategoryType.PINNED_APPS, this.applicationsGrid);
    }

    searchResultsChangedEvent(){
        if(!this.subMainBox.contains(this.searchResultDetailsScrollBox))
            this.subMainBox.add_child(this.searchResultDetailsScrollBox);
        if(this.activeResult === this.searchResults.getTopResult())
            return;           
        
        this.activeResult = this.searchResults.getTopResult();
        if(!this.activeResult || this.activeResult === null){
            return;
        }

        this.createActiveSearchItemPanel(this.searchResults.getTopResult());
    }

    createActiveSearchItemPanel(activeResult){
        if(!activeResult)
            return;
        if(!this.subMainBox.contains(this.searchResultDetailsScrollBox))
            return;
        if(!activeResult.provider || activeResult === this.activeResultMenuItem)
            return;
        this.activeCategoryType = -1;
        this.searchResultDetailsBox.destroy_all_children();

        if(!activeResult.metaInfo)
            return;

        let app = activeResult.app ? activeResult.app : null;
        let path = activeResult._path ? activeResult._path : null;

        this.activeResultMenuItem = new MW.ApplicationMenuItem(this, app, Constants.DisplayType.GRID, activeResult.metaInfo);
        this.activeResultMenuItem.name = "ExtraLargeIconGrid";
        this.activeResultMenuItem.provider = activeResult.provider;
        this.activeResultMenuItem.resultsView = activeResult.resultsView;
        this.activeResultMenuItem._path = path;
        this.activeResultMenuItem.x_expand = false;
        this.activeResultMenuItem.x_align = Clutter.ActorAlign.CENTER;
        let iconSize = 76;
        let icon = activeResult.metaInfo ?activeResult.metaInfo['createIcon'](iconSize) : app.create_icon_texture(iconSize);
        this.activeResultMenuItem._iconBin.set_child(icon);
        if(!this.activeResultMenuItem._iconBin.get_child()){
            let icon = new St.Icon({ 
                icon_size: iconSize,
                gicon: activeResult.provider.appInfo.get_icon()
            });
            this.activeResultMenuItem._iconBin.set_child(icon);
        }
        this.searchResultDetailsBox.add_child(this.activeResultMenuItem);
        this.searchResultContextItems = new MW.ApplicationContextItems(this.activeResultMenuItem, app, this);
        this.searchResultContextItems.path = path;
        this.searchResultContextItems.rebuildItems();
        this.searchResultDetailsBox.add_child(this.searchResultContextItems);
    }

    destroy(){
        this.arcMenu.box.style = null;

        if(this.searchTermsChangedID){
            this.searchResults.disconnect(this.searchTermsChangedID);
            this.searchTermsChangedID = null;
        }
        
        if(this.searchNoResultsID){
            this.searchResults.disconnect(this.searchNoResultsID);
            this.searchNoResultsID = null;
        }

        super.destroy();
    }
}
