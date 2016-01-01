import * as b from 'bobril';
import * as longPollingClient from './longPollingClient';

let c = new longPollingClient.Connection('/bb/api/test');

let connected = false;
let wait = false;
let disconnected = false;
let testing = false;
let testUrl = "";
let testCounter = 0;

c.onClose = () => {
    disconnected = true;
    b.invalidate();
};

c.onMessage = (c: longPollingClient.Connection, message: string, data: any) => {
    if (!connected) {
        connected = true;
        b.invalidate();
    }
    switch (message) {
        case "wait": {
            wait = true;
            b.invalidate();
            break;
        }
        case "test": {
            testing = true;
            testUrl = data.url;
            testCounter++;
            b.invalidate();
            break;
        }
        default: {
            console.log("Unknown message: " + message, data);
            break;
        }
    }
};

c.send("newClient", {
    userAgent: navigator.userAgent
});

b.init(() => {
    if (disconnected) {
        return [{ tag: "h2", children: "Disconnected" }, { tag: "p", children: "reload to try to connect again" }];
    }
    if (!connected) {
        return [{ tag: "h2", children: "Connecting" }, { tag: "p", children: "wait ..." }];
    }
    if (wait) {
        return [{ tag: "h2", children: "Waiting" }, { tag: "p", children: "ready to receive commands" }];
    }
    if (testing) {
        return [{ tag: "h2", children: "Testing" }, { tag: "p", children: testUrl }, { key: "" + testCounter, tag: "iframe", attrs: { src: testUrl } }];
    }
});

window["bbSend"] = c.send;
