var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var staticServer = require('node-static');
var bobrilDepsHelpers = require('bobril-build/src/bobrilDepsHelpers');

var dist = './dist/';
var LANGUAGE_DIR = './g11n';
var DEFAULT_LOCALE = 'en-US';
var DIFF_SUFFIX = '_diff';

var helpers = {};
module.exports = helpers;

function write(filePath, content) {
  console.log('# write:', filePath);
  var outputFilePath = path.join(dist, filePath);
  mkdirp.sync(path.dirname(outputFilePath));
  fs.writeFileSync(outputFilePath, new Buffer(content));
};
helpers.write = write;

function arrayToSet(array) {
    var object = {};
    for (var i = 0; i < array.length; i++) {
        var value = array[i];
        object[value] = true;
    }
    return object;
};

function hasUniqueValues(array) {
    return Object.keys(arrayToSet(array)).length === array.length;
};

function getMessageArrayInLang(language, translationDb) {
    var messages = translationDb.getMessageArrayInLang(language);
    if (!hasUniqueValues(messages)) {
        throw new Error('Duplicate translation messages!');
    }
    return messages;
};

function getLangFileName(language) {
    return language + '.json';
}

function getLangDiffFileName(language) {
    return language + DIFF_SUFFIX + '.json';
}

function getLangFilePath(language) {
    return path.join(LANGUAGE_DIR, getLangFileName(language));
}

function getLangDiffFilePath(language) {
    return path.join(LANGUAGE_DIR, getLangDiffFileName(language));
}

function importLanguages(throwOnMissingKey, translationDb) {
    if (!fs.existsSync(LANGUAGE_DIR)) {
        if (this.doConsoleLogging) {
            console.log('No languages to import!');
        }
        return;
    }

    var messages = getMessageArrayInLang(DEFAULT_LOCALE, translationDb);
    var missingLanguages = [];
    
    var files = fs.readdirSync(LANGUAGE_DIR);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var languageFileName = path.basename(file);
        if (languageFileName.indexOf(DIFF_SUFFIX) > -1) {
            continue;
        }
        var languageName = languageFileName.substr(0, languageFileName.lastIndexOf('.'));
        if (this.doConsoleLogging) {
            console.log('Importing language \'' + languageName + '\'');
        }

        var translations = JSON.parse(fs.readFileSync(path.join(LANGUAGE_DIR, file)));
        var langDiffFilePath = getLangDiffFilePath(languageName);
        if (fs.existsSync(langDiffFilePath)) {
            var diff = JSON.parse(fs.readFileSync(langDiffFilePath));
        }
        
        var output = [];
        var missingKeys = [];
        for (var j = 0; j < messages.length; j++) {
            var key = messages[j];
            if (translations.hasOwnProperty(key)) {
                output.push(translations[key].translation);
            } else if (diff && diff.added.hasOwnProperty(key)) {
                output.push(diff.added[key].translation);
            } else {
                missingKeys.push(key);
                output.push('# ' + key);
            }
        }

        if (missingKeys.length) {
            missingLanguages.push({
                language: languageName,
                missingKeys: missingKeys
            });
        }

        if (!throwOnMissingKey || !missingLanguages.length) {
            bobrilDepsHelpers.writeTranslationFile(languageName, output, languageName + '.js', write);
        }
    }

    if (throwOnMissingKey && missingLanguages.length) {
        var errorMessage = 'Detected missing localizations!\r\n';
        for (var i = 0; i < missingLanguages.length; i++) {
            errorMessage += 'Language: ' + missingLanguages[i].language + '\r\n';
            for (var j = 0; j < missingLanguages[i].missingKeys.length; j++) {
                var missingKey = missingLanguages[i].missingKeys[j];
                errorMessage += missingKey + '\r\n';
            }
            errorMessage += '\r\n';
        }
        throw new Error(errorMessage);
    }
};
helpers.importLanguages = importLanguages;

function startWebserver(port) {
  var file = new staticServer.Server(dist, {
    cache: false
  });
  var webserver = require('http').createServer(function (request, response) {
    request.addListener('end', function () {
      file.serve(request, response);
    }).resume();
  });
  var webserverSockets = {};
  var nextWebserverSocketId = 0;
  webserver.on('connection', function (socket) {
    var socketId = nextWebserverSocketId++;
    webserverSockets[socketId] = socket;
    socket.on('close', function () {
      delete webserverSockets[socketId];
    })
  });

  webserver.on('error', function (err) {
    if (err.code == 'EADDRINUSE') {
      console.log(chalk.red('Port ' + port + ' is already in use.'));
      process.exit(1);
    }
  });

  webserver.listen(port);

  var serverUrl = 'http://localhost:' + port;
  console.log('Server started on ', serverUrl);
};
helpers.startWebserver = startWebserver;
