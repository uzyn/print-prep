#!/usr/bin/env node
'use strict';

var nopt = require('nopt');
var processor = require('./processor');

var knownOptions = {
  position: ['center', 'left', 'right'],
  fillup: Boolean,
  color: String,
  ratio: String,
  ext: [String, Array],
  normalize: Boolean
};
var shortHands = {
  p: ['--position'],
  f: ['--fillup'],
  c: ['--color'],
  r: ['--ratio'],
  e: ['--ext'],
  n: ['--normalize']
};
var options = nopt(knownOptions, shortHands);
console.log(options);

options.source = options.argv.remain[0];
options.output = options.argv.remain[1];

processor.resize(options, function(err) {
  if (err) {
    throw new Error(err)
  }
  console.log('Done');
});
