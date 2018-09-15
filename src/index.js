"use strict";

const createShardTreeBuilder = require("./shard/treeBuilder");
const createShardRepository = require("./shard/repository");
const Splitter = require("./splitter");
const Shard = require("./shard/shard");
const path = require("path");
const buildShardLoadOrder = require("./shard/loadOrderBuilder");
const buildStaticShardLoader = require("./shard/staticLoaderBuilder");
const buildDynamicShards = require("./shard/dynamicShardBuilder");
const buildCommonShards = require("./shard/commonShardBuilder");


function createSplitter(options) {
  return new Splitter(options);
}

function normalizeOptions(options) {
  options = options || {};
  options.name = options.name || options.dest;
  return options;
}

function splitContext(context, splitters) {
  const treeBuilder = createShardTreeBuilder(context.getCache(), splitters);
  const shardTree = treeBuilder.buildTree(new Shard(context.getBundles("main")));
  const shardRepository = buildShardRepository(shardTree);

  buildCommonShards(shardRepository, shardTree.stats);

  const updatedContext = context.setCache(
    buildDynamicShards(shardRepository, context)
      .reduce((acc, mod) => (acc[mod.id] = mod, acc), context.getCache())
  );

  buildStaticShardLoader(shardRepository);

  // Rebuild the context with the current shards.
  return shardRepository
    .getAllShards()
    .filter(shard => shard.modules.length || shard.content)
    .reduce((ctx, shard) => ctx.setBundle(shard.toBundle()), updatedContext);
}


function getDirname(filepath) {
  return filepath && typeof filepath === "string" ? path.dirname(filepath) : null;
}

function updateImplicitDynamicShardDest(shard, rootDir) {
  // Implicit dynamic bundles dont have a valid dest since the split
  // occurs because of a dynamically loaded module rather than a split
  // rule in which you specify a destination.
  return shard.isDynamic && shard.isImplicit ? shard.merge({ dest: path.join(rootDir, shard.dest) }) : shard;
}

function configureLoadOrder(shard, shardRepository) {
  return shard.isDynamic || shard.isMain ? shard.merge({ loadOrder: buildShardLoadOrder(shard.name, shardRepository) }) : shard;
}

function buildShardRepository(shardTree) {
  const shardRepository = Object
    .keys(shardTree.nodes)
    .map(shardName => shardTree.nodes[shardName])
    .reduce((repository, shard) => (repository.setShard(shard), repository), createShardRepository());

  const mainShard = shardRepository.getMainShard();
  const rootDir = getDirname(mainShard.dest);

  shardRepository
    .getAllShards()
    .map(shard => updateImplicitDynamicShardDest(shard, rootDir))
    .map(shard => configureLoadOrder(shard, shardRepository))
    .forEach(shard => shardRepository.setShard(shard));

  // TODO(miguel) When we add logic for having dynamic bundles
  // load their own common bundle then we can enable the lines
  // below to autogen common shards for the dynamic bundles.
  // shardRepository
  //   .getAllShards()
  //   .filter(shard => typeof shard.dest === "string" && shard.isDynamic)
  //   .concat(shardRepository.getShard(mainBundle.name))
  [shardRepository.getMainShard()]
    .forEach(shard => {
      ["common"].forEach((type) => {
        const dest = shard.dest;
        const dirname = path.dirname(dest);
        const filename = type + "-" + path.basename(dest);
        const name = type + "-" + path.basename(dest);

        shardRepository.setShard({
          name: name,
          dest: path.join(dirname, filename)
        });

        shardRepository.setShard(Object.assign({}, shard, {
          loadOrder: [name].concat(shard.loadOrder),
          shards: Object.assign({[type]: name}, shard.shards)
        }));
      });
    });

  return shardRepository;
}

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(normalizeOptions)
    .map(createSplitter);

  function bundleSplitterRun(bundler, context) {
    return splitContext(context, splitters);
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
