'use strict';
const q = require('q');
const proc = require('child_process');
const _ = require('lodash');
const MAX_ATTEMPTS = 5;


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
    let deferred = q.defer(), self = this;

    if (this._running >= (this._config.concurrent)) {
        return;
    }

    let args = this._queue.shift();
    if (args) {
        this._running++;
        dump.apply(null, _.concat([this._config], args)).then(function(res) {
            self._running--;
            deferred.resolve(res);
            return self.runNext();
        }).fail(function(res) {
            self._running--;
            deferred.reject(res);
            return self.runNext();
        });
    }

    return deferred.promise;
};

function dump(config, tableName, blockName, where, destFolder, dryRun) {
    let deferred = q.defer();
    let command = `mysqldump -u${config.user} -p${config.passwd} -h ${config.host} -P ${config.port} --opt -c -e ` +
        `${config.database} ${tableName} --where="${where}" -t --single-transaction --skip-triggers ` +
        `> ${destFolder + blockName}.${tableName}.data.sql`;

    if (dryRun) {
        console.log(command);
        deferred.resolve(command);
    } else {
        let retry = function(attempt, command) {
            let exec = function() {
                if (attempt > MAX_ATTEMPTS) {
                    console.error('maxAttemps reached. ABORTING', tableName, blockName);
                    deferred.reject(new Error(where));
                    return;
                }

                proc.exec(command,
                    function (error) {
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
                setTimeout(() => {
                    exec();
                }, config.retryDelay);
            }
        };


        retry(1, command);
    }

    return deferred.promise;
}

exports.Queue = Queue;
