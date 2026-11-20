// KSP checks: stock data sanity, the rocket equation, Hohmann transfers and CommNet,
// including every number printed in the worked examples on the three KSP pages.
"use strict";
const { eq, ok } = require("./lib.js");
const K = require("../src/assets/ksp.js");

// ---- Stock data cross-checks (published values the data must reproduce) ----
eq("Kerbin g", K.surfaceGravity("Kerbin"), 9.81, 1e-9);
eq("Mun g", K.surfaceGravity("Mun"), 1.63, 0.005);
eq("Duna g", K.surfaceGravity("Duna"), 2.94, 0.005);
eq("Eve g", K.surfaceGravity("Eve"), 16.7, 0.05);
eq("Kerbin year (s)", K.period("Kerbin"), 9203545, 1);
eq("Duna year (s)", K.period("Duna"), 17315400, 1);
eq("Jool year (s)", K.period("Jool"), 104661432, 50);
eq("Mun orbit (s)", K.period("Mun"), 138984, 1);
// Sea-level thrust published on the part pages equals vac thrust * IspASL / IspVac.
const asl = { reliant: 205.16, swivel: 167.97, terrier: 14.78, nerv: 13.88, poodle: 64.29, skipper: 568.75,
  mainsail: 1379.03, rhino: 1205.88, mammoth: 3746.03, vector: 936.51, spark: 16.56, ant: 0.51, kodiak: 247,
  bobcat: 374.19, cheetah: 52.82, skiff: 240.91, wolfhound: 69.08, dart: 153.53, thud: 108.2, twitch: 15.17,
  spider: 1.79, mastodon: 1283.6, flea: 162.91, hammer: 197.9, thumper: 250, kickback: 593.86,
  thoroughbred: 1515.22, clydesdale: 2948.94 };
for (const id in asl) eq(`ASL thrust ${id}`, K.enginePerf(K.engine(id), "asl").thrust, asl[id], 0.01);
// Solid booster burn times on the part pages: (full - empty) / fuel flow.
const burn = { flea: 8.8, hammer: 23.7, thumper: 42.2, kickback: 62.8, thoroughbred: 79.6, clydesdale: 85.9 };
for (const id in burn) {
  const e = K.engine(id);
  const r = K.stack([{ wet: e.mass, dry: e.dry, count: 1, engine: e, env: "vac" }], 0, 9.81);
  eq(`burn time ${id}`, r.stages[0].burnTime, burn[id], 0.06);
}

// ---- Rocket equation ----
eq("dv simple", K.rocketDv(300, 2, 1), 300 * 9.80665 * Math.log(2), 1e-9);
eq("dv mass ratio e", K.rocketDv(350, Math.E, 1), 350 * 9.80665, 1e-9);

// Delta-v page worked example: payload 1 t; upper = Terrier + FL-T400 + decoupler (2.8 / 0.8 t);
// lower = Reliant + 2 FL-T800 + decoupler (10.25 / 2.25 t), lower at sea level.
const g = K.surfaceGravity("Kerbin");
let r = K.stack([
  { wet: 10.25, dry: 2.25, count: 1, engine: K.engine("reliant"), env: "asl" },
  { wet: 2.8, dry: 0.8, count: 1, engine: K.engine("terrier"), env: "vac" }
], 1, g);
eq("ex liftoff mass", r.liftoffMass, 14.05, 1e-9);
eq("ex lower m0", r.stages[0].m0, 14.05, 1e-9);
eq("ex lower m1", r.stages[0].m1, 6.05, 1e-9);
eq("ex lower dv", Math.round(r.stages[0].dv), 2190);
eq("ex lower twr", Math.round(r.stages[0].twrStart * 100) / 100, 1.49);
eq("ex lower twr end", Math.round(r.stages[0].twrEnd * 100) / 100, 3.46);
eq("ex lower burn", Math.round(r.stages[0].burnTime), 101);
eq("ex upper m0", r.stages[1].m0, 3.8, 1e-9);
eq("ex upper dv", Math.round(r.stages[1].dv), 2528);
eq("ex upper twr", Math.round(r.stages[1].twrStart * 100) / 100, 1.61);
eq("ex upper burn", Math.round(r.stages[1].burnTime), 113);
eq("ex total", Math.round(r.totalDv), 4718);
eq("ex lower thrust asl", Math.round(r.stages[0].thrust * 100) / 100, 205.16);
r = K.stack([{ wet: 10.25, dry: 2.25, count: 1, engine: K.engine("reliant"), env: "vac" }], 3.8, g);
eq("ex lower dv vac", Math.round(r.stages[0].dv), 2561);
// Engine count scales thrust and flow but not delta-v.
r = K.stack([{ wet: 20, dry: 5, count: 3, engine: K.engine("swivel"), env: "vac" }], 0, g);
eq("3 engines dv", r.stages[0].dv, K.rocketDv(320, 20, 5), 1e-9);
eq("3 engines thrust", r.stages[0].thrust, 645, 1e-9);

