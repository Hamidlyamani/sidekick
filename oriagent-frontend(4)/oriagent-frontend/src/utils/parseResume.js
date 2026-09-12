let pdfjsLibPromise = null;

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]).then(([pdfjsLib, worker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Loosely matches international numbers with 8+ digits, allowing spaces/dots/dashes/parens.
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const SKILLS_HEADERS = /^(skills|technical skills|compétences|core competencies)\s*:?\s*$/i;
const SECTION_HEADER_RE = /^[a-z][a-z\s&/]{2,30}:?$/i;

async function extractTextFromPdf(file) {
  const pdfjsLib = await getPdfjsLib();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let currentY = null;
    let currentLine = [];

    for (const item of content.items) {
      const y = item.transform[5];
      if (currentY !== null && Math.abs(y - currentY) > 2) {
        lines.push(currentLine.join(" ").trim());
        currentLine = [];
      }
      currentY = y;
      currentLine.push(item.str);
    }
    if (currentLine.length) lines.push(currentLine.join(" ").trim());
  }

  return lines.filter(Boolean);
}

function guessName(lines) {
  // The name is almost always one of the first few non-empty lines, short, and
  // doesn't look like an email, phone number, or address.
  for (const line of lines.slice(0, 6)) {
    const clean = line.trim();
    if (!clean || clean.length > 40) continue;
    if (EMAIL_RE.test(clean) || PHONE_RE.test(clean)) continue;
    if (/\d/.test(clean)) continue;
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-ZÀ-Ý][a-zà-ÿ'-]*\.?$/.test(w))) {
      return clean;
    }
  }
  return "";
}

function guessSkills(lines) {
  const startIdx = lines.findIndex((l) => SKILLS_HEADERS.test(l.trim()));
  if (startIdx === -1) return [];

  const collected = [];
  for (let i = startIdx + 1; i < lines.length && i < startIdx + 8; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (SECTION_HEADER_RE.test(line) && line.split(/\s+/).length <= 3) break;
    collected.push(line);
  }

  return collected
    .join(", ")
    .split(/[,•|·\/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 30)
    .slice(0, 12);
}

export async function parseResumePdf(file) {
  const lines = await extractTextFromPdf(file);
  const fullText = lines.join("\n");

  const emailMatch = fullText.match(EMAIL_RE);
  const phoneMatch = fullText.match(PHONE_RE);

  return {
    nom: guessName(lines),
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0].replace(/[\s().-]/g, "") : "",
    interets: guessSkills(lines),
    cv_summary: fullText.slice(0, 2000).trim(),
  };
}
