"use strict";

const createShardTreeBuilder = require("./src/shard/treeBuilder");
const createShardRepository = require("./src/shard/repository");
const Splitter = require("./src/splitter");
const Shard = require("./src/shard/shard");
const path = require("path");
const crypto = require("crypto");
const loaderJS = require("fs").readFileSync(path.join(__dirname, "loader.js"));

function createSplitter(options) {
  return new Splitter(options);
}

function normalizeOptions(options) {
  options = options || {};
  options.name = options.name || options.dest;
  return options;
}

function splitContext(bundler, context, splitters) {
  const mainBundle = context.getBundles("main");
  const rootDir = getDirname(mainBundle.dest);
  const shardTree = createShardTreeBuilder(context.getCache(), splitters).buildTree(new Shard(mainBundle));
  const shardRepository = createShardRepository();

  // Setup the shard repository to make it easier to make changes to the shards.
  Object.keys(shardTree.nodes).forEach(shardName => shardRepository.setShard(shardTree.nodes[shardName]));

  debugger;
  const dynamicShards = shardRepository
    .getAllShards()
    .filter(shard => shard.dynamic)
    .map(shard => shard.implicit ? shard.setDest(path.join(rootDir, getHash(shard.dest), path.extname(shard.dest))) : shard);

  const rootShards = [shardRepository.getShard("main")]
    .concat(dynamicShards)
    .map(shard => ({
      shard: shard,
      loadOrder: buildShardLoadOrder(shardRepository, shard.name)
    }));

  // Move things around in the shard tree based on load order.
  rootShards.forEach(rootShard => normalizeCommonModules(shardRepository, rootShard.loadOrder, shardTree.stats));

  // Rebuild the context with the shards.
  const updatedContext = shardRepository
    .getAllShards()
    .filter(shard => shard.modules.length)
    .reduce((context, shard) => context.setBundle(shard.toBundle()), context);

  return rootShards
    .map(rootShard => buildShardLoader(rootShard, shardRepository))
    .filter(Boolean)
    .reduce((context, loader) => context.setBundle(loader), updatedContext);
}

function buildShardLoader(shardInfo, shardRepository) {
  const dest = shardInfo.shard.dest && typeof shardInfo.shard.dest === "string" ? shardInfo.shard.dest : null;

  if (!dest) {
    return;
  }

  const dirname = path.dirname(dest);
  const filename = "loader-" + path.basename(dest);

  const shardPaths = shardRepository
    .getShard(shardInfo.loadOrder)
    .map(shard => shard.dest)
    .filter(shardPath => shardPath && typeof shardPath === "string")
    .map(shardPath => `"./${path.relative(dirname, shardPath)}"`);

  return {
    name: filename,
    content: `(function(){\n${loaderJS}\n;load([${shardPaths}]);\n})();`,
    dest: path.join(dirname, filename)
  };
}

function buildShardLoadOrder(shardRepository, shardNames) {
  var visited = {}, shardDependencyOrder = [], shardList = [].concat(shardNames);
  var shardName, children;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    children = [shardList[shardIndex]].reduce((accumulator, parent) => {
      const shard = shardRepository.getShard(parent);
      return shard.dynamic ? accumulator : accumulator.concat(shard.children);
    }, []);

    shardList = shardList.concat(children);
  }

  for (var index = shardList.length; index; index--) {
    shardName = shardList[index - 1];
    if (!visited[shardName]) {
      visited[shardName] = true;
      shardDependencyOrder.push(shardName);
    }
  }

  return shardDependencyOrder;
}

function normalizeCommonModules(shardRepository, shardOrderedList, moduleStats) {
  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      var shards = shardOrderedList.filter(shardId => moduleStats[moduleId].shards[shardId]);
      var entry = shards.find(shardId => shardRepository.getShard(shardId).entries.indexOf(moduleId) !== -1);

      // If the module is NOT an entry module, then we will store in the first
      // shard in the rotation so that the module gets loaded early in the
      // dependency tree.
      if (entry === undefined) {
        shards.shift();
      }

      shards
        .filter(shardId => entry !== shardId)
        .forEach(shardId => {
          const shard = shardRepository.getShard(shardId);
          shardRepository.setShard(shard.setModules(shard.modules.filter(id => id !== moduleId)));
        });
    });
}

function getDirname(filepath) {
  return filepath && typeof filepath === "string" ? path.dirname(filepath) : null;
}

function getHash(input) {
  return crypto
    .createHash("sha256")
    .update(input.toString())
    .digest("hex");
}

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(normalizeOptions)
    .map(createSplitter);

  function bundleSplitterRun(bundler, context) {
    return splitContext(bundler, context, splitters);
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
