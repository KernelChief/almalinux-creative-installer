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
const {Atk, Clutter, Gio, GLib, GMenu, GObject, Gtk, Shell, St} = imports.gi;
const AccountsService = imports.gi.AccountsService;
const AppFavorites = imports.ui.appFavorites;
const BoxPointer = imports.ui.boxpointer;
const Constants = Me.imports.constants;
const Dash = imports.ui.dash;
const DND = imports.ui.dnd;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;
const _SystemActions = imports.misc.systemActions;
const SystemActions = _SystemActions.getDefault();
const Util = imports.misc.util;
const Utils =  Me.imports.utils;
const _ = Gettext.gettext;
const { loadInterfaceXML } = imports.misc.fileUtils;

const ClocksIntegrationIface = loadInterfaceXML('org.gnome.Shell.ClocksIntegration');
const ClocksProxy = Gio.DBusProxy.makeProxyWrapper(ClocksIntegrationIface);

Gio._promisify(Gio._LocalFilePrototype, 'query_info_async', 'query_info_finish');
Gio._promisify(Gio._LocalFilePrototype, 'set_attributes_async', 'set_attributes_finish');

const INDICATOR_ICON_SIZE = 18;
const USER_AVATAR_SIZE = 28;

function activatePowerOption(powerType, arcMenu){
    arcMenu.itemActivated(BoxPointer.PopupAnimation.NONE);
    if(powerType === Constants.PowerType.POWER_OFF)
        SystemActions.activatePowerOff();
    else if(powerType === Constants.PowerType.RESTART)
        SystemActions.activateRestart ? SystemActions.activateRestart() : SystemActions.activatePowerOff();
    else if(powerType === Constants.PowerType.LOCK)
        SystemActions.activateLockScreen();
    else if(powerType === Constants.PowerType.LOGOUT)
        SystemActions.activateLogout();
    else if(powerType === Constants.PowerType.SUSPEND)
        SystemActions.activateSuspend();
    else if(powerType === Constants.PowerType.HYBRID_SLEEP)
        Utils.activateHybridSleep();
    else if(powerType === Constants.PowerType.HIBERNATE)
        Utils.activateHibernate();
}

