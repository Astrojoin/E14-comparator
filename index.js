const fs = require("fs");
const path = require("path");

const DUPLICATE_RE = /^(.+?) \((\d+)\)\.pdf$/i;
const ORIGINAL_RE = /^(.+?)\.pdf$/i;

function parseFileName(filename) {
  const dupMatch = filename.match(DUPLICATE_RE);
  if (dupMatch) {
    return { type: "duplicate", hash: dupMatch[1], index: parseInt(dupMatch[2], 10) };
  }
  const origMatch = filename.match(ORIGINAL_RE);
  if (origMatch) {
    return { type: "original", hash: origMatch[1], index: 0 };
  }
  return null;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      if (i === 0) { dp[i][j] = j; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function scanFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.error("Error: la carpeta no existe.");
    process.exit(1);
  }
  const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.log("No se encontraron archivos PDF.");
    process.exit(0);
  }
  const originals = [];
  const duplicates = [];
  for (const filename of files) {
    const parsed = parseFileName(filename);
    if (!parsed) continue;
    const filePath = path.join(folderPath, filename);
    const stat = fs.statSync(filePath);
    if (parsed.type === "original") {
      originals.push({ hash: parsed.hash, file: filename, mtime: stat.mtime });
    } else {
      duplicates.push({ hash: parsed.hash, file: filename, index: parsed.index, mtime: stat.mtime });
    }
  }
  return { originals, duplicates };
}

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
          diffChars.push({ position: i, original: bestOriginal.hash[i] || "(end)", duplicate: orphan.hash[i] || "(end)" });
        }
      }
      anomalies.push({ type: "hash_mismatch", originalFile: bestOriginal.file, originalHash: bestOriginal.hash, duplicateFile: orphan.file, duplicateHash: orphan.hash, duplicateIndex: orphan.index, distance: bestDist, diffChars });
    }
    if (groups.has(orphan.hash) && !groups.get(orphan.hash).original) { groups.delete(orphan.hash); }
  }
  return { groups, anomalies };
}

function buildReport(groups, anomalies) {
  const lines = [];
  const sep = "=".repeat(70);
  const dash = "-".repeat(70);
  lines.push(sep);
  lines.push("  E14-COMPARATOR - REPORTE DE ANALISIS DE PDFs");
  lines.push(sep);
  lines.push("");
  let totalOriginals = 0, totalDuplicates = 0, cleanDuplicates = 0;
  for (const [, group] of groups) {
    if (group.original) totalOriginals++;
    totalDuplicates += group.duplicates.length;
    cleanDuplicates += group.duplicates.filter(d => d.hash === group.hash).length;
  }
  lines.push("Resumen:");
  lines.push("  Grupos (hashes originales):  " + groups.size);
  lines.push("  Archivos originales:         " + totalOriginals);
  lines.push("  Duplicados (total):          " + totalDuplicates);
  lines.push("  Duplicados correctos:        " + cleanDuplicates);
  lines.push("  Duplicados con hash distinto: " + anomalies.length);
  lines.push("");
  lines.push(dash);
  lines.push("");
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const aHas = a.duplicates.some(d => d.hash !== a.hash);
    const bHas = b.duplicates.some(d => d.hash !== b.hash);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });
  for (const group of sortedGroups) {
    const shortHash = group.hash.length > 16 ? group.hash.slice(0, 16) + "..." : group.hash;
    const hasAnomaly = group.duplicates.some(d => d.hash !== group.hash);
    lines.push((hasAnomaly ? "[!]" : "[OK]") + " Grupo: " + shortHash);
    lines.push("   Hash completo: " + group.hash);
    if (group.original) {
      lines.push("   Original:  " + group.original.file);
      lines.push("      Modificado: " + group.original.mtime.toISOString().replace("T", " ").slice(0, 19));
    } else {
      lines.push("   [!!] Sin archivo original");
    }
    for (const dup of group.duplicates) {
      const isAnomalous = dup.hash !== group.hash;
      lines.push("   " + (isAnomalous ? "[X]" : "[ ]") + " (" + dup.index + ") " + dup.file);
      lines.push("      Modificado: " + dup.mtime.toISOString().replace("T", " ").slice(0, 19));
      if (isAnomalous) { lines.push("      >>> HASH DISTINTO: " + dup.hash + " <<<"); }
    }
    lines.push("");
  }
  if (anomalies.length > 0) {
    lines.push(sep);
    lines.push("  ANOMALIAS DETECTADAS (" + anomalies.length + ")");
    lines.push(sep);
    lines.push("");
    for (const a of anomalies) {
      lines.push("[X] Hash inconsistente:");
      lines.push("   Original:          " + a.originalFile);
      lines.push("   Original hash:     " + a.originalHash);
      lines.push("   Duplicado:         " + a.duplicateFile);
      lines.push("   Duplicado hash:    " + a.duplicateHash);
      lines.push("   Distancia Levenshtein: " + a.distance);
      if (a.diffChars.length > 0 && a.diffChars.length <= 20) {
        lines.push("   Diferencias por posicion:");
        for (const dc of a.diffChars) { lines.push("     Pos " + dc.position + ": original=" + dc.original + "  duplicado=" + dc.duplicate); }
      } else if (a.diffChars.length > 20) {
        lines.push("   " + a.diffChars.length + " caracteres diferentes (hashes muy distintos)");
      }
      lines.push("");
    }
  } else {
    lines.push("[OK] No se detectaron anomalias.");
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("E14-comparator v0.2.0");
    console.log("Uso: node index.js <carpeta_pdf> [--json] [--summary]");
    console.log("");
    console.log("Opciones:");
    console.log("  --json      Genera salida en formato JSON");
    console.log("  --summary   Solo muestra el resumen");
    console.log("  --help      Muestra esta ayuda");
    process.exit(0);
  }
  const folderPath = path.resolve(args[0]);
  const jsonMode = args.includes("--json");
  const summaryOnly = args.includes("--summary");
  const { originals, duplicates } = scanFolder(folderPath);
  const { groups, anomalies } = analyze(originals, duplicates);
  if (jsonMode) {
    console.log(JSON.stringify({ summary: { totalGroups: groups.size, totalOriginals: Array.from(groups.values()).filter(g => g.original).length, totalDuplicates: Array.from(groups.values()).reduce((acc, g) => acc + g.duplicates.length, 0), totalAnomalies: anomalies.length }, groups: Array.from(groups.values()).map(g => ({ hash: g.hash, original: g.original ? { file: g.original.file, mtime: g.original.mtime.toISOString() } : null, duplicates: g.duplicates.map(d => ({ file: d.file, index: d.index, mtime: d.mtime.toISOString(), hash: d.hash, isAnomalous: d.hash !== g.hash })) })), anomalies }, null, 2));
  } else if (summaryOnly) {
    console.log("Grupos: " + groups.size + "  Originales: " + Array.from(groups.values()).filter(g => g.original).length + "  Duplicados: " + Array.from(groups.values()).reduce((a, g) => a + g.duplicates.length, 0) + "  Anomalias: " + anomalies.length);
  } else {
    console.log(buildReport(groups, anomalies));
  }
}

main();
