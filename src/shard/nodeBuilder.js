const Shard = require("./shard");
const moduleHash = require("../moduleHash");

module.exports = function nodeBuilder(moduleCache, splitters) {
  var moduleStats = {};

  function buildSplitPoint(mod, stats) {
    var splitter = splitters.find(splitter => splitter.isMatch(mod, stats));

    if (splitter) {
      return {
        name: splitter.name,
        dest: splitter.dest,
        isDynamic: !!splitter.dynamic
      };
    }
  }

  function isSplitPoint(node1, node2) {
    return node1 && node2 && node1.name !== node2.name;
  }

  function buildNode(node) {
    var currentNode = node;
    var moduleIndex = 0, moduleList = node.entries.slice(0);
    var currentModule;
    var entries = [];
    var splitPoints = {};
    var splitPoint;

    for (moduleIndex = 0; moduleList.length !== moduleIndex; moduleIndex++) {
      currentModule = moduleCache[moduleList[moduleIndex]];

      if (!currentModule) {
        continue;
      }

      // If module is already processed, then we just update shards
      // keeping track of this particular module. Make sure to exclude
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

        if (isSplitPoint(currentNode, splitPoint)) {
          if (!splitPoints[splitPoint.name]) {
            splitPoints[splitPoint.name] = new Shard(splitPoint);
          }

          splitPoints[splitPoint.name] = splitPoints[splitPoint.name].merge({ parents: currentNode.name, entries: currentModule.id });
          currentNode = currentNode.addChildren(splitPoint.name);
          moduleList[moduleIndex] = null;
        }
        else {
          moduleList = moduleList.concat(currentModule.deps.filter(dep => !dep.dynamic).map(dep => dep.id));
          moduleStats[currentModule.id] = { shards: { [currentNode.name]: true } };

          // iterate through the dynamic deps and create shards for dynamic loading
          currentModule.deps
            .filter(dep => dep.dynamic)
            .map(dep => moduleCache[dep.id])
            .forEach(dep => {
              const splitPoint = (
                buildSplitPoint(dep, moduleStats[dep.id]) ||
                { name: moduleHash(dep), isDynamic: true, isImplicit: true }
              );

              if (!splitPoints[splitPoint.name]) {
                splitPoints[splitPoint.name] = new Shard(splitPoint);
              }

              splitPoints[splitPoint.name] = splitPoints[splitPoint.name].merge({
                parents: currentNode.name,
                entries: dep.id,
                references: currentModule.id
              });

              currentNode = currentNode.addChildren(splitPoint.name);
            });

          // If a splitPoint is found it means that the currentNode is the split point.
          // So add the module as an entry.
          if (splitPoint) {
            entries.push(currentModule.id);
          }
        }
      }
    }

    return {
      node: currentNode.addModules(moduleList.filter(Boolean)).addEntries(entries),
      splitPoints: splitPoints
    };
  }

  return {
    buildNode: buildNode,
    getStats: () => moduleStats
  };
};
