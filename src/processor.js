'use strict';
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var sharp = require('sharp');
var gm = require('gm');
var async = require('async');
var rgb = require('rgb');

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

  // TODO: Create a default variable
  options.ratio = options.ratio || '3:2';
  options.normalize = options.normalize || false;
  options.position = options.position || 'right';
  options.background = options.background || null;
  options.color = options.color || 'white';
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
      if (!(/(^|\/)\.[^\/\.]/g).test(filename) && filename !== 'empty') {
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
      // TODO: DEPRECATED
      function(meta, callback) {
        // Always continue without background imge
        return callback(null, meta);

        if (!options.background.image) {
          return callback(null, meta);
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

        console.log('Normalize size: ', size);

        sharp(options.background.image.path)
          .metadata(function(err, metaBackground) {
            var resizeWidth = Math.round(metaBackground.width * options.background.image.scale.width);
            var resizeHeight = Math.round(metaBackground.height * options.background.image.scale.height);

            var paintFilename = 'paint.' + metaBackground.format;
            var paint = sharp(options.background.image.path)
              .resize(resizeWidth, resizeHeight)
              .quality(100)
              .toFile(paintFilename, function(err, paintInfo) {
                console.log('Resize BG image: ', err, paintInfo);

                var background = gm(size.width, size.height, '#FFF')
                  .in('-page', '+0+0')
                  .in(paintFilename)
                  // .in('-page', '+' + size.intWidth + '+0')
                  // .in(paintFilename)
                  .mosaic()
                  .setFormat('jpg')
                  .write('tiled.jpg', function (err) {
                    if (err) console.log('err: ', err);
                    return callback(null, meta);
                  });
              });
          });
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

        // console.log(ratio);
        // console.log(size);
        size = normalizeSize(size);
        console.log('Normalize size: ', size);

        callback(null, meta, landscape, size);
      },

      function(meta, landscape, size, callback) {
        if (!options.background) {
          return callback(null, meta, landscape, size);
        }

        var resizedBackgroundFilename = 'resized-' + options.background;

        sharp(options.background)
          .resize(size.intWidth, size.intHeight)
          .max()
          .quality(100)
          .png()
          .toFormat(sharp.format.png)
          .toFile(resizedBackgroundFilename, function(err, resizedBackground) {
            options.resizedBackground = resizedBackgroundFilename;
            callback(err, meta, landscape, size);
          });
      },

      function(meta, landscape, size, callback) {
        var conv = sharp(file.source).rotate();
        if (!landscape) {
          conv.rotate(270);
        }

        conv
          // .background(rgb(options.color))
          // .background(rgb('transparent'))
          .embed()
          .resize(size.intWidth, size.intHeight)
          .quality(100);

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

        if (options.normalize) {
          conv.normalize();
        }

        if (!options.resizedBackground) {
          conv.background(rgb(options.color));
          conv.jpeg();
          conv.toFormat(sharp.format.jpeg);
          conv.toFile(file.output, callback);
        } else {
          // var ts = new Date().getTime();
          conv.background(rgb('transparent'));
          conv.png();
          conv.toFormat(sharp.format.png);
          conv.toFile('uncombined.png', function(err) {
            async.series([
              function(nextStep) {
                sharp(options.resizedBackground)
                  .overlayWith('uncombined.png')
                  .sharpen()
                  .png()
                  .toFormat(sharp.format.png)
                  .toFile('combined.png', function(err) {
                    nextStep(err);
                  });
              },
              function(nextStep) {
                sharp('combined.png')
                  .flatten()
                  .quality(100)
                  .jpeg()
                  .toFormat(sharp.format.jpeg)
                  .toFile(file.output, function(err) {
                    nextStep(err);
                  });
              }
            ], function(err) {
              callback(err);
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
