# bit-bundler-splitter

[![Greenkeeper badge](https://badges.greenkeeper.io/MiguelCastillo/bit-bundler-splitter.svg)](https://greenkeeper.io/)
> bit-bundler plugin for splitting bundles up

This plugin helps slice and dice your application bundle into smaller bundles which we refer to as bundle shards. The more common use case is to split out the vendor (3rd party) modules into a separate bundle. This is to maximize browsers' caching capabilities; generally speaking vendor bundles do not change frequently and browsers can cache them rather efficiently. Vendor bundles also tend to be larger than your more frequently changing application bundles, which generally translates to a reduction in traffic when properly cached by the browser.

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

Bitbundler.bundle({
  src: "src/main.js",
  dest: "dest/splitter-main.js"
}, {
  loader: [
    "bit-loader-js",
    "bit-loader-babel"
  ],
  bundler: [
    ["bit-bundler-splitter", [
      { name: "vendor", dest: "dest/vendor.js", match: { path: [/\/bower_components\//, /\/node_modules\//] } },
      { name: "renderer", dest: "dest/renderer.js", match: { path: /src\/renderer/ } } ]
    ]
  ]
});
```

### API

#### splitBundle( options: object )

`bit-bundler-splitter` exports a function that we generally call `splitBundle`.

- @param {object} options - Configuration options explained below.
  - `match`, matching rules which is how we configure how bundles are split.
  - `dest`, which is where the bundle is written to; `dest` can be a file path or a stream.
  - `name`, which is the name of the bundle. Other plugins can access these shards by name if need be.

More on matching rules:
Matching rules can match anything that is in the module object, which includes `path`, `filename`, and `source`; matching rules essentially match the shape of modules. These matching rules can be `regex`, `string`, or a `function`.  Please see [roolio matchers](https://github.com/MiguelCastillo/roolio#matchers) for more details on defining rules.


### Examples

Let's take a look at a setup that matches any module name that only has alpha numeric characters. e.g. "jquery".

``` javascript
splitBundle({
  match: {
    name: /^\w+/
  }
});
```

This is an example for matching a particular module name:

``` javascript
splitBundle({
  match: {
    name: "three"
  }
});
```

You can further specify a regex to match particular paths.

``` javascript
splitBundle({
  match: {
    path: /common/
  }
});
```

You can also specify multiple matching rules. In this case only module with name "jquery" that have "views" in its file path will match this.

``` javascript
splitBundle({
  match: {
    name: "jquery",
    path: /views/
  }
});
```

Now, let's specify a bundle name and a destination where the bundle is going to be written to and a name.

``` javascript
splitBundle({
  name: "vendor",
  dest: "dest/vendor.js",
  match: {
    name: "jquery",
    path: /views/
  }
});
```

Destination can alternatively be a stream.

``` javascript
splitBundle({
  name: "vendor",
  dest: process.stdout,
  match: {
    name: "jquery",
    path: /views/
  }
});
```

And you can define multiple bundle splits...

``` javascript
splitBundle([
  { name: "vendor", dest: "dest/vendor.js", match: { path: [/\/bower_components\//, /\/node_modules\//] },
  { name: "renderer", dest: "dest/renderer.js", match: { path: /src\/renderer/ } }
]);
```