var ApplicationContextItems = GObject.registerClass({
    Signals: {
        'close-context-menu': { },
    },

},   class Arc_Menu_ApplicationContextItems extends St.BoxLayout{
    _init(actor, app, menuLayout){
        super._init({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'margin-box',
        });
        this._menuLayout = menuLayout;
        this._settings = menuLayout._settings;
        this._menuButton = menuLayout.menuButton;
        this._app = app;
        this.sourceActor = actor;
        this.layout = this._settings.get_enum('menu-layout');

        this.discreteGpuAvailable = false;
        this._switcherooNotifyId = global.connect('notify::switcheroo-control',
            () => this._updateDiscreteGpuAvailable());
        this._updateDiscreteGpuAvailable();
    }

    set path(path){
        this._path = path;
    }

    _updateDiscreteGpuAvailable() {
        this._switcherooProxy = global.get_switcheroo_control();
        if (this._switcherooProxy) {
            let prop = this._switcherooProxy.get_cached_property('HasDualGpu');
            this.discreteGpuAvailable = prop?.unpack() ?? false;
        } else {
            this.discreteGpuAvailable = false;
        }
    }

    closeMenus(){
        this.close();
        this._menuLayout.arcMenu.toggle();
    }

    close(){
        this.emit('close-context-menu');
    }

    rebuildItems(){
        this.destroy_all_children();
        if(this._app instanceof Shell.App){
            this.appInfo = this._app.get_app_info();
            let actions = this.appInfo.list_actions();

            let windows = this._app.get_windows().filter(
                w => !w.skip_taskbar
            );

            if (windows.length > 0){
                let item = new PopupMenu.PopupMenuItem(_("Current Windows:"), {
                    reactive: false,
                    can_focus: false
                });
                item.actor.add_style_class_name('inactive');
                this.add_child(item);

                windows.forEach(window => {
                    let title = window.title ? window.title
                                            : this._app.get_name();
                    let item = this._appendMenuItem(title);
                    item.connect('activate', () => {
                        this.closeMenus();
                        Main.activateWindow(window);
                    });
                });
                this._appendSeparator();
            }

            if (!this._app.is_window_backed()) {
                if (this._app.can_open_new_window() && !actions.includes('new-window')) {
                    let newWindowItem = this._appendMenuItem(_("New Window"));
                    newWindowItem.connect('activate', () => {
                        this.closeMenus();
                        this._app.open_new_window(-1);
                    });
                }
                if (this.discreteGpuAvailable && this._app.state == Shell.AppState.STOPPED) {
                    const appPrefersNonDefaultGPU = this.appInfo.get_boolean('PrefersNonDefaultGPU');
                    const gpuPref = appPrefersNonDefaultGPU
                        ? Shell.AppLaunchGpu.DEFAULT
                        : Shell.AppLaunchGpu.DISCRETE;

                    this._onGpuMenuItem = this._appendMenuItem(appPrefersNonDefaultGPU
                        ? _('Launch using Integrated Graphics Card')
                        : _('Launch using Discrete Graphics Card'));

                    this._onGpuMenuItem.connect('activate', () => {
                        this.closeMenus();
                        this._app.launch(0, -1, gpuPref);
                    });
                }

                for (let i = 0; i < actions.length; i++) {
                    let action = actions[i];
                    let item;
                    if(action === "empty-trash-inactive"){
                        item = new PopupMenu.PopupMenuItem(this.appInfo.get_action_name(action), {reactive:false, can_focus:false});
                        item.actor.add_style_class_name('inactive');
                        this._appendSeparator();
                        this.add_child(item);
                    }
                    else if(action === "empty-trash"){
                        this._appendSeparator();
                        item = this._appendMenuItem(this.appInfo.get_action_name(action));
                    }
                    else{
                        item = this._appendMenuItem(this.appInfo.get_action_name(action));
                    }

                    item.connect('activate', (emitter, event) => {
                        this.closeMenus();
                        this._app.launch_action(action, event.get_time(), -1);
                    });
                }

                //If Trash Can, we don't want to add the rest of the entries below.
                if(this.appInfo.get_string('Id') === "ArcMenu_Trash")
                    return false;

                let desktopIcons = Main.extensionManager.lookup("desktop-icons@csoriano");
                let desktopIconsNG = Main.extensionManager.lookup("ding@rastersoft.com");
                if((desktopIcons && desktopIcons.stateObj) || (desktopIconsNG && desktopIconsNG.stateObj)){
                    this._appendSeparator();
                    let fileDestination = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP);
                    let src = Gio.File.new_for_path(this.appInfo.get_filename());
                    let dst = Gio.File.new_for_path(GLib.build_filenamev([fileDestination, src.get_basename()]));
                    let exists = dst.query_exists(null);
                    if(exists) {
                        let item = this._appendMenuItem(_("Delete Desktop Shortcut"));
                        item.connect('activate', () => {
                            if(src && dst){
                                try {
                                    dst.delete(null);
                                } catch (e) {
                                    log(`Failed to delete shortcut: ${e.message}`);
                                }
                            }
                            this.close();
                        });
                    }
                    else {
                        let item = this._appendMenuItem(_("Create Desktop Shortcut"));
                        item.connect('activate', () => {
                            if(src && dst){
                                try {
                                    // copy_async() isn't introspectable :-(
                                    src.copy(dst, Gio.FileCopyFlags.OVERWRITE, null, null);
                                    this._markTrusted(dst);
                                } catch (e) {
                                    log(`Failed to copy to desktop: ${e.message}`);
                                }
                            }
                            this.close();
                        });
                    }
                }

                let canFavorite = global.settings.is_writable('favorite-apps');
                if (canFavorite) {
                    this._appendSeparator();
                    let isFavorite = AppFavorites.getAppFavorites().isFavorite(this._app.get_id());
                    if (isFavorite) {
                        let item = this._appendMenuItem(_("Remove from Favorites"));
                        item.connect('activate', () => {
                            let favs = AppFavorites.getAppFavorites();
                            favs.removeFavorite(this._app.get_id());
                            this.close();
                        });
                    } else {
                        let item = this._appendMenuItem(_("Add to Favorites"));
                        item.connect('activate', () => {
                            let favs = AppFavorites.getAppFavorites();
                            favs.addFavorite(this._app.get_id());
                            this.close();
                        });
                    }
                }

                let pinnedApps = this._settings.get_strv('pinned-app-list');
                let pinnedAppID = [];

                //filter pinnedApps list by every 3rd entry in list. 3rd entry contains an appID or command
                for(let i = 2; i < pinnedApps.length; i += 3){
                    pinnedAppID.push(pinnedApps[i]);
                }
                let isAppPinned = pinnedAppID.find((element) => {
                    return element == this._app.get_id();
                });

                //if app is pinned and menulayout has PinnedApps category, show Unpin from ArcMenu entry
                if(isAppPinned && this._menuLayout.hasPinnedApps) {
                    let item = this._appendMenuItem(_("Unpin from ArcMenu"));
                    item.connect('activate', ()=>{
                        this.close();
                        for(let i = 0; i < pinnedApps.length; i += 3){
                            if(pinnedApps[i + 2] === this._app.get_id()){
                                pinnedApps.splice(i, 3);
                                this._settings.set_strv('pinned-app-list', pinnedApps);
                                break;
                            }
                        }
                    });
                }
                else if(this._menuLayout.hasPinnedApps) {
                    let item = this._appendMenuItem(_("Pin to ArcMenu"));
                    item.connect('activate', ()=>{
                        this.close();
                        pinnedApps.push(this.appInfo.get_display_name());
                        pinnedApps.push('');
                        pinnedApps.push(this._app.get_id());
                        this._settings.set_strv('pinned-app-list',pinnedApps);
                    });
                }

                if (Shell.AppSystem.get_default().lookup_app('org.gnome.Software.desktop')) {
                    this._appendSeparator();
                    let item = this._appendMenuItem(_("Show Details"));
                    item.connect('activate', () => {
                        let id = this._app.get_id();
                        let args = GLib.Variant.new('(ss)', [id, '']);
                        Gio.DBus.get(Gio.BusType.SESSION, null, (o, res) => {
                            let bus = Gio.DBus.get_finish(res);
                            bus.call('org.gnome.Software',
                                    '/org/gnome/Software',
                                    'org.gtk.Actions', 'Activate',
                                    GLib.Variant.new('(sava{sv})',
                                                    ['details', [args], null]),
                                    null, 0, -1, null, null);
                            this.closeMenus();
                        });
                    });
                }
            }
        }
        else if(this._path){
            let newWindowItem = this._appendMenuItem(_("Open Folder Location"));
            newWindowItem.connect('activate', () => {
                let file = Gio.File.new_for_path(this._path);
                let context = global.create_app_launch_context(Clutter.get_current_event().get_time(), -1)
                new Promise((resolve, reject) => {
                    Gio.AppInfo.launch_default_for_uri_async(file.get_uri(), context, null, (o, res) => {
                        try {
                            Gio.AppInfo.launch_default_for_uri_finish(res);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });
                });
                this.closeMenus();
            });
        }
        else if(this._menuLayout.hasPinnedApps && this.sourceActor instanceof PinnedAppsMenuItem) {
            let item = this._appendMenuItem(_("Unpin from ArcMenu"));
            item.connect('activate', () => {
                this.close();
                let pinnedApps = this._settings.get_strv('pinned-app-list');
                for(let i = 0; i < pinnedApps.length; i += 3){
                    if(pinnedApps[i + 2] === this._app){
                        pinnedApps.splice(i, 3);
                        this._settings.set_strv('pinned-app-list', pinnedApps);
                        break;
                    }
                }
            });
        }
    }

    //_markTrusted function borrowed from
    //https://gitlab.gnome.org/GNOME/gnome-shell-extensions/-/tree/master/extensions/apps-menu
    async _markTrusted(file) {
        let modeAttr = Gio.FILE_ATTRIBUTE_UNIX_MODE;
        let trustedAttr = 'metadata::trusted';
        let queryFlags = Gio.FileQueryInfoFlags.NONE;
        let ioPriority = GLib.PRIORITY_DEFAULT;

        try {
            let info = await file.query_info_async(modeAttr, queryFlags, ioPriority, null);

            let mode = info.get_attribute_uint32(modeAttr) | 0o100;
            info.set_attribute_uint32(modeAttr, mode);
            info.set_attribute_string(trustedAttr, 'yes');
            await file.set_attributes_async(info, queryFlags, ioPriority, null);

            // Hack: force nautilus to reload file info
            info = new Gio.FileInfo();
            info.set_attribute_uint64(
                Gio.FILE_ATTRIBUTE_TIME_ACCESS, GLib.get_real_time());
            try {
                await file.set_attributes_async(info, queryFlags, ioPriority, null);
            } catch (e) {
                log(`Failed to update access time: ${e.message}`);
            }
        } catch (e) {
            log(`Failed to mark file as trusted: ${e.message}`);
        }
    }

    _appendSeparator() {
        let separator = new ArcMenuSeparator(Constants.SeparatorStyle.SHORT, Constants.SeparatorAlignment.HORIZONTAL);
        this.add_child(separator);
    }

    _appendMenuItem(labelText) {
        let item = new ArcMenuPopupBaseMenuItem(this._menuLayout);
        this.label = new St.Label({
            text: _(labelText),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        item.add_child(this.label);
        this.add_child(item);
        return item;
    }
});

var ApplicationContextMenu = class Arc_Menu_ApplicationContextMenu extends PopupMenu.PopupMenu {
    constructor(actor, app, menuLayout){
        super(actor, 0.0, St.Side.TOP);
        this._menuLayout = menuLayout;
        this._settings = menuLayout._settings;
        this._menuButton = menuLayout.menuButton;
        this._app = app;
        this.layout = this._settings.get_enum('menu-layout');
        this._boxPointer.setSourceAlignment(.20);
        this._boxPointer._border.queue_repaint();
        this.blockSourceEvents = true;
        Main.uiGroup.add_child(this.actor);
        this._menuLayout.contextMenuManager.addMenu(this);
        this.contextMenuItems = new ApplicationContextItems(actor, app, menuLayout);
        this.contextMenuItems.connect('close-context-menu', () => this.toggle());
        this.contextMenuItems._delegate = this.contextMenuItems;
        this.box.add_child(this.contextMenuItems);
        this.sourceActor = actor;
        this.sourceActor.connect("destroy", ()=> {
            if(this.isOpen)
                this.close();
            Main.uiGroup.remove_child(this.actor);
            this.contextMenuItems.destroy();
            this.destroy();
        });
    }

    centerBoxPointerPosition(){
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
        this._boxPointer._border.queue_repaint();
    }

    rightBoxPointerPosition(){
        this._arrowSide = St.Side.LEFT;
        this._boxPointer._arrowSide = St.Side.LEFT;
        this._boxPointer._userArrowSide = St.Side.LEFT;
        this._boxPointer.setSourceAlignment(.50);
        this._arrowAlignment = .5;
        this._boxPointer._border.queue_repaint();
    }

    set path(path){
        this.contextMenuItems.path = path;
    }

    open(animate){
        if(this._menuLayout.searchResults && this.sourceActor !== this._menuLayout.searchResults.getTopResult())
            this._menuLayout.searchResults.getTopResult()?.remove_style_pseudo_class('active');
        if(this._menuButton.tooltipShowingID){
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
            this._menuButton.tooltipShowing = false;
        }
        if(this.sourceActor.tooltip){
            this.sourceActor.tooltip.hide();
            this._menuButton.tooltipShowing = false;
        }

        super.open(animate);
    }

    close(animate){
        super.close(animate);
        if(this.sourceActor instanceof ArcMenuButtonItem)
            this.sourceActor.sync_hover();
        else{       
            this.sourceActor.active = false;
        }
        
        this.sourceActor.sync_hover();
        this.sourceActor.hovered = this.sourceActor.hover;
    }

    rebuildItems(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        if(customStyle){
            this.actor.style_class = 'arc-menu-boxpointer';
            this.actor.add_style_class_name('arc-menu');
        }
        else{
            this.actor.style_class = 'popup-menu-boxpointer';
            this.actor.add_style_class_name('popup-menu');
        }

        this.contextMenuItems.rebuildItems();
    }

    _onKeyPress(actor, event) {
        return Clutter.EVENT_PROPAGATE;
    }
};

var ArcMenuPopupBaseMenuItem = GObject.registerClass({
    Properties: {
        'active': GObject.ParamSpec.boolean('active', 'active', 'active',
                                            GObject.ParamFlags.READWRITE,
                                            false),
        'hovered': GObject.ParamSpec.boolean('hovered', 'hovered', 'hovered',
                                            GObject.ParamFlags.READWRITE,
                                            false),
        'sensitive': GObject.ParamSpec.boolean('sensitive', 'sensitive', 'sensitive',
                                               GObject.ParamFlags.READWRITE,
                                               true),
    },
    Signals: {
        'activate': { param_types: [Clutter.Event.$gtype] },
    },

},   class Arc_Menu_PopupBaseMenuItem extends St.BoxLayout{
    _init(menuLayout, params){
        params = imports.misc.params.parse(params, {
            reactive: true,
            activate: true,
            hover: true,
            style_class: null,
            can_focus: true,
        });
        super._init({ style_class: 'popup-menu-item arcmenu-menu-item',
                      reactive: params.reactive,
                      track_hover: params.reactive,
                      can_focus: params.can_focus,
                      accessible_role: Atk.Role.MENU_ITEM
        });
        this.set_offscreen_redirect(Clutter.OffscreenRedirect.ON_IDLE);
        this.hasContextMenu = false;
        this._delegate = this;
        this._menuLayout = menuLayout;
        this.arcMenu = this._menuLayout.arcMenu;
        this.shouldShow = true;
        this._parent = null;
        this._active = false;
        this._activatable = params.reactive && params.activate;
        this._sensitive = true;

        this._ornamentLabel = new St.Label({ style_class: 'popup-menu-ornament' });
        this.add_child(this._ornamentLabel);

        this.x_align = Clutter.ActorAlign.FILL;
        this.x_expand = true;

        if (!this._activatable)
            this.add_style_class_name('popup-inactive-menu-item');

        if (params.style_class)
            this.add_style_class_name(params.style_class);

        if (params.reactive && params.hover)
            this.bind_property('hover', this, 'hovered', GObject.BindingFlags.SYNC_CREATE);

        if(params.hover)
            this.actor.connect('notify::hover', this._onHover.bind(this));

        this.arcMenuOpenStateChangeID = this.arcMenu.connect('open-state-changed', (menu, open) =>{
            if(!open)
               this.cancelPopupTimeout();
        });

        let textureCache = St.TextureCache.get_default();
        let iconThemeChangedId = textureCache.connect('icon-theme-changed', this._updateIcon.bind(this));
        this.connect('destroy', () => {
            textureCache.disconnect(iconThemeChangedId);
            this._onDestroy();
        });
    }

    _updateIcon() {
        if(!this._iconBin || !this.createIcon)
            return;

        let icon = this.createIcon();
        this._iconBin.set_child(icon);
    }

    get actor() {
        return this;
    }

    get active(){
        return this._active;
    }

    set active(active) {
        if(this.isDestroyed)
            return;
        let activeChanged = active != this.active;
        if(activeChanged){
            this._active = active;
            if(active){
                if(this._menuLayout.activeMenuItem !== this)
                    this._menuLayout.activeMenuItem = this;
                this.remove_style_class_name('selected');
                this.add_style_pseudo_class('active');
                if(this.can_focus)
                    this.grab_key_focus();
            }
            else{
                this.remove_style_pseudo_class('active');
                this.remove_style_class_name('selected');
            }
            this.notify('active');
        }
    }

    set hovered(hover) {
        let hoverChanged = hover != this.hovered;
        if(hoverChanged){
            let isActiveStyle = this.get_style_pseudo_class()?.includes('active')
            if(hover && !isActiveStyle){
                this.add_style_class_name('selected');
            }
            else{
                this.remove_style_class_name('selected');
            }
        }
    }

    setShouldShow(){
        //If a saved shortcut link is a desktop app, check if currently installed.
        //Do NOT display if application not found.
        if(this._command.endsWith(".desktop") && !Shell.AppSystem.get_default().lookup_app(this._command)){
            this.shouldShow = false;
        }
    }

    _onHover() {
        if(this.tooltip === undefined && this.actor.hover && this.label){
            let description = this.description;
            if(this._app)
                description = this._app.get_description();
            Utils.createTooltip(this._menuLayout, this, this.label, description, this._displayType ? this._displayType : -1);
        }
    }

    vfunc_button_press_event(){
        let event = Clutter.get_current_event();
        this.pressed = false;
        if(event.get_button() == 1){
            this._menuLayout._blockActivateEvent = false;
            this.pressed = true;
            if(this.hasContextMenu)
                this.contextMenuTimeOut();
        }
        else if(event.get_button() == 3){
            this.pressed = true;
        }
        this.active = true;
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_button_release_event(){
        let event = Clutter.get_current_event();
        if(event.get_button() == 1 && !this._menuLayout._blockActivateEvent && this.pressed){
            this.pressed = false;
            this.activate(event);
            if(!(this instanceof CategoryMenuItem) && !(this instanceof ArcMenuButtonItem))
                this.active = false;
            return Clutter.EVENT_STOP;
        }
        if(event.get_button() == 3 && this.pressed){
            this.pressed = false;
            if(this.hasContextMenu)
                this.popupContextMenu();
            else if(!(this instanceof CategoryMenuItem && !(this instanceof ArcMenuButtonItem))){
                this.active = false;
                this.hovered = true;
            }
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_key_focus_in() {
        super.vfunc_key_focus_in();
        if(!this.actor.hover)
            this._menuLayout._keyFocusIn(this.actor);
        this.active = true;
    }

    vfunc_key_focus_out() {
        if(this.contextMenu && this.contextMenu.isOpen){
            return;
        }
        super.vfunc_key_focus_out();
        this.active = false;
    }

    activate(event) {
        this.emit('activate', event);
    }

    vfunc_key_press_event(keyEvent) {
        if (!this._activatable)
            return super.vfunc_key_press_event(keyEvent);

        let state = keyEvent.modifier_state;

        // if user has a modifier down (except capslock and numlock)
        // then don't handle the key press here
        state &= ~Clutter.ModifierType.LOCK_MASK;
        state &= ~Clutter.ModifierType.MOD2_MASK;
        state &= Clutter.ModifierType.MODIFIER_MASK;

        if (state)
            return Clutter.EVENT_PROPAGATE;

        let symbol = keyEvent.keyval;
        if ( symbol == Clutter.KEY_Return || symbol == Clutter.KEY_KP_Enter) {
            this.activate(Clutter.get_current_event());
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_touch_event(event){
        if(event.type == Clutter.EventType.TOUCH_END && !this._menuLayout._blockActivateEvent && this.pressed){
            this.remove_style_pseudo_class('active');
            this.activate(Clutter.get_current_event());
            this.pressed = false;
            return Clutter.EVENT_STOP;
        }
        else if(event.type == Clutter.EventType.TOUCH_BEGIN && !this._menuLayout.contextMenuManager.activeMenu){
            this.pressed = true;
            this._menuLayout._blockActivateEvent = false;
            if(this.hasContextMenu)
                this.contextMenuTimeOut();
            this.add_style_pseudo_class('active');
        }
        else if(event.type == Clutter.EventType.TOUCH_BEGIN && this._menuLayout.contextMenuManager.activeMenu){
            this.pressed = false;
            this._menuLayout._blockActivateEvent = false;
            this._menuLayout.contextMenuManager.activeMenu.toggle();
        }
        return Clutter.EVENT_PROPAGATE;
    }

    contextMenuTimeOut(){
        this._popupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            this.pressed = false;
            this._popupTimeoutId = null;
            if(this.hasContextMenu && this._menuLayout.arcMenu.isOpen && !this._menuLayout._blockActivateEvent) {
                this.popupContextMenu();
                this._menuLayout.contextMenuManager.ignoreRelease();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    cancelPopupTimeout(){
        if(this._popupTimeoutId){
            GLib.source_remove(this._popupTimeoutId);
            this._popupTimeoutId = null;
        }
    }

    _onDestroy(){
        this.isDestroyed = true;
        if(this.arcMenuOpenStateChangeID){
            this.arcMenu.disconnect(this.arcMenuOpenStateChangeID);
            this.arcMenuOpenStateChangeID = null;
        }
    }
});

var ArcMenuSeparator = GObject.registerClass(
class Arc_Menu_Separator extends PopupMenu.PopupBaseMenuItem {
    _init(separatorLength, separatorAlignment, text) {
        super._init({
            style_class: 'popup-separator-menu-item',
            reactive: false,
            can_focus: false,
        });
        this._settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
        this.remove_child(this._ornamentLabel);
        this.reactive = true;
        this.label = new St.Label({
            text: text || '',
            style: 'font-weight: bold'
        });
        this.add_child(this.label);
        this.label_actor = this.label;

        this.label.add_style_pseudo_class = () => { return false; };

        this.label.connect('notify::text',
                            this._syncLabelVisibility.bind(this));
        this._syncLabelVisibility();

        this._separator = new St.Widget({
            style_class: 'popup-separator-menu-item-separator separator-color-style',
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._separator);
        if(separatorAlignment === Constants.SeparatorAlignment.HORIZONTAL){
            this.style = "padding: 0px 5px;"
            if(separatorLength === Constants.SeparatorStyle.SHORT)
                this._separator.style = "margin: 5px 45px;";
            else if(separatorLength === Constants.SeparatorStyle.MEDIUM)
                this._separator.style = "margin: 5px 15px;";
            else if(separatorLength === Constants.SeparatorStyle.LONG)
                this._separator.style = "margin: 0px 5px;";
            else if(separatorLength === Constants.SeparatorStyle.MAX)
                this._separator.style = "margin: 0px; padding: 0px;";
            else if(separatorLength === Constants.SeparatorStyle.HEADER_LABEL){
                this._separator.style = "margin: 0px 20px 0px 10px;";
                this.style = "padding: 5px 15px;"
            }
        }
        else if(separatorAlignment === Constants.SeparatorAlignment.VERTICAL){
            if(separatorLength === Constants.SeparatorStyle.ALWAYS_SHOW){
                this.style = "padding: 8px 4px;"
            }
            else{
                this._syncVisibility();
                this.vertSeparatorChangedID = this._settings.connect('changed::vert-separator', this._syncVisibility.bind(this));
                this.style = "padding: 0px 4px;"
            }

            this._separator.style = "margin: 0px; width: 1px; height: -1px;";
            this.remove_child(this.label);
            this.x_expand = this._separator.x_expand = true;
            this.x_align = this._separator.x_align = Clutter.ActorAlign.CENTER;
            this.y_expand = this._separator.y_expand = true;
            this.y_align = this._separator.y_align = Clutter.ActorAlign.FILL;
        }

        this.connect('destroy', () => {
            if(this.vertSeparatorChangedID){
                this._settings.disconnect(this.vertSeparatorChangedID);
                this.vertSeparatorChangedID = null;
            }
        });
    }

    _syncLabelVisibility() {
        this.label.visible = this.label.text != '';
    }

    _syncVisibility() {
        this._separator.visible = this._settings.get_boolean('vert-separator');
    }
});

var ActivitiesMenuItem = GObject.registerClass(class Arc_Menu_ActivitiesMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);
        
        this._updateIcon();

        this.label = new St.Label({
            text: _("Activities Overview"),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.label);
    }

    createIcon(){
        const IconSizeEnum = this._settings.get_enum('quicklinks-item-icon-size');
        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = LayoutProps.DefaultQuickLinksIconSize;
        let iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);

        return new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: iconSize
        });
    }

    activate(event) {
        this._menuLayout.arcMenu.toggle();
        Main.overview.show();
        super.activate(event);
    }
});

var Tooltip = class Arc_Menu_Tooltip{
    constructor(menuLayout, sourceActor, title, description) {
        this._menuButton = menuLayout.menuButton;
        this._settings = this._menuButton._settings;
        this.sourceActor = sourceActor;
        if(this.sourceActor.tooltipLocation)
            this.location = this.sourceActor.tooltipLocation;
        else
            this.location = Constants.TooltipLocation.BOTTOM;
        let descriptionLabel;
        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: 'dash-label tooltip-menu-item',
            opacity: 0
        });

        if(title){
            this.titleLabel = new St.Label({
                text: _(title),
                style: description ? "font-weight: bold;" : null,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_child(this.titleLabel);
        }

        if(description){
            descriptionLabel = new St.Label({
                text: description,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_child(descriptionLabel);
        }

        global.stage.add_child(this.actor);

        this.actor.connect('destroy',()=>{
            if(this.destroyID){
                this.sourceActor.disconnect(this.destroyID);
                this.destroyID = null;
            }
            if(this.activeID){
                this.sourceActor.disconnect(this.activeID);
                this.activeID = null;
            }

            if(this.hoverID){
                this.sourceActor.disconnect(this.hoverID);
                this.hoverID = null;
            }
            if(this.toggleID){
                this._settings.disconnect(this.toggleID);
                this.toggleID = null;
            }
        })
        this.activeID = this.sourceActor.connect('notify::active', ()=> this.setActive(this.sourceActor.active));
        this.destroyID = this.sourceActor.connect('destroy',this.destroy.bind(this));
        this.hoverID = this.sourceActor.connect('notify::hover', this._onHover.bind(this));
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
        this.toggleID = this._settings.connect('changed::disable-tooltips', this.disableTooltips.bind(this));
    }

    setActive(active){
        if(!active)
            this.hide();
    }

    disableTooltips() {
        this._useTooltips = ! this._settings.get_boolean('disable-tooltips');
    }

    _onHover() {
        if(this._useTooltips){
            if(this.sourceActor.hover){
                if(this._menuButton.tooltipShowing){
                    this.show();
                    this._menuButton.activeTooltip = this.actor;
                }
                else{
                    this._menuButton.tooltipShowingID = GLib.timeout_add(0, 750, () => {
                        this.show();
                        this._menuButton.tooltipShowing = true;
                        this._menuButton.activeTooltip = this.actor;
                        this._menuButton.tooltipShowingID = null;
                        return GLib.SOURCE_REMOVE;
                    });
                }
                if(this._menuButton.tooltipHidingID){
                    GLib.source_remove(this._menuButton.tooltipHidingID);
                    this._menuButton.tooltipHidingID = null;
                }
            }
            else {
                this.hide();
                if(this._menuButton.tooltipShowingID){
                    GLib.source_remove(this._menuButton.tooltipShowingID);
                    this._menuButton.tooltipShowingID = null;
                }
                this._menuButton.tooltipHidingID = GLib.timeout_add(0, 750, () => {
                    this._menuButton.tooltipShowing = false;
                    this._menuButton.activeTooltip = null;
                    this._menuButton.tooltipHidingID = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
        }
    }

    show() {
        if(this._useTooltips){
            this.actor.opacity = 0;
            this.actor.show();

            let [stageX, stageY] = this.sourceActor.get_transformed_position();

            let itemWidth  = this.sourceActor.allocation.x2 - this.sourceActor.allocation.x1;
            let itemHeight = this.sourceActor.allocation.y2 - this.sourceActor.allocation.y1;

            let labelWidth = this.actor.get_width();
            let labelHeight = this.actor.get_height();

            let x, y;
            let gap = 5;

            switch (this.location) {
                case Constants.TooltipLocation.BOTTOM_CENTERED:
                    y = stageY + itemHeight + gap;
                    x = stageX + Math.floor((itemWidth - labelWidth) / 2);
                    break;
                case Constants.TooltipLocation.TOP_CENTERED:
                    y = stageY - labelHeight - gap;
                    x = stageX + Math.floor((itemWidth - labelWidth) / 2);
                    break;
                case Constants.TooltipLocation.BOTTOM:
                    y = stageY + itemHeight + gap;
                    x = stageX + gap;
                    break;
            }

            // keep the label inside the screen
            let monitor = Main.layoutManager.findMonitorForActor(this.sourceActor);
            if (x - monitor.x < gap)
                x += monitor.x - x + gap;
            else if (x + labelWidth > monitor.x + monitor.width - gap)
                x -= x + labelWidth - (monitor.x + monitor.width) + gap;
            else if (y - monitor.y < gap)
                y += monitor.y - y + gap;
            else if (y + labelHeight > monitor.y + monitor.height - gap)
                y -= y + labelHeight - (monitor.y + monitor.height) + gap;

            this.actor.set_position(x, y);
            this.actor.ease({
                opacity: 255,
                duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    hide() {
        if(this._useTooltips){
            this.actor.ease({
                opacity: 0,
                duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.actor.hide()
            });
        }
    }

    destroy() {
        if (this._menuButton.tooltipShowingID) {
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
        }
        if (this._menuButton.tooltipHidingID) {
            GLib.source_remove(this._menuButton.tooltipHidingID);
            this._menuButton.tooltipHidingID = null;
        }
        if(this.toggleID>0){
            this._settings.disconnect(this.toggleID);
            this.toggleID = 0;
        }
        if(this.hoverID>0){
            this.sourceActor.disconnect(this.hoverID);
            this.hoverID = 0;
        }
        if(this._menuButton.activeTooltip = this.actor)
            this._menuButton.activeTooltip = null;

        global.stage.remove_child(this.actor);
        this.actor.destroy();
    }
};

var ArcMenuButtonItem = GObject.registerClass(
    class Arc_Menu_ArcMenuButtonItem extends ArcMenuPopupBaseMenuItem {
    _init(menuLayout, tooltipText, iconName, gicon) {
        super._init(menuLayout);
        this.style_class = 'popup-menu-item arc-menu-button';
        this._settings = this._menuLayout._settings;
        this._menuLayout = menuLayout;
        this.remove_child(this._ornamentLabel);
        this.x_expand = false;
        this.x_align = Clutter.ActorAlign.CENTER;
        this.y_expand = false;
        this.y_align = Clutter.ActorAlign.CENTER;
        this.iconName = iconName;
        this.gicon = gicon;
        this.toggleMenuOnClick = true;

        if(tooltipText){
            this.tooltip = new Tooltip(this._menuLayout, this.actor, tooltipText);
            this.tooltip.location = Constants.TooltipLocation.TOP_CENTERED;
            this.tooltip.hide();
        }

        if(this.iconName !== null){
            this._iconBin = new St.Bin();
            this.add_child(this._iconBin);
            
            this._updateIcon();
        }
    }

    createIcon(overrideIconSize){
        const IconSizeEnum = this._settings.get_enum('button-item-icon-size');
        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = LayoutProps.DefaultButtonsIconSize;
        let iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);

        return new St.Icon({
            gicon: this.gicon ? this.gicon : Gio.icon_new_for_string(this.iconName),
            icon_size: overrideIconSize ? overrideIconSize : iconSize,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER
        });
    }

    setIconSize(size){
        if(!this._iconBin)
            return;
        this._iconBin.set_child(this.createIcon(size));
    }

    activate(event){
        if(this.toggleMenuOnClick)
            this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
});

// Settings Button
var SettingsButton = GObject.registerClass(class Arc_Menu_SettingsButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Settings"), 'emblem-system-symbolic');
    }
    activate(event) {
        super.activate(event);
        Util.spawnCommandLine('gnome-control-center');
    }
});

// Runner Layout Tweaks Button
var RunnerTweaksButton = GObject.registerClass(class Arc_Menu_RunnerTweaksButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Configure Runner"), 'emblem-system-symbolic');
        this.tooltip.location = Constants.TooltipLocation.BOTTOM_CENTERED;
    }
    activate(event) {
        super.activate(event);
        this._menuLayout._settings.set_int('prefs-visible-page', Constants.PrefsVisiblePage.RUNNER_TWEAKS);
        Util.spawnCommandLine(Constants.ArcMenuSettingsCommand);
    }
});

//'Insider' layout Pinned Apps hamburger button
var PinnedAppsButton = GObject.registerClass(class Arc_Menu_PinnedAppsButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Pinned Apps"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate(event) {
        super.activate(event);
        this._menuLayout.togglePinnedAppsMenu();
    }
});

//'Windows' layout extras hamburger button
var ExtrasButton = GObject.registerClass(class Arc_Menu_ExtrasButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Extras"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate(event) {
        super.activate(event);
        this._menuLayout.toggleExtrasMenu();
    }
});

//"Leave" Button with popupmenu that shows lock, power off, restart, etc
var LeaveButton = GObject.registerClass(class Arc_Menu_LeaveButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Leave"), 'system-shutdown-symbolic');
        this.toggleMenuOnClick = false;
        this._menuLayout = menuLayout;
        this.menuButton = menuLayout.menuButton;
        this._settings = menuLayout._settings;
        this._createLeaveMenu();
    }

    _createLeaveMenu(){
        this.leaveMenu = new PopupMenu.PopupMenu(this, 0.5 , St.Side.BOTTOM);
        this.leaveMenu.blockSourceEvents = true;
        let section = new PopupMenu.PopupMenuSection();
        this.leaveMenu.addMenuItem(section);

        let box = new St.BoxLayout({
            vertical: true,
            style_class: 'margin-box'
        });
        box._delegate = box;

        section.actor.add_child(box);

        box.add_child(this._menuLayout.createLabelRow(_("Session")));

        this.lockItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.LOCK);
        box.add_child(this.lockItem);

        let logOutItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.LOGOUT);
        box.add_child(logOutItem);

        box.add_child(this._menuLayout.createLabelRow(_("System")));

        Utils.canHybridSleep((canHybridSleep, needsAuth) => {
            if(canHybridSleep){
                let sleepItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.HYBRID_SLEEP);
                box.insert_child_at_index(sleepItem, 4);
            }
        });

        Utils.canHibernate((canHibernate, needsAuth) => {
            if(canHibernate){
                let hibernateItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.HIBERNATE);
                box.insert_child_at_index(hibernateItem, 5);
            }
        });

        let suspendItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.SUSPEND);
        box.add_child(suspendItem);

        let restartItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.RESTART);
        box.add_child(restartItem);

        let powerOffItem = new PowerMenuItem(this._menuLayout, Constants.PowerType.POWER_OFF);
        box.add_child(powerOffItem);

        this._menuLayout.subMenuManager.addMenu(this.leaveMenu);
        this.leaveMenu.actor.hide();
        Main.uiGroup.add_child(this.leaveMenu.actor);
        this.leaveMenu.connect('open-state-changed', (menu, open) => {
            if(open){
                if(this.menuButton.tooltipShowingID){
                    GLib.source_remove(this.menuButton.tooltipShowingID);
                    this.menuButton.tooltipShowingID = null;
                    this.menuButton.tooltipShowing = false;
                }
                if(this.tooltip){
                    this.tooltip.hide();
                    this.menuButton.tooltipShowing = false;
                }
            }
            else{
                this.active = false;
                this.sync_hover();
                this.hovered = this.hover;
            }
        });
    }

    _onDestroy(){
        Main.uiGroup.remove_child(this.leaveMenu.actor);
        this.leaveMenu.destroy();
    }

    activate(event) {
        super.activate(event);
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        this.leaveMenu.actor.style_class = customStyle ? 'arc-menu-boxpointer': 'popup-menu-boxpointer';
        this.leaveMenu.actor.add_style_class_name( customStyle ? 'arc-menu' : 'popup-menu');
        this.leaveMenu.toggle();
    }
});

