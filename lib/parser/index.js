'use strict';

let q = require('q');
let _ = require('lodash');

let refs = {}, tables = {}, context = null;

let TableRegExp = /(\${2}(?:\w*)\.(?:\w*))/gi;


let RefExp = function(key) {
    this.key = key;
};

let StringExp = function(val) {
    this.value = val;
};

let TableExp = function(name, field, where, context) {
    this.name = name;
    this.field = field;
    this.where = where;
    this.context = context;
};

let tableRegExpTester = /(\${2}(?:(?:\w*)\.)?(?:\w*)\.(?:\w*))/gi;
let tableRegExpMatcher = /\${2}(?:(\w*)\.)?(\w*)\.(\w*)/;

function tokenize(exp) {
    let tokens ;
    if (exp) {
        let byTableExp = exp.split(tableRegExpTester);

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
    if (tableRegExpTester.test(part)) {
        let matches = tableRegExpMatcher.exec(part);
        let contextName = matches[1];
        let tableName = matches[2];
        let table = (tables[contextName || context] || {})[tableName];

        if (!table) {
            throw new Error('Undefined table: ' + tableName + ' in context: ' + context);
        }
        return new TableExp(tableName, matches[3], table.where, contextName);
    }
    else if (/\${1}\w*/.test(part)) return new RefExp(part);
    else return new StringExp(part);
}

function parseToken(token) {
    let deferred = q.defer();
    if (token instanceof RefExp) {
        let ref = refs[token.key.replace('$', '')];
        deferred.resolve(parse(ref));
    }
    else if (token instanceof TableExp) {
        parse(token.where, token.context).then(function (whereResult) {
            deferred.resolve(
                'select ' + token.field + ' from ' + token.name + ' where ' + whereResult
            );
        })
    }
    else if (token instanceof StringExp) deferred.resolve(token.value);
    else throw 'Invalid token';

    return deferred.promise;
}

function parse(exp, _context) {
    let deferred = q.defer();

    if (_context) setContext(_context);

    q.all(tokenize(exp).map(parseToken)).then(function(results) {
        deferred.resolve(results.join(''));
    });

    return deferred.promise;
}

function setContext(_context) {
    if (!_context) throw new Error('invalid context ' + _context);
    context = _context;
}

function setTables(_tables, _context) {
    setContext(_context || '___global');
    tables[context] = _tables;
}

exports.setRefs = function setRefs(_refs) {
    refs = _refs;
};

exports.setTables = setTables;

exports.setContext = setContext;

exports.reset = function() {
    refs = {};
    tables = {};
    context = null;
};

exports.parse = parse;
