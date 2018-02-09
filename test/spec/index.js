/*eslint quotes: ["off"]*/

import { expect } from "chai";
import BitBundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import bundleSplitter from "../../src/index";

describe("BitBundler test suite", function () {
  const createBundler = (config) => new BitBundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));

  describe("When spitting bundles with circular references across shards (X and Y)", function () {
    var bitbundler;

    before(function () {
      bitbundler = createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            { name: "test/dist/basic/deep/vendor.js", match: ["/node_modules/"] },
            { name: "test/dist/basic/c.js", match: /c.js$/ },
            { name: "test/dist/basic/W.js", match: /w.js$/ },
            { name: "test/dist/basic/X.js", match: { filename: "X.js" } },
            { name: "test/dist/basic/Y.js", match: "basic/Y.js" },
            { name: "test/dist/basic/deep/Z.js", match: { filename: "z.js" } }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function () {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function () {
      var result;

      before(function () {
        return bitbundler.bundle({ src: ["test/sample/basic/a.js", "test/sample/basic/c.js"], dest: "test/dist/basic/main.js" }).then(function (ctx) {
          result = ctx;
        });
      });

      it("then the main bundle has two modules", function () {
        expect(result.shards["main"].modules).to.have.lengthOf(2);
      });

      it("then the main bundle has a module with filename a.js", function () {
        expect(result.getModules(result.shards["main"].modules)[0].filename).to.be.equal("a.js");
      });

      it("then the main bundle has a module with filename b.js", function () {
        expect(result.getModules(result.shards["main"].modules)[1].filename).to.be.equal("b.js");
      });

      it("then the main bundle contains the correct bundle content", function () {
        const actual = trimResult(result.shards["main"].content);
        const expected = `require=_bb$iter=(function (moduleMap, entries) {  var results = {};  function get(id) {    if (!results.hasOwnProperty(id)) {      var meta = { exports: {} };      var load = moduleMap[id][0];      var deps = moduleMap[id][1];      results[id] = meta.exports;      load(dependencyGetter(deps), meta, meta.exports);      results[id] = meta.exports;    }    return results[id];  }  function has(id) {    return moduleMap[id];  }  function dependencyGetter(depsByName) {    return function getDependency(name) {      var id = depsByName[name];      if (has(id)) {        return get(id);      }      for (var _next = get.next; _next; _next = _next.next) {        if (_next.has(id)) {          return _next.get(id);        }      }      for (var _prev = get.prev; _prev; _prev = _prev.prev) {        if (_prev.has(id)) {          return _prev.get(id);        }      }      throw new Error("Module '" + name + "' with id " + id + " was not found");    };  }  get.get = get;  get.has = has;  get.next = typeof _bb$iter === "undefined" ? null : _bb$iter;  if (entries.length) {    for (var _prev = get, _next = get.next; _next;) {      _next.prev = _prev;      _prev = _next;      _next = _next.next;    }  }  entries.forEach(get);  return get;})({/** * id: 1 * path: /test/sample/basic/a.js * deps: {"./b": 3} */1:[function(_bb$req, module, exports) {const b = _bb$req("./b");console.log("a", b());},{"./b": 3}],/** * id: 3 * path: /test/sample/basic/b.js * deps: {} */3:[function(_bb$req, module, exports) {module.exports = function() {  return "b";};},{}]},[1, 2]);`;
        expect(actual).to.be.equal(expected);
      });

      it("then splitter created a shard for 'test/dist/basic/c.js'", function () {
        expect(result.shards).to.have.property("test/dist/basic/c.js");
      });

      it("then the 'test/dist/basic/c.js' bundle has 1 module", function () {
        expect(result.shards['test/dist/basic/c.js'].modules).to.have.lengthOf(1);
      });

      it("then the 'test/dist/basic/c.js' bundle has a module with filename c.js", function () {
        expect(result.getModules(result.shards["test/dist/basic/c.js"].modules)[0].filename).to.be.equal("c.js");
      });

      it("then splitter created a shard for 'test/dist/basic/W.js'", function () {
        expect(result.shards).to.have.property("test/dist/basic/W.js");
      });

      it("then the 'test/dist/basic/W.js' bundle has 1 module", function () {
        expect(result.shards["test/dist/basic/W.js"].modules).to.have.lengthOf(1);
      });

      it("then the 'test/dist/basic/W.js' bundle has a module with filename W.js", function () {
        expect(result.getModules(result.shards["test/dist/basic/W.js"].modules)[0].filename).to.be.equal("w.js");
      });

      it("then splitter created a shard for 'test/dist/basic/Y.js'", function () {
        expect(result.shards).to.have.property("test/dist/basic/Y.js");
      });

      it("then the 'test/dist/basic/Y.js' bundle has 1 module", function () {
        expect(result.shards["test/dist/basic/Y.js"].modules).to.have.lengthOf(1);
      });

      it("then the 'test/dist/basic/Y.js' bundle has a module with filename Y.js", function () {
        expect(result.getModules(result.shards["test/dist/basic/Y.js"].modules)[0].filename).to.be.equal("Y.js");
      });

      it("then the 'test/dist/basic/X.js' bundle has 2 module", function () {
        expect(result.shards["test/dist/basic/X.js"].modules).to.have.lengthOf(2);
      });

      it("then the 'test/dist/basic/X.js' bundle has a module with filename X.js", function () {
        expect(result.getModules(result.shards["test/dist/basic/X.js"].modules)[0].filename).to.be.equal("X.js");
      });

      it("then the 'test/dist/basic/X.js' bundle has a module with filename aa.js", function () {
        expect(result.getModules(result.shards["test/dist/basic/X.js"].modules)[1].filename).to.be.equal("aa.js");
      });

      it("then splitter created a shard for 'test/dist/basic/deep/Z.js'", function () {
        expect(result.shards).to.have.property("test/dist/basic/deep/Z.js");
      });

      it("then the 'vendor' bundle has 27 modules", function () {
        expect(result.shards["test/dist/basic/deep/vendor.js"].modules).to.have.lengthOf(27);
      });
    });
  });

  describe("When creating a bundle where the root module has a circular reference with a shard", function () {
    var bitbundler;

    before(function () {
      bitbundler = createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            { name: "vendor", dest: "test/dist/circular-reference/deep/vendor.js", match: { path: /\/node_modules\// } },
            { name: "renderer", dest: "test/dist/circular-reference/renderer.js", match: { path: /\/renderer\// } },
            { name: "other", dest: "test/dist/circular-reference/other.js", match: { filename: "other.js" } }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function () {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function () {
      var result;

      before(function () {
        return bitbundler
          .bundle({
            src: ["test/sample/circular-reference/main.js"],
            dest: "test/dist/circular-reference/main.js"
          })
          .then((ctx) => result = ctx);
      });

      it("then splitter created a shard for 'main'", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the 'main' bundle has 1 module", function () {
        expect(result.shards["main"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'main' bundle has the expected name", function () {
        expect(result.shards["main"].modules[0]).to.contain("circular-reference/main.js");
      });

      it("then splitter created a shard for 'other'", function () {
        expect(result.shards).to.have.property("other");
      });

      it("then the 'other' bundle has 1 modules", function () {
        expect(result.shards["other"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'other' bundle has the expected name", function () {
        expect(result.shards["other"].modules[0]).to.contain("circular-reference/other.js");
      });

      it("then splitter created a shard for 'renderer'", function () {
        expect(result.shards).to.have.property("renderer");
      });

      it("then the 'renderer' bundle has 1 module", function () {
        expect(result.shards["renderer"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'renderer' bundle has the expected name", function () {
        expect(result.shards["renderer"].modules[0]).to.contain("circular-reference/renderer/render-it.js");
      });

      it("then the splitter created a 'vendor' bundle", function () {
        expect(result.shards).to.have.property("vendor");
      });

      it("then the 'vendor' bundle has 5 modules", function () {
        expect(result.shards["vendor"].modules).to.have.lengthOf(5);
      });
    });
  });
});

function trimResult(data) {
  return data
    .toString()
    .replace(/\n/g, "")
    .replace(/\/\/# sourceMappingURL=.*/, "");
}
