const path = require("path");
const { parseFileName } = require("../lib/parser");
const { levenshtein } = require("../lib/levenshtein");
const { scanFolder } = require("../lib/scanner");
const { analyze } = require("../lib/analyzer");
const { generateFixtures } = require("./generate-fixtures");

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
    console.log("  FAIL: " + message);
  }
}

function test(name, fn) {
  console.log("  " + name);
  try {
    fn();
  } catch (err) {
    failed++;
    errors.push(name + ": " + err.message);
    console.log("  FAIL (exception): " + err.message);
  }
}

// ── Generate fixtures ──
const fixturesDir = path.join(__dirname, "fixtures");
generateFixtures(fixturesDir);

console.log("");
console.log("E14-comparator — Tests");
console.log("");

// ── Parser tests ──
console.log("[Parser]");
test("parseFileName: original", () => {
  const r = parseFileName("abc123def.pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "original", "type should be original, got " + r.type);
  assert(r.hash === "abc123def", "hash should be abc123def, got " + r.hash);
  assert(r.index === 0, "index should be 0");
});

test("parseFileName: duplicate (1)", () => {
  const r = parseFileName("abc123def (1).pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "duplicate", "type should be duplicate, got " + r.type);
  assert(r.hash === "abc123def", "hash should be abc123def");
  assert(r.index === 1, "index should be 1, got " + r.index);
});

test("parseFileName: duplicate (99)", () => {
  const r = parseFileName("longhash (99).pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "duplicate", "type should be duplicate");
  assert(r.index === 99, "index should be 99, got " + r.index);
});

test("parseFileName: non-pdf returns null", () => {
  const r = parseFileName("abc123def.txt");
  assert(r === null, "non-pdf should return null");
});

test("parseFileName: long hash original", () => {
  const r = parseFileName("ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701.pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "original", "should be original");
  assert(r.hash === "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701", "hash should match");
});

// ── Levenshtein tests ──
console.log("");
console.log("[Levenshtein]");
test("identical strings = 0", () => {
  assert(levenshtein("abc", "abc") === 0, "distance should be 0");
});

test("1 char diff = 1", () => {
  assert(levenshtein("abc", "abd") === 1, "distance should be 1");
});

test("empty vs string = length", () => {
  assert(levenshtein("", "abc") === 3, "distance should be 3");
});

test("long hashes with 1 char diff", () => {
  const a = "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701";
  const b = "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac120c2c2ddd4b6859701";
  assert(levenshtein(a, b) === 1, "distance should be 1, got " + levenshtein(a, b));
});

// ── Scanner tests ──
console.log("");
console.log("[Scanner]");
test("scanFolder: clean scenario", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "clean"));
  assert(originals.length === 1, "should have 1 original, got " + originals.length);
  assert(duplicates.length === 2, "should have 2 duplicates, got " + duplicates.length);
});

test("scanFolder: single-anomaly scenario", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "single-anomaly"));
  assert(originals.length === 1, "should have 1 original, got " + originals.length);
  assert(duplicates.length === 2, "should have 2 duplicates, got " + duplicates.length);
});

test("scanFolder: only originals", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "only-originals"));
  assert(originals.length === 2, "should have 2 originals, got " + originals.length);
  assert(duplicates.length === 0, "should have 0 duplicates");
});

test("scanFolder: empty folder", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "empty"));
  assert(originals.length === 0, "should have 0 originals");
  assert(duplicates.length === 0, "should have 0 duplicates");
});

test("scanFolder: non-existent folder throws", () => {
  let threw = false;
  try {
    scanFolder("/nonexistent/path/12345");
  } catch (e) {
    threw = true;
  }
  assert(threw, "should throw for non-existent folder");
});

// ── Analyzer tests ──
console.log("");
console.log("[Analyzer]");
test("analyze: clean (no anomalies)", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "clean"));
  const { groups, anomalies } = analyze(originals, duplicates);
  assert(groups.size === 1, "should have 1 group, got " + groups.size);
  assert(anomalies.length === 0, "should have 0 anomalies, got " + anomalies.length);
});

test("analyze: single anomaly detected", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "single-anomaly"));
  const { groups, anomalies } = analyze(originals, duplicates);
  assert(groups.size === 1, "should have 1 group, got " + groups.size);
  assert(anomalies.length === 1, "should have 1 anomaly, got " + anomalies.length);
  assert(anomalies[0].distance === 1, "distance should be 1, got " + anomalies[0].distance);
  assert(anomalies[0].diffChars.length === 1, "should have 1 diff char, got " + anomalies[0].diffChars.length);
  assert(anomalies[0].diffChars[0].original === "0", "original char should be 0, got " + anomalies[0].diffChars[0].original);
  assert(anomalies[0].diffChars[0].duplicate === "1", "duplicate char should be 1, got " + anomalies[0].diffChars[0].duplicate);
});

test("analyze: mixed scenario (no anomalies)", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "mixed"));
  const { groups, anomalies } = analyze(originals, duplicates);
  assert(groups.size === 3, "should have 3 groups, got " + groups.size);
  assert(anomalies.length === 0, "should have 0 anomalies, got " + anomalies.length);
});

test("analyze: multi-anomaly (2 anomalies against same original)", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "multi-anomaly"));
  const { groups, anomalies } = analyze(originals, duplicates);
  assert(groups.size === 1, "should have 1 group, got " + groups.size);
  assert(anomalies.length === 2, "should have 2 anomalies, got " + anomalies.length);
});

test("analyze: only originals (no anomalies)", () => {
  const { originals, duplicates } = scanFolder(path.join(fixturesDir, "only-originals"));
  const { groups, anomalies } = analyze(originals, duplicates);
  assert(groups.size === 2, "should have 2 groups, got " + groups.size);
  assert(anomalies.length === 0, "should have 0 anomalies");
});

// ── Summary ──
console.log("");
console.log("=".repeat(50));
if (failed === 0) {
  console.log("TODOS PASARON  (" + passed + "/" + passed + ")");
} else {
  console.log("FALLARON " + failed + " de " + (passed + failed) + " tests");
  console.log("");
  for (const e of errors) {
    console.log("  - " + e);
  }
}
console.log("=".repeat(50));

process.exit(failed > 0 ? 1 : 0);
