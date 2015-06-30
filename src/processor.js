'use strict';
var _ = require('lodash');
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

        var conv = sharp(options.source)
          .rotate();
        if (!landscape) {
          conv.rotate(270);
        }
        conv
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