// ---- Transfers (well-known stock phase angles) ----
const phases = { Moho: 108.21, Eve: -54.13, Duna: 44.36, Dres: 82.06, Jool: 96.58, Eeloo: 101.42 };
for (const t in phases) eq(`phase Kerbin-${t}`, Math.round(K.hohmann("Kerbin", t, 100000).phase * 100) / 100, phases[t]);
ok("same parent required", K.hohmann("Kerbin", "Mun", 100000) === null);
ok("not to itself", K.hohmann("Duna", "Duna", 100000) === null);
ok("Duna is outward", K.hohmann("Kerbin", "Duna", 100000).outward);
ok("Eve is inward", !K.hohmann("Kerbin", "Eve", 100000).outward);

// Transfer page worked example: Kerbin -> Duna from a 100 km orbit.
const h = K.hohmann("Kerbin", "Duna", 100000);
eq("duna phase", Math.round(h.phase * 100) / 100, 44.36);
eq("duna tof days", K.kDuration(h.transferTime).days, 302);
eq("duna synodic (wiki 19,645,697.3 s)", h.synodic, 19645697.3, 1);
eq("duna synodic days", K.kDuration(h.synodic).days, 909);
eq("duna park speed", Math.round(h.parkSpeed), 2246);
eq("duna vinf", Math.round(h.vinf), 918);
eq("duna ejection dv", Math.round(h.ejectionDv), 1060);
eq("duna ejection angle", Math.round(h.ejectionAngle), 149);
eq("duna after retro", Math.round(h.afterCrossing), 31);
eq("duna arrive vinf", Math.round(h.vinfArrive), 826);
const w = K.nextWindow("Kerbin", "Duna", 0);
let d = K.fromUT(w);
eq("duna window year", d.year, 1); eq("duna window day", d.day, 231);
eq("duna window hour", d.hour, 1); eq("duna window min", d.minute, 32);
eq("phase at window", K.phaseNow("Kerbin", "Duna", w), h.phase, 1e-6);
eq("phase at start", K.phaseNow("Kerbin", "Duna", 0), 135.5, 1e-9);
d = K.fromUT(K.nextWindow("Kerbin", "Duna", w + 1));
eq("2nd window year", d.year, 3); eq("2nd window day", d.day, 288);
ok("window at t if already aligned", Math.abs(K.nextWindow("Kerbin", "Duna", w) - w) < 1e-3);

// Calendar
eq("toUT start", K.toUT(1, 1, 0, 0), 0);
eq("toUT year 2", K.toUT(2, 1, 0, 0), 426 * 21600);
d = K.fromUT(K.toUT(4, 123, 5, 59));
eq("round trip y", d.year, 4); eq("round trip d", d.day, 123); eq("round trip h", d.hour, 5); eq("round trip m", d.minute, 59);
eq("normDeg", K.normDeg(190), -170); eq("normDeg2", K.normDeg(-190), 170);

