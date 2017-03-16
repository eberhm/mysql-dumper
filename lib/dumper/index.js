'use strict';
let Parser = require('../parser');
let Queue = require('./queue.js').Queue;
let proc = require('child_process');
let _ = require('lodash');
let q = require('q');
let dumper, config = {};

const DEFAULT_PORT = 3306;

function dumpDatabase(destFolder, dryRun) {
    console.log('Dumping database schema...', config.database, 'in ', destFolder);
    let command = `mysqldump -u${config.user} -p${config.passwd}` +
        ` -h ${config.host} -P ${config.port || DEFAULT_PORT} --opt -c -e ${config.database}` +
        ` --no-data --routines > ${destFolder + config.database}.schema.sql`;

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
    let deferred = q.defer();
    let block = config.blocks[blockName];

    Parser.setContext(blockName);

    let tablesParsed = _.map(block.tables, function(table, tableName) {
        return Parser.parse(table.where, blockName).then(function(where) {
            return dumper.queue(tableName, blockName, where, destFolder, dryRun);
        });
    });

    q.all(tablesParsed).then(deferred.resolve).fail(deferred.reject);

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
