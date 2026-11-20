// Kerbal Space Program maths and stock data (KSP 1.12.5, no mods).
// Pure functions shared by the KSP pages and tests/ksp.test.js.
// Units: masses in tonnes, thrust in kN, distances in metres, times in seconds.
(function (root) {
  "use strict";

  var G0 = 9.80665;          // KSP converts Isp (s) to exhaust velocity with this
  var DAY = 6 * 3600;        // Kerbin calendar day
  var YEAR_DAYS = 426;       // Kerbin calendar year
  var DEG = 180 / Math.PI;
  var TAU = 2 * Math.PI;

  // Stock bodies, checked 21 Nov 2026 against the KSP wiki (unchanged since 1.0).
  // sma m, ecc, inc deg, lan deg, argPe deg, ma0 rad (mean anomaly at UT 0),
  // mu m^3/s^2, radius m, soi m, atm sea-level pressure in atm (0 = none).
  var BODIES = {
    Kerbol: { parent: null, mu: 1.1723328e18, radius: 261600000 },
    Moho:   { parent: "Kerbol", sma: 5263138304, ecc: 0.2, inc: 7, lan: 70, argPe: 15, ma0: 3.14, mu: 1.6860938e11, radius: 250000, soi: 9646663, atm: 0 },
    Eve:    { parent: "Kerbol", sma: 9832684544, ecc: 0.01, inc: 2.1, lan: 15, argPe: 0, ma0: 3.14, mu: 8.1717302e12, radius: 700000, soi: 85109365, atm: 5 },
    Gilly:  { parent: "Eve", sma: 31500000, ecc: 0.55, inc: 12, lan: 80, argPe: 10, ma0: 0.9, mu: 8289449.8, radius: 13000, soi: 126123.27, atm: 0 },
    Kerbin: { parent: "Kerbol", sma: 13599840256, ecc: 0, inc: 0, lan: 0, argPe: 0, ma0: 3.14, mu: 3.5316e12, radius: 600000, soi: 84159286, atm: 1 },
    Mun:    { parent: "Kerbin", sma: 12000000, ecc: 0, inc: 0, lan: 0, argPe: 0, ma0: 1.7, mu: 6.5138398e10, radius: 200000, soi: 2429559.1, atm: 0 },
    Minmus: { parent: "Kerbin", sma: 47000000, ecc: 0, inc: 6, lan: 78, argPe: 38, ma0: 0.9, mu: 1.7658e9, radius: 60000, soi: 2247428.4, atm: 0 },
    Duna:   { parent: "Kerbol", sma: 20726155264, ecc: 0.051, inc: 0.06, lan: 135.5, argPe: 0, ma0: 3.14, mu: 3.0136321e11, radius: 320000, soi: 47921949, atm: 0.066667 },
    Ike:    { parent: "Duna", sma: 3200000, ecc: 0.03, inc: 0.2, lan: 0, argPe: 0, ma0: 1.7, mu: 1.8568369e10, radius: 130000, soi: 1049598.9, atm: 0 },
    Dres:   { parent: "Kerbol", sma: 40839348203, ecc: 0.145, inc: 5, lan: 280, argPe: 90, ma0: 3.14, mu: 2.1484489e10, radius: 138000, soi: 32832840, atm: 0 },
    Jool:   { parent: "Kerbol", sma: 68773560320, ecc: 0.05, inc: 1.304, lan: 52, argPe: 0, ma0: 0.1, mu: 2.82528e14, radius: 6000000, soi: 2455985200, atm: 15 },
    Laythe: { parent: "Jool", sma: 27184000, ecc: 0, inc: 0, lan: 0, argPe: 0, ma0: 3.14, mu: 1.962e12, radius: 500000, soi: 3723645.8, atm: 0.6 },
    Vall:   { parent: "Jool", sma: 43152000, ecc: 0, inc: 0, lan: 0, argPe: 0, ma0: 0.9, mu: 2.074815e11, radius: 300000, soi: 2406401.4, atm: 0 },
    Tylo:   { parent: "Jool", sma: 68500000, ecc: 0, inc: 0.025, lan: 0, argPe: 0, ma0: 3.14, mu: 2.82528e12, radius: 600000, soi: 10856518, atm: 0 },
    Bop:    { parent: "Jool", sma: 128500000, ecc: 0.235, inc: 15, lan: 10, argPe: 25, ma0: 0.9, mu: 2.4868349e9, radius: 65000, soi: 1221060.9, atm: 0 },
    Pol:    { parent: "Jool", sma: 179890000, ecc: 0.171, inc: 4.25, lan: 2, argPe: 15, ma0: 0.9, mu: 7.2170208e8, radius: 44000, soi: 1042138.9, atm: 0 },
    Eeloo:  { parent: "Kerbol", sma: 90118820000, ecc: 0.26, inc: 6.15, lan: 50, argPe: 260, ma0: 3.14, mu: 7.4410815e10, radius: 210000, soi: 119082940, atm: 0 }
  };
  var BODY_ORDER = ["Moho", "Eve", "Gilly", "Kerbin", "Mun", "Minmus", "Duna", "Ike", "Dres", "Jool", "Laythe", "Vall", "Tylo", "Bop", "Pol", "Eeloo"];

  function surfaceGravity(name) {
    var b = BODIES[name];
    return b.mu / (b.radius * b.radius);
  }

  function period(name) {
    var b = BODIES[name];
    return TAU * Math.sqrt(Math.pow(b.sma, 3) / BODIES[b.parent].mu);
  }

  // Stock engines, checked 21 Nov 2026 against the KSP wiki part pages.
  // thrust = vacuum thrust in kN; sea-level thrust = thrust * ispAsl / ispVac
  // (stock engines burn fuel at a fixed rate, so thrust scales with Isp).
  var ENGINES = [
    { id: "ant", name: "LV-1 \"Ant\"", thrust: 2, ispAsl: 80, ispVac: 315, mass: 0.02 },
    { id: "spider", name: "LV-1R \"Spider\"", thrust: 2, ispAsl: 260, ispVac: 290, mass: 0.02 },
    { id: "twitch", name: "24-77 \"Twitch\"", thrust: 16, ispAsl: 275, ispVac: 290, mass: 0.08 },
    { id: "spark", name: "48-7S \"Spark\"", thrust: 20, ispAsl: 265, ispVac: 320, mass: 0.13 },
    { id: "terrier", name: "LV-909 \"Terrier\"", thrust: 60, ispAsl: 85, ispVac: 345, mass: 0.5 },
    { id: "nerv", name: "LV-N \"Nerv\"", thrust: 60, ispAsl: 185, ispVac: 800, mass: 3 },
    { id: "thud", name: "Mk-55 \"Thud\"", thrust: 120, ispAsl: 275, ispVac: 305, mass: 0.9 },
    { id: "cheetah", name: "LV-T91 \"Cheetah\"", thrust: 125, ispAsl: 150, ispVac: 355, mass: 1 },
    { id: "dart", name: "T-1 \"Dart\" aerospike", thrust: 180, ispAsl: 290, ispVac: 340, mass: 1 },
    { id: "swivel", name: "LV-T45 \"Swivel\"", thrust: 215, ispAsl: 250, ispVac: 320, mass: 1.5 },
    { id: "reliant", name: "LV-T30 \"Reliant\"", thrust: 240, ispAsl: 265, ispVac: 310, mass: 1.25 },
    { id: "poodle", name: "RE-L10 \"Poodle\"", thrust: 250, ispAsl: 90, ispVac: 350, mass: 1.75 },
    { id: "kodiak", name: "RK-7 \"Kodiak\"", thrust: 260, ispAsl: 285, ispVac: 300, mass: 1.25 },
    { id: "skiff", name: "RE-I2 \"Skiff\"", thrust: 300, ispAsl: 265, ispVac: 330, mass: 1.6 },
    { id: "wolfhound", name: "RE-J10 \"Wolfhound\"", thrust: 375, ispAsl: 70, ispVac: 380, mass: 3.3 },
    { id: "bobcat", name: "LV-TX87 \"Bobcat\"", thrust: 400, ispAsl: 290, ispVac: 310, mass: 2 },
    { id: "skipper", name: "RE-I5 \"Skipper\"", thrust: 650, ispAsl: 280, ispVac: 320, mass: 3 },
    { id: "vector", name: "S3 KS-25 \"Vector\"", thrust: 1000, ispAsl: 295, ispVac: 315, mass: 4 },
    { id: "mastodon", name: "KE-1 \"Mastodon\"", thrust: 1350, ispAsl: 290, ispVac: 305, mass: 5 },
    { id: "mainsail", name: "RE-M3 \"Mainsail\"", thrust: 1500, ispAsl: 285, ispVac: 310, mass: 6 },
    { id: "rhino", name: "KR-2L+ \"Rhino\"", thrust: 2000, ispAsl: 205, ispVac: 340, mass: 9 },
    { id: "mammoth", name: "S3 KS-25x4 \"Mammoth\"", thrust: 4000, ispAsl: 295, ispVac: 315, mass: 15 },
    { id: "flea", name: "RT-5 \"Flea\" (solid)", thrust: 192, ispAsl: 140, ispVac: 165, mass: 1.5, solid: true, dry: 0.45 },
    { id: "hammer", name: "RT-10 \"Hammer\" (solid)", thrust: 227, ispAsl: 170, ispVac: 195, mass: 3.5625, solid: true, dry: 0.75 },
    { id: "thumper", name: "BACC \"Thumper\" (solid)", thrust: 300, ispAsl: 175, ispVac: 210, mass: 7.65, solid: true, dry: 1.5 },
    { id: "kickback", name: "S1 SRB-KD25k \"Kickback\" (solid)", thrust: 670, ispAsl: 195, ispVac: 220, mass: 24, solid: true, dry: 4.5 },
    { id: "thoroughbred", name: "S2-17 \"Thoroughbred\" (solid)", thrust: 1700, ispAsl: 205, ispVac: 230, mass: 70, solid: true, dry: 10 },
    { id: "clydesdale", name: "S2-33 \"Clydesdale\" (solid)", thrust: 3300, ispAsl: 210, ispVac: 235, mass: 144, solid: true, dry: 21 },
    { id: "dawn", name: "IX-6315 \"Dawn\" (ion)", thrust: 2, ispAsl: 100, ispVac: 4200, mass: 0.25 }
  ];

  function engine(id) {
    for (var i = 0; i < ENGINES.length; i++) if (ENGINES[i].id === id) return ENGINES[i];
    return null;
  }

  // Thrust (kN) and Isp (s) of one engine in "vac" or "asl" (1 atm, Kerbin sea level).
  function enginePerf(e, env) {
    if (env === "asl") return { thrust: e.thrust * e.ispAsl / e.ispVac, isp: e.ispAsl };
    return { thrust: e.thrust, isp: e.ispVac };
  }

  function rocketDv(isp, m0, m1) {
    return isp * G0 * Math.log(m0 / m1);
  }

  // stages: bottom first. Each { wet, dry, count, engine: {thrust, ispAsl, ispVac}, env: "vac"|"asl" }.
  // wet/dry are the stage's own parts (tanks, engines, decoupler), in tonnes.
  // payload: mass on top that is never dropped. g: surface gravity for TWR (m/s^2).
  function stack(stages, payload, g) {
    var out = [], above = payload || 0, totalDv = 0, totalTime = 0;
    var masses = [];
    for (var i = stages.length - 1; i >= 0; i--) { masses[i] = above; above += stages[i].wet; }
    for (i = 0; i < stages.length; i++) {
      var s = stages[i];
      var perf = enginePerf(s.engine, s.env);
      var thrust = perf.thrust * s.count;
      var m0 = s.wet + masses[i], m1 = s.dry + masses[i];
      var dv = rocketDv(perf.isp, m0, m1);
      var flow = s.count * s.engine.thrust / (s.engine.ispVac * G0); // t/s, same in any atmosphere
      var time = flow > 0 ? (m0 - m1) / flow : Infinity;
      out.push({ m0: m0, m1: m1, dv: dv, thrust: thrust, isp: perf.isp,
                 twrStart: thrust / (m0 * g), twrEnd: thrust / (m1 * g), burnTime: time });
      totalDv += dv; totalTime += time;
    }
    return { stages: out, totalDv: totalDv, totalTime: totalTime, liftoffMass: above };
  }

  // ---- Transfers ------------------------------------------------------------

  function normDeg(a) { a = a % 360; if (a > 180) a -= 360; if (a <= -180) a += 360; return a; }

  // Hohmann transfer between two bodies orbiting the same parent (circular, coplanar).
  // parkAlt: circular parking orbit altitude above the origin's surface, m.
  function hohmann(from, to, parkAlt) {
    var A = BODIES[from], B = BODIES[to];
    if (!A || !B || A.parent !== B.parent || from === to) return null;
    var mu = BODIES[A.parent].mu, r1 = A.sma, r2 = B.sma;
    var a = (r1 + r2) / 2;
    var tof = Math.PI * Math.sqrt(a * a * a / mu);
    var n1 = Math.sqrt(mu / (r1 * r1 * r1)), n2 = Math.sqrt(mu / (r2 * r2 * r2));
    var phase = normDeg((Math.PI - n2 * tof) * DEG);
    var v1 = Math.sqrt(mu / r1);
    var vDep = Math.sqrt(mu * (2 / r1 - 1 / a));
    var vinf = Math.abs(vDep - v1);
    var vArr = Math.sqrt(mu * (2 / r2 - 1 / a));
    var vinfArr = Math.abs(Math.sqrt(mu / r2) - vArr);
    var rp = A.radius + parkAlt;
    var vPark = Math.sqrt(A.mu / rp);
    var vBurn = Math.sqrt(vinf * vinf + 2 * A.mu / rp);
    var e = 1 + rp * vinf * vinf / A.mu;
    var thetaInf = Math.acos(-1 / e) * DEG;  // angle from periapsis to escape asymptote
    var outward = r2 > r1;
    return {
      parent: A.parent, outward: outward,
      transferTime: tof, phase: phase,
      synodic: TAU / Math.abs(n1 - n2),
      vinf: vinf, vinfArrive: vinfArr,
      parkSpeed: vPark, ejectionDv: vBurn - vPark,
      // Angle between the ship at the burn and the origin body's prograde (outward)
      // or retrograde (inward) direction; the burn comes this many degrees after
      // the ship crosses the opposite direction.
      ejectionAngle: thetaInf, afterCrossing: 180 - thetaInf
    };
  }

  // Mean longitude (deg) of a body at universal time t (s), treating its orbit as a circle.
  function longitude(name, t) {
    var b = BODIES[name];
    var n = TAU / period(name);
    return ((b.lan + b.argPe + (b.ma0 + n * t) * DEG) % 360 + 360) % 360;
  }

  function phaseNow(from, to, t) { return normDeg(longitude(to, t) - longitude(from, t)); }

  // Next UT at or after t when the target leads the origin by the Hohmann phase angle.
  function nextWindow(from, to, t) {
    var h = hohmann(from, to, 0);
    if (!h) return null;
    var rel = (TAU / period(to) - TAU / period(from)) * DEG; // deg/s, target relative to origin
    var diff = normDeg(h.phase - phaseNow(from, to, t));
    var dt = diff / rel;
    while (dt < 0) dt += h.synodic;
    while (dt >= h.synodic) dt -= h.synodic;
    return t + dt;
  }

  // Kerbin calendar: Year 1, Day 1, 0:00 is UT 0.
  function toUT(year, day, hour, minute) {
    return ((year - 1) * YEAR_DAYS + (day - 1)) * DAY + (hour || 0) * 3600 + (minute || 0) * 60;
  }
  function fromUT(t) {
    var days = Math.floor(t / DAY);
    var rest = t - days * DAY;
    return { year: Math.floor(days / YEAR_DAYS) + 1, day: (days % YEAR_DAYS) + 1,
             hour: Math.floor(rest / 3600), minute: Math.floor((rest % 3600) / 60) };
  }
  // Duration in Kerbin days and hours: { days, hours }.
  function kDuration(s) {
    var d = Math.floor(s / DAY);
    return { days: d, hours: (s - d * DAY) / 3600 };
  }

  // ---- CommNet --------------------------------------------------------------

  // Stock antennas, checked 21 Nov 2026 (KSP wiki CommNet page + part pages).
  // power is the antenna rating; exp is antennaCombinableExponent.
  var ANTENNAS = [
    { id: "internal", name: "Built-in (pod or probe core)", power: 5e3, exp: 0.75, relay: false, combinable: false },
    { id: "c16", name: "Communotron 16", power: 5e5, exp: 1.0, relay: false, combinable: true },
    { id: "c16s", name: "Communotron 16-S", power: 5e5, exp: 0.0, relay: false, combinable: true },
    { id: "dtsm1", name: "Communotron DTS-M1", power: 2e9, exp: 0.75, relay: false, combinable: true },
    { id: "hg55", name: "Communotron HG-55", power: 15e9, exp: 0.75, relay: false, combinable: true },
    { id: "c8888", name: "Communotron 88-88", power: 100e9, exp: 0.75, relay: false, combinable: true },
    { id: "hg5", name: "HG-5 High Gain (relay)", power: 5e6, exp: 0.75, relay: true, combinable: true },
    { id: "ra2", name: "RA-2 Relay", power: 2e9, exp: 0.75, relay: true, combinable: true },
    { id: "ra15", name: "RA-15 Relay", power: 15e9, exp: 0.75, relay: true, combinable: true },
    { id: "ra100", name: "RA-100 Relay", power: 100e9, exp: 0.75, relay: true, combinable: true }
  ];
  var DSN = { 1: 2e9, 2: 50e9, 3: 250e9 };
  var RANGE_MODIFIER = { easy: 1.0, normal: 1.0, moderate: 0.8, hard: 0.65 };

  function antenna(id) {
    for (var i = 0; i < ANTENNAS.length; i++) if (ANTENNAS[i].id === id) return ANTENNAS[i];
    return null;
  }

  // list: [{ id, count }]. relayOnly: count only relay antennas (power a relay offers to others).
  // Combinable antennas stack: strongest * (sum / strongest) ^ (power-weighted mean exponent).
  function vesselPower(list, relayOnly) {
    var sum = 0, strongest = 0, wexp = 0, best = 0;
    list.forEach(function (it) {
      var a = typeof it.id === "string" ? antenna(it.id) : it.id;
      var n = it.count || 0;
      if (!a || n <= 0 || (relayOnly && !a.relay)) return;
      if (!a.combinable) { best = Math.max(best, a.power); return; }
      sum += a.power * n;
      wexp += a.power * a.exp * n;
      strongest = Math.max(strongest, a.power);
    });
    var combined = sum > 0 ? strongest * Math.pow(sum / strongest, wexp / sum) : 0;
    return Math.max(best, combined);
  }

  function linkRange(p1, p2) { return Math.sqrt(p1 * p2); }

  // Closest and farthest distance (m) between Kerbin and another body: planets use
  // their periapsis/apoapsis around Kerbol, Kerbin's moons their orbit around Kerbin.
  function distanceFromKerbin(name) {
    var b = BODIES[name], k = BODIES.Kerbin;
    if (b.parent === "Kerbin") return { min: b.sma * (1 - b.ecc), max: b.sma * (1 + b.ecc) };
    if (b.parent !== "Kerbol") b = BODIES[b.parent];
    var pe = b.sma * (1 - b.ecc), ap = b.sma * (1 + b.ecc);
    var min = pe > k.sma ? pe - k.sma : (ap < k.sma ? k.sma - ap : 0);
    return { min: min, max: ap + k.sma };
  }

  // KSP's signal curve: 100% at 0 m, 0% at max range, smooth in between.
  function signal(distance, range) {
    if (range <= 0) return 0;
    var x = 1 - distance / range;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return (3 - 2 * x) * x * x;
  }

  // Largest distance that still gives at least `strength` (0-1).
  function distanceForSignal(strength, range) {
    if (strength <= 0) return range;
    if (strength >= 1) return 0;
    var lo = 0, hi = 1;
    for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if ((3 - 2 * mid) * mid * mid < strength) lo = mid; else hi = mid; }
    return range * (1 - hi);
  }

  var api = {
    G0: G0, DAY: DAY, YEAR_DAYS: YEAR_DAYS, BODIES: BODIES, BODY_ORDER: BODY_ORDER, ENGINES: ENGINES,
    ANTENNAS: ANTENNAS, DSN: DSN, RANGE_MODIFIER: RANGE_MODIFIER,
    surfaceGravity: surfaceGravity, period: period, engine: engine, enginePerf: enginePerf,
    rocketDv: rocketDv, stack: stack, hohmann: hohmann, longitude: longitude, phaseNow: phaseNow,
    nextWindow: nextWindow, toUT: toUT, fromUT: fromUT, kDuration: kDuration, normDeg: normDeg,
    antenna: antenna, vesselPower: vesselPower, linkRange: linkRange, signal: signal,
    distanceFromKerbin: distanceFromKerbin,
    distanceForSignal: distanceForSignal
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.Calc = root.Calc || {}; root.Calc.ksp = api; }
})(this);
