function formatTime(date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function shortHash(hash) {
  if (hash.length <= 16) return hash;
  return hash.slice(0, 8) + ".." + hash.slice(-6);
}

function padLeft(str, len) {
  str = "" + str;
  return str.length >= len ? str : " ".repeat(len - str.length) + str;
}

function buildReport(groups, anomalies) {
  const lines = [];

  let totalOriginals = 0;
  let totalDuplicates = 0;
  let cleanDuplicates = 0;
  for (const [, group] of groups) {
    if (group.original) totalOriginals++;
    totalDuplicates += group.duplicates.length;
    cleanDuplicates += group.duplicates.filter(d => d.hash === group.hash).length;
  }

  // ── Header ──
  lines.push("");
  lines.push("  E14-COMPARATOR  v0.3.0");
  lines.push("  " + "~".repeat(50));
  lines.push("");

  // ── Stats ──
  lines.push("  RESUMEN");
  lines.push("  " + "-".repeat(30));
  lines.push("  Originales           " + padLeft(totalOriginals, 4));
  lines.push("  Duplicados OK        " + padLeft(cleanDuplicates, 4));
  lines.push("  Duplicados con ERROR    " + padLeft(anomalies.length, 4) + (anomalies.length > 0 ? "  <-- revisar" : ""));
  lines.push("  Total archivos       " + padLeft(totalOriginals + totalDuplicates, 4));
  lines.push("");

  if (anomalies.length === 0) {
    lines.push("  Todo en orden. Sin anomalias detectadas.");
    lines.push("");
    return lines.join("\n");
  }

  // ── Anomalías (lo importante primero) ──
  lines.push("  ANOMALIAS (" + anomalies.length + ")");
  lines.push("  " + "=".repeat(50));
  lines.push("");

  for (const a of anomalies) {
    lines.push("  Original:   " + shortHash(a.originalHash) + ".pdf");
    lines.push("  Duplicado:  " + shortHash(a.duplicateHash) + " (" + a.duplicateIndex + ").pdf");

    if (a.diffChars.length > 0 && a.diffChars.length <= 20) {
      // Visual diff: show the hash with the differing position highlighted
      const origHash = a.originalHash;
      const dupHash = a.duplicateHash;
      const diffPositions = new Set(a.diffChars.map(dc => dc.position));

      let origVisual = "";
      let dupVisual = "";
      let markerLine = "";
      for (let i = 0; i < Math.max(origHash.length, dupHash.length); i++) {
        if (diffPositions.has(i)) {
          origVisual += origHash[i] || " ";
          dupVisual += dupHash[i] || " ";
          markerLine += "^";
        } else if (i >= origHash.length || i >= dupHash.length) {
          origVisual += origHash[i] || " ";
          dupVisual += dupHash[i] || " ";
          markerLine += " ";
        } else {
          // Collapse matching sections
          if (i === 0 || diffPositions.has(i - 1) || diffPositions.has(i + 1)) {
            origVisual += origHash[i];
            dupVisual += dupHash[i];
            markerLine += " ";
          } else if (!diffPositions.has(i) && origVisual.endsWith("..")) {
            // already collapsed, skip
          } else if (i < 8) {
            origVisual += origHash[i];
            dupVisual += dupHash[i];
            markerLine += " ";
          } else if (i > 8 && i < Math.max(origHash.length, dupHash.length) - 8 && !diffPositions.has(i + 1)) {
            origVisual += "..";
            dupVisual += "..";
            markerLine += "  ";
          } else if (i === Math.max(origHash.length, dupHash.length) - 8 || diffPositions.has(i + 1)) {
            origVisual += origHash[i];
            dupVisual += dupHash[i];
            markerLine += " ";
          }
        }
      }

      // Simplified: just show context around the diff
      const pos = a.diffChars[0].position;
      const ctxBefore = 6;
      const ctxAfter = 6;
      const start = Math.max(0, pos - ctxBefore);
      const end = Math.min(Math.max(origHash.length, dupHash.length), pos + ctxAfter + 1);

      const origSnippet = (start > 0 ? ".." : "") + origHash.slice(start, end) + (end < origHash.length ? ".." : "");
      const dupSnippet = (start > 0 ? ".." : "") + dupHash.slice(start, end) + (end < dupHash.length ? ".." : "");
      const offset = start > 0 ? 2 : 0;
      const markerPos = pos - start + offset;

      lines.push("  Diff:");
      lines.push("    orig: " + origSnippet);
      lines.push("    dup:  " + dupSnippet);
      lines.push("    " + " ".repeat(markerPos + 7) + "^ pos " + pos + ": " + a.diffChars[0].original + " -> " + a.diffChars[0].duplicate);
    } else if (a.diffChars.length > 20) {
      lines.push("  " + a.diffChars.length + " caracteres diferentes (hashes muy distintos)");
    }

    lines.push("");
  }

  // ── Groups detail (compacto) ──
  lines.push("  DETALLE POR GRUPO");
  lines.push("  " + "-".repeat(30));
  lines.push("");

  // Sort: anomalous first
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aHas = a.duplicates.some(d => d.hash !== a.hash);
    const bHas = b.duplicates.some(d => d.hash !== b.hash);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  for (const group of sortedGroups) {
    const hasAnomaly = group.duplicates.some(d => d.hash !== group.hash);
    const tag = hasAnomaly ? "ERROR" : "OK";
    const dupCount = group.duplicates.length;
    const anomalyCount = group.duplicates.filter(d => d.hash !== group.hash).length;

    lines.push("  [" + tag + "] " + shortHash(group.hash) + ".pdf  (" + dupCount + " dup" + (anomalyCount > 0 ? ", " + anomalyCount + " con hash ERROR" : "") + ")");

    // List each file in a compact way
    if (group.original) {
      lines.push("       " + group.original.file + "  " + formatTime(group.original.mtime));
    }
    for (const dup of group.duplicates) {
      const isAnomalous = dup.hash !== group.hash;
      const prefix = isAnomalous ? "  ERROR   " : "       ";
      lines.push(prefix + dup.file + "  " + formatTime(dup.mtime));
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildSummary(groups, anomalies) {
  let totalOriginals = 0;
  let totalDuplicates = 0;
  let cleanDuplicates = 0;
  for (const [, group] of groups) {
    if (group.original) totalOriginals++;
    totalDuplicates += group.duplicates.length;
    cleanDuplicates += group.duplicates.filter(d => d.hash === group.hash).length;
  }
  console.log("Originales: " + totalOriginals);
  console.log("Duplicados OK: " + cleanDuplicates);
  console.log("Anomalias: " + anomalies.length);
  console.log("Total: " + (totalOriginals + totalDuplicates));
}

module.exports = { buildReport, buildSummary, shortHash, formatTime, padLeft };