//'Unity' layout categories hamburger button
var CategoriesButton = GObject.registerClass(class Arc_Menu_CategoriesButton extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, _("Categories"), Me.path + Constants.HamburgerIcon.PATH);
        this.toggleMenuOnClick = false;
    }
    activate(event) {
        super.activate(event);
        this._menuLayout.toggleCategoriesMenu();
    }
});

var PowerButton = GObject.registerClass(class Arc_Menu_PowerButton extends ArcMenuButtonItem {
    _init(menuLayout, powerType) {
        super._init(menuLayout, Constants.PowerOptions[powerType].TITLE, Constants.PowerOptions[powerType].IMAGE);
        this.powerType = powerType;
    }
    activate(event) {
        activatePowerOption(this.powerType, this._menuLayout.arcMenu);
    }
});

var PowerMenuItem = GObject.registerClass(class Arc_Menu_PowerMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, type) {
        super._init(menuLayout);
        this.powerType = type;
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);
        
        this._updateIcon();

        this.label = new St.Label({
            text: _(Constants.PowerOptions[this.powerType].TITLE),
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_child(this.label);
    }

    createIcon(){
        const IconSizeEnum = this._settings.get_enum('quicklinks-item-icon-size');
        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = LayoutProps.DefaultQuickLinksIconSize;
        let iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);

        return new St.Icon({
            gicon: Gio.icon_new_for_string(Constants.PowerOptions[this.powerType].IMAGE),
            style_class: 'popup-menu-icon',
            icon_size: iconSize,
        });
    }

    activate(){
        activatePowerOption(this.powerType, this._menuLayout.arcMenu);
    }
});

