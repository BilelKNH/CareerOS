import * as mammoth from 'mammoth';

// pdf-parse's package entry runs a debug file read on import; use the lib entry.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  b: Buffer,
) => Promise<{ text: string }>;

export interface UploadedCv {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/** Extract raw text from a CV upload (PDF, DOCX, or plain text). */
export async function extractCvText(file: UploadedCv): Promise<string> {
  const name = (file.originalname || '').toLowerCase();

  if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  if (
    name.endsWith('.docx') ||
    file.mimetype.includes('officedocument.wordprocessingml')
  ) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    return value;
  }

  // Fallback: treat as UTF-8 text.
  return file.buffer.toString('utf-8');
}
