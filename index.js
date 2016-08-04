'use strict';
var Parser = require('./parser.js');
var Dumper = require('./dumper.js');
var _ = require('lodash');

var run = function(config, destFolder, blockFilter, dryRun) {
    Dumper.setConfig(config);
    Dumper.dumpDatabase(config.database, destFolder, dryRun);

    _.filter(config.blocks, function(_, blockName) { return !blockFilter || blockName === blockFilter;})


    _.map(config.blocks, function(block, blockName) {
        if (blockFilter && blockName != blockFilter) {
            console.log( blockFilter, blockName ,' skipping');
            return;
        }

        Dumper.dumpBlock(blockName);
    });
};

exports.run = run;

