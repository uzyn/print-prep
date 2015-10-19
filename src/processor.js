'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var sharp = require('sharp');
var async = require('async');
var rgb = require('rgb');

module.exports = {
  process: function(options, next) {
    var input = null;
    if (!options.config) {
      input = loadJSONfile('./printprep.config.json');
    } else {
      input = loadJSONfile(options.config);
    }

    var configs = [];
    if (input && _.isPlainObject(input)) {
      configs.push(input);
    }
    if (input && _.isArray(input)) {
      configs = input;
    }

    async.eachSeries(configs, function(config, nextEach) {
      var opts = _.merge(options, config);
      resize(opts, nextEach);
    }, function(err) {
      console.log(err);
      return next(err);
    });
  },

  resize: function(options, next) {
    return resize(options, next);
  },

  meta: function(source, next) {
    return sharp(source).metadata(next);
  }
};

function isLandscape(meta) {
  return meta.width >= meta.height;
}

function parseRatio(ratio) {
  var parsed = ratio.split(':', 2);
  if (parsed.length !== 2) {
    return false;
  }

  var ok = true;
  parsed.forEach(function(value, index) {
    value = parseInt(value);
    if (value <= 0) {
      ok = false;
      return false;
    }
    parsed[index] = value;
  });

  if (!ok) {
    return false;
  }
  return {
    width: parsed[0],
    height: parsed[1]
  }
}

function loadJSONfile(filename, encoding) {
  try {
    if (typeof encoding === 'undefined') {
      encoding = 'utf8';
    }

    var contents = fs.readFileSync(filename, encoding);
    return JSON.parse(contents);
  } catch (err) {
    return false;
  }
}

function resize(options, next) {
  if (
    !options.hasOwnProperty('source') ||
    !options.hasOwnProperty('output')
  ) {
    return next('Missing source and/or output');
  }

  options.color = options.color || 'white';
  options.ratio = options.ratio || '3:2';
  options.normalize = options.normalize || false;
  options.position = options.position || 'right';
  var ratio = parseRatio(options.ratio);

  if (!ratio) {
    return next('Bad ratio');
  }

  var sourceStat = null;
  try {
    sourceStat = fs.lstatSync(options.source);
  } catch(e) {
    return next('Bad source');
  }

  var outputStat = null;
  try {
    outputStat = fs.lstatSync(options.output);
  } catch(e) {
    // Do nothing
  };

  var files = [];
  if (sourceStat.isDirectory()) {
    if (!outputStat || !outputStat.isDirectory()) {
      return next('Bad output');
    }

    var filenames = fs.readdirSync(options.source);
    _.each(filenames, function(filename) {
      if (!(/(^|\/)\.[^\/\.]/g).test(filename)) {
        files.push({
          source: path.normalize(options.source + '/' + filename),
          output: path.normalize(options.output + '/' + filename)
        });
      }
    });
  }

  if (sourceStat.isFile()) {
    files.push({
      source: options.source,
      output: options.output
    });
  }

  async.each(files, function(file, nextEach) {
    async.waterfall([
      function(callback) {
        sharp(file.source).metadata(callback);
      },
      function(meta, callback) {
        console.log(meta);

        var landscape = isLandscape(meta);

        if (!landscape) {
          var temp = _.clone(meta);
          meta.width = temp.height;
          meta.height = temp.width;
        }

        var size = {};

        if (ratio.width * meta.height > ratio.height * meta.width) {
          size.height = meta.height;
          size.width = size.height / ratio.height * ratio.width;
          size.intHeight = size.height;
          size.intWidth = (2 * size.width) - meta.width;
        } else {
          size.width = meta.width;
          size.height = size.width / ratio.width * ratio.height;
          size.intWidth = size.width;
          size.intHeight = (2 * size.height) - meta.height;
        }
        console.log(ratio);
        console.log(size);
        size = normalizeSize(size);
        console.log(size);

        var conv = sharp(file.source)
          .rotate();
        if (!landscape) {
          conv.rotate(270);
        }
        conv
          .background(rgb(options.color))
          .embed()
          .resize(size.intWidth, size.intHeight);

        switch(options.position) {
          case 'left':
            conv.extract(0, size.intWidth - size.width, size.width, size.height);
            break;

          case 'center':
            conv.extract(0, Math.round((size.intWidth - size.width) / 2), size.width, size.height);
            break;

          case 'right':
          default:
            conv.extract(0, 0, size.width, size.height);
            break;
        }

        conv.quality(100);

        if (options.normalize) {
          conv.normalize();
        }

        conv.toFile(file.output, function(err) {
          callback(err);
        });
      }
    ], function(err, result) {
      return nextEach(err);
    });
  }, function(err) {
    return next(err);
  });
}


/**
 * Normalize size to prevent overflow
 * as sharp only supports capped height or width of 16383
 */
function normalizeSize(size, cap) {
  var max = _.max(_.values(size));
  cap = cap || 16383;

  var scale = 1;
  if (max > cap) {
    var scale = cap / max;
  }
  _.forIn(size, function(value, key) {
    size[key] = parseInt(value * scale);
  });
  return size;
}
