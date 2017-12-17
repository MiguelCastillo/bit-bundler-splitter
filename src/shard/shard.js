"use strict";

const defaults = {
  name: "",
  entries: [],
  modules: [],
  parents: [],
  children: [],
  splitter: null
};

class Shard {
  constructor(options) {
    Object.assign(this, defaults, options);
  }

  configure(options) {
    return !options || options === this ? options : new Shard(Object.assign({}, this, options));
  }

  setName(name) {
    return this.configure({ name: name });
  }

  setModules(modules) {
    return this.configure({ modules: modules });
  }

  addModules(modules) {
    return this.configure({ modules: this.modules.concat(modules) });
  }

  setEntries(entries) {
    return this.configure({ entries: entries });
  }

  addEntries(entries) {
    return this.configure({ entries: this.entries.concat(entries) });
  }

  setParents(parents) {
    return this.configure({ parents: parents });
  }

  addParents(parents) {
    return this.configure({ parents: this.parents.concat(parents) });
  }

  setChildren(children) {
    return this.configure({ children: children });
  }

  addChildren(children) {
    return this.configure({ children: this.children.concat(children) });
  }

  setSplitter(splitter) {
    return this.configure({ splitter: splitter });
  }

  toBundle() {
    const bundle = {
      name: this.name,
      modules: this.modules,
      entries: this.entries
    };

    if (this.splitter && this.splitter.dest) {
      bundle.dest = this.splitter.dest;
    }

    return bundle;
  }
}

module.exports = Shard;
