'use strict';
var Dumper = require('./dumper.js');
var _ = require('lodash');

var run = function(config, destFolder, blockFilter, dryRun) {
    Dumper.setConfig(config);
    Dumper.dumpDatabase(destFolder, dryRun);

    _.map(config.blocks, function(block, blockName) {
        if (blockFilter && blockName != blockFilter) {
            console.log( blockFilter, blockName ,' skipping');
            return;
        }

        Dumper.dumpBlock(blockName, destFolder, dryRun);
    });
};

exports.run = run;

