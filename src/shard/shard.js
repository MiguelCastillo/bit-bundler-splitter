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
    return this.configure({ modules: dedup(this.modules.concat(modules)) });
  }

  setEntries(entries) {
    return this.configure({ entries: entries });
  }

  addEntries(entries) {
    return this.configure({ entries: dedup(this.entries.concat(entries)) });
  }

  setParents(parents) {
    return this.configure({ parents: parents });
  }

  addParents(parents) {
    return this.configure({ parents: dedup(this.parents.concat(parents)) });
  }

  setChildren(children) {
    return this.configure({ children: children });
  }

  addChildren(children) {
    return this.configure({ children: dedup(this.children.concat(children)) });
  }

  setSplitter(splitter) {
    return this.configure({ splitter: splitter });
  }

  toBundle() {
    const bundle = {
      name: this.name,
      modules: this.modules
    };

    if (this.splitter && this.splitter.dest) {
      bundle.dest = this.splitter.dest;
    }

    return bundle;
  }
}

function dedup(list) {
  return (
    Object.keys(
      list.reduce((accumulator, item) => (accumulator[item] = true, accumulator), {})
    )
  );
}

module.exports = Shard;
