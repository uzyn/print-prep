var fs = require('fs');
var path = require('path');
var async = require('async');
var assert = require('assert');
var exec = require('child_process').exec;

var originalFolderPath = path.normalize(__dirname + '/originals');
var refinesFolderPath = path.normalize(__dirname + '/refines');

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

describe('Clean up', function() {
  it('refines folder', function(done) {
    cleanUpRefines(done);
  });
});
