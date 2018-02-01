const Shard = require("./shard");

module.exports = function nodeBuilder(moduleCache, splitters) {
  var moduleStats = {};

  function buildSplitPoint(mod, stats) {
    var splitter = splitters.find(splitter => splitter.isMatch(mod, stats));

    if (splitter) {
      return {
        name: splitter.name,
        dest: splitter.dest,
        dynamic: splitter.dynamic
      };
    }
  }

  function nodesNotEqual(node1, node2) {
    return node1 && node2 && node1.name !== node2.name;
  }

  function buildNode(node) {
    var currentNode = node;
    var moduleIndex = 0, moduleList = node.entries.slice(0);
    var currentModule;
    var splitPoints = {};
    var splitPoint;

    for (moduleIndex = 0; moduleList.length !== moduleIndex; moduleIndex++) {
      currentModule = moduleCache[moduleList[moduleIndex]];

      if (!currentModule) {
        continue;
      }

      // If module is already processed, then we just update shards
      // keeping track of this particular modules. Make sure to exclude
      // dynamic modules since they go in different shards.
      if (moduleStats[currentModule.id]) {
        if (moduleStats[currentModule.id].shards[currentNode.name]) {
          moduleList[moduleIndex] = null;
        }
        else {
          moduleStats[currentModule.id].shards[currentNode.name] = true;
          moduleList = moduleList.concat(currentModule.deps.filter(dep => !dep.dynamic).map(dep => dep.id));
        }
      }
      else {
        splitPoint = buildSplitPoint(currentModule, moduleStats[currentModule.id]);

        if (nodesNotEqual(currentNode, splitPoint)) {
          if (!splitPoints[splitPoint.name]) {
            splitPoints[splitPoint.name] = new Shard(splitPoint);
          }

          currentNode = currentNode.addChildren(splitPoint.name);
          splitPoints[splitPoint.name] = splitPoints[splitPoint.name].addEntries(currentModule.id).addParents(currentNode.name);
          moduleList[moduleIndex] = null;
        }
        else {
          moduleList = moduleList.concat(currentModule.deps.filter(dep => !dep.dynamic).map(dep => dep.id));
          moduleStats[currentModule.id] = { shards: { [currentNode.name]: true } };

          // iterate through the dynamic deps and create shards for dynamic loading
          currentModule.deps
            .filter(dep => dep.dynamic)
            .forEach(dep => {
              splitPoints[dep.id] = new Shard({ name: dep.id, dynamic: true, entries: [dep.id], implicit: true });
            });
        }
      }
    }

    return {
      node: currentNode.addModules(moduleList.filter(Boolean)),
      splitPoints: splitPoints
    };
  }

  return {
    buildNode: buildNode,
    getStats: () => moduleStats
  };
};
