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

function padRight(str, len) {
  str = "" + str;
  return str.length >= len ? str : str + " ".repeat(len - str.length);
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

  // Header
  lines.push("");
  lines.push("  E14-COMPARATOR  v0.3.0");
  lines.push("  " + "~".repeat(50));
  lines.push("");

  // Stats - aligned at column 26 (2 spaces + label padded to 22 chars + number)
  const COL = 22;
  lines.push("  RESUMEN");
  lines.push("  " + "-".repeat(30));
  lines.push("  " + padRight("Originales", COL) + padLeft(totalOriginals, 4));
  lines.push("  " + padRight("Duplicados OK", COL) + padLeft(cleanDuplicates, 4));
  lines.push("  " + padRight("Duplicados con ERROR", COL) + padLeft(anomalies.length, 4) + (anomalies.length > 0 ? "  <-- revisar" : ""));
  lines.push("  " + padRight("Total archivos", COL) + padLeft(totalOriginals + totalDuplicates, 4));
  lines.push("");

  if (anomalies.length === 0) {
    lines.push("  Todo en orden. Sin anomalias detectadas.");
    lines.push("");
    return lines.join("\n");
  }

  // Anomalies first
  lines.push("  ANOMALIAS (" + anomalies.length + ")");
  lines.push("  " + "=".repeat(50));
  lines.push("");

  for (const a of anomalies) {
    lines.push("  Original:   " + shortHash(a.originalHash) + ".pdf");
    lines.push("  Duplicado:  " + shortHash(a.duplicateHash) + " (" + a.duplicateIndex + ").pdf");

    if (a.diffChars.length > 0 && a.diffChars.length <= 20) {
      const pos = a.diffChars[0].position;
      const ctxBefore = 6;
      const ctxAfter = 6;
      const start = Math.max(0, pos - ctxBefore);
      const end = Math.min(Math.max(a.originalHash.length, a.duplicateHash.length), pos + ctxAfter + 1);

      const origSnippet = (start > 0 ? ".." : "") + a.originalHash.slice(start, end) + (end < a.originalHash.length ? ".." : "");
      const dupSnippet = (start > 0 ? ".." : "") + a.duplicateHash.slice(start, end) + (end < a.duplicateHash.length ? ".." : "");
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

  // Group detail (compact)
  lines.push("  DETALLE POR GRUPO");
  lines.push("  " + "-".repeat(30));
  lines.push("");

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

    if (group.original) {
      lines.push("       " + group.original.file + "  " + formatTime(group.original.mtime));
    }
    for (const dup of group.duplicates) {
      const isAnomalous = dup.hash !== group.hash;
      const prefix = isAnomalous ? "  ERROR " : "       ";
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
    cleanDuplicates += group.duplicates.filter(d => d.hash !== group.hash).length;
  }
  console.log("Originales: " + totalOriginals);
  console.log("Duplicados OK: " + (totalDuplicates - anomalies.length));
  console.log("Anomalias: " + anomalies.length);
  console.log("Total: " + (totalOriginals + totalDuplicates));
}

module.exports = { buildReport, buildSummary, shortHash, formatTime, padLeft, padRight };
