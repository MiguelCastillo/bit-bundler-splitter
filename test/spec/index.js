/*eslint quotes: ["off"]*/

import { expect } from "chai";
import BitBundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import bundleSplitter from "../../index";

describe("BitBundler test suite", function() {
  const createBundler = (config) => new BitBundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));

  describe("When spitting bundles with shared modules", function() {
    var bitbundler;

    before(function() {
      bitbundler = createBundler({
        loader: ["bit-loader-builtins"],
        bundler: [
          bundleSplitter([
            // { name: "test/dist/X.js", match: { fileName: "X.js" }},
            { name: "test/dist/basic/c.js", match: /c.js$/ },
            { name: "test/dist/basic/W.js", match: /w.js$/ },
            { name: "test/dist/basic/Y.js", match: "basic/Y.js" },
            { name: "test/dist/basic/deep/Z.js", match: { filename: "z.js" }},
            { name: "test/dist/basic/deep/vendor.js", match: ["/node_modules/"] }
          ])
        ]
      });
    });

    it("then the bundler is an instance of Bundler", function() {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function() {
      var result;

      before(function() {
        return bitbundler.bundle({src: ["test/sample/basic/a.js", "test/sample/basic/c.js"], dest: "test/dist/basic/main.js"}).then(function(ctx) {
          result = ctx;
        });
      });

      it("then the main bundle has two modules", function() {
        expect(result.shards["main"].modules).to.have.lengthOf(2);
      });

      it("then the main bundle has a module with filename a.js", function() {
        expect(result.getModules(result.shards["main"].modules)[0].filename).to.be.equal("a.js");
      });

      it("then the main bundle has a module with filename b.js", function() {
        expect(result.getModules(result.shards["main"].modules)[1].filename).to.be.equal("b.js");
      });

      it("then the main bundle contains the correct bundle content", function() {
        expect(trimResult(result.shards["main"].content)).to.be.equal(`require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){const b = require("./b");console.log("a", b());},{"./b":3}],3:[function(require,module,exports){module.exports = function() {  return "b";};},{}]},{},[1])`);
      });

      it("then splitter created a shard for 'test/dist/basic/c.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/c.js");
      });

      it("then the 'test/dist/basic/c.js' bundle has 1 module", function() {
        expect(result.shards['test/dist/basic/c.js'].modules).to.have.lengthOf(1);
      });

      it("then the 'test/dist/basic/c.js' bundle has a module with filename c.js", function() {
        expect(result.getModules(result.shards["test/dist/basic/c.js"].modules)[0].filename).to.be.equal("c.js");
      });

      it("then splitter created a shard for 'test/dist/basic/W.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/W.js");
      });

      it("then the 'test/dist/basic/W.js' bundle has 1 module", function() {
        expect(result.shards["test/dist/basic/W.js"].modules).to.have.lengthOf(1);
      });

      it("then the 'test/dist/basic/W.js' bundle has a module with filename W.js", function() {
        expect(result.getModules(result.shards["test/dist/basic/W.js"].modules)[0].filename).to.be.equal("w.js");
      });

      it("then splitter created a shard for 'test/dist/basic/Y.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/Y.js");
      });

      it("then the 'test/dist/basic/Y.js' bundle has 1 module", function() {
        expect(result.shards["test/dist/basic/Y.js"].modules).to.have.lengthOf(3);
      });

      it("then the 'test/dist/basic/Y.js' bundle has a module with filename Y.js", function() {
        expect(result.getModules(result.shards["test/dist/basic/Y.js"].modules)[0].filename).to.be.equal("Y.js");
      });

      it("then the 'test/dist/basic/Y.js' bundle has a module with filename X.js", function() {
        expect(result.getModules(result.shards["test/dist/basic/Y.js"].modules)[1].filename).to.be.equal("X.js");
      });

      it("then the 'test/dist/basic/Y.js' bundle has a module with filename aa.js", function() {
        expect(result.getModules(result.shards["test/dist/basic/Y.js"].modules)[2].filename).to.be.equal("aa.js");
      });

      it("then splitter created a shard for 'test/dist/basic/deep/Z.js'", function() {
        expect(result.shards).to.have.property("test/dist/basic/deep/Z.js");
      });
    });
  });

  describe("When creating a bundle where the root module has a circular reference", function() {
    var bitbundler;

    before(function() {
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

    it("then the bundler is an instance of Bundler", function() {
      expect(bitbundler).to.be.an.instanceof(BitBundler);
    });

    describe("and bundling two entry modules", function() {
      var result;

      before(function() {
        return bitbundler
          .bundle({
            src: ["test/sample/circular-reference/main.js"],
            dest: "test/dist/circular-reference/main.js"
          })
          .then((ctx) => result = ctx);
      });

      it("then splitter created a shard for 'main'", function() {
        expect(result.shards).to.have.property("main");
      });

      it("then the 'main' bundle has 1 module", function() {
        expect(result.shards["main"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'main' bundle has the expected name", function() {
        expect(result.shards["main"].modules[0]).to.contain("circular-reference/main.js");
      });

      it("then splitter created a shard for 'other'", function() {
        expect(result.shards).to.have.property("other");
      });

      it("then the 'other' bundle has 1 modules", function() {
        expect(result.shards["other"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'other' bundle has the expected name", function() {
        expect(result.shards["other"].modules[0]).to.contain("circular-reference/other.js");
      });

      it("then splitter created a shard for 'renderer'", function() {
        expect(result.shards).to.have.property("renderer");
      });

      it("then the 'renderer' bundle has 1 module", function() {
        expect(result.shards["renderer"].modules).to.have.lengthOf(1);
      });

      it("then the module in the 'renderer' bundle has the expected name", function() {
        expect(result.shards["renderer"].modules[0]).to.contain("circular-reference/renderer/render-it.js");
      });

      it("then the splitter created a 'vendor' bundle", function() {
        expect(result.shards).to.have.property("vendor");
      });

      it("then the 'vendor' bundle has 5 modules", function() {
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
