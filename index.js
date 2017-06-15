var Rule = require("roolio");
var utils = require("belty");

function createMatcher(matches) {
  matches = matches || { name: /^\w+/ };

  var rules = Object
    .keys(matches)
    .reduce(function(rules, matchName) {
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
    .map(function(key) { return context.cache[key]; })
    .some(matcher);
}

function getModules(context, matcher) {
  var stack = context.modules.slice(0);
  var vendor = [], processed = {}, i = 0, mod;

  while (stack.length !== i) {
    mod = stack[i++];
    if (processed.hasOwnProperty(mod.id)) {
      continue;
    }

    mod = context.cache[mod.id];
    processed[mod.id] = mod;

    if (matcher(mod)) {
      vendor.push(mod);
    }
    else {
      stack.push.apply(stack, mod.deps);
    }
  }

  return vendor;
}

function splitBundle(name, options) {
  options = options || {};
  var matcher = createMatcher(options.match);

  function splitBundleDelegate(bundler, context) {
    if (!hasMatches(context, matcher)) {
      return context;
    }

    var browserPackOptions = utils.merge({ standalone: false }, options.options);
    var splitModules = getModules(context, matcher);
    var splitExclude = splitModules.map(function(mod) { return mod.id; });
    var splitContext = context.configure({ modules: splitModules });

    return Promise
      .resolve(bundler.bundle(splitContext, { browserPack: browserPackOptions }))
      .then(function(bundle) {
        return context.addExclude(splitExclude).setShard(name, bundle, options.dest);
      });
  };

  return {
    prebundle: splitBundleDelegate
  };
}

module.exports = splitBundle;
