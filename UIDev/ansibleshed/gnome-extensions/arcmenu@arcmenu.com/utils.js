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
const Constants = Me.imports.constants;
const {Gio, GLib} = imports.gi;

const PowerManagerInterface = `<node>
  <interface name="org.freedesktop.login1.Manager">
    <method name="HybridSleep">
      <arg type="b" direction="in"/>
    </method>
    <method name="CanHybridSleep">
      <arg type="s" direction="out"/>
    </method>
    <method name="Hibernate">
      <arg type="b" direction="in"/>
    </method>
    <method name="CanHibernate">
      <arg type="s" direction="out"/>
    </method>
  </interface>
</node>`;
const PowerManager = Gio.DBusProxy.makeProxyWrapper(PowerManagerInterface);

function canHibernate(asyncCallback){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHibernateRemote((result, error) => {
        if(error)
            asyncCallback(false, false);
        else{
            let needsAuth = result[0] === 'challenge';
            let canHibernate = needsAuth || result[0] === 'yes';
            asyncCallback(canHibernate, needsAuth);
        }
    });
}

function activateHibernate(){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHibernateRemote((result, error) => {
        if(error || result[0] !== 'yes')
            imports.ui.main.notifyError(_("ArcMenu - Hibernate Error!"), _("System unable to hibernate."));
        else{
            proxy.HibernateRemote(true);
        }
    });
}

function canHybridSleep(asyncCallback){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHybridSleepRemote((result, error) => {
        if(error)
            asyncCallback(false, false);
        else{
            let needsAuth = result[0] === 'challenge';
            let canHybridSleep = needsAuth || result[0] === 'yes';
            asyncCallback(canHybridSleep, needsAuth);
        }
    });
}

function activateHybridSleep(){
    let proxy = new PowerManager(Gio.DBus.system, 'org.freedesktop.login1', '/org/freedesktop/login1');
    proxy.CanHybridSleepRemote((result, error) => {
        if(error || result[0] !== 'yes')
            imports.ui.main.notifyError(_("ArcMenu - Hybrid Sleep Error!"), _("System unable to hybrid sleep."));
        else{
            proxy.HybridSleepRemote(true);
        }
    });
}

function getMenuLayout(menuButton, layout, isStandaloneRunner){
    let MenuLayout = Me.imports.menulayouts;
    switch(layout){
        case Constants.MenuLayout.ARCMENU:
            return new MenuLayout.arcmenu.createMenu(menuButton);
        case Constants.MenuLayout.BRISK:
            return new MenuLayout.brisk.createMenu(menuButton); 
        case Constants.MenuLayout.WHISKER:
            return new MenuLayout.whisker.createMenu(menuButton); 
        case Constants.MenuLayout.GNOME_MENU:
            return new MenuLayout.gnomemenu.createMenu(menuButton); 
        case Constants.MenuLayout.MINT:
            return new MenuLayout.mint.createMenu(menuButton); 
        case Constants.MenuLayout.GNOME_OVERVIEW:
            return null;
        case Constants.MenuLayout.ELEMENTARY:
            return new MenuLayout.elementary.createMenu(menuButton); 
        case Constants.MenuLayout.REDMOND:
            return new MenuLayout.redmond.createMenu(menuButton); 
        case Constants.MenuLayout.SIMPLE:
            return new MenuLayout.simple.createMenu(menuButton);  
        case Constants.MenuLayout.SIMPLE_2:
            return new MenuLayout.simple2.createMenu(menuButton);  
        case Constants.MenuLayout.UNITY:
            return new MenuLayout.unity.createMenu(menuButton); 
        case Constants.MenuLayout.BUDGIE:
            return new MenuLayout.budgie.createMenu(menuButton);
        case Constants.MenuLayout.INSIDER:
            return new MenuLayout.insider.createMenu(menuButton);
        case Constants.MenuLayout.RUNNER:
            return new MenuLayout.runner.createMenu(menuButton, isStandaloneRunner);
        case Constants.MenuLayout.CHROMEBOOK:
            return new MenuLayout.chromebook.createMenu(menuButton);
        case Constants.MenuLayout.RAVEN:
            return new MenuLayout.raven.createMenu(menuButton);
        case Constants.MenuLayout.TOGNEE:
            return new MenuLayout.tognee.createMenu(menuButton);
        case Constants.MenuLayout.PLASMA:
            return new MenuLayout.plasma.createMenu(menuButton);
        case Constants.MenuLayout.WINDOWS:
            return new MenuLayout.windows.createMenu(menuButton);
        case Constants.MenuLayout.LAUNCHER:
            return new MenuLayout.launcher.createMenu(menuButton);
        case Constants.MenuLayout.ELEVEN:
            return new MenuLayout.eleven.createMenu(menuButton);
        case Constants.MenuLayout.AZ:
            return new MenuLayout.az.createMenu(menuButton);
        default:
            return new MenuLayout.arcmenu.createMenu(menuButton);    
    }
}

