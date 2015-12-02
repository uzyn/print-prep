'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var sharp = require('sharp');
var async = require('async');
var rgb = require('rgb');

var log = null;
var caches = {};

var defaultOptions = {
  ratio: '3:2',
  normalize: false,
  position: 'right',
  background: null,
  color: 'white',
  fillup: false,
  ext: ['png', 'jpg', 'jpeg', 'tiff']
};

module.exports = {
  process: function(options, next) {
    var input = null;
    if (!options.config) {
      input = loadJSONfile(path.normalize('./printprep.config.json'));
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
    if (input === false) {
      configs.push(options);
    }

    log = options.logger;

    async.eachSeries(configs, function(config, nextEach) {
      var opts = _.merge(_.clone(defaultOptions), config);
      resize(opts, function(err) {
        nextEach(err);
      });
    }, function(err) {
      if (err) {
        log.error(err);
      }
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

  options.ext = splitComma(options.ext);

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
      if (_.indexOf(options.ext, removeDot(path.extname(filename))) !== -1) {
        // EXPLAIN: ignore root path (e.g: ./)
        if (!(/(^|\/)\.[^\/\.]/g).test(filename)) {
          files.push({
            source: path.normalize(options.source + '/' + filename),
            output: path.normalize(options.output + '/' + filename)
          });
        }
      }
    });
  }

  if (sourceStat.isFile()) {
    var filename = path.basename(options.source);
    if (_.indexOf(options.ext, removeDot(path.extname(filename))) !== -1) {
      files.push({
        source: options.source,
        output: options.output
      });
    }
  }

  if (_.isEmpty(files)) {
    return next('No photos found.');
  }

  async.eachSeries(files, function(file, nextEach) {
    async.waterfall([
      function(callback) {
        sharp(file.source).metadata(callback);
      },

      function(meta, callback) {
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

        size = normalizeSize(size);

        log.verbose('Normalize sizes: ', size);

        callback(null, meta, landscape, size);
      },

      function(meta, landscape, size, callback) {
        if (!options.background) {
          return callback(null, meta, landscape, size, null);
        }

        if (options.fillup) {
          return callback(null, meta, landscape, size, null);
        }

        var idx = [options.background, rgb(options.color), size.intWidth, size.intHeight].join('-');

        if (caches[idx]) {
          return callback(null, meta, landscape, size, caches[idx]);
        }

        var start = new Date().getTime();
        sharp(options.background)
          .background(rgb(options.color))
          .resize(size.intWidth, size.intHeight)
          .max()
          .quality(100)
          .toBuffer(function(err, buffer, info) {
            caches[idx] = buffer;

            var end = new Date().getTime();
            log.verbose('Resize background use time (ms): ', end - start);

            callback(err, meta, landscape, size, buffer);
          });
      },

      function(meta, landscape, size, resizedBackground, callback) {
        try {
          fs.mkdirSync(path.dirname(options.output));
        } catch(e) {
          if (e.code !== 'EEXIST') {
            return callback('Unable to make folder.');
          }
        }


        var conv = sharp(file.source).rotate();
        if (!landscape) {
          conv.rotate(270);
        }

        conv
          .embed()
          .quality(100)
          .resize(size.intWidth, size.intHeight);

        if (!options.fillup) {
          switch(options.position) {
            case 'left':
              conv.extract(0, size.intWidth - size.width, size.width, size.height);
              break;

            case 'center':
              conv.extract(Math.round((size.intHeight - size.height) / 2), Math.round((size.intWidth - size.width) / 2), size.width, size.height);
              break;

            case 'right':
            default:
              conv.extract(0, 0, size.width, size.height);
              break;
          }
        } else {
          conv.crop(sharp.gravity.center);
        }

        if (options.normalize) {
          conv.normalize();
        }

        if (!resizedBackground) {
          conv.background(rgb(options.color));
          conv.toFile(file.output, callback);
        } else {
          var tmpFilename = crypto.randomBytes(Math.ceil(12 / 2)).toString('hex').slice(0, 12) + '.png';

          conv.background(rgb('transparent'));
          conv.toFormat(sharp.format.png);
          conv.toFile(tmpFilename, function(err) {
            sharp(resizedBackground)
              .overlayWith(tmpFilename)
              .flatten()
              .quality(100)
              .toFile(file.output, function(err) {
                fs.unlink(tmpFilename, function() {
                  callback(err);
                });
              });
          });
        }

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


function removeDot(ext) {
  if (ext.charAt(0) === '.') {
    ext = ext.substr(1);
  }
  return ext;
}

function splitComma(exts) {
  if (!_.isString(exts)) {
    return exts;
  }
  return exts.split(',');
}
