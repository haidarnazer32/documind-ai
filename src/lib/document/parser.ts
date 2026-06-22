import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract text from a PDF file buffer
 *
 * pdf-parse v2.4.x exposes a `PDFParse` class; the legacy default-export
 * API is not present in the ESM build, so we instantiate it explicitly.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

/**
 * Extract text from a DOCX file buffer
 * Uses mammoth.extractRawText so we get plain text directly, no HTML round-trip.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}

export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  const buffer = await fs.readFile(filePath);

  if (fileType === "pdf") {
    return await extractTextFromPdf(buffer);
  } else if (fileType === "docx") {
    return await extractTextFromDocx(buffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}
