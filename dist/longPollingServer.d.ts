import * as http from 'http';
export interface ILongPollingConnection {
    onMessage: (connection: ILongPollingConnection, message: string, data: any) => void;
    onClose: (connection: ILongPollingConnection) => void;
    userAgent: string;
    send(message: string, data: any): void;
    close(): void;
}
export declare class Connection implements ILongPollingConnection {
    onMessage: (connection: ILongPollingConnection, message: string, data: any) => void;
    onClose: (connection: ILongPollingConnection) => void;
    userAgent: string;
    owner: LongPollingServer;
    id: string;
    closed: boolean;
    response: http.ServerResponse;
    timeOut: NodeJS.Timer;
    toSend: {
        m: string;
        d: any;
    }[];
    constructor(owner: LongPollingServer);
    reTimeout(): void;
    handleTimeOut(that: Connection): void;
    send(message: string, data: any): void;
    receivedMessage(message: string, data: any): void;
    close(): void;
    sendResponse(that: Connection): void;
    pollResponse(response: http.ServerResponse, waitAllowed: boolean): void;
    closeResponse(response: http.ServerResponse): void;
}
export declare class LongPollingServer {
    onConnect: (connection: ILongPollingConnection) => void;
    cs: {
        [id: string]: Connection;
    };
    constructor(onConnect: (connection: ILongPollingConnection) => void);
    handle(request: http.ServerRequest, response: http.ServerResponse): void;
}
