'use strict';
let Dumper = require('./dumper');
let _ = require('lodash');

let run = function(config, destFolder, blockFilter, dryRun) {
    Dumper.setConfig(config);

    if (!blockFilter) {
        Dumper.dumpDatabase(destFolder, dryRun);
    }

    _.map(config.blocks, function(block, blockName) {
        if (blockFilter && blockName != blockFilter) {
            console.log('skipping block', blockName);
            return;
        }

        console.log('dumping block', blockName);

        Dumper.dumpBlock(blockName, destFolder, dryRun);
    });
};

exports.run = run;