function getSettings(schema, extensionUUID) {
    let extension = imports.ui.main.extensionManager.lookup(extensionUUID);
  
    if (!extension)
        throw new Error('ArcMenu - getSettings() unable to find extension');

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // Expect USER extensions to have a schemas/ subfolder, otherwise assume a
    // SYSTEM extension that has been installed in the same prefix as the shell
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                GioSSS.get_default(),
                                                false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error(`Schema ${schema} could not be found for extension ${extension.metadata.uuid}. Please check your installation`);

    return new Gio.Settings({ settings_schema: schemaObj });
}

function convertToGridLayout(item){
    const Clutter = imports.gi.Clutter;
    const settings = item._settings;
    const layoutProperties = item._menuLayout.layoutProperties;

    let icon = item._icon ? item._icon : item._iconBin;

    item.vertical = true;
    if(item._ornamentLabel)
        item.remove_child(item._ornamentLabel);

    item.tooltipLocation = Constants.TooltipLocation.BOTTOM_CENTERED;
    item.label.x_align = item.label.y_align = Clutter.ActorAlign.CENTER;
    item.label.y_expand = true;

    icon.y_align = Clutter.ActorAlign.CENTER;
    icon.y_expand = true;
    if(settings.get_boolean('multi-lined-labels')){
        icon.y_align = Clutter.ActorAlign.TOP;
        icon.y_expand = false;

        let clutterText = item.label.get_clutter_text();
        clutterText.set({
            line_wrap: true,
            line_wrap_mode: imports.gi.Pango.WrapMode.WORD_CHAR,
        });
    }

    if(item._indicator){
        item.remove_child(item._indicator);
        item.insert_child_at_index(item._indicator, 0);
        item._indicator.x_align = Clutter.ActorAlign.CENTER;
        item._indicator.y_align = Clutter.ActorAlign.START;
        item._indicator.y_expand = false;
    }

    const iconSizeEnum = settings.get_enum('menu-item-grid-icon-size');
    let defaultIconStyle = layoutProperties.DefaultIconGridStyle;      

    iconSize = getGridIconStyle(iconSizeEnum, defaultIconStyle);
    item.name = iconSize;
}

function getIconSize(iconSizeEnum, defaultIconSize){
    const IconSizeEnum = iconSizeEnum;
    let iconSize = defaultIconSize;
    if(IconSizeEnum === Constants.IconSize.DEFAULT)
        iconSize = defaultIconSize;
    else if(IconSizeEnum === Constants.IconSize.EXTRA_SMALL)
        iconSize = Constants.EXTRA_SMALL_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.SMALL)
        iconSize = Constants.SMALL_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.MEDIUM)
        iconSize = Constants.MEDIUM_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.LARGE)
        iconSize = Constants.LARGE_ICON_SIZE;
    else if(IconSizeEnum === Constants.IconSize.EXTRA_LARGE)
        iconSize = Constants.EXTRA_LARGE_ICON_SIZE;

    return iconSize;
}

