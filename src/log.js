var level = 'error';

module.exports = {
  level: function(change) {
    if (typeof change !== 'undefined') {
      level = change;
    }
    return level;
  },

  verbose: function() {
    if (level === 'verbose') {
      console.log('VERBOSE', Array.prototype.slice.call(arguments));
    }
  },

  error: function() {
    console.error('ERROR', Array.prototype.slice.call(arguments));
  }
};
