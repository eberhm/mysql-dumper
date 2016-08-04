'use strict';
var Parser = require('./parser.js');
var proc = require('child_process');
var _ = require('lodash');
var q = require('q');

var config = {};

function dump(tableName, where, destFolder, dryRun) {
    console.log('Dumping...', tableName, ' in ', destFolder);
    var command = 'mysqldump -u' + config.user + ' -p' + config.passwd +
        ' -h ' + config.host + ' --opt -c -e ' + config.database + ' ' + tableName +
        ' --where="' + where +  '" -t --single-transaction > ' + destFolder + tableName + '.dump.sql';

    if (dryRun) {
        console.log(command);
    } else {
        proc.exec(
            command,
            function (error, stdout, stderr) {
                console.log('Done dumping...', tableName, ' in ', destFolder);
            }
        );
    }
}

function dumpDatabase(destFolder, dryRun) {
    console.log('Dumping database schema...', config.database, 'in ', destFolder);
    var command = 'mysqldump -u' + config.user + ' -p' + config.passwd +
        ' -h ' + config.host + ' --opt -c -e ' + config.database +
        ' --no-data > ' + destFolder + config.database + '.db.dump.sql';

    if (dryRun) {
        console.log(command);
    } else {
        proc.exec(
            command,
            function (error, stdout, stderr) {
                console.log('Done dumping database ', config.database);
            }
        );
    }
}

function dumpBlock(blockName, destFolder, dryRun) {
    var deferred = q.defer();
    var block = config.blocks[blockName];

    Parser.setTables(block.tables);

    var tablesParsed = _.map(block.tables, function(table, tableName) {
        return Parser.parse(table.where).then(function(where) {
            dump(tableName, where, destFolder, dryRun);
            return where;
        });
    });

    q.all(tablesParsed).then(deferred.resolve);

    return deferred.promise;
}

exports.setConfig = function(_config) {
    config = _config;
    Parser.setRefs(config.refs);
    _.map(config.blocks, function(block, blockName) {
        Parser.setTables(block.tables, blockName);
    });
};

exports.dumpDatabase = dumpDatabase;
exports.dumpBlock = dumpBlock;
