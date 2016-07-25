'use strict';

var q = require('q');
var _ = require('lodash');

var refs, tables;

var TableRegExp = /(\${2}(?:\w*)\.(?:\w*))/gi;


var RefExp = function(key) {
    this.key = key;
};

var StringExp = function(val) {
    this.value = val;
};

var TableExp = function(name, field, where) {
    this.name = name;
    this.field = field;
    this.where = where;
};

function tokenize(exp) {
    var tokens ;
    if (exp) {
        var byTableExp = exp.split(/(\${2}(?:\w*)\.(?:\w*))/gi);

        tokens = _.flatMap(byTableExp, function(elem) {
            if (TableRegExp.test(elem)) {
                return [elem];
            } else {
                return elem.split(/(\${1}\w+)/gi);
            }
        });
    } else {
        tokens = ['1 = 1'];
    }
    return tokens.map(createExpType);
}

function createExpType(part) {
    if (/\${2}\w+\.{1}\w+/gi.test(part)) {
        var matches = /\${2}(.*)\.(.*)/.exec(part);
        var tableName = matches[1];
        return new TableExp(tableName, matches[2], tables[tableName].where);
    }
    else if (/\${1}\w*/.test(part)) return new RefExp(part);
    else return new StringExp(part);
}

function parseToken(token) {
    var deferred = q.defer();
    if (token instanceof RefExp) {
        var ref = refs[token.key.replace('$', '')];
        deferred.resolve(parse(ref));
    }
    else if (token instanceof TableExp) {
        parse(token.where).then(function (whereResult) {
            deferred.resolve(
                'select ' + token.field + ' from ' + token.name + ' where ' + whereResult
            );
        })
    }
    else if (token instanceof StringExp) deferred.resolve(token.value);
    else throw 'Invalid token';

    return deferred.promise;
}

var parse = function(exp) {
    var deferred = q.defer();

    q.all(tokenize(exp).map(parseToken)).then(function(results) {
        deferred.resolve(results.join(''));
    });

    return deferred.promise;
};

exports.setRefs = function(_refs) {
    refs = _refs;
};

exports.setTables = function(_tables) {
    tables = _tables;
};

exports.parse = parse;
