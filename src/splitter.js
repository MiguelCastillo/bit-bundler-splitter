"use strict";

const matchers = require("./matchers");

class Splitter {
  constructor(options) {
    Object.assign(this, options);
    this.matchers = matchers(this.match);
  }

  isMatch(mod, stats) {
    return this.matchers(mod, stats);
  }

  getModules(modules) {
    return Object
      .keys(modules)
      .filter(key => this.isMatch(modules[key]))
      .map(key => modules[key]);
  }
}

module.exports = Splitter;
