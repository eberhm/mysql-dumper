var chai = require('chai');
var expect = chai.expect;
var Parser = require('./../lib/parser');

describe('parse function', function() {

    beforeEach(Parser.reset);

    it('should exists and return a promise', function(done) {
        Parser.parse('anything').then(function(result) {
            done();
        });
    });


    it('should return a promise with empty string when resolved when no exp is passed', function(done) {
        Parser.parse().then(function(result) {
            expect(result).to.equal('1 = 1');
            done();
        });
    });

    it('should throw an exception if table is undefined', function() {
        expect(Parser.parse.bind(Parser, '$$UndefinedTable.id')).to.throw('Undefined table: UndefinedTable in context: null');
    });

    it('should exists and return a promise with the same string if a simple string is passed', function(done) {
        Parser.parse('okok').then(function(result) {
            expect(result).to.equal('okok');
            done();
        });
    });

    it('should return a promise with the evaluation of the ref', function(done) {
        Parser.setRefs({
            foo: 'bar'
        });

        Parser.parse('$foo').then(function(result) {
            expect(result).to.equal('bar');
            done();
        });
    });

    it('should evaluation the ref of the ref recursively', function(done) {
        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$foo').then(function(result) {
            expect(result).to.equal('okoko yeahh ok');
            done();
        });
    });


    it('should return a promise with the evaluation of the table', function(done) {
        Parser.setTables({
            MyTable: {
                where: '$foo'
            }
        });

        Parser.setRefs({
            foo: 'bar'
        });

        Parser.parse('$$MyTable.field').then(function(result) {
            expect(result).to.equal('select field from MyTable where bar');
            done();
        });
    });

    it('should evaluate refs inside the where exp', function(done) {
        Parser.setTables({
            MyTable: {
                where: 'id_key1 = "$foo"'
            }
        });

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$$MyTable.field').then(function(result) {
            expect(result).to.equal('select field from MyTable where id_key1 = "okoko yeahh ok"');
            done();
        });
    });

    it('should evaluate another tables in the where exp', function(done) {
        Parser.setTables({
            MyTable1: {
                where: 'id_key1 = "$foo"'
            },
            MyTable2: {
                where: 'id_key in ($$MyTable1.field2) or id_key2 in ($$MyTable1.field4)'
            }
        });

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$$MyTable2.field').then(function(result) {
            expect(result).to.equal('select field from MyTable2 where id_key in (select field2 from MyTable1 where id_key1 = "okoko yeahh ok") or id_key2 in (select field4 from MyTable1 where id_key1 = "okoko yeahh ok")');
            done();
        });
    });


    it('should evaluate expresions from another contexts (blocks) in the where exp with implicit context', function(done) {

        Parser.setTables({
            MyTable1: {
                where: 'id_key1 = "$foo"'
            }
        }, 'CTX2');

        Parser.setTables({
            MyTable2: {
                where: 'id_key in ($$CTX2.MyTable1.field2) or id_key2 in ($$CTX2.MyTable1.field4)'
            }
        }, 'CTX1');

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$$MyTable2.field').then(function(result) {
            expect(result).to.equal('select field from MyTable2 where id_key in (select field2 from MyTable1 where id_key1 = "okoko yeahh ok") or id_key2 in (select field4 from MyTable1 where id_key1 = "okoko yeahh ok")');
            done();
        });
    });

    it('should evaluate expresions from another contexts (blocks) in the where exp forcing context', function(done) {

        Parser.setTables({
            MyTable2: {
                where: 'id_key in ($$CTX2.MyTable1.field2) or id_key2 in ($$CTX2.MyTable1.field4)'
            }
        }, 'CTX1');

        Parser.setTables({
            MyTable1: {
                where: 'id_key1 = "$foo"'
            }
        }, 'CTX2');

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.setContext('CTX1');

        Parser.parse('$$MyTable2.field').then(function(result) {
            expect(result).to.equal('select field from MyTable2 where id_key in (select field2 from MyTable1 where id_key1 = "okoko yeahh ok") or id_key2 in (select field4 from MyTable1 where id_key1 = "okoko yeahh ok")');
            done();
        });
    });

    it('should evaluate expresions from another contexts (blocks) in the where exp forcing context in the exp', function(done) {

        Parser.setTables({
            MyTable2: {
                where: 'id_key in ($$CTX2.MyTable1.field2) or id_key2 in ($$CTX2.MyTable1.field4)'
            }
        }, 'CTX1');

        Parser.setTables({
            MyTable1: {
                where: 'id_key1 = "$foo"'
            }
        }, 'CTX2');

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$$CTX1.MyTable2.field').then(function(result) {
            expect(result).to.equal('select field from MyTable2 where id_key in (select field2 from MyTable1 where id_key1 = "okoko yeahh ok") or id_key2 in (select field4 from MyTable1 where id_key1 = "okoko yeahh ok")');
            done();
        });
    });


    it('should resolve expresions from many contexts contexts (blocks)', function(done) {
        Parser.setTables({
            MyTable2: {
                where: 'id_key in ($$CTX2.MyTable1.field2))'
            },
            MyTable3: {
                where: 'id_key1 = "$foo"'
            }
        }, 'CTX1');

        Parser.setTables({
            MyTable1: {
                where: 'id_key1 in ($$CTX3.MyTable3.id_fieldX)'
            }
        }, 'CTX2');

        Parser.setTables({
            MyTable3: {
                where: 'id_key4 in ($$CTX1.MyTable3.field1)',
            }
        }, 'CTX3');

        Parser.setRefs({
            foo: '$bar $baz ok',
            bar: '$qux',
            baz: 'yeahh',
            qux: 'okoko'
        });

        Parser.parse('$$CTX1.MyTable2.field').then(function(result) {
            expect(result).to.equal('select field from MyTable2 where id_key in (select field2 from MyTable1 where id_key1 in (select id_fieldX from MyTable3 where id_key4 in (select field1 from MyTable3 where id_key1 = "okoko yeahh ok"))))');
            done();
        });
    });
});
