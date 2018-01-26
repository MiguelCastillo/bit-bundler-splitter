const createNodeBuilder = require("./nodeBuilder");

function treeBuilder(moduleCache, splitters, shardRepository) {

  /** the tree is built using a breadth first traversal */
  function buildTree(rootShardName, rootModuleIds) {
    shardRepository.setShard({ name: rootShardName, entries: rootModuleIds });

    const nodeBuilder = createNodeBuilder(moduleCache, splitters, shardRepository);
    var shardList = [{ name: rootShardName, entries: rootModuleIds }];
    var splitPoints;

    for (var shardIndex = 0; shardList.length !== shardIndex; shardIndex++) {
      splitPoints = nodeBuilder.buildNode(shardList[shardIndex]);
      splitPoints = Object.keys(splitPoints).map(key => ({ name: key, entries: splitPoints[key].entries }));
      shardList = shardList.concat(splitPoints);
    }

    return nodeBuilder.getStats();
  }

  return {
    buildTree: buildTree
  };
}


module.exports = treeBuilder;
