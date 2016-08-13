import * as b from 'bobril';
import * as s from './state';
import * as longPollingClient from './longPollingClient';

let c = new longPollingClient.Connection('/bb/api/main');

export function reconnect() {
    s.disconnected = false;
    c.connect();
    b.invalidate();
}

c.onClose = () => {
    s.connected = false;
    s.disconnected = true;
    b.invalidate();
    if (s.reconnectDelay < 30000) s.reconnectDelay += 1000;
    setTimeout(() => {
        reconnect();
    }, s.reconnectDelay);
};

c.onMessage = (c: longPollingClient.Connection, message: string, data: any) => {
    if (!s.connected) {
        s.connected = true;
        b.invalidate();
    }
    switch (message) {
        case "testUpdated": {
            s.testSvrState = data;
            b.invalidate();
            break;
        }
        case "compilationStarted": {
            s.building = true;
            b.invalidate();
            break;
        }
        case "compilationFinished": {
            s.building = false;
            s.lastBuildResult = data;
            b.invalidate();
            break;
        }
        case "focusPlace": {
            // ignore because this is not editor
            break;
        }
        case "actionsRefresh": {
            s.actions = data;
            b.invalidate();
        }
        default: {
            console.log("Unknown message: " + message, data);
            break;
        }
    }
};

export function focusPlace(fn: string, pos: number[]) {
    c.send("focusPlace", { fn, pos });
}

export function runAction(id: string) {
    c.send("runAction", { id });
}
