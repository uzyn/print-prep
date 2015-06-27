#!/usr/bin/env node
'use strict';

var nopt = require('nopt');
var processor = require('./processor');

var knownOptions = {
  position: ['center', 'left', 'right'],
  fillup: Boolean,
  color: String,
  ratio: String,
  ext: [String, Array]
};
var shortHands = {
  p: ['--position'],
  f: ['--fillup'],
  c: ['--color'],
  r: ['--ratio'],
  e: ['--ext']
};
var cliOptions = nopt(knownOptions, shortHands);
console.log(cliOptions);

var options = {
  source: cliOptions.argv.remain[0],
  output: cliOptions.argv.remain[1]
};

if (cliOptions.hasOwnProperty('color')) {
  options.color = cliOptions.color;
}

processor.resize(options, function(err) {
  console.log(err);
  console.log('Done');
});
