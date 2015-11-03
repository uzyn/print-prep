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

if (options.verbose) {
  options.logger = new Log('debug');
} else {
  options.logger = new Log('warning');
}

processor.process(options, function(err) {
  if (err) {
    throw new Error(err)
  }
});
