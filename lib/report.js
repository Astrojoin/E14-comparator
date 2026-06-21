function formatTime(date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function shortHash(hash, len) {
  len = len || 12;
  if (hash.length <= len + 3) return hash;
  return hash.slice(0, len) + "..." + hash.slice(-4);
}

function padLeft(str, len) {
  str = "" + str;
  if (str.length >= len) return str;
  return " ".repeat(len - str.length) + str;
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
  lines.push("  +==========================================================+");
  lines.push("  |           E14-COMPARATOR - REPORTE DE PDFs              |");
  lines.push("  +==========================================================+");
  lines.push("");

  // Summary box
  const alertTag = anomalies.length > 0 ? " !! ALERTA !!" : "";
  lines.push("  +-- Resumen -----------------------------------------------+");
  lines.push("  |  Grupos (hashes unicos)    " + padLeft(groups.size, 4) + "                        |");
  lines.push("  |  Archivos originales       " + padLeft(totalOriginals, 4) + "                        |");
  lines.push("  |  Duplicados (total)        " + padLeft(totalDuplicates, 4) + "                        |");
  lines.push("  |  Duplicados correctos      " + padLeft(cleanDuplicates, 4) + "                        |");
  lines.push("  |  Hash distinto detectado   " + padLeft(anomalies.length, 4) + alertTag + "               |");
  lines.push("  +----------------------------------------------------------+");
  lines.push("");

  // Groups
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aHas = a.duplicates.some(d => d.hash !== a.hash);
    const bHas = b.duplicates.some(d => d.hash !== b.hash);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  for (const group of sortedGroups) {
    const hasAnomaly = group.duplicates.some(d => d.hash !== group.hash);
    const status = hasAnomaly ? "!!" : "OK";
    const label = hasAnomaly ? "ALERTA" : "LIMPIO";

    lines.push("  +- " + status + " " + label + " " + shortHash(group.hash, 20) + " ----");
    lines.push("  | Hash: " + group.hash);

    if (group.original) {
      lines.push("  |");
      lines.push("  |  ORIG  " + group.original.file);
      lines.push("  |        Modificado: " + formatTime(group.original.mtime));
    } else {
      lines.push("  |  [!!] Sin archivo original");
    }

    for (const dup of group.duplicates) {
      const isAnomalous = dup.hash !== group.hash;
      lines.push("  |");
      if (isAnomalous) {
        lines.push("  |  <> ( " + dup.index + " )  " + dup.file);
        lines.push("  |           Modificado: " + formatTime(dup.mtime));
        lines.push("  |           HASH DISTINTO: " + dup.hash);
      } else {
        lines.push("  |   ( " + dup.index + " )  " + dup.file);
        lines.push("  |           Modificado: " + formatTime(dup.mtime));
      }
    }

    lines.push("  +-" + "-".repeat(group.hash.length + 8) + "-");
    lines.push("");
  }

  // Anomalies
  if (anomalies.length > 0) {
    lines.push("  +==========================================================+");
    lines.push("  |         ANOMALIAS DETECTADAS (" + padLeft(anomalies.length, 2) + ")                        |");
    lines.push("  +==========================================================+");
    lines.push("");

    for (const a of anomalies) {
      lines.push("  +-- Hash inconsistente -------------------------------------+");
      lines.push("  | Original:         " + shortHash(a.originalHash, 40));
      lines.push("  | Duplicado (" + a.duplicateIndex + "):    " + shortHash(a.duplicateHash, 40));
      lines.push("  | Distancia:        " + a.distance);

      if (a.diffChars.length > 0 && a.diffChars.length <= 20) {
        lines.push("  | Diferencias:");
        for (const dc of a.diffChars) {
          lines.push("  |   pos " + padLeft(dc.position, 3) + "  original=[" + dc.original + "]  duplicado=[" + dc.duplicate + "]");
        }
      } else if (a.diffChars.length > 20) {
        lines.push("  | " + a.diffChars.length + " caracteres diferentes (hashes muy distintos)");
      }
      lines.push("  +----------------------------------------------------------+");
      lines.push("");
    }
  } else {
    lines.push("  OK  No se detectaron anomalias. Todos los duplicados coinciden.");
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

  console.log("Grupos: " + groups.size);
  console.log("Originales: " + totalOriginals);
  console.log("Duplicados: " + totalDuplicates + " (" + cleanDuplicates + " correctos, " + anomalies.length + " con hash distinto)");
}

module.exports = { buildReport, buildSummary, shortHash, formatTime, padLeft };
