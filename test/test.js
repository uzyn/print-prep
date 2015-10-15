var fs = require('fs');
var path = require('path');
var async = require('async');
var sharp = require('sharp');
var assert = require('chai').assert;
var exec = require('child_process').exec;

var originalFolderPath = path.normalize(__dirname + '/originals');
var refinesFolderPath = path.normalize(__dirname + '/refines');

var filePath = function(ratio, isOriginal, extension) {
  if (typeof extension === 'undefined') extension = 'jpg';
  if (typeof isOriginal === 'undefined') isOriginal = true;

  var fullFilePath = null;
  var fileFolder = originalFolderPath;
  if (!isOriginal) {
    fileFolder = refinesFolderPath;
  }

  switch (ratio) {
    case '3:4':
    case '34':
      fullFilePath = path.normalize(fileFolder + '/3-4.' + extension);
      break;

    case '4:3':
    case '43':
    default:
      fullFilePath = path.normalize(fileFolder + '/4-3.' + extension);
      break;
  }
  return fullFilePath;
}

var cleanUpRefines = function(fn) {
  fs.readdir(refinesFolderPath, function(err, list) {
    if (err) {
      console.error(err);
      return fn(err);
    }

    async.each(list, function(filename, nextFile) {
      if (filename === 'empty') {
        return nextFile();
      }

      fs.unlink(path.normalize(refinesFolderPath + '/' + filename), nextFile);
    }, function(err) {
      if (err) {
        console.error('Unlink file: ', err);
      }
      return fn();
    });
  });
}

describe('Convert single file', function() {
  this.timeout(15000);

  it('4:3 to 3:4 (JPEG format)', function(done) {
    exec('printprep ' + filePath() + ' ' + filePath('3:4', false), function(err) {
      assert.isNull(err, err);

      return done();
    });
  });

  it('4:3 to 3:4 (PNG format)', function(done) {
    exec('printprep ' + filePath('4:3', true, 'png') + ' ' + filePath('3:4', false, 'png'), function(err) {
      assert.isNull(err, err);

      return done();
    });
  });
});

describe('Clean up', function() {
  it('refines folder', function(done) {
    cleanUpRefines(done);
  });
});
