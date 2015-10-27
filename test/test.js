var fs = require('fs');
var path = require('path');
var async = require('async');
var sharp = require('sharp');
var assert = require('chai').assert;
var exec = require('child_process').exec;

var metadata = function(fullPath, fn) {
  sharp(fullPath).metadata(fn);
}

var originalPath = function(filename) {
  filename = filename || '';
  return path.normalize(__dirname + '/originals/' + filename);
}

var outputPath = function(filename) {
  filename = filename || '';
  return path.normalize(__dirname + '/output/' + filename);
}

var preprocessPath = function(filename) {
  filename = filename || '';
  return path.normalize(__dirname + '/preprocess/' + filename);
}

var cleanOutput = function(fn) {
  var directories = [];
  directories.push(outputPath());
  directories.push(preprocessPath());

  async.each(directories, function(directory, nextEach) {
    fs.readdir(directory, function(err, list) {
      if (err) {
        console.error(err);
        return fn(err);
      }

      async.each(list, function(filename, nextFile) {
        if (filename === 'empty') {
          return nextFile();
        }

        fs.unlink(path.normalize(directory + filename), nextFile);
      }, function(err) {
        return nextEach(err);
      });
    });
  }, function(err) {
    if (err) {
      console.error('Unlink file: ', err);
    }
    return fn();
  });


}

describe('Convert single file', function() {
  this.timeout(15000);
  beforeEach(function(done) {
    cleanOutput(done);
  });

  it('4:3 to 3:4 (JPEG format)', function(done) {
    exec('printprep ' + originalPath('4-3.jpg') + ' ' + outputPath('3-4.jpg'), function(err, o, e) {
      assert.isNull(err, err);

      async.parallel({
        original: function(callback) {
          metadata(originalPath('4-3.jpg'), callback);
        },
        output: function(callback) {
          metadata(outputPath('3-4.jpg'), callback);
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
    exec('printprep ' + originalPath('4-3.png') + ' ' + outputPath('3-4.png'), function(err) {
      assert.isNull(err, err);

      async.parallel({
        original: function(callback) {
          metadata(originalPath('4-3.png'), callback);
        },
        output: function(callback) {
          metadata(outputPath('3-4.png'), callback);
        }
      }, function(err, data) {
        assert.isNull(err, err);
        assert.isAbove(data.output.width, data.original.width - 1, 'Output width must be greater than or equal to original');
        assert.isAbove(data.output.height, data.original.height - 1, 'Output height must be greater than or equal to original');
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

  it('source is directory but output is file should throw error', function(done) {
    exec('printprep ' + originalPath() + ' ' + outputPath('a-file.jpg'), function(err) {
      assert.isNotNull(err, 'Output must be a directory');
      done();
    });
  });

  it('source is directory and output is directory', function(done) {
    exec('printprep ' + originalPath() + ' ' + outputPath(), function(err) {
      assert.isNull(err, err);

      var originalFiles = fs.readdirSync(originalPath());
      async.each(originalFiles, function(filename, nextFile) {
        if (filename === 'empty') {
          return nextFile();
        }

        async.parallel({
          original: function(callback) {
            metadata(originalPath(filename), callback);
          },
          output: function(callback) {
            metadata(outputPath(filename), callback);
          }
        }, function(err, data) {
          assert.isNull(err, err);
          assert.notEqual(data.output.width, data.original.width, 'Output ' + filename + ' width must not be equal to the original');
          nextFile();
        });
      }, function() {
        done();
      });
    });
  });
});

describe('Read config file', function() {
  this.timeout(15000);
  beforeEach(function(done) {
    cleanOutput(done);
  });

  it('load config.json.', function(done) {
    exec('printprep --config=./test/config.json', function(err) {
      assert.isNull(err, 'Unable to read config.json');

      var outputFiles = fs.readdirSync(outputPath());
      assert.equal(outputFiles.length, 5, 'Output should have 4 photos.');
      done();
    });
  });

  it('auto load default config file.', function(done) {
    var copy = fs.createReadStream('./test/printprep.config.example.json').pipe(
      fs.createWriteStream('./test/printprep.config.json')
    );

    exec('cd ./test && printprep', function(err) {
      assert.isNull(err, 'Unable to read config.json');

      var preprocessFiles = fs.readdirSync(preprocessPath());
      assert.equal(preprocessFiles.length, 5, 'Output should have 4 photos.');

      var outputFiles = fs.readdirSync(outputPath());
      assert.equal(outputFiles.length, 5, 'Output should have 4 photos.');

      fs.unlink('./test/printprep.config.json', function(err) {
        assert.isNull(err, 'Unable to delete printprep.config.json');
        done();
      });
    });
  });
});

describe('Clean up', function() {
  it('output folder', function(done) {
    cleanOutput(done);
  });
});
