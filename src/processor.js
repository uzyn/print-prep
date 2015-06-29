'use strict';
var sharp = require('sharp');
var async = require('async');
var rgb = require('rgb');

module.exports = {
  resize: function(options, next) {
    if (
      !options.hasOwnProperty('source') ||
      !options.hasOwnProperty('output')
    ) {
      return next('Missing source and/or output');
    }

    options.color = options.color || 'black';
    options.ratio = options.ratio || '3:2';
    var ratio = parseRatio(options.ratio);

    if (!ratio) {
      return next('Bad ratio');
    }

    async.waterfall([
      function(callback) {
        sharp(options.source).metadata(callback);
      },
      function(meta, callback) {
        console.log(meta);

        var landscape = isLandscape(meta);
        var size = {
          width: meta.width,
          height: meta.height
        };

        if (landscape) {
          size.width = size.height / ratio.height * ratio.width;
          size.intWidth = (ratio.height * size.width) - meta.width;
          size.intHeight = size.height;
        } else {
          size.height = size.width / ratio.height * ratio.width;
          size.intHeight = (ratio.height * size.height) - meta.height;
          size.intWidth = size.width;
        }

        console.log(size);

        sharp(options.source)
          .rotate()
          .background(rgb(options.color))
          .embed()
          .resize(size.intWidth, size.intHeight)
          .extract(0, 0, size.width, size.height)
          .normalize()
          .quality(100)
          .toFile(options.output, function(err) {
             callback(err);
          });
      }
    ], function(err, result) {
      return next(err);
    });
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
