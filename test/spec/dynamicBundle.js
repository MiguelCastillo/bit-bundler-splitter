import Bitbundler from "bit-bundler";
import loggers from "bit-bundler/loggers";
import { expect } from "chai";
import bundleSplitter from "../../index";

describe("Dynamic bundle Test Suite", function () {
  const createBundler = (config) => new Bitbundler(Object.assign({ log: { stream: loggers.through() } }, config || {}));

  describe("When bundling a module that is dyanmically loaded", function () {
    var result;

    describe("And the bundler has no splitters", function () {
      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter()
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then result has 4 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(4);
      });

      it("then result has a main bundle", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result bundle loader for the main bundle", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module called '1e466af.js'", function () {
        expect(result.shards).to.have.property("1e466af.js");
      });

      it("then the result bundle loader for the dynamic bundle '1e466af'", function () {
        expect(result.shards).to.have.property("loader-1e466af.js");
      });

      it("then the main bundle has 4 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(4);
      });

      it("then the main bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the main bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the main bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "splita.js" });
      });

      it("then the main bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the dynamic bundle '1e466af' has 1 module", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '1e466af' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also exists in a static bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "splita", dest: "test/dist/dynamic-import/splita.js", match: { filename: "splita.js" } }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 5 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(5);
      });

      it("then result has a main bundle", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle called 'splita'", function () {
        expect(result.shards).to.have.property("splita");
      });

      it("then the result bundle loader for the main bundle", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module called '1e466af.js'", function () {
        expect(result.shards).to.have.property("1e466af.js");
      });

      it("then the result bundle loader for the dynamic bundle '1e466af'", function () {
        expect(result.shards).to.have.property("loader-1e466af.js");
      });

      it("then the main bundle has 2 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(2);
      });

      it("then the main bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the main bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the 'splita' bundle has 2 modules", function () {
        expect(result.getModules(result.shards["splita"].modules)).to.have.lengthOf(2);
      });

      it("then the main bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[0])).to.deep.include({ filename: "splita.js" });
      });

      it("then the 'splita' bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[1])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the dynamic bundle '1e466af' has 1 module", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '1e466af' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also exists in a dynamic bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "splita", dest: "test/dist/dynamic-import/splita.js", match: { filename: "splita.js" }, dynamic: true }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 6 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(6);
      });

      it("then result has a main bundle", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle called 'splita'", function () {
        expect(result.shards).to.have.property("splita");
      });

      it("then the result has a bundle called 'loader-splita.js'", function () {
        expect(result.shards).to.have.property("loader-splita.js");
      });

      it("then the result bundle loader for the main bundle", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then result has a bundle for the dynamic module called '1e466af.js'", function () {
        expect(result.shards).to.have.property("1e466af.js");
      });

      it("then the result bundle loader for the dynamic bundle '1e466af'", function () {
        expect(result.shards).to.have.property("loader-1e466af.js");
      });

      it("then the main bundle has 3 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(3);
      });

      it("then the main bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the main bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the main bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the 'splita' bundle has 1 modules", function () {
        expect(result.getModules(result.shards["splita"].modules)).to.have.lengthOf(1);
      });

      it("then the 'splita' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["splita"].modules[0])).to.deep.include({ filename: "splita.js" });
      });

      it("then the dynamic bundle '1e466af' has 1 module", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules)).to.have.lengthOf(1);
      });

      it("then the dynamic bundle '1e466af' has the module 'world.js'", function () {
        expect(result.getModules(result.shards["1e466af.js"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });

    describe("And the dynamically loaded module also matches a dynamic bundle split", function () {
      var result;

      before(function () {
        return createBundler({
          bundler: [
            bundleSplitter([
              { name: "split-world", dest: "test/dist/dynamic-import/world.js", match: { filename: "world.js" }, dynamic: true }
            ])
          ]
        })
          .bundle({ src: "test/sample/dynamic-import/index.js", dest: "test/dist/dynamic-import/main.js" })
          .then(r => result = r);
      });

      it("then the result is OK", function () {
        expect(result).to.be.ok;
      });

      it("then the result has 4 bundles", function () {
        expect(Object.keys(result.shards)).to.have.lengthOf(4);
      });

      it("then result has a main bundle", function () {
        expect(result.shards).to.have.property("main");
      });

      it("then the result has a bundle called 'split-world'", function () {
        expect(result.shards).to.have.property("split-world");
      });

      it("then the result has a bundle called 'loader-world.js'", function () {
        expect(result.shards).to.have.property("loader-world.js");
      });

      it("then the result bundle loader for the main bundle", function () {
        expect(result.shards).to.have.property("loader-main.js");
      });

      it("then the main bundle has 4 modules", function () {
        expect(result.getModules(result.shards["main"].modules)).to.have.lengthOf(4);
      });

      it("then the main bundle has the module 'index.js'", function () {
        expect(result.getModules(result.shards["main"].modules[0])).to.deep.include({ filename: "index.js" });
      });

      it("then the main bundle has the module 'hello.js'", function () {
        expect(result.getModules(result.shards["main"].modules[1])).to.deep.include({ filename: "hello.js" });
      });

      it("then the main bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["main"].modules[2])).to.deep.include({ filename: "splita.js" });
      });

      it("then the main bundle has the module 'moriarty.js'", function () {
        expect(result.getModules(result.shards["main"].modules[3])).to.deep.include({ filename: "moriarty.js" });
      });

      it("then the 'split-world' bundle has 1 modules", function () {
        expect(result.getModules(result.shards["split-world"].modules)).to.have.lengthOf(1);
      });

      it("then the 'split-world' bundle has the module 'splita.js'", function () {
        expect(result.getModules(result.shards["split-world"].modules[0])).to.deep.include({ filename: "world.js" });
      });
    });
  });
});
