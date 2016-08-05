var chai = require('chai');
var expect = chai.expect;
var Dumper = require('./../dumper.js');
var sinon = require('sinon');
var proc = require('child_process');
var exec;


beforeEach(function(){
    exec = sinon.stub(proc, 'exec');
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
            expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anyTable --where="id = 1" -t --single-transaction > any destinationanyTable.dump.sql')).to.be.true;
            expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anotherTable --where="id = 2" -t --single-transaction > any destinationanotherTable.dump.sql')).to.be.true;
            done();
        });
    });

    it('should stay in the block context after resolving a context change', function(done) {
        Dumper.setConfig({
            host: "anyHost",
            user: "anyUser",
            passwd: "anyPass",
            database: "anyDatabase",
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
            // expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anyTable --where="id = 1" -t --single-transaction > any destinationanyTable.dump.sql')).to.be.true;
            // expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase anotherTable --where="id = 2" -t --single-transaction > any destinationanotherTable.dump.sql')).to.be.true;
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
            database: "anyDatabase"
        });

        Dumper.dumpDatabase('any destination');

        expect(exec.called).to.be.true;
        expect(exec.calledWith('mysqldump -uanyUser -panyPass -h anyHost --opt -c -e anyDatabase --no-data > any destinationanyDatabase.db.dump.sql')).to.be.true;
    });
});
