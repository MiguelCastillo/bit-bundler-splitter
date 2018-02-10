"use strict";

const defaults = {
  name: "",
  dest: "",
  entries: [],
  modules: [],
  parents: [],
  children: [],
  implicit: false,
  dynamic: false
};

class Shard {
  constructor(options) {
    options = options || {};
    Object.assign(this, defaults, options);

    var dest = this.dest;
    var name = this.name;

    if (!dest && name) {
      this.dest = dest !== false && looksLikeFileName(name) ? name : false;
    }
  }

  merge(shard) {
    if (shard === this) {
      return this;
    }

    var result = {};

    if (shard.hasOwnProperty("entries")) {
      result.entries = dedup(this.entries.concat(shard.entries));
    }

    if (shard.hasOwnProperty("modules")) {
      result.modules = dedup(this.modules.concat(shard.modules));
    }

    if (shard.hasOwnProperty("parents")) {
      result.parents = dedup(this.parents.concat(shard.parents));
    }

    if (shard.hasOwnProperty("children")) {
      result.children = dedup(this.children.concat(shard.children));
    }

    if (shard.hasOwnProperty("name")) {
      result.name = shard.name;
    }

    if (shard.hasOwnProperty("dest")) {
      result.dest = shard.dest;
    }

    if (shard.hasOwnProperty("dynamic")) {
      result.dynamic = shard.dynamic;
    }

    return this.configure(result);
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


function looksLikeFileName(name) {
  return /[\w]+[\.][\w]+$/.test(name);
}


module.exports = Shard;
