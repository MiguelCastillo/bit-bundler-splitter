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

function createBundlerSplitter(options) {
  var splitters = []
    .concat(options)
    .map(buildOptions)
    .map(buildSplitter);

  function buildOptions(options) {
    options = options || {};
    options.name = options.name || options.dest;
    return options;
  }

  function buildSplitter(options) {
    var matcher = createMatcher(options.match);

    return function splitter(context) {
      if (!hasMatches(context, matcher)) {
        return;
      }

      var modules = getModules(context, matcher);
      var byId = flattenModules(context, modules).reduce((byId, mod) => (byId[mod.id] = mod, byId), {});

      return {
        options: options,
        byId: byId,
        modules: modules
      };
    };
  }

  function createBundle(context, config) {
    var splitContext = context.configure({ modules: config.modules });
    var browserPackOptions = Object.assign({ standalone: false }, config.options);

    return Promise
      .resolve(bundler.bundle(splitContext, { browserPack: browserPackOptions }))
      .then((bundle) => context.addExclude(Object.keys(config.byId)).setShard(config.name, bundle, config.dest));
  }

  function bundleSplitterRun(bundler, context) {
    return splitters
      .map(splitter => splitter(context))
      .filter(Boolean)
      .map(config => createBundle(context, config))
      .reduce((deferred, current) => deferred.then(current), Promise.resolve(context));
  }

  return {
    prebundle: bundleSplitterRun
  };
}

module.exports = createBundlerSplitter;
