const Shard = require("./shard");

module.exports = function createRepository() {
  var shards = {};

  function getAllShards() {
    return Object.keys(shards).map(shardName => shards[shardName]);
  }

  function getShard(names) {
    return Array.isArray(names) ?
      names.map(name => shards[name]) :
      shards[names];
  }

  function createShard(name, entries, splitter) {
    return new Shard({
      name: name,
      entries: entries,
      splitter: splitter
    });
  }

  function setShard(shard) {
    shards[shard.name] = (
      shard instanceof Shard ?
        shard : shards[shard.name] ? shards[shard.name].configure(shard) : new Shard(shard)
    );

    return shards[shard.name];
  }

  return {
    getAllShards: getAllShards,
    getShard: getShard,
    createShard: createShard,
    setShard: setShard
  };
};
