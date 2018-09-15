const path = require("path");
const buildShardLoadOrder = require("./loadOrderBuilder");
const moduleHash = require("../moduleHash");
const dynamicLoader = require("fs").readFileSync(path.join(__dirname, "../loaders/dynamic.js"));

const dynamicBundleLoader = {
  id: "$dl$",
  name: "$dl$",
  source: dynamicLoader.toString(),
  deps: []
};

/**
 * Builds a list of modules that load dynamic shards that contain
 * modules that are dynamically loaded.
 * 
 * @param shardRepository repository where all shards live
 * @param context bundler context that gives us access to the modules
 *    being processed
 */
function dynamicShardBuilder(shardRepository, context) {
  const results = shardRepository
    .getEntryShards()
    .map(entryShard => ({
      shard: entryShard,
      modules: buildDynamicShardLoader(entryShard, shardRepository, context)
    }));

  results.forEach(result => shardRepository.setShard(result.shard.addModules(result.modules.map(m => m.id))));
  return results.reduce((acc, result) => acc.concat(result.modules), []);
}

function buildDynamicShardLoader(entryShard, shardRepository, context) {
  // Let's get a list of all dynamic shards that are children of the
  // entryShard.
  const dynamicShards = getDynamicShards(entryShard, shardRepository);

  const modules = dynamicShards.reduce((accumulator, dynamicShard) => {
    return dynamicShard.entries
      .map(entryModuleId => context.getModules(entryModuleId))
      .reduce((acc, mod) => {
        return acc.concat(injectDynamicModuleLoader(dynamicShard, shardRepository, mod, context));
      }, accumulator);
  }, []);

  if (modules.length) {
    modules.push(dynamicBundleLoader);
  }

  return modules;
}

/**
 * Function that builds a list of children shards that are dynamically loaded
 * by the entryShard passed in.
 * 
 * @param entryShard Starting point for finding first layer of dynamic shards
 *    that will be dynamically loaded by the entryShard
 * @param shardRepository Repository where we find all shards
 */
function getDynamicShards(entryShard, shardRepository) {
  var shardList = [entryShard.name], dynamicShards = [];
  var parentShard, childrenShards;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    parentShard = shardList[shardIndex];
    childrenShards = shardRepository.getShards(shardRepository.getShard(parentShard).children);
    shardList = shardList.concat(childrenShards.filter(child => !child.isDynamic).map(child => child.name));
    dynamicShards = dynamicShards.concat(childrenShards.filter(child => child.isDynamic));
  }

  return dynamicShards;
}

function injectDynamicModuleLoader(dynamicShard, shardRepository, mod, context) {
  const id = moduleHash(mod);

  const shardPaths = buildShardLoadOrder(dynamicShard.name, shardRepository)
    .map(shardName => shardRepository.getShard(shardName))
    .map(shard => `"./${path.basename(shard.dest)}"`);

  const modulesWithDynamicDeps = context
    .getModules(dynamicShard.references)
    .map(parentModule => parentModule.configure({
      deps: parentModule.deps.map(dep => (dep.id === mod.id ? { name: mod.name, id: id, deps: [] } : dep))
    }));

  // Here we are swapping the ID of dynamic modules with the ID of the
  // module that will load things up.
  return modulesWithDynamicDeps.concat({
      id: id,
      name: mod.name,
      source: buildShimModuleContent(dynamicBundleLoader.id, shardPaths, mod.name),
      deps: [dynamicBundleLoader, mod]
  });
}

function buildShimModuleContent(dynamicLoaderId, shardPaths, moduleName) {
  return `module.exports = require("${dynamicLoaderId}")([${shardPaths}]).then(function() { return require("${moduleName}"); });`;
}

module.exports = dynamicShardBuilder;
