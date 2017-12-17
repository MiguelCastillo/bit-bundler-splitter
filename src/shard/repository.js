const Shard = require("./shard");

module.exports = function createRepository() {
  var shards = {};

  function getShardByName(names) {
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
      shard instanceof Shard ? shard :
      shards[shard.name] ? shards[shard.name].configure(shard) :
      new Shard(shard)
    );

    return shards[shard.name];
  }

  return {
    getShardByName: getShardByName,
    createShard: createShard,
    setShard: setShard
  };
};
