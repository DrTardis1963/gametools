// Minecraft checks, including every number printed in the pages' worked examples.
"use strict";
const { eq, ok } = require("./lib.js");
const M = require("../src/assets/mc.js");

// ---- XP (Minecraft Wiki level table)
eq("xp L1", M.xpForLevel(1), 7);
eq("xp L16", M.xpForLevel(16), 352);
eq("xp L17", M.xpForLevel(17), 394);
eq("xp L30", M.xpForLevel(30), 1395);
eq("xp L31", M.xpForLevel(31), 1507);
eq("xp L32", M.xpForLevel(32), 1628);
eq("xp L40", M.xpForLevel(40), 2920);
eq("xp L65", M.xpForLevel(65), 10670);
// the step formula and the total formula agree everywhere
for (let L = 0; L < 200; L++) eq(`xp step ${L}`, M.xpForLevel(L + 1) - M.xpForLevel(L), M.xpToNext(L));
eq("xp 30->31 (page)", M.xpToNext(30), 112);
eq("xp 0->7 (page)", M.xpForLevel(7), 91);
eq("bottles 0->30 (page)", Math.ceil(M.xpForLevel(30) / 7), 200);
eq("level from 1395", M.levelFromXp(1395).level, 30);
eq("level from 1394", M.levelFromXp(1394).level, 29);
eq("level from 0", M.levelFromXp(0).level, 0);
eq("death L30", M.deathDrop(30), 100);
eq("death L5", M.deathDrop(5), 35);
eq("100 points -> level 7 (page)", M.levelFromXp(100).level, 7);
eq("8 levels from 38 (page)", M.xpForLevel(38) - M.xpForLevel(30), 1148);
eq("8 levels at 8 (page)", M.xpForLevel(8), 112);

// ---- Nether portals
let c = M.toNether(1000, -500);
eq("ow->n x", c.x, 125); eq("ow->n z", c.z, -63);
c = M.toNether(1100, -300);
eq("ow->n 1100", c.x, 137); eq("ow->n -300", c.z, -38);
c = M.toNether(-1, 7);
eq("ow->n -1", c.x, -1); eq("ow->n 7", c.z, 0);
c = M.toOverworld(137, -63);
eq("n->ow x", c.x, 1096); eq("n->ow z", c.z, -504);
eq("radius java nether", M.searchRadius("java", "nether"), 16);
eq("radius java ow", M.searchRadius("java", "overworld"), 128);
eq("radius bedrock nether", M.searchRadius("bedrock", "nether"), 128);

// page example: the farm portal goes to the home Nether portal
const home = { name: "Home", x: 1000, y: 70, z: -500 }, farm = { name: "Farm", x: 1100, y: 64, z: -500 };
const homeN = { name: "Home", x: 125, y: 70, z: -63 }, farmN = { name: "Farm", x: 137, y: 64, z: -63 };
let net = M.portalNetwork([home, farm], [homeN], "java");
eq("broken: home links home", net.overworld[0].link, 0);
ok("broken: home two-way", net.overworld[0].twoWay);
eq("broken: farm -> home nether", net.overworld[1].link, 0);
ok("broken: farm not two-way", !net.overworld[1].twoWay);
eq("broken: farm dist", Math.round(net.overworld[1].dist * 100) / 100, 13.42);
eq("broken: farm dest x", net.overworld[1].dest.x, 137);
net = M.portalNetwork([home, farm], [homeN, farmN], "java");
ok("fixed: all two-way", net.overworld.concat(net.nether).every((t) => t.twoWay));
// 136 blocks apart can't interfere; 128 apart can
net = M.portalNetwork([{ x: 0, y: 64, z: 0 }, { x: 136, y: 64, z: 0 }], [{ x: 0, y: 64, z: 0 }], "java");
eq("136 apart: no link", net.overworld[1].link, -1);
eq("136 apart: back", M.portalTarget({ x: 17, y: 64, z: 0 }, "nether", [{ x: 0, y: 64, z: 0 }], "java").link, -1);
net = M.portalNetwork([{ x: 0, y: 64, z: 0 }, { x: 128, y: 64, z: 0 }], [{ x: 0, y: 64, z: 0 }], "java");
eq("128 apart: links", net.overworld[1].link, 0);
// Bedrock's 128-block Nether search
eq("bedrock far link", M.portalTarget({ x: 800, y: 64, z: 0 }, "overworld", [{ x: 0, y: 64, z: 0 }], "bedrock").link, 0);
eq("java far no link", M.portalTarget({ x: 800, y: 64, z: 0 }, "overworld", [{ x: 0, y: 64, z: 0 }], "java").link, -1);
// height counts in the distance
const t = M.portalTarget({ x: 0, y: 64, z: 0 }, "overworld", [{ x: 2, y: 124, z: 0 }, { x: 10, y: 64, z: 0 }], "java");
eq("height wins", t.link, 1);

