const getHash = require("./hash");
const path = require("path");
const cwd = process.cwd();

function moduleHash(mod) {
    const id = mod.path || mod.id;
    return getHash(id.replace(cwd, "")) + path.extname(id);
}

module.exports = moduleHash;
