'use strict';
var sharp = require('sharp');
var async = require('async');

module.exports = {
  resize: function(source, options, next) {
    var output = 'temp/output.jpg';

    async.waterfall([
      function(callback) {
        sharp(source).metadata(callback);
      },
      function(meta, callback) {
        console.log(meta);
        // Assuming resulting ratio is 3:2
        var landscape = isLandscape(meta);
        var size = {
          width: meta.width,
          height: meta.height
        };

        if (landscape) {
          size.width = size.height / 2 * 3;
          size.intWidth = (2 * size.width) - meta.width;
          size.intHeight = size.height;
        } else {
          size.height = size.width / 2 * 3;
          size.intHeight = (2 * size.height) - meta.height;
          size.intWidth = size.width;
        }

        console.log(size);

        sharp(source)
          .background({r: 0, g: 0, b: 0, a: 1})
          .embed()
          .resize(size.intWidth, size.intHeight)
          .extract(0, 0, size.width, size.height)
          .normalize()
          .quality(100)
          .toFile(output, function(err) {
            callback(err);
          })
        ;
      }
    ], function(err, result) {
      next(err);
    });
  },

  meta: function(source, next) {
    sharp(source).metadata(next);
  }
};

function isLandscape(meta) {
  return meta.width > meta.height;
}