function getGridIconSize(iconSizeEnum, defaultIconStyle){
    let iconSize;
    if(iconSizeEnum === Constants.GridIconSize.DEFAULT){
        Constants.GridIconInfo.forEach((info) => {
            if(info.NAME === defaultIconStyle){
                iconSize = info.ICON_SIZE;
            }
        });
    }
    else
        iconSize = Constants.GridIconInfo[iconSizeEnum - 1].ICON_SIZE;
    
    return iconSize;
}

function getGridIconStyle(iconSizeEnum, defaultIconStyle){
    const IconSizeEnum = iconSizeEnum;
    let iconStyle = defaultIconStyle;
    if(IconSizeEnum === Constants.GridIconSize.DEFAULT)
        iconStyle = defaultIconStyle;
    else if(IconSizeEnum === Constants.GridIconSize.SMALL)
        iconStyle = 'SmallIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.MEDIUM)
        iconStyle = 'MediumIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.LARGE)
        iconStyle = 'LargeIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.SMALL_RECT)
        iconStyle = 'SmallRectIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.MEDIUM_RECT)
        iconStyle = 'MediumRectIconGrid';
    else if(IconSizeEnum === Constants.GridIconSize.LARGE_RECT)
        iconStyle = 'LargeRectIconGrid';

    return iconStyle;
}

function getCategoryDetails(currentCategory, categoryIconType){
    let name, gicon, iconName, fallbackIconName;
    for(let entry of Constants.Categories){
        if(entry.CATEGORY === currentCategory){
            name = entry.NAME;
            if(categoryIconType === Constants.CategoryIconType.FULL_COLOR)
                iconName = entry.FULL_COLOR_ICON;
            else
                iconName = entry.ICON;
            return [name, gicon, iconName, fallbackIconName];
        }
    }
    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        name = _("Home Screen");  
        gicon = Gio.icon_new_for_string(Me.path + '/media/icons/menu_icons/homescreen-symbolic.svg');
        return [name, gicon, iconName, fallbackIconName];
    }
    else{
        name = currentCategory.get_name();
        if(categoryIconType === Constants.CategoryIconType.FULL_COLOR)
            gicon = currentCategory.get_icon() ? currentCategory.get_icon() : null;
        else
            iconName = currentCategory.get_icon().to_string() + "-symbolic";
        fallbackIconName = currentCategory.get_icon() ? currentCategory.get_icon().to_string() : null;
        return [name, gicon, iconName, fallbackIconName];
    }
}

function activateCategory(currentCategory, menuLayout, menuItem, extraParams = false){
    if(currentCategory === Constants.CategoryType.HOME_SCREEN){
        menuLayout.activeCategory = _("Pinned Apps");
        menuLayout.displayPinnedApps();
    }
    else if(currentCategory === Constants.CategoryType.PINNED_APPS)
        menuLayout.displayPinnedApps();
    else if(currentCategory === Constants.CategoryType.FREQUENT_APPS){
        menuLayout.setFrequentAppsList(menuItem);
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);
    }
    else if(currentCategory === Constants.CategoryType.ALL_PROGRAMS)
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);
    else if(currentCategory === Constants.CategoryType.RECENT_FILES)
        menuLayout.displayRecentFiles();
    else
        menuLayout.displayCategoryAppList(menuItem.appList, currentCategory, extraParams ? menuItem : null);          

    menuLayout.activeCategoryType = currentCategory;  
}

