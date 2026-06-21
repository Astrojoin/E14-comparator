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
  if (condition) { passed++; } else { failed++; errors.push(message); console.log("  FAIL: " + message); }
}

function test(name, fn) {
  console.log("  " + name);
  try { fn(); } catch (err) { failed++; errors.push(name + ": " + err.message); console.log("  FAIL (exception): " + err.message); }
}

const fixturesDir = path.join(__dirname, "fixtures");
generateFixtures(fixturesDir);

console.log("");
console.log("E14-comparator - Tests");
console.log("");

console.log("[Parser]");
test("parseFileName: original", function() {
  var r = parseFileName("abc123def.pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "original", "type should be original, got " + r.type);
  assert(r.hash === "abc123def", "hash should be abc123def, got " + r.hash);
  assert(r.index === 0, "index should be 0");
});
test("parseFileName: duplicate (1)", function() {
  var r = parseFileName("abc123def (1).pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "duplicate", "type should be duplicate, got " + r.type);
  assert(r.hash === "abc123def", "hash should be abc123def");
  assert(r.index === 1, "index should be 1, got " + r.index);
});
test("parseFileName: duplicate (99)", function() {
  var r = parseFileName("longhash (99).pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "duplicate", "type should be duplicate");
  assert(r.index === 99, "index should be 99, got " + r.index);
});
test("parseFileName: non-pdf returns null", function() {
  var r = parseFileName("abc123def.txt");
  assert(r === null, "non-pdf should return null");
});
test("parseFileName: long hash original", function() {
  var r = parseFileName("ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701.pdf");
  assert(r !== null, "should not return null");
  assert(r.type === "original", "should be original");
  assert(r.hash === "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701", "hash should match");
});

console.log("");
console.log("[Levenshtein]");
test("identical strings = 0", function() { assert(levenshtein("abc", "abc") === 0, "distance should be 0"); });
test("1 char diff = 1", function() { assert(levenshtein("abc", "abd") === 1, "distance should be 1"); });
test("empty vs string = length", function() { assert(levenshtein("", "abc") === 3, "distance should be 3"); });
test("long hashes with 1 char diff", function() {
  var a = "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701";
  var b = "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac120c2c2ddd4b6859701";
  assert(levenshtein(a, b) === 1, "distance should be 1, got " + levenshtein(a, b));
});

console.log("");
console.log("[Scanner]");
test("scanFolder: clean scenario", function() {
  var r = scanFolder(path.join(fixturesDir, "clean"));
  assert(r.originals.length === 1, "should have 1 original, got " + r.originals.length);
  assert(r.duplicates.length === 2, "should have 2 duplicates, got " + r.duplicates.length);
});
test("scanFolder: single-anomaly scenario", function() {
  var r = scanFolder(path.join(fixturesDir, "single-anomaly"));
  assert(r.originals.length === 1, "should have 1 original, got " + r.originals.length);
  assert(r.duplicates.length === 2, "should have 2 duplicates, got " + r.duplicates.length);
});
test("scanFolder: only originals", function() {
  var r = scanFolder(path.join(fixturesDir, "only-originals"));
  assert(r.originals.length === 2, "should have 2 originals, got " + r.originals.length);
  assert(r.duplicates.length === 0, "should have 0 duplicates");
});
test("scanFolder: empty folder", function() {
  var r = scanFolder(path.join(fixturesDir, "empty"));
  assert(r.originals.length === 0, "should have 0 originals");
  assert(r.duplicates.length === 0, "should have 0 duplicates");
});
test("scanFolder: non-existent folder throws", function() {
  var threw = false;
  try { scanFolder("/nonexistent/path/12345"); } catch (e) { threw = true; }
  assert(threw, "should throw for non-existent folder");
});

console.log("");
console.log("[Analyzer]");
test("analyze: clean (no anomalies)", function() {
  var r = scanFolder(path.join(fixturesDir, "clean"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 1, "should have 1 group, got " + result.groups.size);
  assert(result.anomalies.length === 0, "should have 0 anomalies, got " + result.anomalies.length);
});
test("analyze: single anomaly detected", function() {
  var r = scanFolder(path.join(fixturesDir, "single-anomaly"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 1, "should have 1 group, got " + result.groups.size);
  assert(result.anomalies.length === 1, "should have 1 anomaly, got " + result.anomalies.length);
  assert(result.anomalies[0].distance === 1, "distance should be 1, got " + result.anomalies[0].distance);
  assert(result.anomalies[0].diffChars.length === 1, "should have 1 diff char");
  assert(result.anomalies[0].diffChars[0].original === "0", "original char should be 0");
  assert(result.anomalies[0].diffChars[0].duplicate === "1", "duplicate char should be 1");
});
test("analyze: mixed scenario (no anomalies)", function() {
  var r = scanFolder(path.join(fixturesDir, "mixed"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 3, "should have 3 groups, got " + result.groups.size);
  assert(result.anomalies.length === 0, "should have 0 anomalies, got " + result.anomalies.length);
});
test("analyze: multi-anomaly (2 anomalies against same original)", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-anomaly"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 1, "should have 1 group, got " + result.groups.size);
  assert(result.anomalies.length === 2, "should have 2 anomalies, got " + result.anomalies.length);
});
test("analyze: only originals (no anomalies)", function() {
  var r = scanFolder(path.join(fixturesDir, "only-originals"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 2, "should have 2 groups, got " + result.groups.size);
  assert(result.anomalies.length === 0, "should have 0 anomalies");
});

// Multi-group: 3 originals, each with 5 duplicates.
// Group A: 4 clean + 1 ERROR (pos 11: b->c)
// Group B: 5 clean (no errors)
// Group C: 4 clean + 1 ERROR (pos 23: 7->8)
// Total: 3 originals, 15 duplicates (13 clean + 2 error)
console.log("");
console.log("[Multi-group]");
test("scanFolder: multi-group has 3 originals, 15 duplicates", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  assert(r.originals.length === 3, "should have 3 originals, got " + r.originals.length);
  assert(r.duplicates.length === 15, "should have 15 duplicates, got " + r.duplicates.length);
});
test("analyze: 3 groups, 2 anomalies", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  var result = analyze(r.originals, r.duplicates);
  assert(result.groups.size === 3, "should have 3 groups, got " + result.groups.size);
  assert(result.anomalies.length === 2, "should have 2 anomalies, got " + result.anomalies.length);
});
test("analyze: group A error at pos 11 (b->c)", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  var result = analyze(r.originals, r.duplicates);
  var a = result.anomalies.find(function(x) { return x.originalHash.indexOf("aaaa0000") === 0; });
  assert(a !== undefined, "should find anomaly for group A");
  assert(a.distance === 1, "distance should be 1");
  assert(a.diffChars[0].position === 11, "diff should be at pos 11, got " + a.diffChars[0].position);
  assert(a.diffChars[0].original === "b", "original char should be b, got " + a.diffChars[0].original);
  assert(a.diffChars[0].duplicate === "c", "duplicate char should be c, got " + a.diffChars[0].duplicate);
});
test("analyze: group C error at pos 23 (7->8)", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  var result = analyze(r.originals, r.duplicates);
  var a = result.anomalies.find(function(x) { return x.originalHash.indexOf("zzzz9999") === 0; });
  assert(a !== undefined, "should find anomaly for group C");
  assert(a.distance === 1, "distance should be 1");
  assert(a.diffChars[0].position === 23, "diff should be at pos 23, got " + a.diffChars[0].position);
  assert(a.diffChars[0].original === "7", "original char should be 7, got " + a.diffChars[0].original);
  assert(a.diffChars[0].duplicate === "8", "duplicate char should be 8, got " + a.diffChars[0].duplicate);
});
test("analyze: group B has no anomalies", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  var result = analyze(r.originals, r.duplicates);
  var groupB = null;
  for (var entry of result.groups) {
    if (entry[0].indexOf("1111aaaa") === 0) { groupB = entry[1]; break; }
  }
  assert(groupB !== null, "should find group B");
  var hasAnomaly = groupB.duplicates.some(function(d) { return d.hash !== groupB.hash; });
  assert(!hasAnomaly, "group B should have no anomalies");
});
test("analyze: duplicate counts per group (5, 5, 5)", function() {
  var r = scanFolder(path.join(fixturesDir, "multi-group"));
  var result = analyze(r.originals, r.duplicates);
  var counts = Array.from(result.groups.values()).map(function(g) { return g.duplicates.length; }).sort(function(a,b){return a-b;});
  assert(counts[0] === 5, "group 1 should have 5 dup, got " + counts[0]);
  assert(counts[1] === 5, "group 2 should have 5 dup, got " + counts[1]);
  assert(counts[2] === 5, "group 3 should have 5 dup, got " + counts[2]);
});

// Summary
console.log("");
console.log("=".repeat(50));
if (failed === 0) {
  console.log("TODOS PASARON  (" + passed + "/" + passed + ")");
} else {
  console.log("FALLARON " + failed + " de " + (passed + failed) + " tests");
  console.log("");
  for (var i = 0; i < errors.length; i++) { console.log("  - " + errors[i]); }
}
console.log("=".repeat(50));
process.exit(failed > 0 ? 1 : 0);
