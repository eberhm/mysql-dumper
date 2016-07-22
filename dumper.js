'use strict';

var exec = require('child_process').exec;

var config = {};

function puts(error, stdout, stderr) { console.log(stdout); }


function dump(tableName, where, destFolder) {
    console.log('Dumping...', tableName, 'in ', destFolder);
    var command = 'mysqldump -u' + config.user + ' -p' + config.passwd +
        ' -h ' + config.host + ' --opt -c -e ' + config.database + ' ' + tableName +
        ' --where="' + where +  '" --single-transaction > ' + destFolder + tableName + '.dump.sql';
    exec(
        command,
        puts
    );
}

function dumpDatabase(database, destFolder) {
    console.log('Dumping database schema...', database, 'in ', destFolder);
    var command = 'mysqldump -u' + config.user + ' -p' + config.passwd +
        ' -h ' + config.host + ' --opt -c -e ' + database +
        ' --no-data > ' + destFolder + database + '.db.dump.sql';
    exec(
        command,
        puts
    );
}

exports.dump = dump;
exports.dumpDatabase = dumpDatabase;
exports.setConfig = function(_config) {
    config = _config;
};
