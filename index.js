'use strict';
var Parser = require('./parser.js');
var Dumper = require('./dumper.js');
var _ = require('lodash');

var run = function(config, destFolder, blockName1, dryRun) {
    Dumper.setConfig(config);
    //dump squema for the selected databases

    Dumper.dumpDatabase(config.database, destFolder, dryRun);

    //dump selected tables in the database

    var refs = config.refs;
    Parser.setRefs(refs);
    _.map(config.blocks, function(block, blockName) {
        if (blockName1 && blockName != blockName1) {
            console.log( blockName1, blockName ,' skipping');
            return;
        }

        Parser.setTables(block.tables);
        _.map(block.tables, function(table, tableName) {
                Parser.parse(table.where).then(function(where) {
                    Dumper.dump(tableName, where, destFolder, dryRun);
                });
        });
    });
};

exports.run = run;

