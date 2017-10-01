// map
function (doc) {
  if(doc.type === 'result') {
    var d = new Date(Date.parse(doc.properties.time));
    var key = [1900 + d.getYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]; // getFullYear is recommended
    emit(key, doc.properties);
  }
}

// reduce
function (keys, values, rereduce) {
  var result = { };

  function mapSamples(rereduce, name) {
    return function(doc) {
      return rereduce ? doc[name].samples : 1;
    };
  }

  function mapName(rereduce, name, ext) {
    return function(doc) {
      return rereduce ? doc[name][ext] : doc[name];
    };
  }

  //var x = values.filter(function(doc){ return doc.pressurePa !== undefined; }).map(function(doc){ return doc.pressurePa; });
  function calc(sumfn, rawary, rereduce, name) {
    var ary = rawary.filter(function(doc){ return doc[name] !== undefined; });
    if(ary.length === 0){ return { samples: 0, sum: 0, avg: 0, min: Number.MAX_VALUE, max: Number.MIN_VALUE }; }
    var sum = sumfn(ary.map(mapName(rereduce, name, 'sum')));
    var samples = sumfn(ary.map(mapSamples(rereduce, name)));
    return {
      samples: samples,
      sum: sum,
      avg: sum / samples,
      min: ary.map(mapName(rereduce, name, 'min')).reduce(function(accum, cur){ return Math.min(accum, cur); }),
      max: ary.map(mapName(rereduce, name, 'max')).reduce(function(accum, cur){ return Math.max(accum, cur); })
    }
  }

  result.pressurePa = calc(sum, values, rereduce, 'pressurePa');
  result.tempatureC = calc(sum, values, rereduce, 'tempatureC');
  result.humidity = calc(sum, values, rereduce, 'humidity');

  //result.tempatureC.avg = values.map(function(doc){ return rereduce ? doc.tempatureC.avg : doc.tempatureC; }).reduce(function(accum, cur){ return accum + cur; }) / values.length;
  ///if(doc.tempatureC < result.tempatureC.min || result.tempatureC.min === NaN) { result.tempatureC.min = doc.tempatureC; }
  //if(doc.tempatureC > result.tempatureC.max || result.tempatureC.max === NaN) { result.tempatureC.max = doc.tempatureC; }

  //result.humidity.avg = values.map(function(doc){ return rereduce ? doc.humidity.avg : doc.humidity; }).reduce(function(accum, cur){ return accum + cur; }) / values.length;
  //if(doc.humidity < result.humidity.min || result.hmidity.min === NaN) { result.humidity.min = doc.humidity; }
  //if(doc.humidity > result.humidity.max || result.hmidity.max === NaN) { result.humidity.max = doc.humidity; }

  result.samples = rereduce ? sum(values.map(function(doc){ return doc.samples; })) : values.length;

  return result;
}