var PlasmaMenuItem = GObject.registerClass(class Arc_Menu_PlasmaMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, title, iconPath) {
        super._init(menuLayout);
        this.remove_child(this._ornamentLabel);
        this._menuLayout = menuLayout;
        this.tooltipLocation = Constants.TooltipLocation.BOTTOM_CENTERED;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this.vertical = true;
        this.name = "arc-menu-plasma-button";
        this.iconPath = iconPath;

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);
        
        this._updateIcon();

        this.label = new St.Label({
            text: _(title),
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.label.x_align = this.label.y_align = Clutter.ActorAlign.CENTER;
        this.label.y_expand = true;

        this._iconBin.x_align = this._iconBin.y_align = Clutter.ActorAlign.CENTER;
        this._iconBin.y_expand = true;

        this.label.get_clutter_text().set_line_wrap(true);
        this.add_child(this.label);
        this.actor.connect('notify::hover', this._onHover.bind(this));
    }

    createIcon(){
        return new St.Icon({
            gicon: Gio.icon_new_for_string(this.iconPath),
            style_class: 'popup-menu-icon',
            icon_size: Constants.MEDIUM_ICON_SIZE
        });
    }

    _onHover(){
        if(this.tooltip === undefined && this.actor.hover && this.label){
            let description = null;
            Utils.createTooltip(this._menuLayout, this, this.label, description, Constants.DisplayType.LIST);
        }
        let shouldHover = this._settings.get_boolean('plasma-enable-hover');
        if(shouldHover && this.actor.hover && !this.isActive){
            this.activate(Clutter.get_current_event());
        }
    }

    set active(active) {
        let activeChanged = active != this.active;
        if(activeChanged){
            this._active = active;
            if(active){
                this.add_style_class_name('selected');
                this._menuLayout.activeMenuItem = this;
                if(this.can_focus)
                    this.grab_key_focus();
            }
            else{
                this.remove_style_class_name('selected');
            }
            this.notify('active');
        }
    }

    setActive(active){
        if(active){
            this.isActive = true;
            this.set_style_pseudo_class("active-item");
        }
        else{
            this.isActive = false;
            this.set_style_pseudo_class(null);
        }
    }

    activate(event){
        this._menuLayout.searchBox.clearWithoutSearchChangeEvent();
        this._menuLayout.clearActiveItem();
        this.setActive(true);
        super.activate(event);
    }
});

