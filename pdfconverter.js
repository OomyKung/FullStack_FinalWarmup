const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

/* =========================
   CONFIG (EDIT HERE)
   ========================= */

const INPUT_DIR = "public/css"; // Folder containing .ejs files to convert
const OUTPUT_DIR = "final_pdfs";
const OUTPUT_FILE = "Frontend_CSS.pdf";

// Exclude generator file(s)
const EXCLUDE_FILES = new Set(["pdfconverter.js", "pdfconverter.mjs"]);

// A4 page size (portrait)
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

// Margins (smaller = more content per page)
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const MARGIN_LEFT = 25;
const MARGIN_RIGHT = 25;

// Text layout
const FONT_SIZE = 8.5;
const LINE_HEIGHT = FONT_SIZE * 1.25;
const MAX_LINE_LENGTH = 120;

// Run JS output settings
const RUN_TIMEOUT = 5000;

// Border settings
const BORDER_PADDING = 8;
const BORDER_THICKNESS = 0.8;

/* =========================
   HELPERS
   ========================= */

// Fix pdf-lib standard fonts encoding crash (emoji/Thai/etc.)
function sanitize(text) {
  if (!text) return "";
  return text.replace(/[^\x00-\xFF]/g, "?");
}

// Natural sort: 1.js, 2.js, 10.js
function naturalSort(a, b) {
  const ax = [];
  const bx = [];

  a.replace(/(\d+)|(\D+)/g, (_, num, str) => ax.push([num || Infinity, str || ""]));
  b.replace(/(\d+)|(\D+)/g, (_, num, str) => bx.push([num || Infinity, str || ""]));

  while (ax.length && bx.length) {
    const [aNum, aStr] = ax.shift();
    const [bNum, bStr] = bx.shift();

    if (Number(aNum) !== Number(bNum)) return Number(aNum) - Number(bNum);
    if (aStr !== bStr) return aStr.localeCompare(bStr);
  }

  return ax.length - bx.length;
}

// Run JS file and capture stdout/stderr
async function runJsFile(filePath) {
  try {
    const { stdout, stderr } = await execAsync(`node "${filePath}"`, {
      timeout: RUN_TIMEOUT,
      windowsHide: true,
    });

    const out = stdout?.trim();
    const err = stderr?.trim();

    if (out && err) return `${out}\n${err}`;
    if (out) return out;
    if (err) return err;

    return "(no output)";
  } catch (error) {
    const out = error.stdout?.trim();
    const err = error.stderr?.trim();

    if (out && err) return `${out}\n${err}`;
    if (out) return out;
    if (err) return err;

    return error.message;
  }
}

// Scan folder for JS files
async function getJsFilesFromDirectory() {
  const files = await fs.readdir(INPUT_DIR);

  return files
    .filter((file) => file.endsWith(".ejs") || file.endsWith(".css"))
    .filter((file) => !EXCLUDE_FILES.has(file))
    .sort(naturalSort);
}

/* =========================
   PDF WRITER (compact + borders)
   ========================= */

function createPdfWriter(pdfDoc, font) {
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // Border segments for current block (each segment = one page part)
  let blockSegments = [];
  let blockActive = false;

  function newPage() {
    // If we are inside a block, close the segment on the old page
    if (blockActive && blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }

    // Create new page
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;

    // If we are inside a block, start a new segment on the new page
    if (blockActive) {
      blockSegments.push({
        page,
        topY: y,
        bottomY: y,
      });
    }
  }

  function ensureSpace() {
    if (y < MARGIN_BOTTOM) {
      newPage();
    }
  }

  function writeLine(text, options = {}) {
    ensureSpace();

    page.drawText(sanitize(text), {
      x: MARGIN_LEFT,
      y,
      size: options.size ?? FONT_SIZE,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });

    y -= options.lineHeight ?? LINE_HEIGHT;

    // Update border segment bottom continuously
    if (blockActive && blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }
  }

  function writeBlock(text, options = {}) {
    const lines = sanitize(text).split("\n");

    for (const line of lines) {
      const safeLine =
        line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + "..." : line;

      writeLine(safeLine, options);
    }
  }

  function startBlockBorder() {
    ensureSpace();
    blockActive = true;

    blockSegments = [
      {
        page,
        topY: y,
        bottomY: y,
      },
    ];
  }

  function finishBlockBorder() {
    if (!blockActive) return;

    // close last segment bottom
    if (blockSegments.length > 0) {
      blockSegments[blockSegments.length - 1].bottomY = y;
    }

    // Draw border for each segment
    for (const seg of blockSegments) {
      const boxLeft = MARGIN_LEFT - BORDER_PADDING;
      const boxRight = PAGE_WIDTH - MARGIN_RIGHT + BORDER_PADDING;
      const boxWidth = boxRight - boxLeft;

      const top = seg.topY + BORDER_PADDING;
      const bottom = seg.bottomY - BORDER_PADDING;
      const boxHeight = top - bottom;

      if (boxHeight < 10) continue;

      seg.page.drawRectangle({
        x: boxLeft,
        y: bottom,
        width: boxWidth,
        height: boxHeight,
        borderWidth: BORDER_THICKNESS,
        borderColor: rgb(0.6, 0.6, 0.6),
      });
    }

    // Reset
    blockActive = false;
    blockSegments = [];
  }

  return {
    writeLine,
    writeBlock,
    startBlockBorder,
    finishBlockBorder,
  };
}

/* =========================
   MAIN
   ========================= */

async function main() {
  const jsFiles = await getJsFilesFromDirectory();

  if (jsFiles.length === 0) {
    console.log("No .js files found in:", INPUT_DIR);
    return;
  }

  console.log(`Found ${jsFiles.length} JS files`);

  // Create PDF + font
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  // Create writer
  const writer = createPdfWriter(pdfDoc, font);

  // Write each file into PDF
  for (const fileName of jsFiles) {
    const filePath = path.join(INPUT_DIR, fileName);
    console.log("Processing:", filePath);

    const code = await fs.readFile(filePath, "utf-8");
    const output = await runJsFile(filePath);

    // Start bordered block for this file
    writer.startBlockBorder();

    // Header
    writer.writeLine(`FILE: ${fileName}`, {
      size: FONT_SIZE + 2,
      lineHeight: LINE_HEIGHT * 1.4,
      color: rgb(0.1, 0.1, 0.1),
    });

    writer.writeLine("");

    // Code section
    writer.writeLine("[CODE]", {
      size: FONT_SIZE + 1,
      lineHeight: LINE_HEIGHT * 1.2,
      color: rgb(0.2, 0.2, 0.2),
    });
    writer.writeBlock(code);

    writer.writeLine("");

    // Output section
    writer.writeLine("[OUTPUT]", {
      size: FONT_SIZE + 1,
      lineHeight: LINE_HEIGHT * 1.2,
      color: rgb(0.2, 0.2, 0.2),
    });
    writer.writeBlock(output);

    writer.writeLine("");

    // Finish bordered block
    writer.finishBlockBorder();
  }

  // Save PDF
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);

  await fs.writeFile(outputPath, pdfBytes);

  console.log("Created:", outputPath);
}

main().catch(console.error);
