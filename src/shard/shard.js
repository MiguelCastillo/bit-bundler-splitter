"use strict";

const defaults = {
  name: "",
  dest: "",
  entries: [],
  modules: [],
  parents: [],
  children: [],
  implicit: false
};

class Shard {
  constructor(options) {
    Object.assign(this, defaults, options);
  }

  merge(shard) {
    return this
      .addEntries(shard.entries)
      .addModules(shard.modules)
      .addParents(shard.parents)
      .addChildren(shard.children)
      .setDest(shard.dest)
      .setDynamic(shard.dynamic);
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

  setDest(dest) {
    return this.configure({ dest: dest });
  }

  setDynamic(dynamic) {
    return this.configure({ dynamic: dynamic });
  }

  toBundle() {
    return {
      name: this.name,
      modules: this.modules,
      dest: this.dest
    };
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