var PlasmaCategoryHeader = GObject.registerClass(class Arc_Menu_PlasmaCategoryHeader extends St.BoxLayout{
    _init(menuLayout) {
        super._init({
            style_class: "popup-menu-item",
            style: 'padding: 0px;',
            reactive: true,
            track_hover:true,
            can_focus: true,
            accessible_role: Atk.Role.MENU_ITEM
        });
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;

        this.backButton = new ArcMenuPopupBaseMenuItem(this._menuLayout);
        this.backButton.x_expand = false;
        this.backButton.x_align = Clutter.ActorAlign.CENTER;
        this.label = new St.Label({
            text: _("Applications"),
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: bold'
        });

        this.backButton.add_child(this.label);

        this.add_child(this.backButton);
        this.backButton.connect("activate", () => this._menuLayout.displayCategories() );

        this.categoryLabel = new St.Label({
            text: '',
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_child(this.categoryLabel);
    }

    setActiveCategory(categoryText){
        if(categoryText){
            this.categoryLabel.text = _(categoryText);
            this.categoryLabel.show();
        }
        else
            this.categoryLabel.hide();
    }
});

var AllAppsButton = GObject.registerClass(class Arc_Menu_AllAppsButton extends ArcMenuButtonItem{
    _init(menuLayout) {
        super._init(menuLayout, null, 'go-next-symbolic');
        this.setIconSize(Constants.EXTRA_SMALL_ICON_SIZE);
        this.toggleMenuOnClick = false;
        this.style = 'min-height: 28px; padding: 0px 8px;'
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this.x_expand = true;
        this.x_align = Clutter.ActorAlign.END;
        this._label = new St.Label({
            text: _("All Apps"),
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.insert_child_at_index(this._label, 0);
    }

    activate(event){
        super.activate(event);
        this._menuLayout.displayAllApps();
    }
});

var BackButton = GObject.registerClass(class Arc_Menu_BackButton extends ArcMenuButtonItem{
    _init(menuLayout) {
        super._init(menuLayout, null, 'go-previous-symbolic');
        this.setIconSize(Constants.EXTRA_SMALL_ICON_SIZE);
        this.toggleMenuOnClick = false;
        this.style = 'min-height: 28px; padding: 0px 8px;'
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;
        this.x_expand = true;
        this.x_align = Clutter.ActorAlign.END;
        this._label = new St.Label({
            text: _("Back"),
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_expand: false,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.add_child(this._label);
    }

    activate(event){
        super.activate(event);
        this._menuLayout.setDefaultMenuView();
    }
});

// Menu item to go back to category view
var BackMenuItem = GObject.registerClass(class Arc_Menu_BackMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._layout = this._menuLayout.layout;
        this._settings = this._menuLayout._settings;

        this._iconBin = new St.Bin({
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
        });
        this.add_child(this._iconBin);

        this._updateIcon();

        let backLabel = new St.Label({
            text: _("Back"),
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(backLabel);
    }

    createIcon(){
        const IconSizeEnum = this._settings.get_enum('misc-item-icon-size');
        let iconSize = Utils.getIconSize(IconSizeEnum, Constants.MISC_ICON_SIZE);

        return new St.Icon({
            icon_name: 'go-previous-symbolic',
            icon_size: iconSize,
        });
    }

    activate(event) {
        if(this._layout === Constants.MenuLayout.ARCMENU){
            //If the current page is inside a category and 
            //previous page was the categories page,
            //go back to categories page
            if(this._menuLayout.previousCategoryType === Constants.CategoryType.CATEGORIES_LIST && (this._menuLayout.activeCategoryType <= 4 || this._menuLayout.activeCategoryType instanceof GMenu.TreeDirectory))
                this._menuLayout.displayCategories();
            else
                this._menuLayout.setDefaultMenuView();
        }
        else if(this._layout === Constants.MenuLayout.TOGNEE)
            this._menuLayout.setDefaultMenuView();
        super.activate(event);
    }
});

// Menu item to view all apps
var ViewAllPrograms = GObject.registerClass(class Arc_Menu_ViewAllPrograms extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;

        let backLabel = new St.Label({
            text: _("All Applications"),
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(backLabel);

        this._iconBin = new St.Bin({
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
        });
        this.add_child(this._iconBin);
        this._updateIcon();
    }

    createIcon(){
        const IconSizeEnum = this._settings.get_enum('misc-item-icon-size');
        let iconSize = Utils.getIconSize(IconSizeEnum, Constants.MISC_ICON_SIZE);

        return new St.Icon({
            icon_name: 'go-next-symbolic',
            icon_size: iconSize,
            x_align: Clutter.ActorAlign.START
        });
    }

    activate(event) {
        let defaultMenuView = this._settings.get_enum('default-menu-view');
        if(defaultMenuView === Constants.DefaultMenuView.PINNED_APPS || defaultMenuView === Constants.DefaultMenuView.FREQUENT_APPS)
            this._menuLayout.displayCategories();
        else
            this._menuLayout.displayAllApps();
        super.activate(event);
    }
});

var ShortcutMenuItem = GObject.registerClass(class Arc_Menu_ShortcutMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, name, icon, command, displayType, isContainedInCategory) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        if(this._settings.get_enum('shortcut-icon-type') === Constants.CategoryIconType.FULL_COLOR)
            this.add_style_class_name('regular-icons');
        else
            this.add_style_class_name('symbolic-icons');
        this._command = command;
        this._displayType = displayType;
        this.isContainedInCategory = isContainedInCategory;
        this.iconName = icon;

        //Check for default commands--------
        if(this._command == "ArcMenu_Software"){
            let softwareManager = Utils.findSoftwareManager();
            this._command = softwareManager ? softwareManager : 'ArcMenu_unfound.desktop';
        }
        else if(this._command === "ArcMenu_Trash"){
            this.trash = new Me.imports.placeDisplay.Trash(this);
            this._command = "ArcMenu_Trash";
            this._app = this.trash.getApp();
        }
        if(!this._app)
            this._app = Shell.AppSystem.get_default().lookup_app(this._command);

        if(this._app && icon === ''){
            let appIcon = this._app.create_icon_texture(Constants.MEDIUM_ICON_SIZE);
            if(appIcon instanceof St.Icon){
                this.iconName = appIcon.gicon.to_string();
            }
        }
        //-------------------------------------

        this.hasContextMenu = this._app ? true : false;

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);

        this._updateIcon();

        this.label = new St.Label({
            text: _(name), y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.layout = this._settings.get_enum('menu-layout');
        if(this.layout === Constants.MenuLayout.PLASMA && this._settings.get_boolean('apps-show-extra-details') && this._app){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionLabel = new St.Label({
                text: this._app.get_description(),
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add_child(this.label);
            if(this._app.get_description())
                labelBox.add_child(descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }

        if(this._displayType === Constants.DisplayType.GRID)
            Utils.convertToGridLayout(this);
        else if(this._displayType === Constants.DisplayType.BUTTON){
            this.style_class = 'popup-menu-item arc-menu-button';
            this.remove_child(this._ornamentLabel);
            this.remove_child(this.label);
            this.x_expand = false;
            this.x_align = Clutter.ActorAlign.CENTER;
            this.y_expand = false;
            this.y_align = Clutter.ActorAlign.CENTER;
        }
        this.setShouldShow();
    }

    createIcon(){
        let iconSizeEnum;
        if(this.isContainedInCategory)
            iconSizeEnum = this._settings.get_enum('menu-item-icon-size');
        else
            iconSizeEnum = this._settings.get_enum('quicklinks-item-icon-size');
        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = this.isContainedInCategory ? LayoutProps.DefaultApplicationIconSize : LayoutProps.DefaultQuickLinksIconSize;
        let iconSize = Utils.getIconSize(iconSizeEnum, defaultIconSize);

        if(this._displayType === Constants.DisplayType.BUTTON){
            iconSizeEnum = this._settings.get_enum('button-item-icon-size');
            defaultIconSize = LayoutProps.DefaultButtonsIconSize;
            iconSize = Utils.getIconSize(iconSizeEnum, defaultIconSize);
        }
        else if(this._displayType === Constants.DisplayType.GRID){
            iconSizeEnum = this._settings.get_enum('menu-item-grid-icon-size');
            let defaultIconStyle = LayoutProps.DefaultIconGridStyle;
            iconSize = Utils.getGridIconSize(iconSizeEnum, defaultIconStyle);
        }

        return new St.Icon({
            icon_name: this.iconName,
            gicon: Gio.icon_new_for_string(this.iconName),
            style_class: 'popup-menu-icon',
            icon_size: iconSize
        });
    }

    popupContextMenu(){
        if(this._app && this.contextMenu == undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this._displayType === Constants.DisplayType.GRID || this.layout === Constants.MenuLayout.UNITY || this.layout === Constants.MenuLayout.AZ)
                this.contextMenu.centerBoxPointerPosition();
            else if(this.layout === Constants.MenuLayout.MINT || this.layout === Constants.MenuLayout.TOGNEE)
                this.contextMenu.rightBoxPointerPosition();
            if(this._path)
                this.contextMenu.path = this._path;
        }
        if(this.contextMenu !== undefined){
            if(this.tooltip !== undefined)
                this.tooltip.hide();
            if(!this.contextMenu.isOpen){
                this.contextMenu.rebuildItems();
            }
            this.contextMenu.toggle();
        }
    }

    activate(event) {
        if(this._command === "ArcMenu_LogOut")
            activatePowerOption(Constants.PowerType.LOGOUT, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_Lock")
            activatePowerOption(Constants.PowerType.LOCK, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_PowerOff")
            activatePowerOption(Constants.PowerType.POWER_OFF, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_Restart")
            activatePowerOption(Constants.PowerType.RESTART, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_Suspend")
            activatePowerOption(Constants.PowerType.SUSPEND, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_HybridSleep")
            activatePowerOption(Constants.PowerType.HYBRID_SLEEP, this._menuLayout.arcMenu);
        else if(this._command === "ArcMenu_Hibernate")
            activatePowerOption(Constants.PowerType.HIBERNATE, this._menuLayout.arcMenu);

        else{
            this._menuLayout.arcMenu.toggle();
            if(this._command === "ArcMenu_ActivitiesOverview")
                Main.overview.show();
            else if(this._command === "ArcMenu_RunCommand")
                Main.openRunDialog();
            else if(this._command === "ArcMenu_ShowAllApplications")
                Main.overview._overview._controls._toggleAppsPage();
            else if(this._app)
                this._app.open_new_window(-1);
            else
                Util.spawnCommandLine(this._command);
        }
    }
});

// Menu item which displays the current user
var UserMenuItem = GObject.registerClass(class Arc_Menu_UserMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, displayType) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._displayType = displayType;
        this._settings = this._menuLayout._settings;

        if(this._displayType === Constants.DisplayType.BUTTON){
            this.style_class = 'popup-menu-item arc-menu-button';
            const IconSizeEnum = this._settings.get_enum('button-item-icon-size');
            const LayoutProps = this._menuLayout.layoutProperties;
            let defaultIconSize = LayoutProps.DefaultButtonsIconSize;
            this.iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);

            this.remove_child(this._ornamentLabel);
            this.x_expand = false;
            this.x_align = Clutter.ActorAlign.CENTER;
            this.y_expand = false;
            this.y_align = Clutter.ActorAlign.CENTER;
        }
        else{
            const IconSizeEnum = this._settings.get_enum('misc-item-icon-size');
            this.iconSize = Utils.getIconSize(IconSizeEnum, USER_AVATAR_SIZE);
        }

        this.userMenuIcon = new UserMenuIcon(menuLayout, this.iconSize, false);

        this.add_child(this.userMenuIcon.actor);
        this.label = this.userMenuIcon.label;
        if(this._displayType !== Constants.DisplayType.BUTTON)
            this.add_child(this.label);
    }

    activate(event) {
        Util.spawnCommandLine("gnome-control-center user-accounts");
        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
});

var UserMenuIcon = class Arc_Menu_UserMenuIcon{
    constructor(menuLayout, size, hasTooltip) {
        this._menuLayout = menuLayout;
        this.iconSize = size;

        let username = GLib.get_user_name();
        this._user = AccountsService.UserManager.get_default().get_user(username);

        this.actor = new St.Bin({
            style_class: 'menu-user-avatar user-icon',
            track_hover: true,
            reactive: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.label = new St.Label({
            text: GLib.get_real_name(),
            y_align: Clutter.ActorAlign.CENTER
        });

        this.actor.style = "width: " + this.iconSize + "px; height: " + this.iconSize + "px;";

        this._userLoadedId = this._user.connect('notify::is-loaded', this._onUserChanged.bind(this));
        this._userChangedId = this._user.connect('changed', this._onUserChanged.bind(this));
        this.actor.connect('destroy', this._onDestroy.bind(this));
        if(hasTooltip)
            this.actor.connect('notify::hover',this._onHover.bind(this));

        this._onUserChanged();
    }

    _onHover() {
        if(this.tooltip === undefined && this.actor.hover){
            this.tooltip = new Tooltip(this._menuLayout, this.actor, GLib.get_real_name());
            this.tooltip.location = Constants.TooltipLocation.BOTTOM_CENTERED;
            this.tooltip._onHover();
        }
    }

    _onUserChanged() {
        if (this._user.is_loaded) {
            this.label.set_text(this._user.get_real_name());
            if(this.tooltip)
                this.tooltip.titleLabel.text = this._user.get_real_name();

            let iconFile = this._user.get_icon_file();
            if (iconFile && !GLib.file_test(iconFile ,GLib.FileTest.EXISTS))
                iconFile = null;

            if (iconFile) {
                this.actor.child = null;
                this.actor.add_style_class_name('user-avatar');
                this.actor.style = 'background-image: url("%s");'.format(iconFile) + "width: " + this.iconSize + "px; height: " + this.iconSize + "px;";
            } 
            else {
                this.actor.style = "width: " + this.iconSize + "px; height: " + this.iconSize + "px;";
                this.actor.child = new St.Icon({ 
                    icon_name: 'avatar-default-symbolic',
                    icon_size: this.iconSize,
                    style: "padding: 5px; width: " + this.iconSize + "px; height: " + this.iconSize + "px;"
                });
            }
        }
    }

    _onDestroy() {
        if (this._userLoadedId) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = null;
        }
        if (this._userChangedId) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = null;
        }
    }
};

// Menu pinned apps item class
var PinnedAppsMenuItem = GObject.registerClass({
    Signals: {  'saveSettings': {}, },
}, class Arc_Menu_PinnedAppsMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, name, icon, command, displayType, isContainedInCategory) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._menuButton = menuLayout.menuButton;
        this._settings = this._menuLayout._settings;
        this._command = command;
        this._iconString = this._iconPath = icon;
        this._name = name;
        this._displayType = displayType;
        this._app = Shell.AppSystem.get_default().lookup_app(this._command);
        this.hasContextMenu = true;
        this.gridLocation = [-1, -1];
        this.isContainedInCategory = isContainedInCategory;

        //Modifiy the Default Pinned Apps---------------------
        if(this._name == "ArcMenu Settings"){
            this._name = _("ArcMenu Settings");
        }
        else if(this._name == "Terminal"){
            this._name = _("Terminal");
        }
        else if(this._name == "Files"){
            this._name = _("Files");
        }
        if(this._iconPath === "ArcMenu_ArcMenuIcon" || this._iconPath ===  Me.path + '/media/icons/arc-menu-symbolic.svg'){
            this._iconString = this._iconPath = Me.path + '/media/icons/menu_icons/arc-menu-symbolic.svg';
        }
        //-------------------------------------------------------

        if(this._app && this._iconPath === ''){
            let appIcon = this._app.create_icon_texture(Constants.MEDIUM_ICON_SIZE);
            if(appIcon instanceof St.Icon){
                this._iconString = appIcon.gicon ? appIcon.gicon.to_string() : appIcon.fallback_icon_name;
                if(!this._iconString)
                    this._iconString = "";
            }
        }

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);

        this._updateIcon();

        this.label = new St.Label({
            text: _(this._name),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        if(this._displayType === Constants.DisplayType.LIST && this._settings.get_boolean('apps-show-extra-details') && this._app){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionLabel = new St.Label({
                text: this._app.get_description(),
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add_child(this.label);
            if(this._app.get_description())
                labelBox.add_child(descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }

        this._draggable = DND.makeDraggable(this.actor);
        this._draggable._animateDragEnd = (eventTime) => {
            this._draggable._animationInProgress = true;
            this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime);
        };
        this.isDraggableApp = true;
        this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
        this._draggable.connect('drag-end', this._onDragEnd.bind(this));

        if(this._displayType === Constants.DisplayType.GRID)
            Utils.convertToGridLayout(this);

        this.setShouldShow();
    }

    createIcon(){
        let iconSize;
        if(this._displayType === Constants.DisplayType.GRID){
            const IconSizeEnum = this._settings.get_enum('menu-item-grid-icon-size');
            const LayoutProps = this._menuLayout.layoutProperties;
            let defaultIconStyle = LayoutProps.DefaultIconGridStyle;
            iconSize = Utils.getGridIconSize(IconSizeEnum, defaultIconStyle);
        }
        else if(this._displayType === Constants.DisplayType.LIST){
            const IconSizeEnum = this._settings.get_enum('menu-item-icon-size');
            const LayoutProps = this._menuLayout.layoutProperties;
            let defaultIconSize = this.isContainedInCategory ? LayoutProps.DefaultApplicationIconSize : LayoutProps.DefaultPinnedIconSize;
            iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);
        }

        return new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconString),
            icon_size: iconSize
        });
    }

    popupContextMenu(){
        if(this.contextMenu == undefined){
            let app = this._app ? this._app : this._command;
            this.contextMenu = new ApplicationContextMenu(this.actor, app, this._menuLayout);
            if(this._displayType === Constants.DisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
        }
        if(this.tooltip !== undefined)
            this.tooltip.hide();
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();
    }

   _onDragBegin() {
        this.isDragging = true;
        if(this._menuButton.tooltipShowingID){
            GLib.source_remove(this._menuButton.tooltipShowingID);
            this._menuButton.tooltipShowingID = null;
            this._menuButton.tooltipShowing = false;
        }
        if(this.tooltip){
            this.tooltip.hide();
            this._menuButton.tooltipShowing = false;
        }

        if(this.contextMenu && this.contextMenu.isOpen)
            this.contextMenu.toggle();

        this.cancelPopupTimeout();

        this._dragMonitor = {
            dragMotion: this._onDragMotion.bind(this)
        };
        DND.addDragMonitor(this._dragMonitor);
        this._parentBox = this.actor.get_parent();
        let p = this._parentBox.get_transformed_position();
        this.posX = p[0];
        this.posY = p[1];

        this.actor.opacity = 55;
        this.get_allocation_box();
        this.rowHeight = this.height;
        this.rowWidth = this.width;
    }

    _onDragMotion(dragEvent) {
        let layoutManager = this._parentBox.layout_manager;
        if(layoutManager instanceof Clutter.GridLayout){
            this.xIndex = Math.floor((this._draggable._dragX - this.posX) / (this.rowWidth + layoutManager.column_spacing));
            this.yIndex = Math.floor((this._draggable._dragY - this.posY) / (this.rowHeight + layoutManager.row_spacing));

            if(this.xIndex === this.gridLocation[0] && this.yIndex === this.gridLocation[1]){
                return DND.DragMotionResult.CONTINUE;
            }
            else{
                this.gridLocation = [this.xIndex, this.yIndex];
            }

            this._parentBox.remove_child(this);
            let children = this._parentBox.get_children();
            let childrenCount = children.length;
            let columns = layoutManager.gridColumns;
            let rows = Math.floor(childrenCount / columns);
            if(this.yIndex >= rows)
                this.yIndex = rows;
            if(this.yIndex < 0)
                this.yIndex = 0;
            if(this.xIndex >= columns - 1)
                this.xIndex = columns - 1;
            if(this.xIndex < 0)
                this.xIndex = 0;

            if(((this.xIndex + 1) + (this.yIndex * columns)) > childrenCount)
                this.xIndex = Math.floor(childrenCount % columns);

            this._parentBox.remove_all_children();

            let x = 0, y = 0;
            for(let i = 0; i < children.length; i++){
                if(this.xIndex === x && this.yIndex === y)
                    [x, y] = this.gridLayoutIter(x, y, columns);
                layoutManager.attach(children[i], x, y, 1, 1);
                [x, y] = this.gridLayoutIter(x, y, columns);
            }
            layoutManager.attach(this, this.xIndex, this.yIndex, 1, 1);
        }
        return DND.DragMotionResult.CONTINUE;
    }

    _onDragEnd() {
        if (this._dragMonitor) {
            DND.removeDragMonitor(this._dragMonitor);
            this._dragMonitor = null;
        }
        this.actor.opacity = 255;
        let layoutManager = this._parentBox.layout_manager;
        if(layoutManager instanceof Clutter.GridLayout){
            let x = 0, y = 0;
            let columns = layoutManager.gridColumns;
            let orderedList = [];
            let children = this._parentBox.get_children();
            for(let i = 0; i < children.length; i++){
                orderedList.push(this._parentBox.layout_manager.get_child_at(x, y));
                [x, y] = this.gridLayoutIter(x, y, columns);
            }
            this._menuLayout.pinnedAppsArray = orderedList;
        }
        this.emit('saveSettings');
    }

    getDragActor() {
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');
        let icon = new St.Icon({
            gicon: Gio.icon_new_for_string(this._iconString),
            style_class: 'popup-menu-icon',
            icon_size: this._iconBin.get_child().icon_size
        });
        let iconColor = this._settings.get_string('menu-foreground-color');
        if(customStyle)
            icon.style = `color: ${iconColor};`;
        return icon;
    }

    getDragActorSource() {
        return this.actor;
    }

    gridLayoutIter(x, y, columns){
        x++;
        if(x === columns){
            y++;
            x = 0;
        }
        return [x, y];
    }

    activate(event) {
        if(this._app)
            this._app.open_new_window(-1);
        else if(this._command === "ArcMenu_ShowAllApplications")
            Main.overview._overview._controls._toggleAppsPage();
        else
            Util.spawnCommandLine(this._command);

        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }
});

var ApplicationMenuItem = GObject.registerClass(class Arc_Menu_ApplicationMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, app, displayType, metaInfo, isContainedInCategory) {
        super._init(menuLayout);
        this._app = app;
        this._menuLayout = menuLayout;
        this.metaInfo = metaInfo;
        this._settings = this._menuLayout._settings;
        this.searchType = this._menuLayout.layoutProperties.SearchDisplayType;
        this._displayType = displayType;
        this.hasContextMenu = true;
        this.isSearchResult = this.metaInfo ? true : false;
        this.isContainedInCategory = isContainedInCategory;

        if(this._app){
            let disableRecentAppsIndicator = this._settings.get_boolean("disable-recently-installed-apps")
            if(!disableRecentAppsIndicator){
                let recentApps = this._settings.get_strv('recently-installed-apps');
                this.isRecentlyInstalled = recentApps.some((appIter) => appIter === this._app.get_id());
            }
        }

        this._iconBin = new St.Bin({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this._iconBin);

        this._updateIcon();

        this.label = new St.Label({
            text: this._app ? this._app.get_name() : this.metaInfo['name'],
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.description = this._app ? this._app.get_description() : this.metaInfo['description'];

        let searchResultsDescriptionsSetting = this._settings.get_boolean("show-search-result-details");
        let appsShowDescriptionsSetting = this._settings.get_boolean("apps-show-extra-details");
        this.searchResultsDescriptions = searchResultsDescriptionsSetting && this.isSearchResult;
        this.appsShowDescriptions = appsShowDescriptionsSetting && !this.isSearchResult;

        if(this.description && (this.searchResultsDescriptions || this.appsShowDescriptions) && this._displayType === Constants.DisplayType.LIST){
            let labelBox = new St.BoxLayout({
                vertical: true
            });
            let descriptionText = this.description.split('\n')[0];
            this.descriptionLabel = new St.Label({
                text: descriptionText,
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: "font-weight: lighter;"
            });
            labelBox.add_child(this.label);
            labelBox.add_child(this.descriptionLabel);
            this.add_child(labelBox);
        }
        else{
            this.add_child(this.label);
        }

        this.label_actor = this.label;

        if(this.isRecentlyInstalled){
            this._indicator = new St.Label({
                text: _('New'),
                style_class: "arc-menu-menu-item-text-indicator",
                style: "border-radius: 15px; margin: 0px; padding: 0px 10px;",
                x_expand: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._indicator);
        }
        if(this._displayType === Constants.DisplayType.GRID)
            Utils.convertToGridLayout(this);

        this.hoverID = this.connect("notify::hover", () => this.removeIndicator());
        this.keyFocusInID = this.connect("key-focus-in", () => this.removeIndicator());
    }

    createIcon(){
        let iconSize;
        if(this._displayType === Constants.DisplayType.GRID){
            this._iconBin.x_align = Clutter.ActorAlign.CENTER;

            const IconSizeEnum = this._settings.get_enum('menu-item-grid-icon-size');
            const LayoutProps = this._menuLayout.layoutProperties;
            let defaultIconStyle = LayoutProps.DefaultIconGridStyle;
            iconSize = Utils.getGridIconSize(IconSizeEnum, defaultIconStyle);
        }
        else if(this._displayType === Constants.DisplayType.LIST){
            const IconSizeEnum = this._settings.get_enum('menu-item-icon-size');
            const LayoutProps = this._menuLayout.layoutProperties;
            let defaultIconSize = this.isContainedInCategory || this.isSearchResult ? LayoutProps.DefaultApplicationIconSize : LayoutProps.DefaultPinnedIconSize;
            iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);
        }
        return this.metaInfo ? this.metaInfo['createIcon'](iconSize) : this._app.create_icon_texture(iconSize);
    }

    removeIndicator(){
        if(this.isRecentlyInstalled){
            this.isRecentlyInstalled = false;
            let recentApps = this._settings.get_strv('recently-installed-apps');
            let index = recentApps.indexOf(this._app.get_id());
            if(index > -1){
                recentApps.splice(index, 1);
            }
            this._settings.set_strv('recently-installed-apps', recentApps);

            this._indicator.hide();
            this._menuLayout.setRecentlyInstalledIndicator();
        }
    }

    popupContextMenu(){
        this.removeIndicator();
        if(this.tooltip)
            this.tooltip.hide();
        if(!this._app && !this._path)
            return;

        if(this.contextMenu === undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this._path)
                this.contextMenu.path = this._path;
            if(this._displayType === Constants.DisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
        }
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();
    }

    activateSearchResult(provider, metaInfo, terms, event){
        this._menuLayout.arcMenu.toggle();
        if(provider.activateResult){
            provider.activateResult(metaInfo.id, terms);
            if (metaInfo.clipboardText)
                St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, metaInfo.clipboardText);
        }
        else{
            if (metaInfo.id.endsWith('.desktop')) {
                let app = Shell.AppSystem.get_default().lookup_app(metaInfo.id);
                if (app.can_open_new_window())
                    app.open_new_window(-1);
                else
                    app.activate();
            }
            else{
                this._menuLayout.arcMenu.itemActivated(BoxPointer.PopupAnimation.NONE);
                SystemActions.activateAction(metaInfo.id);
            }   
        }
    }

    activate(event) {
        this.removeIndicator();

        if(this.metaInfo){
            this.activateSearchResult(this.provider, this.metaInfo, this.resultsView.terms, event);
            return Clutter.EVENT_STOP;
        }
        else
            this._app.open_new_window(-1);

        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }

    _onDestroy(){
        if(this.hoverID){
            this.disconnect(this.hoverID);
            this.hoverID = null;
        }
        if(this.keyFocusInID){
            this.disconnect(this.keyFocusInID);
            this.keyFocusInID = null;
        }
    }
});

// Menu Category item class
var CategoryMenuItem = GObject.registerClass(class Arc_Menu_CategoryMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, category, displayType) {
        super._init(menuLayout);
        this.appList = [];
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._layout = this._settings.get_enum('menu-layout');
        this._category = category;
        this._name = "";
        this._horizontalFlip = this._settings.get_boolean('enable-horizontal-flip');
        this._displayType = displayType;
        this.layoutProps = this._menuLayout.layoutProperties;

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);

        this._updateIcon();

        this.label = new St.Label({
            text: this._name,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.label);

        if(this.isRecentlyInstalled)
            this.setRecentlyInstalledIndicator(true);

        if(this._displayType === Constants.DisplayType.BUTTON){
            this.style_class = 'popup-menu-item arc-menu-button';
            this.remove_child(this._ornamentLabel);
            this.x_expand = false;
            this.x_align = Clutter.ActorAlign.CENTER;
            this.y_expand = false;
            this.y_align = Clutter.ActorAlign.CENTER;
            this.remove_child(this.label);
        }

        this.label_actor = this.label;
        this._menuLayout._oldX = -1;
        this._menuLayout._oldY = -1;
        this.connect('motion-event', this._onMotionEvent.bind(this));
        this.connect('enter-event', this._onEnterEvent.bind(this));
        this.connect('leave-event', this._onLeaveEvent.bind(this));
    }

    createIcon(){
        const IconSizeEnum = this._settings.get_enum('menu-item-icon-size');

        let defaultIconSize = this.layoutProps.DefaultCategoryIconSize;
        let iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);

        if(this._displayType === Constants.DisplayType.BUTTON){
            const IconSizeEnum = this._settings.get_enum('button-item-icon-size');
            let defaultIconSize = this.layoutProps.DefaultButtonsIconSize;
            iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);
        }

        let icon = new St.Icon({
            style_class: 'popup-menu-icon',
            icon_size: iconSize
        });

        let categoryIconType = this._settings.get_enum('category-icon-type');
        let [name, gicon, iconName, fallbackIconName] = Utils.getCategoryDetails(this._category, categoryIconType);
        this._name = _(name);
        if(gicon)
            icon.gicon = gicon;
        else if(iconName)
            icon.icon_name = iconName;
        else
            icon.fallback_icon_name = fallbackIconName;

        return icon;
    }

    setRecentlyInstalledIndicator(shouldShow){
        if(this._displayType === Constants.DisplayType.BUTTON)
            return;
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._indicator);
        }
        else if(this._indicator && this.contains(this._indicator))
            this.remove_child(this._indicator);
    }

    displayAppList(){
        this._menuLayout.searchBox?.clearWithoutSearchChangeEvent();
        this._menuLayout.activeCategory = this._name;
        Utils.activateCategory(this._category, this._menuLayout, this, null);
    }

    activate(event) {
        this.displayAppList();
        if(this.layoutProps.SupportsCategoryOnHover)
            this._menuLayout.setActiveCategory(this, true);
        super.activate(event);
    }

    _onEnterEvent(actor, event) {
        if(this._menuLayout.navigatingCategoryLeaveEventID){
            GLib.source_remove(this._menuLayout.navigatingCategoryLeaveEventID);
            this._menuLayout.navigatingCategoryLeaveEventID = null;
        }
    }

    _onLeaveEvent(actor, event) {
        if(!this._menuLayout.navigatingCategoryLeaveEventID){
            this._menuLayout.navigatingCategoryLeaveEventID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                this._menuLayout.navigatingCategory = null;
                this._menuLayout.navigatingCategoryLeaveEventID = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _onMotionEvent(actor, event) {
        if(this.layoutProps.SupportsCategoryOnHover && this._settings.get_boolean('activate-on-hover')){
            if (!this._menuLayout.navigatingCategory) {
                this._menuLayout.navigatingCategory = this;
            }

            if (this._isInTriangle(event.get_coords())){
                if(this._menuLayout.activeCategoryType !== this._category && this._menuLayout.navigatingCategory === this)
                    this.activate(Clutter.get_current_event());
                return true;
            }
            this._menuLayout.navigatingCategory = this;
            return true;
        }
    }

    _isInTriangle([x, y]){
        let [posX, posY] = this._menuLayout.navigatingCategory.get_transformed_position();

        //the mouse is still in the active category
        if (this._menuLayout.navigatingCategory === this){
            this._menuLayout._oldX = x;
            this._menuLayout._oldY = y;
            return true;
        }

        if(!this._menuLayout.navigatingCategory)
            return false;

        let width = this._menuLayout.navigatingCategory.width;
        let height = this._menuLayout.navigatingCategory.height;

        let maxX = this._horizontalFlip ? posX : posX + width;
        let maxY = posY + height;

        let distance = Math.abs(maxX - this._menuLayout._oldX);
        let point1 = [this._menuLayout._oldX, this._menuLayout._oldY]
        let point2 = [maxX, posY - distance];
        let point3 = [maxX, maxY + distance];

        let area = Utils.areaOfTriangle(point1, point2, point3);
        let a1 = Utils.areaOfTriangle([x, y], point2, point3);
        let a2 = Utils.areaOfTriangle(point1, [x, y], point3);
        let a3 = Utils.areaOfTriangle(point1, point2, [x, y]);
        return area === a1 + a2 + a3;
    }
});

var SimpleMenuItem = GObject.registerClass(class Arc_Menu_SimpleMenuItem extends CategoryMenuItem{
    _init(menuLayout, category) {
        super._init(menuLayout, category);
        this.subMenu = new PopupMenu.PopupMenu(this.actor,.5,St.Side.LEFT);
        this.subMenu.connect("open-state-changed", (menu, open) => {
            if(!open){
                let appsScrollBoxAdj = this.applicationsScrollBox.get_vscroll_bar().get_adjustment();
                appsScrollBoxAdj.set_value(0);
            }
        });

        Main.uiGroup.add_child(this.subMenu.actor);
        this.section = new PopupMenu.PopupMenuSection();
        this.subMenu.addMenuItem(this.section);

        this.applicationsScrollBox = this._menuLayout._createScrollBox({
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'left-panel ' + (this._menuLayout.disableFadeEffect ? '' : 'small-vfade'),
            overlay_scrollbars: true
        });
        this._menuLayout.subMenuManager.addMenu(this.subMenu);
        this.applicationsBox = new St.BoxLayout({
            vertical: true,
            style_class: 'margin-box'
        });
        this.applicationsScrollBox.style = 'max-height: 25em;';
        this.applicationsBox._delegate = this.applicationsBox;
        this.applicationsScrollBox.add_actor(this.applicationsBox);
        this.section.actor.add_child(this.applicationsScrollBox);

        if(this.subMenu._keyPressId)
            this.actor.disconnect(this.subMenu._keyPressId);
        this.applicationsScrollBox.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Right:
                case Clutter.KEY_Left:
                    this.subMenu.toggle();
                    this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                        this.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                    }
                    return Clutter.EVENT_STOP;
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
        this.actor.connect("key-press-event",(actor, event)=>{
            let symbol = event.get_key_symbol();
            switch (symbol) {
                case Clutter.KEY_Escape:
                    if(this.subMenu.isOpen){
                        this.subMenu.toggle();
                    }
                    return Clutter.EVENT_STOP;
                case Clutter.KEY_Left:
                case Clutter.KEY_Right:
                case Clutter.KEY_Return:
                    if(!this.subMenu.isOpen){
                        let navigateFocus = true;
                        this.activate(event, navigateFocus);
                        this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
                        return Clutter.EVENT_STOP;
                    }
                    else{
                        return Clutter.EVENT_PROPAGATE;
                    }
                default:
                    return Clutter.EVENT_PROPAGATE;
            }
        });
        this.updateStyle();
    }

    updateStyle(){
        let customStyle = this._settings.get_boolean('enable-custom-arc-menu');

        this.subMenu.actor.hide();
        if(customStyle){
            this.subMenu.actor.style_class = 'arc-menu-boxpointer';
            this.subMenu.actor.add_style_class_name('arc-menu');
        }
        else
        {
            this.subMenu.actor.style_class = 'popup-menu-boxpointer';
            this.subMenu.actor.add_style_class_name('popup-menu');
        }
    }

    displayAppList(){
        this._menuLayout.activeCategory = this._name;
    }

    activate(event, navigateFocus = true) {
        this._menuLayout.activeCategory = this._name;
        Utils.activateCategory(this._category, this._menuLayout, this, true);
        this.subMenu.toggle();
        if(navigateFocus)
            this.subMenu.actor.navigate_focus(null, St.DirectionType.TAB_FORWARD, false);
        this._menuLayout.setActiveCategory(this, true);
    }

    _onMotionEvent(actor, event) {
        if (!this._menuLayout.navigatingCategory) {
            this._menuLayout.navigatingCategory = this;
        }

        if (this._isInTriangle(event.get_coords())){
            if(this._menuLayout.activeCategory !== this._name && this._menuLayout.navigatingCategory === this){
                let navigateFocus = false;
                this.activate(event, navigateFocus);
            }
            return true;
        }
        this._menuLayout.navigatingCategory = this;
        return true;
    }
});
// SubMenu Category item class
var CategorySubMenuItem = GObject.registerClass(class Arc_Menu_CategorySubMenuItem extends PopupMenu.PopupSubMenuMenuItem{
    _init(menuLayout, category) {
        super._init('', true);
        this.add_style_class_name("arcmenu-menu-item");
        this.add_style_class_name('margin-box');
        this._category = category;
        this._menuLayout = menuLayout;
        this._settings = this._menuLayout._settings;
        this._name = "";
        this.isSimpleMenuItem = false;
        this._active = false;
        this.applicationsMap = new Map();
        this.appList = [];

        let categoryIconType = this._settings.get_enum('category-icon-type');
        let [name, gicon, iconName, fallbackIconName] = Utils.getCategoryDetails(this._category, categoryIconType);
        this._name = _(name);
        if(gicon)
            this.icon.gicon = gicon;
        else if(iconName)
            this.icon.icon_name = iconName;
        else
            this.icon.fallback_icon_name = fallbackIconName;

        this.label.text = this._name;

        const IconSizeEnum = this._settings.get_enum('menu-item-icon-size');
        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = LayoutProps.DefaultCategoryIconSize;
        let iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);
        this.icon.icon_size = iconSize;

        let panAction = new Clutter.PanAction({ interpolate: false });
        panAction.connect('pan', (action) => {
            this._menuLayout._blockActivateEvent = true;
            this._menuLayout.onPan(action, this.menu.actor);
        });
        panAction.connect('gesture-cancel',(action) =>  this._menuLayout.onPanEnd(action, this.menu.actor));
        panAction.connect('gesture-end', (action) => this._menuLayout.onPanEnd(action, this.menu.actor));
        this.menu.actor.add_action(panAction);

        this.menu.actor.style = 'max-height: 250px;';
        this.menu.actor.overlay_scrollbars = true;
        this.menu.actor.style_class = 'popup-sub-menu ' + (this._menuLayout.disableFadeEffect ? '' : 'small-vfade');
        this.menu._needsScrollbar = () => this._needsScrollbar();

        this.menu.connect('open-state-changed', () => {
            if(!this.menu.isOpen){
                let scrollbar= this.menu.actor.get_vscroll_bar().get_adjustment();
                scrollbar.set_value(0);
            }
        });
        this.menu.box.style_class = 'margin-box';
    }

    setRecentlyInstalledIndicator(shouldShow){
        this.isRecentlyInstalled = shouldShow;
        if(shouldShow){
            this._indicator = new St.Icon({
                icon_name: 'message-indicator-symbolic',
                style_class: 'arc-menu-menu-item-indicator',
                icon_size: INDICATOR_ICON_SIZE,
                x_expand: true,
                y_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.actor.add_child(this._indicator);
        }
        else if(this._indicator && this.actor.contains(this._indicator))
            this.actor.remove_child(this._indicator);
    }

    _needsScrollbar() {
        let topMenu = this.menu;
        let [, topNaturalHeight] = topMenu.actor.get_preferred_height(-1);
        let topThemeNode = topMenu.actor.get_theme_node();

        let topMaxHeight = topThemeNode.get_max_height();
        let needsScrollbar = topMaxHeight >= 0 && topNaturalHeight >= topMaxHeight;
        if(needsScrollbar)
            this.menu.actor.style = 'min-height:150px; max-height: 250px;';
        else
            this.menu.actor.style = 'max-height: 250px;';

        this.menu.actor.vscrollbar_policy = St.PolicyType.AUTOMATIC;

        if (needsScrollbar)
            this.menu.actor.add_style_pseudo_class('scrolled');
        else
            this.menu.actor.remove_style_pseudo_class('scrolled');

        return needsScrollbar;
    }

    loadMenu(){
        let children = this.menu.box.get_children();
        for (let i = 0; i < children.length; i++) {
            let item = children[i];
            this.menu.box.remove_child(item);
        }
        let appList = [];
        this.applicationsMap.forEach((value,key,map) => {
            appList.push(key);
        });
        appList.sort((a, b) => {
            return a.get_name().toLowerCase() > b.get_name().toLowerCase();
        });
        for (let i = 0; i < appList.length; i++) {
            let app = appList[i];
            let item = this.applicationsMap.get(app);
            if(item.actor.get_parent()){
                item.actor.get_parent().remove_child(item.actor);
            }
            if (!item.actor.get_parent()) {
                this.menu.box.add_child(item.actor);
            }
        }
    }

    _setOpenState(open){
        if(this.isSimpleMenuItem && open){
            this._menuLayout.activeCategory = this._name;
            Utils.activateCategory(this._category, this._menuLayout, this, true);
        }
        else if(open)
            this.loadMenu();

        this.setSubmenuShown(open);
    }
});

// Place Info class
var PlaceInfo = class Arc_Menu_PlaceInfo {
    constructor(file, name, icon) {
        this.file = file;
        this.name = name ? name : this._getFileName();
        this.icon = icon ? icon : null;
        this.gicon = icon ? null : this.getIcon();
    }

    launch(timestamp) {
        let context = global.create_app_launch_context(timestamp, -1);
        new Promise((resolve, reject) => {
            Gio.AppInfo.launch_default_for_uri_async(this.file.get_uri(), context, null, (o, res) => {
                try {
                    Gio.AppInfo.launch_default_for_uri_finish(res);
                    resolve();
                } catch (e) {
                    Main.notifyError(_('Failed to open “%s”').format(this._getFileName()), e.message);
                    reject(e);
                }
            });
        });
    }

    getIcon() {
        try {
            let info = this.file.query_info('standard::symbolic-icon', 0, null);
            return info.get_symbolic_icon();

        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                if (!this.file.is_native()) {
                    return new Gio.ThemedIcon({ name: 'folder-remote-symbolic' });
                } else {
                    return new Gio.ThemedIcon({ name: 'folder-symbolic' });
                }
            }
        }
    }

    _getFileName() {
        try {
            let info = this.file.query_info('standard::display-name', 0, null);
            return info.get_display_name();
        } catch (e) {
            if (e instanceof Gio.IOErrorEnum) {
                return this.file.get_basename();
            }
        }
    }

    destroy(){
    }
};
Signals.addSignalMethods(PlaceInfo.prototype);

