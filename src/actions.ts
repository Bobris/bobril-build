import * as pluginsLoader from "./pluginsLoader";

export interface IAction {
    type: string;
    id: string;
}

export interface IActionCommand extends IAction {
    type: "command";
    enabled: boolean;
    name: string;
}

export interface IActionCombo extends IAction {
    type: "combo";
    label: string;
    selected: string;
    options: { id: string, name: string }[];
}

export interface IActionsRegistry {
    registerAction(action: IAction);
    registerCommand(id: string, name: string, enabled?: boolean);
    registerCombo(label: string, selected: string, options: { id: string, name: string }[]);
    option(id: string, name: string);
}

export interface IActionsList extends IActionsRegistry {
    getList(): IAction[];
    removeAllActions();
    invokeAction(id: string): Promise<any[]>;
    refreshCallBack: () => void;
}

class ActionsList implements IActionsRegistry, IActionsList {
    list: IAction[] = [];
    id2Action: { [id: string]: IAction } = Object.create(null);
    refreshCallBack: () => void;

    registerAction(action: IAction) {
        let existing = this.id2Action[action.id];
        if (existing) {
            this.list.splice(this.list.indexOf(existing), 1);
        }
        this.list.push(action);
        this.id2Action[action.id] = action;
    }

    registerCommand(id: string, name: string, enabled = true) {
        this.registerAction(<IActionCommand>{ type: "command", id, name, enabled });
    }

    registerCombo(label: string, selected: string, options: { id: string, name: string }[]) {
        this.registerAction(<IActionCombo>{ type: "combo", id: label, label, selected, options });
    }

    option(id: string, name: string) {
        return { id, name };
    }

    getList(): IAction[] {
        return this.list;
    }

    removeAllActions() {
        this.list = [];
        this.id2Action = Object.create(null);
    }

    invokeAction(id: string): Promise<any[]> {
        return Promise.all(pluginsLoader.pluginsLoader.executeEntryMethod(pluginsLoader.EntryMethodType.invokeAction, id));
    }
}

let invalidateRunning = false;
export function invalidateActions() {
    if (invalidateRunning) return;
    invalidateRunning = true;
    setTimeout(() => {
        actionList.removeAllActions();
        pluginsLoader.pluginsLoader.executeEntryMethod(pluginsLoader.EntryMethodType.registerActions, actionList);
        let cb = actionList.refreshCallBack;
        if (cb) cb();
        invalidateRunning = false;
    }, 10);
}

export const actionList: IActionsList = new ActionsList();
