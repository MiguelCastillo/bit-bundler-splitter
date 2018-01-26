const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters, shardRepository) {

  /** the tree is built using a breadth first traversal */
  function buildTree(rootShardName, rootModuleIds) {
    shardRepository.setShard({ name: rootShardName, entries: rootModuleIds });

    const nodeBuilder = createNodeBuilder(moduleCache, splitters, shardRepository);
    var shardList = [{ name: rootShardName, entries: rootModuleIds }];
    var result;

    for (var shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      result = nodeBuilder.buildNode(shardList[shardIndex]);
      result = Object.keys(result).map(key => ({ name: key, entries: result[key].entries }));
      shardList = shardList.concat(result);
    }

    return nodeBuilder.getStats();
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