// Menu Place Shortcut item class
var PlaceMenuItem = GObject.registerClass(class Arc_Menu_PlaceMenuItem extends ArcMenuPopupBaseMenuItem{
    _init(menuLayout, info, displayType, isContainedInCategory) {
        super._init(menuLayout);
        this._menuLayout = menuLayout;
        this._displayType = displayType;
        this._info = info;
        this._settings = menuLayout._settings;
        this.isContainedInCategory = isContainedInCategory;
        this.hasContextMenu = true;

        this.label = new St.Label({
            text: _(info.name),
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this._iconBin = new St.Bin();
        this.add_child(this._iconBin);

        this._updateIcon();

        if(this._displayType === Constants.DisplayType.BUTTON){
            this.style_class = 'popup-menu-item arc-menu-button';
            this.remove_child(this._ornamentLabel);
            this.x_expand = this.y_expand = false;
            this.x_align = this.y_align = Clutter.ActorAlign.CENTER;
        }
        else{
            this.add_child(this.label);
        }

        this._changedId = this._info.connect('changed', this._propertiesChanged.bind(this));
    }

    createIcon(){
        let iconSizeEnum;
        if(this.isContainedInCategory)
            iconSizeEnum = this._settings.get_enum('menu-item-icon-size');
        else
            iconSizeEnum = this._settings.get_enum('quicklinks-item-icon-size');

        const LayoutProps = this._menuLayout.layoutProperties;
        let defaultIconSize = this.isContainedInCategory ? LayoutProps.DefaultApplicationIconSize : LayoutProps.DefaultQuickLinksIconSize;
        let iconSize = Utils.getIconSize(iconSizeEnum, defaultIconSize);

        if(this._displayType === Constants.DisplayType.BUTTON){
            let defaultIconSize = LayoutProps.DefaultButtonsIconSize;
            const IconSizeEnum = this._settings.get_enum('button-item-icon-size');
            iconSize = Utils.getIconSize(IconSizeEnum, defaultIconSize);
        }

        return new St.Icon({
            gicon:  this._info.gicon ?  this._info.gicon :  this._info.icon,
            icon_size: iconSize,
        });
    }

    _onDestroy() {
        if (this._changedId) {
            this._info.disconnect(this._changedId);
            this._changedId = null;
        }
        if(this._info)
            this._info.destroy();
        super._onDestroy();
    }

    popupContextMenu(){
        if(this.tooltip)
            this.tooltip.hide();
        if(!this._app && !this._path)
            return;

        if(this.contextMenu === undefined){
            this.contextMenu = new ApplicationContextMenu(this.actor, this._app, this._menuLayout);
            if(this._path)
                this.contextMenu.path = this._path;
            if(this._displayType === Constants.DisplayType.GRID)
                this.contextMenu.centerBoxPointerPosition();
        }
        if(!this.contextMenu.isOpen)
            this.contextMenu.rebuildItems();
        this.contextMenu.toggle();
    }

    activate(event) {
        this._info.launch(event.get_time());
        this._menuLayout.arcMenu.toggle();
        super.activate(event);
    }

    _propertiesChanged(info) {
        this._info = info;
        this.createIcon();
        if(this.label)
            this.label.text = info.name;
    }
});

var SearchBox = GObject.registerClass({
Signals: {
    'search-changed': { param_types: [GObject.TYPE_STRING] },
    'entry-key-focus-in': { },
    'entry-key-press': { param_types: [Clutter.Event.$gtype] },
},},
class Arc_Menu_SearchBox extends St.Entry {
    _init(menuLayout) {
        super._init({
            hint_text: _("Search…"),
            track_hover: true,
            can_focus: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            name: "ArcSearchEntry"
        });
        this.searchResults = menuLayout.searchResults;
        this._settings = menuLayout._settings;
        this.triggerSearchChangeEvent = true;

        const IconSizeEnum = this._settings.get_enum('misc-item-icon-size');
        let iconSize = Utils.getIconSize(IconSizeEnum, Constants.EXTRA_SMALL_ICON_SIZE);

        this._findIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-find-symbolic',
            icon_size: iconSize
        });

        this._clearIcon = new St.Icon({
            style_class: 'search-entry-icon',
            icon_name: 'edit-clear-symbolic',
            icon_size: iconSize
        });

        this.set_primary_icon(this._findIcon);

        this._text = this.get_clutter_text();
        this._textChangedId = this._text.connect('text-changed', this._onTextChanged.bind(this));
        this._keyPressId = this._text.connect('key-press-event', this._onKeyPress.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-in', this._onKeyFocusIn.bind(this));
        this._keyFocusInId = this._text.connect('key-focus-out', this._onKeyFocusOut.bind(this));
        this._searchIconClickedId = this.connect('secondary-icon-clicked', () => this.clear());
        this.connect('destroy', this._onDestroy.bind(this));
    }

    updateStyle(removeBorder){
        let style = this.style;
        this.style = style.replace("border-width: 0;", "");
        if(removeBorder)
            this.style += 'border-width: 0;';
    }

    get entryBox(){
        return this;
    }

    get actor(){
        return this;
    }

    getText() {
        return this.get_text();
    }

    setText(text) {
        this.set_text(text);
    }

    clearWithoutSearchChangeEvent(){
        this.triggerSearchChangeEvent = false;
        this.set_text('');
        this.triggerSearchChangeEvent = true;
    }

    hasKeyFocus() {
        return this.contains(global.stage.get_key_focus());
    }

    clear() {
        this.set_text('');
    }

    isEmpty() {
        return this.get_text() == '';
    }

    _onKeyFocusOut(){
        if(!this.isEmpty()){
            this.add_style_pseudo_class('focus');
            return Clutter.EVENT_STOP;
        }
    }

    _onTextChanged() {
        let searchString = this.get_text();
        if(!this.isEmpty()){
            if(!this.hasKeyFocus())
                this.grab_key_focus();
            if (!this.searchResults.getTopResult()?.has_style_pseudo_class("active"))
                this.searchResults.getTopResult()?.add_style_pseudo_class("active")
            this.add_style_pseudo_class('focus');
            this.set_secondary_icon(this._clearIcon);
        }
        else{
            if(!this.hasKeyFocus())
                this.remove_style_pseudo_class('focus');
            this.set_secondary_icon(null);
        }

        if(this.triggerSearchChangeEvent)
            this.emit('search-changed', searchString);
    }

    _onKeyPress(actor, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.KEY_Return ||
            symbol == Clutter.KEY_KP_Enter) {
            if (!this.isEmpty()) {
                if (this.searchResults.getTopResult()) {
                    this.searchResults.getTopResult().activate(event);
                }
            }
            return Clutter.EVENT_STOP;
        }
        this.emit('entry-key-press', event);
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyFocusIn() {
        this.add_style_pseudo_class('focus');
        this.emit('entry-key-focus-in');
        return Clutter.EVENT_PROPAGATE;
    }

    _onDestroy() {
        if (this._textChangedId) {
            this._text.disconnect(this._textChangedId);
            this._textChangedId = null;
        }
        if (this._keyPressId) {
            this._text.disconnect(this._keyPressId);
            this._keyPressId = null;
        }
        if (this._keyFocusInId) {
            this._text.disconnect(this._keyFocusInId);
            this._keyFocusInId = null;
        }
        if(this._searchIconClickedId){
            this.disconnect(this._searchIconClickedId);
            this._searchIconClickedId = null;
        }
    }
});

/**
 * This class is responsible for the appearance of the menu button.
 */
var MenuButtonWidget = class Arc_Menu_MenuButtonWidget{
    constructor() {
        this.actor = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            pack_start: false
        });
        this._arrowIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
        this._arrowIcon.add_style_class_name('arc-menu-arrow');

        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            reactive: true,
        });
        this._label = new St.Label({
            text: _("Applications"),
            y_expand: true,
            style_class: 'arc-menu-text',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.actor.add_child(this._icon);
        this.actor.add_child(this._label);
        this.actor.add_child(this._arrowIcon);
    }

    setActiveStylePseudoClass(enable){
        if(enable){
            this._arrowIcon.add_style_pseudo_class('active');
            this._icon.add_style_pseudo_class('active');
            this._label.add_style_pseudo_class('active');
        }
        else{
            this._arrowIcon.remove_style_pseudo_class('active');
            this._icon.remove_style_pseudo_class('active');
            this._label.remove_style_pseudo_class('active');
        }
    }

    updateArrowIconSide(side){
        let iconName;
        switch (side) {
        case St.Side.TOP:
            iconName = 'pan-down-symbolic';
            break;
        case St.Side.RIGHT:
            iconName = 'pan-start-symbolic';
            break;
        case St.Side.BOTTOM:
            iconName = 'pan-up-symbolic';
            break;
        case St.Side.LEFT:
            iconName = 'pan-end-symbolic';
            break;
        }
        this._arrowIcon.icon_name = iconName;
    }

    getPanelLabel() {
        return this._label;
    }

    getPanelIcon() {
        return this._icon;
    }

    showArrowIcon() {
        if (!this.actor.contains(this._arrowIcon)) {
            this.actor.add_child(this._arrowIcon);
        }
    }

    hideArrowIcon() {
        if (this.actor.contains(this._arrowIcon)) {
            this.actor.remove_child(this._arrowIcon);
        }
    }

    showPanelIcon() {
        if (!this.actor.contains(this._icon)) {
            this.actor.add_child(this._icon);
        }
    }

    hidePanelIcon() {
        if (this.actor.contains(this._icon)) {
            this.actor.remove_child(this._icon);
        }
    }

    showPanelText() {
        if (!this.actor.contains(this._label)) {
            this.actor.add_child(this._label);
        }
    }

    hidePanelText() {
        this._label.style = '';
        if (this.actor.contains(this._label)) {
            this.actor.remove_child(this._label);
        }
    }

    setPanelTextStyle(style){
        this._label.style = style;
    }
};

