const path = require("path");
const staticLoader = require("fs").readFileSync(path.join(__dirname, "../loaders/static.js"));

function staticLoaderBuilder(shardRepository) {
  shardRepository
    .getEntryShards()
    .filter(shard => !shard.isDynamic)
    .map(shard => buildStaticLodaer(shard, shardRepository))
    .filter(Boolean)
    .forEach(shard => shardRepository.setShard(shard));
}

function buildStaticLodaer(shard, shardRepository) {
  const dest = shard.dest && typeof shard.dest === "string" ? shard.dest : null;

  if (!dest || !shard.modules.length) {
    return;
  }

  const dirname = path.dirname(dest);
  const filename = "loader-" + path.basename(dest);

  const shardPaths = shardRepository
    .getShards(shard.loadOrder)
    .filter(shard => shard.modules.length || shard.content)
    .map(shard => shard.dest)
    .filter(shardPath => shardPath && typeof shardPath === "string")
    .map(shardPath => `"./${path.relative(dirname, shardPath)}"`);

  return {
    name: filename,
    content: `(function(){\n${staticLoader}\n;load([${shardPaths}]);\n})();`,
    dest: path.join(dirname, filename)
  };
}

module.exports = staticLoaderBuilder;
