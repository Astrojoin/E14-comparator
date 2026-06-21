const path = require("path");
const { scanFolder } = require("./lib/scanner");
const { analyze } = require("./lib/analyzer");
const { buildReport, buildSummary } = require("./lib/report");

const VERSION = "0.3.0";

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("E14-comparator v" + VERSION);
    console.log("");
    console.log("  Escanea una carpeta de PDFs y detecta duplicados");
    console.log("  con hashes inconsistentes en el nombre del archivo.");
    console.log("");
    console.log("USO:");
    console.log("  node index.js <carpeta_pdf> [opciones]");
    console.log("");
    console.log("OPCIONES:");
    console.log("  --json      Salida en formato JSON");
    console.log("  --summary   Solo resumen numerico");
    console.log("  -h, --help  Muestra esta ayuda");
    process.exit(0);
  }

  const folderPath = path.resolve(args[0]);
  const jsonMode = args.includes("--json");
  const summaryOnly = args.includes("--summary");

  try {
    const { originals, duplicates } = scanFolder(folderPath);
    const { groups, anomalies } = analyze(originals, duplicates);

    if (jsonMode) {
      const report = {
        summary: {
          totalGroups: groups.size,
          totalOriginals: Array.from(groups.values()).filter(g => g.original).length,
          totalDuplicates: Array.from(groups.values()).reduce((acc, g) => acc + g.duplicates.length, 0),
          totalAnomalies: anomalies.length,
        },
        groups: Array.from(groups.values()).map(g => ({
          hash: g.hash,
          original: g.original
            ? { file: g.original.file, mtime: g.original.mtime.toISOString() }
            : null,
          duplicates: g.duplicates.map(d => ({
            file: d.file,
            index: d.index,
            mtime: d.mtime.toISOString(),
            hash: d.hash,
            isAnomalous: d.hash !== g.hash,
          })),
        })),
        anomalies,
      };
      console.log(JSON.stringify(report, null, 2));
    } else if (summaryOnly) {
      console.log(buildSummary(groups, anomalies));
    } else {
      console.log(buildReport(groups, anomalies));
    }
  } catch (err) {
    console.error("Error: " + err.message);
    process.exit(1);
  }
}

main();
