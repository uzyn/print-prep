var fs = require('fs');
var path = require('path');
var async = require('async');
var sharp = require('sharp');
var assert = require('chai').assert;
var exec = require('child_process').exec;

var originalFolderPath = path.normalize(__dirname + '/originals');
var outputFolderPath = path.normalize(__dirname + '/output');

var metadata = function(fullPath, fn) {
  sharp(fullPath).metadata(fn);
}

var filePath = function(ratio, isOriginal, extension) {
  if (typeof ratio === 'undefined') ratio = '4:3';
  if (typeof extension === 'undefined') extension = 'jpg';
  if (typeof isOriginal === 'undefined') isOriginal = true;

  var fullFilePath = null;
  var fileFolder = originalFolderPath;
  if (!isOriginal) {
    fileFolder = outputFolderPath;
  }

  switch (ratio) {
    case '3:4':
      fullFilePath = path.normalize(fileFolder + '/3-4.' + extension);
      break;

    case '4:3':
      fullFilePath = path.normalize(fileFolder + '/4-3.' + extension);
      break;

    default:
      // Serve ratio as filename
      fullFilePath = path.normalize(fileFolder + '/' + ratio);
      break;
  }
  return fullFilePath;
}

var cleanOutput = function(fn) {
  fs.readdir(outputFolderPath, function(err, list) {
    if (err) {
      console.error(err);
      return fn(err);
    }

    async.each(list, function(filename, nextFile) {
      if (filename === 'empty') {
        return nextFile();
      }

      fs.unlink(path.normalize(outputFolderPath + '/' + filename), nextFile);
    }, function(err) {
      if (err) {
        console.error('Unlink file: ', err);
      }
      return fn();
    });
  });
}

describe.skip('Convert single file', function() {
  this.timeout(15000);
  beforeEach(function(done) {
    cleanOutput(done);
  });

  it('4:3 to 3:4 (JPEG format)', function(done) {
    exec('printprep ' + filePath() + ' ' + filePath('3:4', false), function(err) {
      assert.isNull(err, err);

      async.parallel({
        original: function(callback) {
          metadata(filePath(), callback);
        },
        output: function(callback) {
          metadata(filePath('3:4', false), callback);
        }
      }, function(err, data) {
        assert.isNull(err, err);
        assert.isAbove(data.output.width, data.original.width - 1, 'Output width must greater or equal than original');
        assert.isAbove(data.output.height, data.original.height - 1, 'Output height must greater or equal than original');
        done();
      });
    });
  });

  it('4:3 to 3:4 (PNG format)', function(done) {
    exec('printprep ' + filePath('4:3', true, 'png') + ' ' + filePath('3:4', false, 'png'), function(err) {
      assert.isNull(err, err);

      async.parallel({
        original: function(callback) {
          metadata(filePath('4:3', true, 'png'), callback);
        },
        output: function(callback) {
          metadata(filePath('3:4', false, 'png'), callback);
        }
      }, function(err, data) {
        assert.isNull(err, err);
        assert.isAbove(data.output.width, data.original.width - 1, 'Output width must greater or equal than original');
        assert.isAbove(data.output.height, data.original.height - 1, 'Output height must greater or equal than original');
        done();
      });
    });
  });

  // COVER: source is file but output is directory. (accept, output file name will same as original)
});

describe('Convert multiple files', function() {
  this.timeout(15000);
  beforeEach(function(done) {
    cleanOutput(done);
  });

  // COVER: source is directory but output is file. (Not accept)
  // COVER: source is directory and output is directory

  it('select original folder', function(done) {
    exec('printprep ' + originalFolderPath + ' ' + outputFolderPath, function(err, a, b) {
      assert.isNull(err, err);

      fs.readdir(outputFolderPath, function(err, list) {
        assert.isNull(err, err);

        async.each(list, function(filename, nextFile) {
          console.log('File: ', filename);
          nextFile();
        }, function() {
          done();
        });
      });
    });
  });
});

describe('Clean up', function() {
  it('output folder', function(done) {
    cleanOutput(done);
  });
});
