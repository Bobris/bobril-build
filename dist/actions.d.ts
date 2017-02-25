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
    options: {
        id: string;
        name: string;
    }[];
}
export interface IActionsRegistry {
    registerAction(action: IAction): any;
    registerCommand(id: string, name: string, enabled?: boolean): any;
    registerCombo(label: string, selected: string, options: {
        id: string;
        name: string;
    }[]): any;
    option(id: string, name: string): any;
}
export interface IActionsList extends IActionsRegistry {
    getList(): IAction[];
    removeAllActions(): any;
    invokeAction(id: string): Promise<any[]>;
    refreshCallBack: () => void;
}
export declare function invalidateActions(): void;
export declare const actionList: IActionsList;
