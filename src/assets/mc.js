// Minecraft maths and game data as pure functions, shared by the pages and
// tests/mc.test.js. Game data: Java Edition 26.3 unless a function says otherwise.
(function (root) {
  "use strict";

  var VERSION = "Java Edition 26.3";
  var CHECKED = "21 November 2026";

  function floorDiv(a, b) { return Math.floor(a / b); }

  // ---------------------------------------------------------------- Experience
  // Points needed to go from `level` to level + 1.
  function xpToNext(level) {
    if (level <= 15) return 2 * level + 7;
    if (level <= 30) return 5 * level - 38;
    return 9 * level - 158;
  }
  // Total points collected to reach `level` from 0 (whole levels).
  function xpForLevel(level) {
    var L = level;
    if (L <= 16) return L * L + 6 * L;
    if (L <= 31) return 2.5 * L * L - 40.5 * L + 360;
    return 4.5 * L * L - 162.5 * L + 2220;
  }
  // Points at a level plus a fraction (0-1) of the bar.
  function xpAt(level, fraction) {
    return xpForLevel(level) + (fraction || 0) * xpToNext(level);
  }
  // Level reached with a total number of points: { level, points into it, fraction of bar }.
  function levelFromXp(points) {
    var L = 0;
    while (xpForLevel(L + 1) <= points) L++;
    var into = points - xpForLevel(L);
    return { level: L, into: into, fraction: into / xpToNext(L) };
  }
  // Points dropped on death in survival: 7 per level, capped at 100.
  function deathDrop(level) { return Math.min(7 * level, 100); }

  // --------------------------------------------------------------- Nether portal
  // Overworld -> Nether divides X and Z by 8 and rounds down; Y is unchanged.
  function toNether(x, z) { return { x: floorDiv(x, 8), z: floorDiv(z, 8) }; }
  function toOverworld(x, z) { return { x: x * 8, z: z * 8 }; }

  // How far from the converted point the game looks for an existing portal.
  // Java: 128 blocks each way in the Overworld, 16 in the Nether. Bedrock: 128 in both.
  function searchRadius(edition, dim) {
    if (edition === "bedrock") return 128;
    return dim === "nether" ? 16 : 128;
  }

  // Where a portal at p = {x, y, z} in `fromDim` leads.
  // others: portals in the other dimension [{x, y, z, name}]. Returns
  // { dest, radius, link: index or -1, dist, inRange: [indexes] }.
  function portalTarget(p, fromDim, others, edition) {
    var toDim = fromDim === "overworld" ? "nether" : "overworld";
    var d = fromDim === "overworld" ? toNether(p.x, p.z) : toOverworld(p.x, p.z);
    var dest = { x: d.x, y: p.y, z: d.z };
    var r = searchRadius(edition, toDim);
    var best = -1, bestDist = Infinity, inRange = [];
    others.forEach(function (o, i) {
      if (Math.abs(o.x - dest.x) > r || Math.abs(o.z - dest.z) > r) return;
      inRange.push(i);
      var dist = Math.sqrt(Math.pow(o.x - dest.x, 2) + Math.pow(o.y - dest.y, 2) + Math.pow(o.z - dest.z, 2));
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return { toDim: toDim, dest: dest, radius: r, link: best, dist: best >= 0 ? bestDist : NaN, inRange: inRange };
  }

  // Every portal's destination, and whether each pair links both ways.
  function portalNetwork(overworld, nether, edition) {
    var ow = overworld.map(function (p) { return portalTarget(p, "overworld", nether, edition); });
    var ne = nether.map(function (p) { return portalTarget(p, "nether", overworld, edition); });
    ow.forEach(function (t, i) { t.twoWay = t.link >= 0 && ne[t.link].link === i; });
    ne.forEach(function (t, i) { t.twoWay = t.link >= 0 && ow[t.link].link === i; });
    return { overworld: ow, nether: ne };
  }

  // --------------------------------------------------------------- Enchanting
  // id: [name, max level, multiplier from item, multiplier from book]
  var ENCHANTS = {
    protection: ["Protection", 4, 1, 1],
    fire_protection: ["Fire Protection", 4, 2, 1],
    feather_falling: ["Feather Falling", 4, 2, 1],
    blast_protection: ["Blast Protection", 4, 4, 2],
    projectile_protection: ["Projectile Protection", 4, 2, 1],
    thorns: ["Thorns", 3, 8, 4],
    respiration: ["Respiration", 3, 4, 2],
    depth_strider: ["Depth Strider", 3, 4, 2],
    aqua_affinity: ["Aqua Affinity", 1, 4, 2],
    sharpness: ["Sharpness", 5, 1, 1],
    smite: ["Smite", 5, 2, 1],
    bane_of_arthropods: ["Bane of Arthropods", 5, 2, 1],
    knockback: ["Knockback", 2, 2, 1],
    fire_aspect: ["Fire Aspect", 2, 4, 2],
    looting: ["Looting", 3, 4, 2],
    sweeping_edge: ["Sweeping Edge", 3, 4, 2],
    efficiency: ["Efficiency", 5, 1, 1],
    silk_touch: ["Silk Touch", 1, 8, 4],
    unbreaking: ["Unbreaking", 3, 2, 1],
    fortune: ["Fortune", 3, 4, 2],
    power: ["Power", 5, 1, 1],
    punch: ["Punch", 2, 4, 2],
    flame: ["Flame", 1, 4, 2],
    infinity: ["Infinity", 1, 8, 4],
    luck_of_the_sea: ["Luck of the Sea", 3, 4, 2],
    lure: ["Lure", 3, 4, 2],
    frost_walker: ["Frost Walker", 2, 4, 2],
    mending: ["Mending", 1, 4, 2],
    binding_curse: ["Curse of Binding", 1, 8, 4],
    vanishing_curse: ["Curse of Vanishing", 1, 8, 4],
    impaling: ["Impaling", 5, 4, 2],
    riptide: ["Riptide", 3, 4, 2],
    loyalty: ["Loyalty", 3, 1, 1],
    channeling: ["Channeling", 1, 8, 4],
    multishot: ["Multishot", 1, 4, 2],
    piercing: ["Piercing", 4, 1, 1],
    quick_charge: ["Quick Charge", 3, 2, 1],
    soul_speed: ["Soul Speed", 3, 8, 4],
    swift_sneak: ["Swift Sneak", 3, 8, 4],
    wind_burst: ["Wind Burst", 3, 4, 2],
    density: ["Density", 5, 2, 1],
    breach: ["Breach", 4, 4, 2],
    lunge: ["Lunge", 3, 2, 1]
  };

  // Enchantments in the same group can't share an item.
  var CONFLICTS = [
    ["protection", "fire_protection", "blast_protection", "projectile_protection"],
    ["sharpness", "smite", "bane_of_arthropods", "density", "breach"],
    ["silk_touch", "fortune"],
    ["depth_strider", "frost_walker"],
    ["infinity", "mending"],
    ["multishot", "piercing"],
    ["riptide", "loyalty"],
    ["riptide", "channeling"]
  ];

  var ARMOR = ["protection", "fire_protection", "blast_protection", "projectile_protection", "thorns"];
  var COMMON = ["unbreaking", "mending", "vanishing_curse"];
  var DIG = ["efficiency", "fortune", "silk_touch"];
  // What an anvil will put on each item (Java). Order = display order.
  var ITEMS = {
    sword: ["Sword", ["sharpness", "smite", "bane_of_arthropods", "looting", "fire_aspect", "sweeping_edge", "knockback"].concat(COMMON)],
    spear: ["Spear", ["sharpness", "smite", "bane_of_arthropods", "looting", "fire_aspect", "lunge", "knockback"].concat(COMMON)],
    axe: ["Axe", ["sharpness", "smite", "bane_of_arthropods"].concat(DIG, COMMON)],
    pickaxe: ["Pickaxe", DIG.concat(COMMON)],
    shovel: ["Shovel", DIG.concat(COMMON)],
    hoe: ["Hoe", DIG.concat(COMMON)],
    mace: ["Mace", ["density", "breach", "smite", "bane_of_arthropods", "wind_burst", "fire_aspect"].concat(COMMON)],
    bow: ["Bow", ["power", "punch", "flame", "infinity"].concat(COMMON)],
    crossbow: ["Crossbow", ["quick_charge", "multishot", "piercing"].concat(COMMON)],
    trident: ["Trident", ["impaling", "loyalty", "riptide", "channeling"].concat(COMMON)],
    fishing_rod: ["Fishing Rod", ["luck_of_the_sea", "lure"].concat(COMMON)],
    helmet: ["Helmet (or turtle shell)", ARMOR.concat(["respiration", "aqua_affinity"], COMMON, ["binding_curse"])],
    chestplate: ["Chestplate", ARMOR.concat(COMMON, ["binding_curse"])],
    leggings: ["Leggings", ARMOR.concat(["swift_sneak"], COMMON, ["binding_curse"])],
    boots: ["Boots", ARMOR.concat(["feather_falling", "depth_strider", "frost_walker", "soul_speed"], COMMON, ["binding_curse"])],
    elytra: ["Elytra", COMMON.concat(["binding_curse"])],
    shield: ["Shield", COMMON],
    shears: ["Shears", ["efficiency"].concat(COMMON)]
  };

  function conflicts(a, b) {
    return CONFLICTS.some(function (g) { return a !== b && g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
  }

  // Prior work penalty after `uses` anvil uses: 0, 1, 3, 7, 15, 31...
  function priorWork(uses) { return Math.pow(2, uses) - 1; }

  var TOO_EXPENSIVE = 40; // Java survival refuses any job costing 40 levels or more

  // Cheapest order to put enchanted books on an item.
  // books: [{ id, level }], one book per enchantment, each already at the level wanted.
  // itemUses: anvil uses the item already has (0 for a fresh item).
  // Returns { ok, total, steps, uses } or { ok: false, reason }.
  // A step is { target, sacrifice, cost, uses } where target and sacrifice
  // are trees: a number (index into books; -1 = the item) or [left, right].
  function enchantOrder(books, itemUses) {
    var n = books.length + 1; // element 0 is the item
    if (n > 13) return { ok: false, reason: "Too many books (12 at most)." };
    for (var i = 0; i < books.length; i++) {
      for (var j = i + 1; j < books.length; j++) {
        if (books[i].id === books[j].id) return { ok: false, reason: "Two books with " + ENCHANTS[books[i].id][0] + "." };
        if (conflicts(books[i].id, books[j].id)) {
          return { ok: false, reason: ENCHANTS[books[i].id][0] + " and " + ENCHANTS[books[j].id][0] + " can't go on the same item." };
        }
      }
    }
    var full = (1 << n) - 1;
    // value of a group of books as a sacrifice: level x book multiplier, summed
    var val = new Array(full + 1).fill(0);
    for (var m = 1; m <= full; m++) {
      var low = m & -m, bit = 31 - Math.clz32(low);
      val[m] = val[m ^ low] + (bit === 0 ? 0 : books[bit - 1].level * ENCHANTS[books[bit - 1].id][3]);
    }
    // best[mask] = { uses: { total, maxStep, tree, steps } }
    var best = new Array(full + 1);
    best[1] = {}; best[1][itemUses || 0] = { total: 0, maxStep: 0, tree: -1, steps: [] };
    for (var b = 1; b < n; b++) { best[1 << b] = { 0: { total: 0, maxStep: 0, tree: b - 1, steps: [] } }; }

    var masks = [];
    for (m = 1; m <= full; m++) if (m & (m - 1)) masks.push(m);
    masks.sort(function (a, c) { return popcount(a) - popcount(c); });

    masks.forEach(function (M) {
      var res = {};
      var hasItem = M & 1;
      for (var A = (M - 1) & M; A > 0; A = (A - 1) & M) {
        var B = M ^ A;
        if (hasItem && !(A & 1)) continue; // the item must be the target (left slot)
        var bA = best[A], bB = best[B];
        if (!bA || !bB) continue;
        for (var wa in bA) {
          for (var wb in bB) {
            var wA = +wa, wB = +wb;
            var cost = priorWork(wA) + priorWork(wB) + val[B];
            if (cost >= TOO_EXPENSIVE) continue;
            var w = Math.max(wA, wB) + 1;
            var x = bA[wa], y = bB[wb];
            var total = x.total + y.total + cost;
            var maxStep = Math.max(x.maxStep, y.maxStep, cost);
            var cur = res[w];
            if (!cur || total < cur.total || (total === cur.total && maxStep < cur.maxStep)) {
              res[w] = { total: total, maxStep: maxStep, tree: [x.tree, y.tree],
                         steps: x.steps.concat(y.steps, [{ target: x.tree, sacrifice: y.tree, cost: cost, uses: w }]) };
            }
          }
        }
      }
      best[M] = res;
    });

    var fin = best[full], pick = null, pickUses = 0;
    for (var w in fin) {
      var r = fin[w];
      if (!pick || r.total < pick.total || (r.total === pick.total && +w < pickUses)) { pick = r; pickUses = +w; }
    }
    if (n === 1) return { ok: true, total: 0, steps: [], uses: itemUses || 0 };
    if (!pick) return { ok: false, reason: "Every order has a step costing 40 levels or more (\"Too Expensive!\"). Use fewer books, or a fresh item." };
    return { ok: true, total: pick.total, maxStep: pick.maxStep, steps: pick.steps, uses: pickUses, tree: pick.tree };
  }

  function popcount(x) { var c = 0; while (x) { x &= x - 1; c++; } return c; }

  // XP points a step costs if you have exactly `levels` levels when you pay.
  function levelsToPoints(levels) { return xpForLevel(levels); }

  // ---------------------------------------------------------- Circles and spheres
  // Filled ellipse w x h blocks: block (i, j) is in if its centre is inside.
  function ellipse(w, h) {
    var rows = [];
    for (var j = 0; j < h; j++) {
      var row = [];
      for (var i = 0; i < w; i++) {
        var nx = (i + 0.5 - w / 2) / (w / 2), ny = (j + 0.5 - h / 2) / (h / 2);
        row.push(nx * nx + ny * ny <= 1);
      }
      rows.push(row);
    }
    return rows;
  }

  // Keep only the edge of a filled shape. thick: walls joined along faces
  // (no diagonal gaps); thin: blocks may touch only at corners.
  function outline(grid, thick) {
    var h = grid.length, w = h ? grid[0].length : 0;
    function at(i, j) { return j >= 0 && j < h && i >= 0 && i < w && grid[j][i]; }
    return grid.map(function (row, j) {
      return row.map(function (on, i) {
        if (!on) return false;
        if (!at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1)) return true;
        return !!thick && (!at(i - 1, j - 1) || !at(i + 1, j - 1) || !at(i - 1, j + 1) || !at(i + 1, j + 1));
      });
    });
  }

  function countBlocks(grid) {
    return grid.reduce(function (s, row) { return s + row.filter(Boolean).length; }, 0);
  }

  // Inside test for a sphere of diameter d at block (i, j, k).
  function inSphere(d, i, j, k) {
    var r = d / 2;
    var x = (i + 0.5 - r) / r, y = (j + 0.5 - r) / r, z = (k + 0.5 - r) / r;
    return x * x + y * y + z * z <= 1;
  }

  // One horizontal layer (y = 0 is the bottom) of a sphere of diameter d.
  // hollow: only blocks with an outside neighbour (6 faces, or all 26 when thick).
  function sphereLayer(d, y, hollow, thick) {
    var rows = [];
    for (var k = 0; k < d; k++) {
      var row = [];
      for (var i = 0; i < d; i++) {
        var on = inSphere(d, i, y, k);
        if (on && hollow) {
          var edge = false;
          for (var dy = -1; dy <= 1 && !edge; dy++) {
            for (var dz = -1; dz <= 1 && !edge; dz++) {
              for (var dx = -1; dx <= 1 && !edge; dx++) {
                var faces = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                if (faces === 0 || (!thick && faces > 1)) continue;
                var ni = i + dx, nj = y + dy, nk = k + dz;
                var inside = ni >= 0 && nj >= 0 && nk >= 0 && ni < d && nj < d && nk < d && inSphere(d, ni, nj, nk);
                if (!inside) edge = true;
              }
            }
          }
          on = edge;
        }
        row.push(on);
      }
      rows.push(row);
    }
    return rows;
  }

  function sphereCount(d, hollow, thick, fromLayer) {
    var s = 0;
    for (var y = fromLayer || 0; y < d; y++) s += countBlocks(sphereLayer(d, y, hollow, thick));
    return s;
  }

  // Stacks of 64 and shulker boxes (27 stacks) for a block count.
  function stacks(n) {
    return { stacks: Math.floor(n / 64), rest: n % 64, shulkers: n / (64 * 27) };
  }

  // ---------------------------------------------------------------- Slime chunks
  // BigInt is built at run time (no 1n literals) so an old browser without it
  // still loads every other tool on the page.
  var B = typeof BigInt === "function" ? BigInt : null;
  var MASK48 = B && (B(1) << B(48)) - B(1);
  var MULT = B && B("0x5DEECE66D");
  var ADD = B && B(11);

  // java.util.Random, enough of it for slime chunks.
  function JavaRandom(seed) { this.s = (B.asIntN(64, B(seed)) ^ MULT) & MASK48; }
  JavaRandom.prototype.next = function (bits) {
    this.s = (this.s * MULT + ADD) & MASK48;
    return Number(B.asIntN(32, this.s >> B(48 - bits)));
  };
  JavaRandom.prototype.nextInt = function (bound) {
    if (bound === undefined) return this.next(32);
    if ((bound & -bound) === bound) return Number((B(bound) * B(this.next(31))) >> B(31));
    var u, r;
    do { u = this.next(31); r = u % bound; } while (u - r + (bound - 1) > 0x7fffffff);
    return r;
  };

  // A world seed as typed in the Create World screen: a whole number in the
  // 64-bit range is used as is; any other text uses Java's String.hashCode.
  function parseSeed(text) {
    var t = String(text).trim();
    if (/^-?\d+$/.test(t)) {
      var n = B(t);
      if (B.asIntN(64, n) === n) return n;
    }
    var h = 0;
    for (var i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
    return B(h);
  }

  function chunkOf(block) { return Math.floor(block / 16); }

  function isSlimeChunkJava(seed, cx, cz) {
    var s = B.asIntN(64,
      B(seed) +
      B(Math.imul(Math.imul(cx, cx), 0x4c1906)) +
      B(Math.imul(cx, 0x5ac0db)) +
      B(Math.imul(cz, cz)) * B(0x4307a7) +
      B(Math.imul(cz, 0x5f24f))) ^ B(0x3ad8025f);
    return new JavaRandom(s).nextInt(10) === 0;
  }

  // Bedrock: first Mersenne Twister (MT19937) output, seeded from the chunk
  // coordinates only, so the same chunks in every world.
  function mtFirst(seed) {
    var mt = new Uint32Array(398);
    mt[0] = seed >>> 0;
    for (var i = 1; i < 398; i++) {
      var p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, p) + i) >>> 0;
    }
    var y = (mt[0] & 0x80000000) | (mt[1] & 0x7fffffff);
    var v = mt[397] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
    v ^= v >>> 11;
    v ^= (v << 7) & 0x9d2c5680;
    v ^= (v << 15) & 0xefc60000;
    v ^= v >>> 18;
    return v >>> 0;
  }
  function isSlimeChunkBedrock(cx, cz) {
    return mtFirst((Math.imul(cx, 0x1f1f1f1f) ^ cz) >>> 0) % 10 === 0;
  }

  var api = {
    VERSION: VERSION, CHECKED: CHECKED,
    xpToNext: xpToNext, xpForLevel: xpForLevel, xpAt: xpAt, levelFromXp: levelFromXp, deathDrop: deathDrop,
    toNether: toNether, toOverworld: toOverworld, searchRadius: searchRadius,
    portalTarget: portalTarget, portalNetwork: portalNetwork,
    ENCHANTS: ENCHANTS, ITEMS: ITEMS, CONFLICTS: CONFLICTS, conflicts: conflicts, priorWork: priorWork,
    enchantOrder: enchantOrder, levelsToPoints: levelsToPoints, TOO_EXPENSIVE: TOO_EXPENSIVE,
    ellipse: ellipse, outline: outline, countBlocks: countBlocks, sphereLayer: sphereLayer,
    sphereCount: sphereCount, stacks: stacks,
    JavaRandom: JavaRandom, parseSeed: parseSeed, chunkOf: chunkOf,
    isSlimeChunkJava: isSlimeChunkJava, isSlimeChunkBedrock: isSlimeChunkBedrock, mtFirst: mtFirst
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.Calc = root.Calc || {}; root.Calc.mc = api; }
})(this);
