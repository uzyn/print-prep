#!/usr/bin/env node
'use strict';

var nopt = require('nopt');
var Log = require('log');
var processor = require('./processor');

var knownOptions = {
  position: ['center', 'left', 'right'],
  fillup: Boolean,
  color: String,
  ratio: String,
  ext: [String, Array],
  normalize: Boolean,
  verbose: Boolean
};

var shortHands = {
  p: ['--position'],
  f: ['--fillup'],
  c: ['--color'],
  r: ['--ratio'],
  e: ['--ext'],
  n: ['--normalize'],
  i: ['--config'],
  b: ['--background'],
  v: ['--verbose']
};
var options = nopt(knownOptions, shortHands);

options.source = options.argv.remain[0];
options.output = options.argv.remain[1];

var log = new Log('warning');
if (options.verbose) {
  log = new Log('debug');
}

options.logger = log;

processor.process(options, function(err) {
  if (err) {
    if (log.level > 4) {
      throw new Error(err);
    }
    process.exit(1);
  }
});