// ---- Enchanting
eq("43 enchantments", Object.keys(M.ENCHANTS).length, 43);
for (const k in M.ITEMS) for (const id of M.ITEMS[k][1]) ok(`item ${k} has known ${id}`, !!M.ENCHANTS[id]);
for (const g of M.CONFLICTS) for (const id of g) ok(`conflict id ${id}`, !!M.ENCHANTS[id]);
ok("silk vs fortune", M.conflicts("silk_touch", "fortune"));
ok("sharp vs density", M.conflicts("sharpness", "density"));
ok("loyalty vs channeling ok", !M.conflicts("loyalty", "channeling"));
ok("lunge vs mending ok", !M.conflicts("lunge", "mending"));
eq("pwp 0", M.priorWork(0), 0); eq("pwp 3", M.priorWork(3), 7); eq("pwp 5", M.priorWork(5), 31);

const pick = [{ id: "efficiency", level: 5 }, { id: "unbreaking", level: 3 }, { id: "fortune", level: 3 }, { id: "mending", level: 1 }];
let r = M.enchantOrder(pick, 0);
ok("pickaxe ok", r.ok);
eq("pickaxe total (page)", r.total, 23);
eq("pickaxe steps", r.steps.map((s) => s.cost).join(","), "6,2,7,8");
eq("pickaxe uses", r.uses, 3);
eq("pickaxe max", r.maxStep, 8);
eq("pickaxe final penalty (page)", M.priorWork(r.uses), 7);
eq("pickaxe points", r.steps.reduce((s, x) => s + M.levelsToPoints(x.cost), 0), 291);
// the naive one-by-one order on the page: 5 + 4 + 9 + 9 = 27
let w = 0, naive = 0;
for (const b of pick) { naive += M.priorWork(w) + b.level * M.ENCHANTS[b.id][3]; w++; }
eq("pickaxe naive (page)", naive, 27);
// brute force: no binary merge tree beats the DP (small case, all trees enumerated)
function brute(items) {
  if (items.length === 1) return [{ w: items[0].w, total: 0 }];
  let out = [];
  const n = items.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j) continue;
    const a = items[i], b = items[j];
    if (b.item) continue; // the item is never the sacrifice
    if (!a.item && j < i && !items.some((x) => x.item)) { /* both orders tried anyway */ }
    const cost = M.priorWork(a.w) + M.priorWork(b.w) + b.val;
    if (cost >= 40) continue;
    const merged = { item: a.item || b.item, w: Math.max(a.w, b.w) + 1, val: a.val + b.val };
    const rest = items.filter((_, k) => k !== i && k !== j).concat([merged]);
    for (const s of brute(rest)) out.push({ total: s.total + cost });
  }
  return out;
}
const bruteBest = Math.min(...brute([{ item: true, w: 0, val: 0 }].concat(pick.map((b) => ({ w: 0, val: b.level * M.ENCHANTS[b.id][3] })))).map((x) => x.total));
eq("pickaxe brute force", bruteBest, 23);
r = M.enchantOrder([{ id: "sharpness", level: 5 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }, { id: "looting", level: 3 },
  { id: "sweeping_edge", level: 3 }, { id: "fire_aspect", level: 2 }, { id: "knockback", level: 2 }], 0);
