# bit-bundler-splitter

[![Greenkeeper badge](https://badges.greenkeeper.io/MiguelCastillo/bit-bundler-splitter.svg)](https://greenkeeper.io/)
> bit-bundler plugin for splitting bundles up

This plugin helps slice and dice your application bundle into smaller parts which we refer to as bundle shards. The more common use case is to split out the vendor (3rd party) modules into a separate bundle. This is to maximize browsers' caching capabilities; generally speaking vendor bundles do not change frequently and browsers can cache them rather efficiently. Vendor bundles also tend to be larger than your more frequently changing application bundles, which generally translates to a reduction in traffic when properly cached by the browser.


### Semantics

Bundle splitting works by defining matching rules for the modules you want in separate bundles. Any modules that match a rule become entry points for a new bundle. You can match modules by their filename, path, or any other piece of information available on them. The modules that are split into their own bundle actually bring their entire dependency tree, unless a dependency matches a rule in which case the dependency and its dependency tree become their own bundle. What bundle splitter ends up with is a tree of bundles with the corresponding modules that matched splitting rules at each node. And all corresponding module dependencies are tucked under each of the corresponding bundles.

The bundle splitter create two extra bundles - `common` and `loader`. The `common` bundle will contain all the modules that appear in more than one bundle as long as it does not match a slitting rule. This helps ensure that modules are not duplicated across different bundles. The other bundle that is created is called `loader`. This bundle constains the necessary bootstrapping to load bundles in the proper order in the browser. This is generally the file you want to use in your index.html, unless you have a custom setup for loading your bundles.

`bit-bundler-splitter` uses [roolio](https://github.com/MiguelCastillo/roolio) to provide a flexible way to configure matching rules that control how bundles are split. More on this in the examples section.


### Install

```
$ npm install --save-dev @bit/bundler-splitter
```


### API

#### splitBundle( config: object )

`bit-bundler-splitter` exports a function that takes the following configuration.

- @param {object} options - Configuration options explained below.
  - `match`, matching rules which is how we configure how bundles are split.
  - `dest`, which is where the bundle is written to; `dest` can be a string file path or a stream.
  - `name`, which is the name of the bundle. Other plugins can access these shards by name if need be.


### Examples

This example shows a basic `bit-bundler` setup with `bit-bundler-splitter` splitting out vendor bundles. If a module `bower_components` or `node_modules` in its path then its pushed to the vendor bundle. We are also splitting out modules whose path contains `src/renderer` and writing that out as a separate bundle.

The code is available [here](https://github.com/MiguelCastillo/bit-bundler-splitter/tree/master/examples/renderer).

``` javascript
var Bitbundler = require("@bit/bundler");

Bitbundler.bundle({
  src: "src/main.js",
  dest: "dist/main.js"
}, {
  loader: [
    "@bit/loader-babel"
  ],
  bundler: [
    ["@bit/bundler-splitter", [
      { name: "vendor", dest: "dest/vendor.js", match: ["/bower_components/", "/node_modules/"] },
      { name: "renderer", dest: "dest/renderer.js", match: "/src/renderer/" } ]
    ]
  ]
});
```

can run it with:

```
$ npm install
$ npm run build
$ cat dist/vendor.js dist/renderer.js dist/main.js | node
```


### Matching rules


So bundles are split by matching rules and these rules can be a simple string, regex, or objects with properties matching different information found in modules. When you specify a string or a regex the splitter will match the path of the bundle. String patterns are converted to regexp internally, so you can definitely use regex syntax in the strings you define.


Below are different matching rule examples.

You can specify a regex to match modules with a path that contains "common".

``` javascript
splitBundle({
  match: {
    path: /common/
  }
});
```

You can use the short hand with regex

``` javascript
splitBundle({
  match: /common/
});
```

Or you can use the short hand with string

``` javascript
splitBundle({
  match: "common"
});
```


You can match modules with names that only has alpha numeric characters. e.g. "jquery".

``` javascript
splitBundle({
  match: {
    name: /^\w+/
  }
});
```

Or match modules with name `three`:

``` javascript
splitBundle({
  match: {
    name: "three"
  }
});
```


You can also specify multiple matching properties. In this case only module with name "jquery" that have "views" in its file path will match this.

``` javascript
splitBundle({
  match: {
    name: "jquery",
    path: /views/
  }
});
```

Now, let's specify a bundle name and a destination where the bundle is going to be written to.

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
  { name: "vendor", dest: "dest/vendor.js", match: ["/bower_components/", "/node_modules/"] },
  { name: "renderer", dest: "dest/renderer.js", match: "/src/renderer/" }
]);
```
