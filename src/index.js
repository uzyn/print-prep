#!/usr/bin/env node
'use strict';

var nopt = require('nopt');

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
var options = nopt(knownOptions, shortHands);
console.log(options);
