var Rule = require("roolio");

function createMatcher(matches) {
  matches = matches || { name: /^\w+/ };

  var rules = Object
    .keys(matches)
    .reduce((rules, matchName) => {
      rules[matchName] = (new Rule()).addMatcher(matches[matchName]);
      return rules;
    }, {});

  return function matcher(mod) {
    return !rules || Object.keys(rules).some(function(rule) {
      return rules[rule].match(mod[rule]);
    });
  };
}

function hasMatches(context, matcher) {
  return Object.keys(context.cache)
    .map(key => context.cache[key])
    .some(matcher);
}

function getModules(context, matcher) {
  var result = [], processed = {}, i = 0, currentModule;
  var stack = context.modules.slice(0);

  while (stack.length !== i) {
    currentModule = stack[i++];

    if (!processed[currentModule.id]) {
      currentModule = processed[currentModule.id] = context.cache[currentModule.id];

      if (matcher(currentModule)) {
        result.push(currentModule);
      }
      else {
        stack.push.apply(stack, currentModule.deps);
      }
    }
  }

  return result;
}

function flattenModules(context, root) {
  var result = [], stack = root.slice(0), i = 0;
  var currentModule, processed = {};

  while(stack.length !== i) {
    currentModule = stack[i++];

    if (!processed[currentModule.id]) {
      currentModule = processed[currentModule.id] = context.cache[currentModule.id];
      result.push(currentModule);
      stack.push.apply(stack, currentModule.deps);
    }
  }

  return result;
}

function createSplitter(options) {
  var matcher = createMatcher(options.match);

  return function splitter(context) {
    if (!hasMatches(context, matcher)) {
      return;
    }

    return Object.assign({}, options, {
      modules: getModules(context, matcher)
    });
  };
}

function normalizeOptions(options) {
  options = options || {};
  options.name = options.name || options.dest;
  return options;
}

function createBundle(bundler, context, shard) {
  var rootModules = context.modules.map(mod => mod.id);
  var shardContext = context.configure({ modules: shard.modules }).addExclude(rootModules);
  var browserPackOptions = Object.assign({ standalone: false }, shard.options);
  var moduleIds = flattenModules(context, shard.modules).map((mod) => mod.id).filter(id => !rootModules.includes(id));

  return Promise
    .resolve(bundler.bundle(shardContext, { browserPack: browserPackOptions }))
    .then((bundledShard) => context.addExclude(moduleIds).setShard(shard.name, bundledShard, shard.dest));
}

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(normalizeOptions)
    .map(createSplitter);

  function bundleSplitterRun(bundler, context) {
    return splitters
      .map(split => split(context))
      .filter(Boolean)
      .reduce((deferred, shard) => deferred.then((context) => createBundle(bundler, context, shard)), Promise.resolve(context));
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