eq("sword 7 books", r.total, 49);
ok("sword steps under 40", r.steps.every((s) => s.cost < 40));
ok("conflict refused", !M.enchantOrder([{ id: "silk_touch", level: 1 }, { id: "fortune", level: 3 }], 0).ok);
ok("duplicate refused", !M.enchantOrder([{ id: "unbreaking", level: 3 }, { id: "unbreaking", level: 2 }], 0).ok);
r = M.enchantOrder([{ id: "mending", level: 1 }], 5);
eq("worn item one book", r.total, 31 + 2);
ok("too expensive", !M.enchantOrder([{ id: "thorns", level: 3 }], 6).ok);

// ---- Circles and spheres (hand-worked on the page)
eq("circle 1", M.countBlocks(M.ellipse(1, 1)), 1);
eq("circle 3 (page)", M.countBlocks(M.ellipse(3, 3)), 9);
eq("circle 4 (page)", M.countBlocks(M.ellipse(4, 4)), 12);
eq("circle 5 (page)", M.countBlocks(M.ellipse(5, 5)), 21);
eq("circle 7 outline", M.outline(M.ellipse(7, 7)).map((r) => r.map((b) => (b ? "#" : ".")).join("")).join("/"),
  "..###../.#...#./#.....#/#.....#/#.....#/.#...#./..###..");
eq("sphere 15 thin (page)", M.sphereCount(15, true, false), 530);
eq("sphere 15 thick (page)", M.sphereCount(15, true, true), 890);
eq("sphere 15 filled (page)", M.sphereCount(15, false, false), 1791);
eq("stacks 530", M.stacks(530).stacks, 8); eq("stacks 530 rest", M.stacks(530).rest, 18);
// symmetry and a sane volume
const g = M.ellipse(31, 31);
ok("circle symmetric", g.every((row, j) => row.every((b, i) => b === g[30 - j][i] && b === row[30 - i] && b === g[i][j])));
ok("sphere volume close", Math.abs(M.sphereCount(40, false) / (4 / 3 * Math.PI * 20 ** 3) - 1) < 0.02);
ok("thick outline is 4-connected", (() => {
  const o = M.outline(M.ellipse(25, 25), true);
  // every outline block has an outline neighbour on a face
  return o.every((row, j) => row.every((b, i) => !b || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => o[j + dy] && o[j + dy][i + dx])));
})());

// ---- Slime chunks
eq("java random 42", new M.JavaRandom(42).nextInt(), -1170105035);
eq("java random 0", new M.JavaRandom(0).nextInt(), -1155484576);
eq("hashCode hello", Number(M.parseSeed("hello")), 99162322);
eq("seed number", String(M.parseSeed("-4172144997902289642")), "-4172144997902289642");
eq("seed too big -> hash", typeof M.parseSeed("99999999999999999999"), "bigint");
eq("chunk 24", M.chunkOf(24), 1); eq("chunk -24", M.chunkOf(-24), -2); eq("chunk -1", M.chunkOf(-1), -1);
const s = M.parseSeed("146008555");
ok("java slime (1,-2) (page)", M.isSlimeChunkJava(s, 1, -2));
ok("java slime (-2,2) (page)", M.isSlimeChunkJava(s, -2, 2));
ok("java not (0,0) (page)", !M.isSlimeChunkJava(s, 0, 0));
ok("bedrock (3,1) (page)", M.isSlimeChunkBedrock(3, 1));
ok("bedrock (-61,-59) (page)", M.isSlimeChunkBedrock(-61, -59));
ok("bedrock not (0,0) (page)", !M.isSlimeChunkBedrock(0, 0));
ok("bedrock not (-61,-60) (page)", !M.isSlimeChunkBedrock(-61, -60));
let n = 0, nb = 0;
for (let x = -100; x < 100; x++) for (let z = -100; z < 100; z++) { if (M.isSlimeChunkJava(s, x, z)) n++; if (M.isSlimeChunkBedrock(x, z)) nb++; }
ok("about 1 in 10 java", Math.abs(n / 40000 - 0.1) < 0.01);
ok("about 1 in 10 bedrock", Math.abs(nb / 40000 - 0.1) < 0.01);