function getMenuButtonIcon(settings, path){
    let iconType = settings.get_enum('menu-button-icon');

    if(iconType === Constants.MenuIcon.CUSTOM){
        if(path && GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }
    else if(iconType === Constants.MenuIcon.DISTRO_ICON){
        let iconEnum = settings.get_int('distro-icon');
        path = Me.path + Constants.DistroIcons[iconEnum].PATH;
        if(Constants.DistroIcons[iconEnum].PATH === 'start-here-symbolic')
            return 'start-here-symbolic';
        else if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;   
    }
    else{
        let iconEnum = settings.get_int('arc-menu-icon');
        path = Me.path + Constants.MenuIcons[iconEnum].PATH;
        if(GLib.file_test(path, GLib.FileTest.IS_REGULAR))
            return path;
    }

    global.log("ArcMenu Error - Failed to set menu button icon. Set to System Default.");
    return 'start-here-symbolic';
}

function findSoftwareManager(){
    let softwareManager = null;
    let appSys = imports.gi.Shell.AppSystem.get_default();

    for(let softwareManagerID of Constants.SoftwareManagerIDs){
        if(appSys.lookup_app(softwareManagerID)){
            softwareManager = softwareManagerID;
            break;
        }
    }

    return softwareManager;
}

function createXpmImage(color1, color2, color3, color4){
    let width = 42;
    let height = 14;
    let colors = 5;
    let xpm = [width + " " + height + " " + colors + " " + 1, "1 c " + rgbStringToHex(color1), "2 c " + rgbStringToHex(color2), 
                "3 c " + rgbStringToHex(color3), "4 c " + rgbStringToHex(color4), "x c #AAAAAA"];
    xpm.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    for(let i = 0; i < height - 2; i++)
        xpm.push("x1111111111222222222233333333334444444444x");
    xpm.push("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    return xpm;
}

function areaOfTriangle(p1, p2, p3){
    return Math.abs((p1[0] * (p2[1] - p3[1]) + p2[0] * (p3[1] - p1[1]) + p3[0] * (p1[1] - p2[1])) / 2.0);
}

function ensureActorVisibleInScrollView(actor) {
    let box = actor.get_allocation_box();
    let y1 = box.y1, y2 = box.y2;
    
    let parent = actor.get_parent();
    while (!(parent instanceof imports.gi.St.ScrollView)) {
        if (!parent)
            return;

        box = parent.get_allocation_box();
        y1 += box.y1;
        y2 += box.y1;
        parent = parent.get_parent();    
    }

    let adjustment = parent.vscroll.adjustment;
    let [value, lower_, upper, stepIncrement_, pageIncrement_, pageSize] = adjustment.get_values();

    let offset = 0;
    let vfade = parent.get_effect("fade");
    if (vfade)
        offset = vfade.fade_margins.top;

    if (y1 < value + offset)
        value = Math.max(0, y1 - offset);
    else if (y2 > value + pageSize - offset)
        value = Math.min(upper, y2 + offset - pageSize);
    else
        return;
    adjustment.set_value(value);  
}

function getArraysEqual(a, b) {
    if(a instanceof Array && b instanceof Array){
        if (a.length !== b.length)
            return false;
        for(let i = 0; i < a.length; i++)
            if (!getArraysEqual(a[i], b[i]))
                return false;
        return true;
    } 
    else
        return a === b;
}

function createTooltip(button, widget, titleLabel, description, displayType){
    let lbl = titleLabel.clutter_text;
    lbl.get_allocation_box();
    let isEllipsized = lbl.get_layout().is_ellipsized();
    if(displayType !== Constants.DisplayType.BUTTON && (isEllipsized || description)){
        let titleText, descriptionText;
        if(isEllipsized && description){
            titleText = titleLabel.text.replace(/\n/g, " ");
            descriptionText = description;
        }
        else if(isEllipsized && !description)
            titleText = titleLabel.text.replace(/\n/g, " ");
        else if(!isEllipsized && description)
            descriptionText = description;
        widget.tooltip = new Me.imports.menuWidgets.Tooltip(button, widget.actor, titleText, descriptionText);
        widget.tooltip._onHover();
    }
    else if(displayType === Constants.DisplayType.BUTTON){
        let titleText = titleLabel.text.replace(/\n/g, " ");
        widget.tooltip = new Me.imports.menuWidgets.Tooltip(button, widget.actor, titleText, null);
        widget.tooltip.location = Constants.TooltipLocation.TOP_CENTERED;
        widget.tooltip._onHover();
    }
}

function getDashToPanelPosition(settings, index){
    var positions = null;
    var side;

    try{
        positions = JSON.parse(settings.get_string('panel-positions'))
    } catch(e){
        log('Error parsing Dash to Panel positions: ' + e.message);
    }
    
    if(!positions)
        side = settings.get_string('panel-position');
    else{
        side = positions[index];
    }

    if (side === 'TOP') 
        return imports.gi.St.Side.TOP;
    else if (side === 'RIGHT') 
        return imports.gi.St.Side.RIGHT;
    else if (side === 'BOTTOM')
        return imports.gi.St.Side.BOTTOM;
    else if (side === 'LEFT')
        return imports.gi.St.Side.LEFT;
    else
        return imports.gi.St.Side.BOTTOM;
}

function getStylesheet(){
    let stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");

    if(!stylesheet.query_exists(null)){
        GLib.spawn_command_line_sync("mkdir " + GLib.get_home_dir() + "/.local/share/arcmenu");
        GLib.spawn_command_line_sync("touch " + GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");
        stylesheet = Gio.File.new_for_path(GLib.get_home_dir() + "/.local/share/arcmenu/stylesheet.css");
    }

    return stylesheet;
}

function rgbStringToHex(colorString) {
    let [r, g, b, a_] = parseRgbString(colorString)
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function clutterColorToRGBA(color) {
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
}

function parseRgbString(colorString){
    if(colorString.includes('rgba'))
		colorString = colorString.replace('rgba(','');
	if(colorString.includes('rgb'))
		colorString = colorString.replace('rgb(','');
	colorString = colorString.replace(')','');
    let rgbaColor = colorString.split(",");

    let r = parseFloat(rgbaColor[0]);
    let g = parseFloat(rgbaColor[1]);
    let b = parseFloat(rgbaColor[2]);
	let a;
	if(rgbaColor[3] != undefined)
		a = parseFloat(rgbaColor[3]); 
	else
        a = 1;
    return [r, g, b, a];
}

function modifyColorLuminance(colorString, luminanceFactor, overrideAlpha){
    let Clutter = imports.gi.Clutter;
    let color = Clutter.color_from_string(colorString)[1];
    let [hue, lum, sat] = color.to_hls();
    let modifiedLum = lum;

    if(lum >= .85) //if lum is too light, force darken
        modifiedLum = Math.min((1 - Math.abs(luminanceFactor)) * modifiedLum, 1);
    else if(lum <= .15) //if lum is too dark, force lighten
        modifiedLum = Math.max((1 - Math.abs(luminanceFactor)) * modifiedLum, 0);
    else if(luminanceFactor >= 0) //otherwise, darken or lighten based on luminanceFactor
        modifiedLum = Math.min((1 + luminanceFactor) * modifiedLum, 1);
    else
        modifiedLum = Math.max((1 + luminanceFactor) * modifiedLum, 0);
   
    let alpha = (color.alpha / 255).toPrecision(3);
    if(overrideAlpha)
        alpha = overrideAlpha;

    let modifiedColor = Clutter.color_from_hls(hue, modifiedLum, sat);

    return `rgba(${modifiedColor.red}, ${modifiedColor.green}, ${modifiedColor.blue}, ${alpha})`
}

function createStylesheet(settings){
    let customarcMenu = settings.get_boolean('enable-custom-arc-menu');
    let separatorColor = settings.get_string('separator-color');
    let menuColor = settings.get_string('menu-color');
    let menuForegroundColor = settings.get_string('menu-foreground-color');
    let borderColor = settings.get_string('border-color');
    let highlightColor = settings.get_string('highlight-color');
    let highlightForegroundColor = settings.get_string('highlight-foreground-color');
    let fontSize = settings.get_int('menu-font-size');
    let borderSize = settings.get_int('menu-border-size');
    let cornerRadius = settings.get_int('menu-corner-radius');
    let menuMargin = settings.get_int('menu-margin');
    let menuArrowSize = settings.get_int('menu-arrow-size');
    let leftPanelWidth = settings.get_int('menu-width');
    let leftPanelWidthSmall = settings.get_int('menu-width') - 65;
    let rightPanelWidth = settings.get_int('right-panel-width');
    let rightPanelWidthPlus45 = settings.get_int('right-panel-width') + 45;
    let rightPanelWidthPlus70 = settings.get_int('right-panel-width') + 70;
    let avatarStyle =  settings.get_enum('avatar-style');
    let avatarRadius = avatarStyle == 0 ? 999 : 0;
    let menuButtonColor = settings.get_string('menu-button-color');
    let menuButtonHoverColor = settings.get_string('menu-button-hover-color');
    let menuButtonActiveColor = settings.get_string('menu-button-active-color');
    let menuButtonHoverBackgroundcolor = settings.get_string('menu-button-hover-backgroundcolor');
    let menuButtonActiveBackgroundcolor = settings.get_string('menu-button-active-backgroundcolor');
    let gapAdjustment = settings.get_int('gap-adjustment');
    let indicatorColor = settings.get_string('indicator-color');
    let indicatorTextBackgroundColor = settings.get_string('indicator-text-color');
    let plasmaSelectedItemColor = settings.get_string('plasma-selected-color');
    let plasmaSelectedItemBackgroundColor = settings.get_string('plasma-selected-background-color');
    let plasmaSearchBarTop = settings.get_enum('searchbar-default-top-location');
    let menuButtonBorderRadius = settings.get_int('menu-button-border-radius');
    let tooltipStyle, separatorColorStyle = "\n", smallButtonHoverStyle = "\n";
    let plasmaButtonStyle = plasmaSearchBarTop === Constants.SearchbarLocation.TOP ? 'border-top-width: 2px;' : 'border-bottom-width: 2px;';
    if(customarcMenu){
        tooltipStyle = ".tooltip-menu-item{\nborder-radius: 8px;\nbox-shadow: 0 0 1px 0px " + separatorColor + ";\nfont-size:" + fontSize + "pt;\npadding: 3px 8px;\nmin-height: 0px;"
                        + "\ncolor:" + menuForegroundColor+ ";\nbackground-color:" + modifyColorLuminance(menuColor, 0.05, 1) + ";\nmax-width:550px;\n}\n\n"; 
        separatorColorStyle = ".separator-color-style{\nbackground-color: " + separatorColor + ";\n}\n\n";
        smallButtonHoverStyle = ".arc-menu .popup-menu-item .arcmenu-small-button.selected{\nbackground-color: " + modifyColorLuminance(highlightColor, -0.25) + "\n}\n\n";
    }
    else
        tooltipStyle = ".tooltip-menu-item{\nborder-radius: 8px;\npadding: 3px 8px;\nmax-width:550px;\nmin-height: 0px;\n}\n\n";
    
    let menuButtonStyle = '';
    if(settings.get_boolean('override-menu-button-color'))
        menuButtonStyle += ".arc-menu-icon, .arc-menu-text, .arc-menu-arrow{\ncolor: " + menuButtonColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-hover-background-color'))
        menuButtonStyle += ".arc-menu-panel-menu:hover{\nbackground-color: " + menuButtonHoverBackgroundcolor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-hover-color'))
        menuButtonStyle += ".arc-menu-panel-menu:hover .arc-menu-icon, .arc-menu-panel-menu:hover .arc-menu-text"
                            +", .arc-menu-panel-menu:hover .arc-menu-arrow{\ncolor: " + menuButtonHoverColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-active-color'))
        menuButtonStyle += ".arc-menu-icon:active, .arc-menu-text:active, .arc-menu-arrow:active{\ncolor: " + menuButtonActiveColor + ";\n}\n\n";
    if(settings.get_boolean('override-menu-button-active-background-color'))
        menuButtonStyle += ".arc-menu-panel-menu:active{\nbackground-color: " + menuButtonActiveBackgroundcolor + ";\n}\n\n";
    if(settings.get_boolean('menu-button-override-border-radius')){
        let border = menuButtonBorderRadius === 0 ? 1 : 3;
        menuButtonStyle += ".arc-menu-panel-menu{\nborder-radius: " + menuButtonBorderRadius + "px;\nborder: " + border + "px solid transparent;\n}\n\n";
    }

    let iconGridStyle = "\ntext-align: center;\n border-radius: 8px;\n padding: 5px;\n spacing: 0px;\n margin: 0px;\n";

    let stylesheetCSS = "#arc-search{\nwidth: " + leftPanelWidth + "px;\n}\n\n"
        +".arc-menu-status-text{\ncolor:" + menuForegroundColor + ";\nfont-size:" + fontSize + "pt;\n}\n\n"                                                     
        +".search-statustext{\nfont-size:11pt;\n}\n\n"

        +"#ExtraLargeIconGrid{\nwidth: 150px;\n height: 150px;" + iconGridStyle + "}\n\n"

        +"#LargeIconGrid{\nwidth: 95px;\n height: 95px;" + iconGridStyle + "}\n\n"

        +"#MediumIconGrid{\nwidth: 87px;\n height: 87px;" + iconGridStyle + "}\n\n"

        +"#SmallIconGrid{\nwidth: 80px;\n height: 80px;" + iconGridStyle + "}\n\n"

        +"#LargeRectIconGrid{\nwidth: 95px;\n height: 85px;" + iconGridStyle + "}\n\n"

        +"#MediumRectIconGrid{\nwidth: 92px;\n height: 78px;" + iconGridStyle + "}\n\n"

        +"#SmallRectIconGrid{\nwidth: 85px;\n height: 70px;" + iconGridStyle + "}\n\n"

        +".left-panel{\nwidth:" + leftPanelWidth + "px;\n}\n\n"   
        +".left-panel-small{\nwidth:" + leftPanelWidthSmall + "px;\n}\n\n"
        +".right-panel{\nwidth:" + rightPanelWidth + "px;\n}\n\n"   
        +".right-panel-plus45{\nwidth:" + rightPanelWidthPlus45 + "px;\n}\n\n"   
        +".right-panel-plus70{\nwidth:" + rightPanelWidthPlus70 + "px;\n}\n\n"
        +".default-search-entry{\nmax-width: 17.667em;\n}\n\n"
        +".arc-search-entry{\nmax-width: 17.667em;\nfont-size:" + fontSize + "pt;\nborder-color:" + separatorColor + ";\nborder-width: 1px;\n"
                            +"color:" + menuForegroundColor + ";\nbackground-color:" + modifyColorLuminance(menuColor, -0.1, 1) + ";\n}\n\n"
        +".arc-search-entry:focus{\nborder-color:" + highlightColor + ";\nborder-width: 1px;\nbox-shadow: inset 0 0 0 1px " + modifyColorLuminance(highlightColor, 0.05) + ";\n}\n\n"
        +".arc-search-entry StLabel.hint-text{\ncolor: " + modifyColorLuminance(menuForegroundColor, 0, 0.6) + ";\n}\n\n"
        +"#ArcSearchEntry{\nmin-height: 0px;\nborder-radius: 8px;\nborder-width: 1px;\npadding: 7px 9px;\n}\n\n"
        +"#ArcSearchEntryRound{\nmin-height: 0px;\nborder-radius: 18px;\nborder-width: 1px;\npadding: 7px 12px;\n}\n\n"       
        + menuButtonStyle
        +".symbolic-icons{\n-st-icon-style: symbolic;\n}\n\n"
        +".regular-icons{\n-st-icon-style: regular;\n}\n\n"
        +".arcmenu-menu-item{\nborder-radius: 8px;\n}\n\n"     
        +".margin-box{\nmargin: 0px 4px;\n}\n\n" 
        +"#arc-menu-launcher-button{\nmax-width: 90px;\nborder-radius: 0px;\n padding: 5px;\n spacing: 0px;\n margin: 0px;\nborder-color: transparent;\nborder-bottom-width: 3px;\n}\n\n"
        +"#arc-menu-launcher-button.active-item, #arc-menu-launcher-button:active{\nbackground-color: " + plasmaSelectedItemBackgroundColor + ";\n"
            +"\nborder-color: " + plasmaSelectedItemColor + ";\nborder-bottom-width: 3px;\n}\n\n"

        +"#arc-menu-plasma-button{\nwidth: 90px;\n height: 65px;\nborder-radius: 8px;\n text-align: center;\n padding: 5px;\n spacing: 0px;\n margin: 0px;\n\n" + plasmaButtonStyle + ";\nborder-color: transparent;\n}\n\n"
        +"#arc-menu-plasma-button:active-item, .arc-menu-plasma-button:active{\nbackground-color: " + plasmaSelectedItemBackgroundColor + ";\n"
            + plasmaButtonStyle + "\nborder-color: " + plasmaSelectedItemColor + ";\n}\n\n"

        +"StScrollView .small-vfade{\n-st-vfade-offset: 44px;\n}\n\n"

        +".arc-menu-button{\n-st-icon-style: symbolic;\nborder-width: 1px;\nborder-radius: 8px;\npadding: 8px;\n}\n\n"
        +".arcmenu-small-button{\n-st-icon-style: symbolic;\nborder-radius: 8px;\npadding: 3px 8px;\n}\n\n"
        +smallButtonHoverStyle

        +".arc-menu-menu-item-indicator{\ncolor: " + indicatorColor + ";\n}\n\n"
        +".arc-menu-menu-item-text-indicator{\nbackground-color: " + indicatorTextBackgroundColor + ";\n}\n\n"

        +tooltipStyle

        +".arc-menu{\n-boxpointer-gap: " + gapAdjustment + "px;\nmin-width: 15em;\ncolor: #D3DAE3;\nborder-image: none;\n"
                        +"box-shadow: none;\nfont-size:" + fontSize + "pt;\n}\n\n"
        +".arc-menu .popup-sub-menu{\npadding-bottom: 1px;\nbackground-color: " + modifyColorLuminance(menuColor, 0.04) + ";\n}\n\n"
        +".arc-menu .popup-menu-item{\nspacing: 6px; \nborder: none;\ncolor:" + menuForegroundColor + ";\n}\n\n"
        +".arc-menu .popup-menu-item:active{\nbackground-color:" + modifyColorLuminance(highlightColor, -0.15) + "; \ncolor: " + highlightForegroundColor + ";\n}\n\n"
        +".arc-menu .popup-menu-item.selected{\nbackground-color:" + highlightColor + "; \ncolor: " + highlightForegroundColor + ";\n}\n\n"
        +".arc-menu .popup-menu-item:checked{\nbackground-color:" + highlightColor + "; \ncolor: " + highlightForegroundColor + ";\n}\n\n"
        +".arc-menu .popup-menu-item:insensitive{\ncolor:" + modifyColorLuminance(menuForegroundColor, 0, 0.6) + ";\n}\n\n"
        +".arc-menu-boxpointer{ \n-arrow-border-radius:" + cornerRadius + "px;\n"
                                +"-arrow-background-color:" + menuColor + ";\n"
                                +"-arrow-border-color:" + borderColor + ";\n"
                                +"-arrow-border-width:" + borderSize + "px;\n"
                                +"-arrow-base:" + menuMargin + "px;\n"
                                +"-arrow-rise:" + menuArrowSize + "px;\n}\n\n"
        +".arc-menu .popup-menu-content{\npadding: 16px 0px;\nmargin: 0;\nbackground-color: transparent;\nborder-radius: 0px;\nbox-shadow: 0;\n}\n\n"

        +".arcmenu-separator{\npadding: 0px;\nheight: 1px;\nmargin: 0px 20px;\n}\n\n"
        + separatorColorStyle
        +".menu-user-avatar{\nbackground-size: contain;\nborder-radius: " + avatarRadius + "px;\n}\n\n";
    
    let stylesheet = getStylesheet();
    if(stylesheet){
        try{
            stylesheet.replace_contents(stylesheetCSS, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        }
        catch(e){
            global.log("ArcMenu Error - Failed to update stylesheet. " + e.message);
        }
    }
    else
        global.log("ArcMenu Error - Failed to find stylesheet.");
}
