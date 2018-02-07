"use strict";

const createShardTreeBuilder = require("./src/shard/treeBuilder");
const createShardRepository = require("./src/shard/repository");
const Splitter = require("./src/splitter");
const Shard = require("./src/shard/shard");
const path = require("path");
const loaderJS = require("fs").readFileSync(path.join(__dirname, "loader.js"));

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

  const dynamicShards = shardRepository
    .getAllShards()
    .filter(shard => shard.dynamic)
    .map(shard => shard.name);

  const rootShards = dynamicShards
    .concat("main")
    .map(shardName => ({
      name: shardName,
      loadOrder: buildShardLoadOrder(shardRepository, shardName)
    }));

  // Move common modules around into the "common" bundle.
  if (createCommonBundle) {
    shardRepository.setShard({ name: "common", dest: path.join(rootDir, "common.js") });
    rootShards.find(shard => shard.name === "main").loadOrder.unshift("common");
  }

  normalizeCommonModules(shardRepository, buildShardLoadOrder(shardRepository, dynamicShards.concat("main")), shardTree.stats);

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

function buildShardLoadOrder(shardRepository, shardNames) {
  var visited = {}, shardDependencyOrder = [], shardList = [].concat(shardNames);
  var shardName, children;

  for (var shardIndex = 0; shardList.length > shardIndex; shardIndex++) {
    children = [shardList[shardIndex]].reduce((accumulator, parent) => accumulator.concat(shardRepository.getShard(parent).children), []);
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
  var commonModules = [];

  Object
    .keys(moduleStats)
    .filter(moduleId => Object.keys(moduleStats[moduleId].shards).length > 1)
    .forEach(moduleId => {
      var shards = shardOrderedList.filter(shardId => moduleStats[moduleId].shards[shardId]);
      var owner = shards.find(shardName => shardRepository.getShard(shardName).entries.indexOf(moduleId) !== -1);

      if (createCommonBundle) {
        // Move common modules around into the "common" bundle.
        if (!owner) {
          commonModules.push(moduleId);
        }
      }
      else {
        // If the module is NOT an entry module, then we will store it in the first bundle
        if (!owner) {
          if (shards.every((shardName) => shardRepository.getShard(shardName).dynamic)) {
            commonModules.push(moduleId);
          }
          else {
            owner = shards[0];
          }
        }
      }

      shards
        .filter(shardName => owner !== shardName)
        .forEach(shardName => {
          const shard = shardRepository.getShard(shardName);
          shardRepository.setShard(shard.setModules(shard.modules.filter(id => id !== moduleId)));
        });
    });

  if (commonModules.length) {
    // Move common modules around into the "common" bundle.
    if (createCommonBundle) {
      shardRepository.setShard(shardRepository.getShard("common").setModules(commonModules));
    }
    else {
      shardRepository.setShard(shardRepository.getShard("main").addModules(commonModules));
    }
  }
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
