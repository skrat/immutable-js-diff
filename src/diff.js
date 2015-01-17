'use strict';

var Immutable = require('immutable');
var utils = require('./utils');
var lcs = require('./lcs');
var op = utils.op,
    isMap = utils.isMap,
    isIndexed = utils.isIndexed;

var mapDiff = function(a, b, p){
  var ops = [];
  var path = p || [];

  if(Immutable.is(a, b) || (a == b == null)){ return ops; }

  if(a.forEach){
    a.forEach(function(aValue, aKey){
      if(b.has(aKey)){
        if(isMap(aValue) && isMap(b.get(aKey))){
          ops = ops.concat(mapDiff(aValue, b.get(aKey), path.concat(aKey)));
        }
        else if(isIndexed(b.get(aKey)) && isIndexed(aValue)){
          ops = ops.concat(sequenceDiff(aValue, b.get(aKey), path.concat(aKey)));
        }
        else {
          var bValue = b.get ? b.get(aKey) : b;
          var areDifferentValues = (aValue !== bValue);
          if (areDifferentValues) {
            ops.push(op('replace', path.concat(aKey), bValue));
          }
        }
      }
      else {
        ops.push( op('remove', path.concat(aKey)) );
      }
    });
  }

  b.forEach(function(bValue, bKey){
    if(a.has && !a.has(bKey)){
      ops.push( op('add', path.concat(bKey), bValue) );
    }
  });

  return ops;
};

var sequenceDiff = function (a, b, p) {
  var ops = [];
  var path = p || '';
  if(Immutable.is(a, b) || (a == b == null)){ return ops; }
  if(b.count() > 100) { return mapDiff(a, b, p); }

  var lcsDiff = lcs.diff(a, b);

  var pathIndex = 0;

  lcsDiff.forEach(function (diff) {
    if(diff.op === '='){ pathIndex++; }
    else if(diff.op === '!='){
      if(isMap(diff.val) && isMap(diff.newVal)){
        var mapDiffs = mapDiff(diff.val, diff.newVal, path.concat(pathIndex));
        ops = ops.concat(mapDiffs);
      }
      else{
        ops.push(op('replace', path.concat(pathIndex), diff.newVal));
      }
      pathIndex++;
    }
    else if(diff.op === '+'){
      ops.push(op('add', path.concat(pathIndex), diff.val));
      pathIndex++;
    }
    else if(diff.op === '-'){ ops.push(op('remove', path.concat(pathIndex))); }
  });

  return ops;
};

var primitiveTypeDiff = function (a, b, p) {
  var path = p || '';
  if(a === b){ return []; }
  else{
    return [ op('replace', path.concat(''), b) ];
  }
};

var diff = function(a, b, p){
  if(a != b && (a == null || b == null)){ return Immutable.fromJS([op('replace', '/', b)]); }
  if(isIndexed(a) && isIndexed(b)){
    return Immutable.fromJS(sequenceDiff(a, b));
  }
  else if(isMap(a) && isMap(b)){
    return Immutable.fromJS(mapDiff(a, b));
  }
  else{
    return Immutable.fromJS(primitiveTypeDiff(a, b, p));
  }
};

module.exports = diff;
