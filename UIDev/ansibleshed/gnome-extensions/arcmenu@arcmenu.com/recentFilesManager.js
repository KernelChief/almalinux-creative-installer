const { Gtk, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const LogEnabled = false;

var isCanceled = false;
var currentQueries = [];

var RecentFilesManager = class Arc_Menu_RecentFilesManager {
    constructor() {
        this._settings = ExtensionUtils.getSettings();
        this._recentManager = new Gtk.RecentManager();
    }

    filterRecentFiles(callback){
        isCanceled = false;
        this._recentManager.get_items().sort((a, b) => b.get_modified() - a.get_modified())
        .forEach(item => {
            this.queryFileExists(item)
            .then(validFile => {
                this.debugLog("Valid file - " + validFile.get_display_name());
                if(!isCanceled)
                    callback(validFile);
            })
            .catch(err =>{
                this.debugLog(err);
            });
        });
    }
    
    queryFileExists(item) {
        return new Promise((resolve, reject) => {
            let file = Gio.File.new_for_uri(item.get_uri());
            let cancellable = new Gio.Cancellable();
    
            if(file === null)
                reject("Recent file is null. Rejected.");
    
            //Create and store queryInfo to cancel any active queries when needed
            let queryInfo = { 
                timeOutID: null, 
                cancellable, 
                reject,
                item
            };
    
            currentQueries.push(queryInfo);
    
            file.query_info_async('standard::type,standard::is-hidden', 0, 0, cancellable, (source, res) => {
                try {
                    let fileInfo = source.query_info_finish(res);
                    this.removeQueryInfoFromList(queryInfo);
                    if (fileInfo) {
                        let isHidden = fileInfo.get_attribute_boolean("standard::is-hidden");
                        let showHidden = this._settings.get_boolean('show-hidden-recent-files');
                        if(isHidden && !showHidden)
                            reject(item.get_display_name() + " is hidden. Rejected.")
                        resolve(item);
                    }
                }
                catch (err) {
                    if (err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        this.debugLog("Cancel Called: " + item.get_display_name());
    
                    this.removeQueryInfoFromList(queryInfo);
                    reject(err);
                }
            });
        });
    }
    
    removeQueryInfoFromList(queryInfo){
        let queryIndex = currentQueries.indexOf(queryInfo);
        if(queryIndex !== -1)
            currentQueries.splice(queryIndex, 1);
    }
    
    cancelCurrentQueries(){
        if(currentQueries.length === 0)
            return;
        isCanceled = true;
        this.debugLog("Canceling " + currentQueries.length + " queries...")
        for(let queryInfo of currentQueries){
            this.debugLog("Cancel query - " + queryInfo.item.get_display_name());
            queryInfo.cancellable.cancel();
            queryInfo.cancellable = null;
            queryInfo.reject("Query Canceled");
        }
        currentQueries = null;
        currentQueries = [];
        this.debugLog("Cancel Finished");
    }
    
    debugLog(message){
        if (!LogEnabled)
            return;
        else log(message);
    }

    getRecentManager(){
        return this._recentManager;
    }

    destroy(){
        this.cancelCurrentQueries();
        this._settings = null;
        this._recentManager = null;
    }
}

