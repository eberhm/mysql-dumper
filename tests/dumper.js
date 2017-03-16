let chai = require('chai');
let expect = chai.expect;
let Dumper = require('./../lib/dumper');
let sinon = require('sinon');
let proc = require('child_process');
let exec;


beforeEach(function(){
    exec = sinon.stub(proc, 'exec');
    exec.yields();
});

afterEach(function(){
    exec.restore();
});

describe('dumpBlock function', function() {

    it('should exists', function() {
        expect(Dumper.dumpBlock).is.a.function;
    });

    it('should not call exec on dryRun', function() {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                anyBlock : {
                    tables: {
                        anyTable: {
                            where: 'id = 1'
                        }
                    }
                }
            }
        });

        Dumper.dumpBlock('anyBlock', 'any destination', true);
        expect(exec.notCalled).to.be.true;
    });

    it('should call exec with the following args', function(done) {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                anyBlock : {
                    tables: {
                        anyTable: {
                            where: 'id = 1'
                        },
                        anotherTable: {
                            where: 'id = 2'
                        }
                    }
                }
            }
        });

        Dumper.dumpBlock('anyBlock', 'any destination').then(function(results) {
            expect(exec.callCount).to.equal(2);
            expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anyTable --where="id = 1" -t --single-transaction --skip-triggers > any destinationanyBlock.anyTable.data.sql')).to.be.true;
            expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anotherTable --where="id = 2" -t --single-transaction --skip-triggers > any destinationanyBlock.anotherTable.data.sql')).to.be.true;
            done();
        });
    });

    it('should stay in the block context after resolving a context change', function(done) {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                block1 : {
                    tables: {
                        block1Table: {
                            where: 'id = $$block2.anyTable.anyField'
                        },
                        anotherTable: {
                            where: 'id = $$block1Table.anyField'
                        }
                    }
                },
                block2 : {
                    tables: {
                        anyTable: {
                            where: 'id = 1'
                        }
                    }
                }
            }
        });

        Dumper.dumpBlock('block1', 'any destination').then(function(results) {
            expect(exec.callCount).to.equal(2);
            expect(results).to.deep.equal(
                [
                    'id = select anyField from anyTable where id = 1',
                    'id = select anyField from block1Table where id = select anyField from anyTable where id = 1'
                ]
            );
            done();
        });
    });

    it('should try dumping on error', function(done) {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                block1 : {
                    tables: {
                        block1Table: {
                            where: 'id = 1'
                        }
                    }
                }
            }
        });

        exec.onFirstCall().yields([{'error': 1}]);
        exec.onSecondCall().yields([{'error': 1}]);
        exec.onCall(2).yields();

        Dumper.dumpBlock('block1', 'any destination').then(function(results) {
            expect(exec.callCount).to.equal(3);
            expect(results).to.deep.equal(['id = 1']);
            done();
        });
    });

    it('should try dumping on error for MAX_ATTEMPTS times and then reject', function(done) {

        const MAX_ATTEMPTS = 5;

        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                block1 : {
                    tables: {
                        block1Table: {
                            where: 'id = 1'
                        }
                    }
                }
            }
        });

        exec.onCall(0).yields([{'error': 1}]);
        exec.onCall(1).yields([{'error': 1}]);
        exec.onCall(2).yields([{'error': 1}]);
        exec.onCall(3).yields([{'error': 1}]);
        exec.onCall(4).yields([{'error': 1}]);
        exec.onCall(5).yields([{'error': 1}]);
        exec.onCall(6).yields([{'error': 1}]);

        Dumper.dumpBlock('block1', 'any destination').fail(function(results) {
            expect(exec.callCount).to.equal(MAX_ATTEMPTS);
            expect(results.message).to.equal('id = 1');
            done();
        });
    });

    it('should try dumping on error for MAX_ATTEMPTS times and not count as attempt when it can be recovered', function(done) {

        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1,
            blocks: {
                block1 : {
                    tables: {
                        block1Table: {
                            where: 'id = 1'
                        }
                    }
                }
            }
        });

        exec.onCall(0).yields({'error': 1});
        exec.onCall(1).yields({'code': 'EAGAIN'});
        exec.onCall(2).yields({'error': 1});
        exec.onCall(3).yields({'code': 'EAGAIN'});
        exec.onCall(4).yields({'code': 'EAGAIN'});
        exec.onCall(5).yields({'error': 1});
        exec.onCall(6).yields();

        Dumper.dumpBlock('block1', 'any destination').then(function(results) {
            expect(exec.callCount).to.equal(7);
            expect(results).to.deep.equal(['id = 1']);
            done();
        });
    });
});

describe('dumpDatabase function', function() {

    it('should exists', function() {
        expect(Dumper.dumpDatabase).is.a.function;
    });

    it('should not call exec on dryRun', function() {
        Dumper.dumpDatabase('any destination', true);
        expect(exec.called).to.be.false;
    });

    it('should call exec with following mysqldump config', function() {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
            retryDelay: 1
        });

        Dumper.dumpDatabase('any destination');

        expect(exec.called).to.be.true;
        expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase --no-data --routines > any destinationanyDatabase.schema.sql')).to.be.true;
    });
});
