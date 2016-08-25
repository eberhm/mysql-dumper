'use strict';
var Parser = require('../parser');
var Queue = require('./queue.js').Queue;
var proc = require('child_process');
var _ = require('lodash');
var q = require('q');
var dumper, config = {};

function dumpDatabase(destFolder, dryRun) {
    console.log('Dumping database schema...', config.database, 'in ', destFolder);
    var command = `mysqldump -u${config.user} -p${config.passwd}` +
        ` -h ${config.host} --opt -c -e ${config.database}`+
        ` --no-data > ${destFolder}${config.database}.schema.sql`;

    if (dryRun) {
        console.log(command);
    } else {
        proc.exec(
            command,
            function (error, stdout, stderr) {
                if (error) console.error(error);
                console.log('Done dumping database ', config.database);
            }
        );
    }
}

function dumpBlock(blockName, destFolder, dryRun) {
    var deferred = q.defer();
    var block = config.blocks[blockName];

    Parser.setContext(blockName);

    var tablesParsed = _.map(block.tables, function(table, tableName) {
        return Parser.parse(table.where, blockName).then(function(where) {
            dumper.queue(tableName, blockName, where, destFolder, dryRun);
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

    dumper = new Queue(config);
};

exports.dumpDatabase = dumpDatabase;
exports.dumpBlock = dumpBlock;
