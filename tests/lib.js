// Shared check helpers for tests/*.test.js. Run everything with: node tests/check.js
"use strict";
const state = { fails: 0, count: 0 };

function eq(label, got, want, tol = 1e-9) {
  state.count++;
  const ok = typeof want === "number" ? Math.abs(got - want) <= tol : got === want;
  if (!ok) { state.fails++; console.log(`FAIL ${label}: got ${got}, want ${want}`); }
}

function ok(label, cond) {
  state.count++;
  if (!cond) { state.fails++; console.log(`FAIL ${label}`); }
}

module.exports = { eq, ok, state };
