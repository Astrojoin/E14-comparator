const fs = require("fs");
const path = require("path");
const { parseFileName } = require("./parser");

function scanFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error("La carpeta no existe: " + folderPath);
  }
  const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    return { originals: [], duplicates: [] };
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

module.exports = { scanFolder };