var DashMenuButtonWidget = class Arc_Menu_DashMenuButtonWidget{
    constructor(menuButton, settings) {
        this._menuButton = menuButton;
        this._settings = settings;
        this.actor = new St.Button({
            style_class: 'show-apps',
            track_hover: true,
            can_focus: true,
            toggle_mode: false,
            reactive: false
        });
        this.actor._delegate = this;
        this.icon = new imports.ui.iconGrid.BaseIcon(_("ArcMenu"),
                                            { setSizeManually: true,
                                            showLabel: false,
                                            createIcon: this._createIcon.bind(this) });
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            icon_size: 15,
            track_hover:true,
            reactive: true
        });
        this.icon._delegate = this.actor;
        this._labelText = _("ArcMenu");
        this.label = new St.Label({ style_class: 'dash-label' });
        this.label.hide();
        Main.layoutManager.addChrome(this.label);
        this.label_actor = this.label;
        this.actor.set_child(this.icon);

        this.child = this.actor;
    }
    showLabel() {
        if (!this._labelText)
            return;

        this.label.set_text(this._labelText);
        this.label.opacity = 0;
        this.label.show();

        let [stageX, stageY] = this.actor.get_transformed_position();
        let node = this.label.get_theme_node();

        let itemWidth  = this.actor.allocation.x2 - this.actor.allocation.x1;
        let itemHeight = this.actor.allocation.y2 - this.actor.allocation.y1;

        let labelWidth = this.label.get_width();
        let labelHeight = this.label.get_height();

        let x, y, xOffset, yOffset;

        let position = this._menuButton._panel._settings.get_enum('dock-position');
        this._isHorizontal = ((position == St.Side.TOP) || (position == St.Side.BOTTOM));
        let labelOffset = node.get_length('-x-offset');
        switch (position) {
            case St.Side.LEFT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = stageX + this.actor.get_width() + xOffset;
                break;
            case St.Side.RIGHT:
                yOffset = Math.floor((itemHeight - labelHeight) / 2);
                y = stageY + yOffset;
                xOffset = labelOffset;
                x = Math.round(stageX) - labelWidth - xOffset;
                break;
            case St.Side.TOP:
                y = stageY + labelOffset + itemHeight;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
            case St.Side.BOTTOM:
                yOffset = labelOffset;
                y = stageY - labelHeight - yOffset;
                xOffset = Math.floor((itemWidth - labelWidth) / 2);
                x = stageX + xOffset;
                break;
        }

        // keep the label inside the screen border
        // Only needed fot the x coordinate.

        // Leave a few pixel gap
        let gap = 5;
        let monitor = Main.layoutManager.findMonitorForActor(this.actor);
        if (x - monitor.x < gap)
            x += monitor.x - x + labelOffset;
        else if (x + labelWidth > monitor.x + monitor.width - gap)
            x -= x + labelWidth - (monitor.x + monitor.width) + gap;

        this.label.remove_all_transitions();
        this.label.set_position(x, y);
        this.label.ease({
            opacity: 255,
            duration: Dash.DASH_ITEM_LABEL_SHOW_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD
        });
    }
    hideLabel() {
        this.label.ease({
            opacity: 0,
            duration: Dash.DASH_ITEM_LABEL_HIDE_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.label.hide()
        });
    }
    _createIcon(size) {
        this._icon = new St.Icon({
            icon_name: 'start-here-symbolic',
            style_class: 'arc-menu-icon',
            track_hover:true,
            icon_size: size,
            reactive: true
        });
        let path = this._settings.get_string('custom-menu-button-icon');
        let iconString = Utils.getMenuButtonIcon(this._settings, path);
        this._icon.set_gicon(Gio.icon_new_for_string(iconString));

        return this._icon;
    }
    getPanelIcon() {
        return this._icon;
    }
};