// ---- CommNet (wiki range tables and its Jool example) ----
eq("DSN3 x 88-88 range", K.linkRange(250e9, 100e9), 158.11e9, 0.01e9);
eq("2G x 500k range", K.linkRange(2e9, 5e5), 31.62e6, 0.01e6);
eq("2 x 88-88 power", K.vesselPower([{ id: "c8888", count: 2 }]), 168.18e9, 0.01e9);
eq("3 x RA-100 power", K.vesselPower([{ id: "ra100", count: 3 }]), 227.95e9, 0.01e9);
eq("Jool example 71%", Math.round(K.signal(73.4e9, K.linkRange(250e9, K.vesselPower([{ id: "c8888", count: 2 }]))) * 100), 71);
eq("16-S never stacks", K.vesselPower([{ id: "c16s", count: 3 }]), 5e5, 1e-6);
eq("16 stacks linearly", K.vesselPower([{ id: "c16", count: 3 }]), 1.5e6, 1e-6);
eq("88-88 + 16 weighted exponent", K.vesselPower([{ id: "c8888", count: 1 }, { id: "c16", count: 1 }]), 100e9 * Math.pow(100.0005e9 / 100e9, (100e9 * 0.75 + 5e5) / 100.0005e9), 1);
eq("built-in does not stack", K.vesselPower([{ id: "internal", count: 1 }, { id: "c16", count: 1 }]), 5e5, 1e-6);
eq("relay-only ignores dishes", K.vesselPower([{ id: "c8888", count: 1 }, { id: "ra2", count: 1 }], true), 2e9, 1e-6);
eq("signal 0", K.signal(0, 100), 1); eq("signal max", K.signal(100, 100), 0); eq("signal beyond", K.signal(150, 100), 0);
eq("signal half", K.signal(50, 100), 0.5, 1e-12);
eq("100% distance", K.distanceForSignal(0.995, 1), 0.0414, 0.0001);
eq("distance 50%", K.distanceForSignal(0.5, 1), 0.5, 1e-9);

// Farthest distances from Kerbin (wiki relay table), closest Duna approach.
eq("Duna max", K.distanceFromKerbin("Duna").max, 35383029419, 1e3);
eq("Dres max", K.distanceFromKerbin("Dres").max, 60360893643, 1e3);
eq("Jool max", K.distanceFromKerbin("Jool").max, 85812078643, 1e3);
eq("Eeloo max", K.distanceFromKerbin("Eeloo").max, 127149553456, 1e3);
eq("Duna min (Gm)", Math.round(K.distanceFromKerbin("Duna").min / 1e8) / 10, 6.1);
eq("Ike uses Duna", K.distanceFromKerbin("Ike").max, K.distanceFromKerbin("Duna").max);
eq("Mun", K.distanceFromKerbin("Mun").max, 12e6);
eq("Eve min", K.distanceFromKerbin("Eve").min, 13599840256 - 9832684544 * 1.01, 1);

// CommNet page worked example: Duna probe with two HG-55s.
const pDuna = K.vesselPower([{ id: "hg55", count: 2 }]);
eq("2 x HG-55 power (G)", Math.round(pDuna / 1e9 * 100) / 100, 25.23);
eq("vs DSN3 range (Gm)", Math.round(K.linkRange(pDuna, 250e9) / 1e9 * 10) / 10, 79.4);
eq("vs DSN3 at 30 Gm", Math.round(K.signal(30e9, K.linkRange(pDuna, 250e9)) * 100), 68);
eq("vs DSN2 range (Gm)", Math.round(K.linkRange(pDuna, 50e9) / 1e9 * 10) / 10, 35.5);
eq("vs DSN2 at 30 Gm", Math.round(K.signal(30e9, K.linkRange(pDuna, 50e9)) * 100), 6);
eq("relay chain", Math.round(0.8 * 0.9 * 100), 72);
// Hard difficulty: range modifier 0.65 on the craft's power.
eq("hard range", Math.round(K.linkRange(pDuna * 0.65, 250e9) / 1e9 * 10) / 10, 64.0);
