"use strict";

const defaults = {
  name: "",
  dest: "",
  entries: [],
  isMain: false,
  modules: [],
  references: [],
  parents: [],
  children: [],
  loadOrder: [],
  implicit: false,
  dynamic: false,
  content: null
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

    if (options.hasOwnProperty("isMain")) {
      this.isMain = options.isMain;
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

    if (shard.hasOwnProperty("references")) {
      result.references = dedup(this.references.concat(shard.references));
    }

    if (shard.hasOwnProperty("parents")) {
      result.parents = dedup(this.parents.concat(shard.parents));
    }

    if (shard.hasOwnProperty("children")) {
      result.children = dedup(this.children.concat(shard.children));
    }

    if (shard.hasOwnProperty("loadOrder")) {
      result.loadOrder = dedup(this.loadOrder.concat(shard.loadOrder));
    }

    if (shard.hasOwnProperty("name")) {
      result.name = shard.name;
    }

    if (shard.hasOwnProperty("dest")) {
      result.dest = shard.dest;
    }

    if (shard.hasOwnProperty("content")) {
      result.content = shard.content;
    }

    if (shard.hasOwnProperty("dynamic")) {
      result.dynamic = shard.dynamic;
    }

    if (shard.hasOwnProperty("isMain")) {
      result.isMain = shard.isMain;
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

  setContent(content) {
    return this.configure({ content: content });
  }

  setDynamic(dynamic) {
    return this.configure({ dynamic: dynamic });
  }

  toBundle() {
    return {
      name: this.name,
      modules: this.modules,
      entries: this.isMain || this.dynamic === true ? this.entries : [],
      dest: this.dest,
      content: this.content
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
