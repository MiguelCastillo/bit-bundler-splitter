"use strict";

const createShardTreeBuilder = require("./shard/treeBuilder");
const createShardRepository = require("./shard/repository");
const Splitter = require("./splitter");
const Shard = require("./shard/shard");
const path = require("path");
const loaderJS = require("fs").readFileSync(path.join(__dirname, "../loader.js"));

//
// Ugh - I wish we had actual support for macros in JS. Anyways,
// this flag for an experimental/temporary switch to generate
// a separate common bundle instead of stuffing common modules
// in the best suitable bundle. Separate bundle create an extra
// request to load... But it's a bit cleaner of a mental model.
// Stuffing modules in the best suitable bundle removes the extra
// bundle that needs to be loaded, but it isn't obviously clear
// which bundle a common module will end in.
//
const createCommonBundle = false;

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
  const shardRepository = buildShardRepository(shardTree);

  // Implicit dynamic bundles dont have a valid dest since the split
  // occurs because of a dynamically loaded module rather than a split
  // rule in which you specify a destination.
  shardRepository
    .getAllShards()
    .filter(shard => shard.dynamic && shard.implicit)
    .forEach(shard => shardRepository.setShard(configureDest(shard, rootDir)));

  const rootShards = shardRepository
    .getAllShards()
    .filter(shard => shard.dynamic)
    .concat(shardRepository.getShard("main"))
    .map(shard => ({
      name: shard.name,
      shards: {},
      loadOrder: buildShardLoadOrder(shard.name, shardRepository)
    }));

  normalizeCommonModules(createCommonBundle ? "common-main" : "main", rootShards.map(shard => shard.name), shardRepository, shardTree.stats);

  // Rebuild the context with the current shards.
  var updatedContext = shardRepository
    .getAllShards()
    .filter(shard => shard.modules.length)
    .reduce((context, shard) => context.setBundle(shard.toBundle()), context);

  return rootShards
    .map(shard => buildShardLoader(shard, shardRepository))
    .filter(Boolean)
    .reduce((context, shard) => context.setBundle(shard), updatedContext);
}

function buildShardLoader(shardInfo, shardRepository) {
  const shard = shardRepository.getShard(shardInfo.name);
  const dest = shard.dest && typeof shard.dest === "string" ? shard.dest : null;

  if (!dest || !shard.modules.length) {
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

function buildShardLoadOrder(shardNames, shardRepository) {
  var visited = {}, loadOrder = [], shardList = [].concat(shardNames);
  var parent, shard, shardName;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    parent = shardList[shardIndex];
    shard = shardRepository.getShard(shardRepository.getShard(parent).children);
    shardList = shardList.concat(shard.filter(child => !child.dynamic).map(child => child.name));
  }

  for (var index = shardList.length; index; index--) {
    shardName = shardList[index - 1];
    if (!visited[shardName]) {
      visited[shardName] = true;
      loadOrder.push(shardName);
    }
  }

  return loadOrder;
}

function normalizeCommonModules(targetShardName, sourceShardNames, shardRepository, moduleStats) {
  const shardLoadOrder = buildShardLoadOrder(sourceShardNames, shardRepository);
  const commonShardInfo = buildCommonShard(shardLoadOrder, shardRepository, moduleStats);

  shardRepository.setShard(shardRepository.getShard(targetShardName).addModules(commonShardInfo.commonModules));

  Object
    .keys(commonShardInfo.shardMap)
    .forEach(shardName => {
      const shard = shardRepository.getShard(shardName);
      const modules = shard.modules.filter(moduleId => !commonShardInfo.shardMap[shardName].modules[moduleId]);
      shardRepository.setShard(shard.setModules(modules));
    });
}

function buildCommonShard(shardNames, shardRepository, moduleStats) {
  var result = {
    commonModules: [],
    shardMap: {}
  };

  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      const shardsWithDuplicates = shardNames.filter(shardName => moduleStats[moduleId].shards[shardName]);
      var owner = shardsWithDuplicates.find(shardName => shardRepository.getShard(shardName).entries.indexOf(moduleId) !== -1);

      if (!owner) {
        if (createCommonBundle || shardsWithDuplicates.every((shardName) => shardRepository.getShard(shardName).dynamic)) {
          result.commonModules.push(moduleId);
        }
        else {
          owner = shardsWithDuplicates[0];
        }
      }

      shardsWithDuplicates
        .filter(shardName => owner !== shardName)
        .forEach(shardName => {
          if (!result.shardMap[shardName]) {
            result.shardMap[shardName] = { modules: {} };
          }

          result.shardMap[shardName].modules[moduleId] = true;
        });
    });

  return result;
}

function getDirname(filepath) {
  return filepath && typeof filepath === "string" ? path.dirname(filepath) : null;
}

function buildShardRepository(shardTree) {
  // Setup the shard repository to make it easier to make changes to the shards.
  return Object
    .keys(shardTree.nodes)
    .map(shardName => shardTree.nodes[shardName])
    .reduce((repository, shard) => (repository.setShard(shard), repository), createShardRepository());
}

function configureDest(shard, rootDir) {
  return (
    shard.dynamic && shard.implicit ?
      shard.configure({
        dest: path.join(rootDir, shard.dest)
      }) : shard);
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
