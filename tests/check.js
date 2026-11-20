// Checks every tool's maths against hand-worked figures, including every
// worked example printed on the pages. Run: node tests/check.js
"use strict";
const { state } = require("./lib.js");
const fs = require("fs");
const path = require("path");

// Optional filter: `node tests/check.js ksp` runs only ksp.test.js.
const only = process.argv[2];
for (const f of fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js") && (!only || f.startsWith(only))).sort()) {
  require(path.join(__dirname, f));
}

if (state.fails) { console.log(`${state.fails} of ${state.count} check(s) failed`); process.exit(1); }
console.log(`All ${state.count} checks passed`);
