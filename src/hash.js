const crypto = require("crypto");

function getShortHash(input, maxLength) {
  return getLongHash(input).slice(0, maxLength || 7);
}

function getLongHash(input) {
  return crypto
    .createHash("sha1")
    .update(input.toString())
    .digest("hex");
}

module.exports = getShortHash;
module.exports.long = getLongHash;
