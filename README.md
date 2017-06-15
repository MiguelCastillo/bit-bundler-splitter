# bit-bundler-splitter
> bit-bundler plugin for splitting bundles up

This plugin helps slice and dice your application bundle into smaller bundles which we refer to as bundle shards. The more common use case is to split out the vendor (3rd party) modules into a separate bundle. This is to maximize browsers' caching capabilities; generally speaking vendor bundles do not change frequently and browsers can cache them rather efficiently. Vendor bundles also tend to be larger than your more frequently changing application bundles, which generally translates to a reduction in traffic.

`bit-bundler-splitter` uses [roolio](https://github.com/MiguelCastillo/roolio) to provide a flexible way to configure matching rules that control how bundles are split. More on this in the examples section.

### Install

```
$ npm install --save-dev bit-bundler-splitter
```

### example

This example shows a basic `bit-bundler` setup with `bit-bundler-splitter` splitting out vendor bundles by matching the path of module. If the module path contains `bower_components` or `node_modules` then it is considered a 3rd party library and it gets push to the vendor bundle. We are also splitting out modules whose path contains `src/renderer` and writing that out as a separate bundle.

> `bit-bundler-splitter` splits out vendor modules by default when no matching rules are defined.

``` javascript
var Bitbundler = require("bit-bundler");
var splitBundle = require("bit-bundler-splitter");

var bitbundler = new Bitbundler({
  loader: [
    "bit-loader-js",
    "bit-loader-babel"
  ],
  bundler: [
    splitBundle("dest/splitter-vendor.js", { match: { path: [/\/bower_components\//, /\/node_modules\//] } }),
    splitBundle("dest/splitter-renderer.js", { match: { path: /src\/renderer/ } })
  ]
});

bitbundler.bundle({
  src: "src/main.js",
  dest: "dest/splitter-main.js"
});
```

### API

#### splitBundle( name: string, options: object )

`bit-bundler-splitter` exports a function that we generally call `splitBundle`.  The first parameter is the name of the bundle. If there is no dest specified in the options, then the name is used as the file path for writing the bundle. The second parameter are options to define matching rules, which is how we configure how bundles are split. Options can also contain `dest` which is where the bundle is written to. `dest` can be a file name or a stream.

- @param {string} name - name of the bundle. When there is no `dest` option specified, then the name is used as the file path to write bundles to.
- @param {object} options - Configuration options explained below.

The primary options that `splitBundle` take are for configuring matching rules to determine which modules go in which bundle. Matching rules can match anything that is in the module object, which includes `path`, `filename`, and `source`; matching rules essentially match the shape of modules. These matching rules can be `regex`, `string`, or a `function`.  Please see [roolio matchers](https://github.com/MiguelCastillo/roolio#matchers) for more details on defining rules.

You can also configure the destination for the bundle, which can be a string (file path) or a writable stream.


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

Now, let's specify a bundle name and a destination where the bundle is going to be written to.

``` javascript
splitBundle("vendor", {
  dest: "dest/vendor.js",
  match: {
    name: "jquery",
    path: /views/
  }
});
```

Destination can alternatively be a stream.

``` javascript
splitBundle("vendor", {
  dest: process.stdout,
  match: {
    name: "jquery",
    path: /views/
  }
});
```


### License

MIT
