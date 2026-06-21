const fs = require("fs");
const path = require("path");

function touch(p, time) {
  fs.writeFileSync(p, "");
  if (time) {
    const d = new Date(time);
    fs.utimesSync(p, d, d);
  }
}

function generateFixtures(baseDir) {
  fs.rmSync(baseDir, { recursive: true, force: true });

  // Scenario 1: Clean group (no anomalies)
  const cleanDir = path.join(baseDir, "clean");
  fs.mkdirSync(cleanDir, { recursive: true });
  touch(path.join(cleanDir, "abc123def.pdf"), "2026-01-15T10:00:00Z");
  touch(path.join(cleanDir, "abc123def (1).pdf"), "2026-01-15T10:05:00Z");
  touch(path.join(cleanDir, "abc123def (2).pdf"), "2026-01-15T10:10:00Z");

  // Scenario 2: Single anomaly (1 char diff)
  const anomalyDir = path.join(baseDir, "single-anomaly");
  fs.mkdirSync(anomalyDir, { recursive: true });
  touch(path.join(anomalyDir, "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701.pdf"), "2026-02-01T08:00:00Z");
  touch(path.join(anomalyDir, "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac020c2c2ddd4b6859701 (1).pdf"), "2026-02-01T08:05:00Z");
  touch(path.join(anomalyDir, "ec1b340260f0d461ad324d73c97c60b68d34d3bd358ac120c2c2ddd4b6859701 (1).pdf"), "2026-02-01T08:10:00Z");

  // Scenario 3: Multiple originals, mixed
  const mixedDir = path.join(baseDir, "mixed");
  fs.mkdirSync(mixedDir, { recursive: true });
  touch(path.join(mixedDir, "hash_aaa.pdf"), "2026-03-01T12:00:00Z");
  touch(path.join(mixedDir, "hash_aaa (1).pdf"), "2026-03-01T12:05:00Z");
  touch(path.join(mixedDir, "hash_bbb.pdf"), "2026-03-02T14:00:00Z");
  touch(path.join(mixedDir, "hash_ccc.pdf"), "2026-03-03T16:00:00Z");
  touch(path.join(mixedDir, "hash_ccc (1).pdf"), "2026-03-03T16:05:00Z");
  touch(path.join(mixedDir, "hash_ccc (2).pdf"), "2026-03-03T16:10:00Z");

  // Scenario 4: Only originals, no duplicates
  const originalsOnlyDir = path.join(baseDir, "only-originals");
  fs.mkdirSync(originalsOnlyDir, { recursive: true });
  touch(path.join(originalsOnlyDir, "solo1.pdf"), "2026-04-01T10:00:00Z");
  touch(path.join(originalsOnlyDir, "solo2.pdf"), "2026-04-02T10:00:00Z");

  // Scenario 5: Empty folder
  const emptyDir = path.join(baseDir, "empty");
  fs.mkdirSync(emptyDir, { recursive: true });

  // Scenario 6: Two anomalies against same original
  const multiAnomalyDir = path.join(baseDir, "multi-anomaly");
  fs.mkdirSync(multiAnomalyDir, { recursive: true });
  touch(path.join(multiAnomalyDir, "aaaa1111bbbb2222cccc3333dddd4444.pdf"), "2026-05-01T09:00:00Z");
  touch(path.join(multiAnomalyDir, "aaaa1111bbbb2222cccc3333dddd4444 (1).pdf"), "2026-05-01T09:05:00Z");
  touch(path.join(multiAnomalyDir, "aaaa1111bbbb2222ccee3333dddd4444 (1).pdf"), "2026-05-01T09:10:00Z");
  touch(path.join(multiAnomalyDir, "aaaa1111bbbb2222ccff3333dddd4444 (2).pdf"), "2026-05-01T09:15:00Z");

  // Scenario 7: Multi-group - 3 originals, 5 duplicates each
  // Group A: 1 ERROR duplicate (pos 12: b->c)
  // Group B: all clean (5 correct duplicates)
  // Group C: 1 ERROR duplicate (pos 20: 7->8)
  const multiGroupDir = path.join(baseDir, "multi-group");
  fs.mkdirSync(multiGroupDir, { recursive: true });

  var groupA = "aaaa0000bbbb1111cccc2222dddd3333eeee4444ffff5555gggg6666";
  touch(path.join(multiGroupDir, groupA + ".pdf"), "2026-06-01T10:00:00Z");
  touch(path.join(multiGroupDir, groupA + " (1).pdf"), "2026-06-01T10:05:00Z");
  touch(path.join(multiGroupDir, groupA + " (2).pdf"), "2026-06-01T10:10:00Z");
  touch(path.join(multiGroupDir, groupA + " (3).pdf"), "2026-06-01T10:15:00Z");
  touch(path.join(multiGroupDir, groupA + " (4).pdf"), "2026-06-01T10:20:00Z");
  // ERROR: pos 12 changes b->c
  var groupAerr = "aaaa0000bbbc1111cccc2222dddd3333eeee4444ffff5555gggg6666";
  touch(path.join(multiGroupDir, groupAerr + " (5).pdf"), "2026-06-01T10:25:00Z");

  var groupB = "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777";
  touch(path.join(multiGroupDir, groupB + ".pdf"), "2026-06-02T11:00:00Z");
  touch(path.join(multiGroupDir, groupB + " (1).pdf"), "2026-06-02T11:05:00Z");
  touch(path.join(multiGroupDir, groupB + " (2).pdf"), "2026-06-02T11:10:00Z");
  touch(path.join(multiGroupDir, groupB + " (3).pdf"), "2026-06-02T11:15:00Z");
  touch(path.join(multiGroupDir, groupB + " (4).pdf"), "2026-06-02T11:20:00Z");
  touch(path.join(multiGroupDir, groupB + " (5).pdf"), "2026-06-02T11:25:00Z");

  var groupC = "zzzz9999yyyy8888xxxx7777wwww6666vvvv5555uuuu4444tttt3333";
  touch(path.join(multiGroupDir, groupC + ".pdf"), "2026-06-03T12:00:00Z");
  touch(path.join(multiGroupDir, groupC + " (1).pdf"), "2026-06-03T12:05:00Z");
  touch(path.join(multiGroupDir, groupC + " (2).pdf"), "2026-06-03T12:10:00Z");
  touch(path.join(multiGroupDir, groupC + " (3).pdf"), "2026-06-03T12:15:00Z");
  touch(path.join(multiGroupDir, groupC + " (4).pdf"), "2026-06-03T12:20:00Z");
  // ERROR: pos 20 changes 7->8
  var groupCerr = "zzzz9999yyyy8888xxxx7778wwww6666vvvv5555uuuu4444tttt3333";
  touch(path.join(multiGroupDir, groupCerr + " (5).pdf"), "2026-06-03T12:25:00Z");

  console.log("Fixtures generated in: " + baseDir);
}

if (require.main === module) {
  const dir = process.argv[2] || path.join(__dirname, "fixtures");
  generateFixtures(dir);
}

module.exports = { generateFixtures };
