import * as bb from './index';
import * as http from 'http';
import * as chalk from 'chalk';

let server: http.Server = null;
var memoryFs: { [name: string]: Buffer };

function handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
    if (request.url==="/status") {
        console.log(chalk.blue("Faking itself as React Native Packager"));
        response.end('packager-status:running');
        return;
    }
    if (/^\/index.android.bundle\?/.test(request.url)) {
        response.end(memoryFs["bundle.js"]);
        return;
    }
    console.log('RNReq ' + request.url);
    response.statusCode = 404;
    response.end('Not found');
}

export function startReactNativeHttpServer(aMemoryFs:{ [name: string]: Buffer }) {
    memoryFs = aMemoryFs;
    server = http.createServer(handleRequest);
    server.on("listening", function () {
        console.log("React Native Server listening on: " + chalk.cyan(" http://localhost:" + server.address().port));
    });
    server.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            setTimeout(function () {
                server.close();
                server.listen({ port: 0, exclusive: true });
            }, 10);
        }
    });
    server.listen({ port: 8081, exclusive: true });
}
