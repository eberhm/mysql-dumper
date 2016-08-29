'use strict';
var q = require('q');
var proc = require('child_process');
var _ = require('lodash');
var MAX_ATTEMPTS = 5;
var DEFAULT_MAX_CONCURRENT = 200;


function Queue(config) {
        this._config = config;
        this._running = 0;
        this._queue = [];
}

Queue.prototype.queue = function() {
    this._queue.push(arguments);
    return this.runNext();
};

Queue.prototype.runNext = function() {
    var deferred = q.defer(), self = this;

    if (this._running >= (this._config.concurrent || DEFAULT_MAX_CONCURRENT)) {
        return;
    }

    var args = this._queue.shift();
    if (args) {
        this._running++;
        dump.apply(null, _.concat([this._config], args)).then(function(res) {
            self._running--;
            deferred.resolve(res);
            return self.runNext();
        });
    }

    return deferred.promise;
};

function dump(config, tableName, blockName, where, destFolder, dryRun) {
    var deferred = q.defer();
    var command = 'mysqldump -u' + config.user + ' -p' + config.passwd + ' -h ' + config.host +
        ' --opt -c -e ' + config.database + ' ' + tableName + ' --where="' + where + '"'+
        ' -t --single-transaction > ' + destFolder + blockName + '.' + tableName + '.data.sql';
    if (dryRun) {
        console.log(command);
        deferred.resolve(command);
    } else {
        var retry = function(attempt, command) {
            var exec = function() {
                if (attempt > MAX_ATTEMPTS) {
                    console.error('maxAttemps reached. ABORTING', tableName, blockName);
                    deferred.reject(new Error(where));
                    return;
                }

                proc.exec(command,
                    function (error, stdout, stderr) {
                        if (error) {
                            if (error.code === 'EAGAIN') {
                                retry(attempt, command);
                            } else {
                                retry(++attempt, command);
                            }
                        } else {
                            deferred.resolve(where);
                        }
                    });
            };

            if (attempt === 1) {
                exec();
            } else {
                setTimeout(exec(), 5000);
            }
        };


        retry(1, command);
    }

    return deferred.promise;
}

exports.Queue = Queue;