var WorldClocksSection = GObject.registerClass(class Arc_Menu_WorldClocksSection extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, null, null);

        this.x_expand = true;
        this._clock = new imports.gi.GnomeDesktop.WallClock();
        this._clockNotifyId = 0;

        this._locations = [];

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._grid = new St.Widget({ style_class: 'world-clocks-grid',
                                        x_expand: true,
                                        layout_manager: layout });
        layout.hookup_style(this._grid);

        this.add_child(this._grid);

        this._clocksApp = null;
        this._clocksProxy = new ClocksProxy(
            Gio.DBus.session,
            'org.gnome.clocks',
            '/org/gnome/clocks',
            this._onProxyReady.bind(this),
            null /* cancellable */,
            Gio.DBusProxyFlags.DO_NOT_AUTO_START | Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES);

        this._clockSettings = new Gio.Settings({
            schema_id: 'org.gnome.shell.world-clocks',
        });
        this.clocksChangedID = this._clockSettings.connect('changed', this._clocksChanged.bind(this));
        this._clocksChanged();

        this._appSystem = Shell.AppSystem.get_default();
        this.syncID = this._appSystem.connect('installed-changed',
            this._sync.bind(this));
        this._sync();
    }

    _onDestroy(){
        if(this.syncID){
            this._appSystem.disconnect(this.syncID);
            this.syncID = null;
        }
        if(this.clocksChangedID){
            this._clockSettings.disconnect(this.clocksChangedID);
            this.clocksChangedID = null;
        }
        if(this.clocksProxyID){
            this._clocksProxy.disconnect(this.clocksProxyID);
            this.clocksProxyID = null;
        }
        if (this._clockNotifyId){
            this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = null;
        }
    }

    activate(event) {
        super.activate(event);
        if (this._clocksApp){
            this._clocksApp.activate();
        }
    }

    _sync() {
        this._clocksApp = this._appSystem.lookup_app('org.gnome.clocks.desktop');
        this.visible = this._clocksApp != null;
    }

    _clocksChanged() {
        this._grid.destroy_all_children();
        this._locations = [];

        let world = imports.gi.GWeather.Location.get_world();
        let clocks = this._clockSettings.get_value('locations').deep_unpack();
        for (let i = 0; i < clocks.length; i++) {
            let l = world.deserialize(clocks[i]);
            if (l && l.get_timezone() != null)
                this._locations.push({ location: l });
        }

        this._locations.sort((a, b) => {
            return a.location.get_timezone().get_offset() -
                    b.location.get_timezone().get_offset();
        });

        let layout = this._grid.layout_manager;
        let title = this._locations.length == 0
            ? _("Add world clocks…")
            : _("World Clocks");
        let header = new St.Label({ x_align: Clutter.ActorAlign.START,
                                    text: title });
        header.style = "font-weight: bold;";
        layout.attach(header, 0, 0, 2, 1);
        this.label_actor = header;

        let localOffset = GLib.DateTime.new_now_local().get_utc_offset();

        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i].location;

            let name = l.get_city_name() || l.get_name();
            let label = new St.Label({  text: name,
                                        x_align: Clutter.ActorAlign.START,
                                        y_align: Clutter.ActorAlign.CENTER,
                                        x_expand: true });
            label.style = "font-weight: normal; font-size: 0.9em;";
            let time = new St.Label();
            time.style = "font-feature-settings: \"tnum\"; font-size: 1.2em;";
            let otherOffset = this._getTimeAtLocation(l).get_utc_offset();
            let offset = (otherOffset - localOffset) / GLib.TIME_SPAN_HOUR;
            let fmt = Math.trunc(offset) == offset ? '%s%.0f' : '%s%.1f';
            let prefix = offset >= 0 ? '+' : '-';
            let tz = new St.Label({ text: fmt.format(prefix, Math.abs(offset)),
                                    x_align: Clutter.ActorAlign.END,
                                    y_align: Clutter.ActorAlign.CENTER });
            tz.style = "font-feature-settings: \"tnum\"; font-size: 0.9em;";
            if (this._grid.text_direction == Clutter.TextDirection.RTL) {
                layout.attach(tz, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(label, 2, i + 1, 1, 1);
            } else {
                layout.attach(label, 0, i + 1, 1, 1);
                layout.attach(time, 1, i + 1, 1, 1);
                layout.attach(tz, 2, i + 1, 1, 1);
            }

            this._locations[i].actor = time;
        }

        if (this._grid.get_n_children() > 1) {
            if (!this._clockNotifyId) {
                this._clockNotifyId =
                    this._clock.connect('notify::clock', this._updateLabels.bind(this));
            }
            this._updateLabels();
        } else {
            if (this._clockNotifyId)
                this._clock.disconnect(this._clockNotifyId);
            this._clockNotifyId = 0;
        }
    }

    _getTimeAtLocation(location) {
        let tz = GLib.TimeZone.new(location.get_timezone().get_tzid());
        return GLib.DateTime.new_now(tz);
    }

    _updateLabels() {
        for (let i = 0; i < this._locations.length; i++) {
            let l = this._locations[i];
            let now = this._getTimeAtLocation(l.location);
            l.actor.text = Util.formatTime(now, { timeOnly: true });
        }
    }

    _onProxyReady(proxy, error) {
        if (error) {
            log(`Failed to create GNOME Clocks proxy: ${error}`);
            return;
        }

        this.clocksProxyID = this._clocksProxy.connect('g-properties-changed',
            this._onClocksPropertiesChanged.bind(this));
        this._onClocksPropertiesChanged();
    }

    _onClocksPropertiesChanged() {
        if (this._clocksProxy.g_name_owner == null)
            return;

        this._clockSettings.set_value('locations',
            new GLib.Variant('av', this._clocksProxy.Locations));
    }
});

var WeatherSection = GObject.registerClass(class Arc_Menu_WeatherSection extends ArcMenuButtonItem {
    _init(menuLayout) {
        super._init(menuLayout, null, null);

        this.x_expand = true;
        this.x_align = Clutter.ActorAlign.FILL;
        this._weatherClient = new imports.misc.weather.WeatherClient();

        let box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        this.add_child(box);

        let titleBox = new St.BoxLayout({ });
        let label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_align: Clutter.ActorAlign.END,
            text: _('Weather'),
        })
        label.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(label);
        box.add_child(titleBox);

        this._titleLocation = new St.Label({
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END,
        });
        this._titleLocation.style = "font-weight: bold; padding-bottom: 5px;";
        titleBox.add_child(this._titleLocation);

        let layout = new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._forecastGrid = new St.Widget({
            style_class: 'weather-grid',
            layout_manager: layout,
        });
        layout.hookup_style(this._forecastGrid);
        box.add_child(this._forecastGrid);

        this.syncID = this._weatherClient.connect('changed', this._sync.bind(this));
        this._sync();

    }
    _onDestroy(){
        if(this.syncID){
            this._weatherClient.disconnect(this.syncID);
            this.syncID = null;
        }
        this._weatherClient = null;
    }
    vfunc_map() {
        this._weatherClient.update();
        super.vfunc_map();
    }

    activate(event) {
        super.activate(event);
        this._weatherClient.activateApp();
    }

    _getInfos() {
        let forecasts = this._weatherClient.info.get_forecast_list();

        let now = GLib.DateTime.new_now_local();
        let current = GLib.DateTime.new_from_unix_local(0);
        let infos = [];
        for (let i = 0; i < forecasts.length; i++) {
            const [valid, timestamp] = forecasts[i].get_value_update();
            if (!valid || timestamp === 0)
                continue;  // 0 means 'never updated'

            const datetime = GLib.DateTime.new_from_unix_local(timestamp);
            if (now.difference(datetime) > 0)
                continue; // Ignore earlier forecasts

            if (datetime.difference(current) < GLib.TIME_SPAN_HOUR)
                continue; // Enforce a minimum interval of 1h

            if (infos.push(forecasts[i]) == 5)
                break; // Use a maximum of five forecasts

            current = datetime;
        }
        return infos;
    }

    _addForecasts() {
        let layout = this._forecastGrid.layout_manager;

        let infos = this._getInfos();
        if (this._forecastGrid.text_direction == Clutter.TextDirection.RTL)
            infos.reverse();

        let col = 0;
        infos.forEach(fc => {
            const [valid_, timestamp] = fc.get_value_update();
            let timeStr = Util.formatTime(new Date(timestamp * 1000), {
                timeOnly: true
            });
            const [, tempValue] = fc.get_value_temp(imports.gi.GWeather.TemperatureUnit.DEFAULT);
            const tempPrefix = tempValue >= 0 ? ' ' : '';

            let time = new St.Label({
                text: timeStr,
                x_align: Clutter.ActorAlign.CENTER,
            });
            time.style = "font-size: 0.8em;"
            let icon = new St.Icon({
                style_class: 'weather-forecast-icon',
                icon_name: fc.get_symbolic_icon_name(),
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            let temp = new St.Label({
                text: '%s%.0f°'.format(tempPrefix, tempValue),
                x_align: Clutter.ActorAlign.CENTER,
            });

            temp.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;
            time.clutter_text.ellipsize = imports.gi.Pango.EllipsizeMode.NONE;

            layout.attach(time, col, 0, 1, 1);
            layout.attach(icon, col, 1, 1, 1);
            layout.attach(temp, col, 2, 1, 1);
            col++;
        });
    }

    _setStatusLabel(text) {
        let layout = this._forecastGrid.layout_manager;
        let label = new St.Label({ text });
        layout.attach(label, 0, 0, 1, 1);
    }

    _updateForecasts() {
        this._forecastGrid.destroy_all_children();

        if (!this._weatherClient.hasLocation) {
            this._setStatusLabel(_("Select a location…"));
            return;
        }

        let info = this._weatherClient.info;
        let loc = info.get_location();
        if (loc.get_level() !== imports.gi.GWeather.LocationLevel.CITY && loc.has_coords()) {
            let world = imports.gi.GWeather.Location.get_world();
            loc = world.find_nearest_city(...loc.get_coords());
        }
        this._titleLocation.text = loc.get_name();

        if (this._weatherClient.loading) {
            this._setStatusLabel(_("Loading…"));
            return;
        }

        if (info.is_valid()) {
            this._addForecasts();
            return;
        }

        if (info.network_error())
            this._setStatusLabel(_("Go online for weather information"));
        else
            this._setStatusLabel(_("Weather information is currently unavailable"));
    }

    _sync() {
        this.visible = this._weatherClient.available;

        if (!this.visible)
            return;

        this._titleLocation.visible = this._weatherClient.hasLocation;

        this._updateForecasts();
    }
});

function _isToday(date) {
    let now = new Date();
    return now.getYear() == date.getYear() &&
           now.getMonth() == date.getMonth() &&
           now.getDate() == date.getDate();
}
