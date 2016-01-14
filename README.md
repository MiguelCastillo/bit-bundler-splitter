# bit-bundler-splitter
> bit-bundler plugin for splitting bundles up

This plugin helps slice and dice your application bundle into smaller bundles which we refer to as bundle parts. The more common use case is to split out the vendor (3rd party) modules into a separate bundle. This is to maximize browsers' caching capabilities; generally speaking vendor bundles do not change frequencetly and browsers can cache them rather efficiently. Vendor bundles also tend to be larger than your more frequently changing application bundle, and this generally translates to a reduction in traffic.

`bit-bundler-splitter` uses [roolio](https://github.com/MiguelCastillo/roolio) to provide a flexible way to configure matching rules that control how bundles are split. More on this in the examples section.

### Install

```
$ npm install --save-dev bit-bundler-splitter
```

### Recipes

#### grunt recipe

This example shows a basic `bit-bundler` setup with `bit-bundler-splitter` splitting out vendor bundles.

> `bit-bundler-splitter` splits out vendor modules by default when no matching rules are defined.

``` javascript
module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var jsBundler = require("bit-bundler-browserpack");
  var splitBundle = require("bit-bundler-splitter");
  var jsPlugin = require("bit-loader-js");

  grunt.initConfig({
    pkg: pkg,
    bitbundler: {
      build: {
        files: [{
          src: "src/main.js",
          dest: "dist/app.js"
        }],
        loader: {
          plugins: jsPlugin()
        },
        bundler: jsBundler({
          plugins: [
            splitBundle("dist/vendor.js")
          ]
        })
      }
    }
  });

  grunt.registerTask("build", ["bitbundler:build"]);
};
```

### API

#### splitBundle( dest: string, options: object )

`bit-bundler-splitter` exports a function that we generally call `splitBundle`.  The first parameter is the destination of where the bundle is going to be written to relative to the current working directory.  The second parameter are options to define matching rules, which is how we configure how bundles are split.

- @param {string} dest - File name where the bundle is going to be written to relative to the working directory
- @param {object} options - Configuration options explained below.

The options that `splitBundle` take are for configuring matching rules to determine which modules go in which bundle. Matching rules can match anything that is in the module object, which includes `path`, `name`, and `source`; matching rules essentially match the shape of modules. These matching rules can be `regex`, `string`, or a `function`.  Please see [roolio matchers](https://github.com/MiguelCastillo/roolio#matchers) for more details on defining rules.


### Examples
Let's take a look at a setup that matches any module name that only has word characters. e.g. "jquery". This is a really simple heuristic for identifying vendor modules, and it is also the default behavior for `bit-bundler-splitter` when no options are provided.

> By default, `bit-bundler-splitter` will split out vendor modules when no options are provided.

``` javascript
splitBundle("dest/vendor.js", {
  match: {
    name: /^\w+/
  }
});
```

This is an example for matching a particular module name:

``` javascript
splitBundle("dest/three.js", {
  match: {
    name: "three"
  }
});
```

You can further specify a regex to match particular paths.

``` javascript
splitBundle("dest/common.js", {
  match: {
    path: /common/
  }
});
```

You can also specify multiple matching rules.

``` javascript
splitBundle("dest/vendor.js", {
  match: {
    name: "jquery",
    path: /views/
  }
});
```


### License

Licensed under MIT