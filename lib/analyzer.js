const { levenshtein } = require("./levenshtein");

function analyze(originals, duplicates) {
  const groups = new Map();
  for (const orig of originals) {
    groups.set(orig.hash, { hash: orig.hash, original: orig, duplicates: [] });
  }
  const orphans = [];
  for (const dup of duplicates) {
    if (groups.has(dup.hash)) {
      groups.get(dup.hash).duplicates.push(dup);
    } else {
      orphans.push(dup);
    }
  }
  const anomalies = [];
  for (const orphan of orphans) {
    let bestOriginal = null;
    let bestDist = Infinity;
    for (const orig of originals) {
      const dist = levenshtein(orphan.hash, orig.hash);
      if (dist < bestDist) { bestDist = dist; bestOriginal = orig; }
    }
    if (bestOriginal) {
      const group = groups.get(bestOriginal.hash);
      group.duplicates.push(orphan);
      const diffChars = [];
      for (let i = 0; i < Math.max(orphan.hash.length, bestOriginal.hash.length); i++) {
        if (orphan.hash[i] !== bestOriginal.hash[i]) {
          diffChars.push({
            position: i,
            original: bestOriginal.hash[i] || "(end)",
            duplicate: orphan.hash[i] || "(end)",
          });
        }
      }
      anomalies.push({
        type: "hash_mismatch",
        originalFile: bestOriginal.file,
        originalHash: bestOriginal.hash,
        duplicateFile: orphan.file,
        duplicateHash: orphan.hash,
        duplicateIndex: orphan.index,
        distance: bestDist,
        diffChars,
      });
    }
    if (groups.has(orphan.hash) && !groups.get(orphan.hash).original) {
      groups.delete(orphan.hash);
    }
  }
  return { groups, anomalies };
}

module.exports = { analyze };
