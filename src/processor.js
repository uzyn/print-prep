'use strict';

var sharp = require('sharp');

module.exports = {
  resize: function(source, options, next) {
    var output = 'temp/output.jpg';

    sharp(source)
      .background({r: 0, g: 0, b: 0, a: 1})
      .embed()
      .resize(2000, 1200)
      .extract(0, 0, 1800, 1200)
      .normalize()
      .quality(100)
      .toFile(output, function(err) {
        console.log(err);
        next(err);
      })
    ;
  }
};
