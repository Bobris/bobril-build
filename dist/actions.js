"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pluginsLoader = require("./pluginsLoader");
class ActionsList {
    constructor() {
        this.list = [];
        this.id2Action = Object.create(null);
    }
    registerAction(action) {
        let existing = this.id2Action[action.id];
        if (existing) {
            this.list.splice(this.list.indexOf(existing), 1);
        }
        this.list.push(action);
        this.id2Action[action.id] = action;
    }
    registerCommand(id, name, enabled = true) {
        this.registerAction({ type: "command", id, name, enabled });
    }
    registerCombo(label, selected, options) {
        this.registerAction({ type: "combo", id: label, label, selected, options });
    }
    option(id, name) {
        return { id, name };
    }
    getList() {
        return this.list;
    }
    removeAllActions() {
        this.list = [];
        this.id2Action = Object.create(null);
    }
    invokeAction(id) {
        return Promise.all(pluginsLoader.pluginsLoader.executeEntryMethod(pluginsLoader.EntryMethodType.invokeAction, id));
    }
}
let invalidateRunning = false;
function invalidateActions() {
    if (invalidateRunning)
        return;
    invalidateRunning = true;
    setTimeout(() => {
        exports.actionList.removeAllActions();
        pluginsLoader.pluginsLoader.executeEntryMethod(pluginsLoader.EntryMethodType.registerActions, exports.actionList);
        let cb = exports.actionList.refreshCallBack;
        if (cb)
            cb();
        invalidateRunning = false;
    }, 10);
}
exports.invalidateActions = invalidateActions;
exports.actionList = new ActionsList();
//# sourceMappingURL=actions.js.map