const buildShardLoadOrder = require("./loadOrderBuilder");

/**
 * TODO(miguel) We should have a common shard in each on of the
 * entry shards. All common modules across children shards of each
 * entry should go in that corresponding common bundle. Unless
 * a common module occurs across multiple entry shard tree, in which
 * case the module can either in the main common or duplicated in
 * each entry's common shard. The last bit is TBD and perhaps
 * configurable?
 */
function commonShardBuilder(shardRepository, moduleStats) {
  const targetShardName = shardRepository.getMainShard().shards["common"];
  const sourceShardNames = shardRepository.getEntryShards().map(shard => shard.name);
  const commonShardInfo = buildCommonShardInfo(sourceShardNames, shardRepository, moduleStats);

  shardRepository.setShard(shardRepository.getShard(targetShardName).addModules(commonShardInfo.commonModules));

  Object
    .keys(commonShardInfo.shardMap)
    .forEach(shardName => {
      const shard = shardRepository.getShard(shardName);
      const nonDuplicatedModules = shard.modules.filter(moduleId => !commonShardInfo.shardMap[shardName].modules[moduleId]);
      shardRepository.setShard(shard.setModules(nonDuplicatedModules));
    });
}


/**
 * Function that finds which modules appear in more than one shard returning
 * a list of those modules as well as the list of shards in which those duplicate
 * modules appeared in.  The only modules that will not be considered common,
 * even if found in multiple shards are those that are entry points to a shard.
 * The algorithm here only processes shards with the names in sourceShardNames
 * and well their children.
 * 
 * @param sourceShardNames array of shard names to check for duplicate modules in.
 *    The algorithm here will travese children shards as well.
 * @param shardRepository shard repository that contains all the shards.
 * @param moduleStats contains the information about which shards a particular
 *    module exists in
 */
function buildCommonShardInfo(sourceShardNames, shardRepository, moduleStats) {
  var result = {
    commonModules: [],
    shardMap: {}
  };

  // Traverse the shard tree starting from sourceShardNames and get
  // a flatten list of shard names. These are all the shards we will
  // be looking at.
  const shardNames = buildShardLoadOrder(sourceShardNames, shardRepository);

  function isModuleEntryPoint(shardName, moduleId) {
    return shardRepository.getShard(shardName).entries.indexOf(moduleId) !== -1;
  }

  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      const shardsWithDuplicates = shardNames.filter(shardName => moduleStats[moduleId].shards[shardName]);
      const entryPointShardName = shardsWithDuplicates.find(shardName => isModuleEntryPoint(shardName, moduleId));

      // If the module is not an entry point, then we will tag it as a common module.
      if (!entryPointShardName) {
        result.commonModules.push(moduleId);
      }

      shardsWithDuplicates
        .filter(shardName => entryPointShardName !== shardName)
        .forEach(shardName => {
          if (!result.shardMap[shardName]) {
            result.shardMap[shardName] = { modules: {} };
          }

          result.shardMap[shardName].modules[moduleId] = true;
        });
    });

  return result;
}

module.exports = commonShardBuilder;
