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

module.exports = { parseFileName };
