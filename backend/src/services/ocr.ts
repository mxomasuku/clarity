export interface OcrResult {
  extractedText: string;
  specialty: string;
  inferredTitle: string;
}

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { inflateSync } from 'zlib';

type GoogleVisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
    };
    textAnnotations?: Array<{
      description?: string;
    }>;
    error?: {
      message?: string;
    };
  }>;
};

const cleanText = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const runCommandWithInput = (command: string, args: string[], input: Buffer): Promise<string> =>
  new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'ignore'] });
    const chunks: Buffer[] = [];

    child.stdout.on('data', chunk => chunks.push(Buffer.from(chunk)));
    child.on('error', () => resolve(''));
    child.on('close', code => {
      resolve(code === 0 ? cleanText(Buffer.concat(chunks).toString('utf8')) : '');
    });

    child.stdin.end(input);
  });

const getGoogleAccessToken = async () => {
  const metadataUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

  try {
    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2500)
    });

    if (!response.ok) return '';

    const payload = await response.json() as { access_token?: string };
    return payload.access_token ?? '';
  } catch {
    return '';
  }
};

const extractWithGoogleVision = async (fileBuffer: Buffer, mimeType: string): Promise<string> => {
  if (!mimeType.startsWith('image/')) return '';

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  const accessToken = apiKey ? '' : await getGoogleAccessToken();

  if (!apiKey && !accessToken) return '';

  const endpoint = apiKey
    ? `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`
    : 'https://vision.googleapis.com/v1/images:annotate';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: fileBuffer.toString('base64')
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION'
              }
            ],
            imageContext: {
              languageHints: ['en']
            }
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn(`Google Vision OCR request failed with status ${response.status}`);
      return '';
    }

    const payload = await response.json() as GoogleVisionResponse;
    const firstResult = payload.responses?.[0];

    if (firstResult?.error?.message) {
      console.warn(`Google Vision OCR failed: ${firstResult.error.message}`);
      return '';
    }

    return cleanText(
      firstResult?.fullTextAnnotation?.text ??
      firstResult?.textAnnotations?.[0]?.description ??
      ''
    );
  } catch (error) {
    console.warn('Google Vision OCR request failed:', error);
    return '';
  }
};

const runTesseract = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  const extension = path.extname(fileName) || '.png';
  const tempPath = path.join(os.tmpdir(), `clarity-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);

  try {
    await fs.writeFile(tempPath, fileBuffer);
    return await new Promise((resolve) => {
      const child = spawn('tesseract', [tempPath, 'stdout'], { stdio: ['ignore', 'pipe', 'ignore'] });
      const chunks: Buffer[] = [];

      child.stdout.on('data', chunk => chunks.push(Buffer.from(chunk)));
      child.on('error', () => resolve(''));
      child.on('close', code => {
        resolve(code === 0 ? cleanText(Buffer.concat(chunks).toString('utf8')) : '');
      });
    });
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
};

const decodePdfString = (value: string) => {
  const bytes: number[] = [];

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char !== '\\') {
      bytes.push(char.charCodeAt(0));
      continue;
    }

    const next = value[++i];
    if (!next) break;

    const escapes: Record<string, number> = {
      n: 10,
      r: 13,
      t: 9,
      b: 8,
      f: 12,
      '\\': 92,
      '(': 40,
      ')': 41
    };

    if (escapes[next] !== undefined) {
      bytes.push(escapes[next]);
    } else if (/[0-7]/.test(next)) {
      const octal = `${next}${value.slice(i + 1, i + 3).match(/^[0-7]{0,2}/)?.[0] ?? ''}`;
      i += octal.length - 1;
      bytes.push(parseInt(octal, 8));
    } else if (next === '\n' || next === '\r') {
      if (next === '\r' && value[i + 1] === '\n') i += 1;
    } else {
      bytes.push(next.charCodeAt(0));
    }
  }

  const buffer = Buffer.from(bytes);
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return cleanText(buffer.subarray(2).toString('utf16le').replace(/([\s\S])([\s\S])/g, '$2$1'));
  }

  return cleanText(buffer.toString('utf8'));
};

const decodePdfHexString = (value: string) => {
  const normalized = value.replace(/\s/g, '');
  const evenHex = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  const buffer = Buffer.from(evenHex, 'hex');

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1] ?? 0;
      swapped[i - 1] = buffer[i];
    }
    return cleanText(swapped.toString('utf16le'));
  }

  return cleanText(buffer.toString('utf8'));
};

const extractTextFromPdfStreams = (fileBuffer: Buffer) => {
  const raw = fileBuffer.toString('latin1');
  const streamRegex = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const fragments: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(raw)) !== null) {
    const dictionary = match[1];
    const stream = Buffer.from(match[2], 'latin1');
    let decoded = stream;

    if (/\/Filter\s*(?:\[[^\]]*)?\/FlateDecode/.test(dictionary)) {
      try {
        decoded = inflateSync(stream);
      } catch {
        continue;
      }
    }

    const content = decoded.toString('latin1');
    const literalMatches = content.matchAll(/\((?:\\.|[^\\()])*\)/g);
    for (const literal of literalMatches) {
      const decodedLiteral = decodePdfString(literal[0].slice(1, -1));
      if (decodedLiteral.length > 1) fragments.push(decodedLiteral);
    }

    const hexMatches = content.matchAll(/<([0-9a-fA-F\s]{4,})>/g);
    for (const hex of hexMatches) {
      const decodedHex = decodePdfHexString(hex[1]);
      if (decodedHex.length > 1) fragments.push(decodedHex);
    }
  }

  return cleanText(
    fragments
      .join(' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([.!?])\s+/g, '$1\n')
  );
};

const extractReadableText = async (fileBuffer: Buffer, fileName: string, mimeType: string) => {
  const nameLower = fileName.toLowerCase();

  if (
    mimeType.startsWith('text/') ||
    nameLower.endsWith('.txt') ||
    nameLower.endsWith('.md') ||
    nameLower.endsWith('.csv')
  ) {
    return cleanText(fileBuffer.toString('utf8'));
  }

  if (mimeType === 'application/pdf' || nameLower.endsWith('.pdf')) {
    const pdftotextResult = await runCommandWithInput('pdftotext', ['-layout', '-', '-'], fileBuffer);
    if (pdftotextResult) return pdftotextResult;

    const streamText = extractTextFromPdfStreams(fileBuffer);
    if (streamText) return streamText;
  }

  if (mimeType.startsWith('image/') || /\.(png|jpe?g|tiff?|bmp)$/i.test(nameLower)) {
    const cloudVisionResult = await extractWithGoogleVision(fileBuffer, mimeType);
    if (cloudVisionResult) return cloudVisionResult;

    const tesseractResult = await runTesseract(fileBuffer, fileName);
    if (tesseractResult) return tesseractResult;
  }

  const raw = fileBuffer.toString('latin1');
  const printableRuns = raw.match(/[A-Za-z0-9][A-Za-z0-9\s.,;:()/%+$'"!?-]{8,}/g) ?? [];
  const likelyText = printableRuns
    .map(part => cleanText(part))
    .filter(part => part.length > 20 && !part.includes('obj') && !part.includes('endstream'))
    .slice(0, 80)
    .join('\n');

  return cleanText(likelyText);
};

const inferSpecialty = (text: string) => {
  const lower = text.toLowerCase();

  if (lower.includes('meniscus') || lower.includes('knee') || lower.includes('arthroscopy')) {
    return { specialty: 'Orthopedics', inferredTitle: 'Knee Recommendation Analysis' };
  }

  if (lower.includes('coronary') || lower.includes('angiogram') || lower.includes('cabg') || lower.includes('cardio')) {
    return { specialty: 'Cardiology', inferredTitle: 'Cardiology Recommendation Analysis' };
  }

  if (lower.includes('prescription') || lower.includes('rx') || lower.includes('medication')) {
    return { specialty: 'General Medicine', inferredTitle: 'Prescription Analysis' };
  }

  if (lower.includes('gallstone') || lower.includes('cholecystectomy') || lower.includes('laparoscopic')) {
    return { specialty: 'General Surgery', inferredTitle: 'Gallstones & Laparoscopic Cholecystectomy' };
  }

  if (lower.includes('mri') || lower.includes('ct') || lower.includes('ultrasound') || lower.includes('x-ray')) {
    return { specialty: 'Radiology', inferredTitle: 'Imaging Report Analysis' };
  }

  return { specialty: 'General Medicine', inferredTitle: 'Uploaded Document Analysis' };
};

export const ocrService = {
  async extractText(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<OcrResult> {
    // Simulate OCR processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const extractedText = await extractReadableText(fileBuffer, fileName, mimeType);
    const textForInference = extractedText || fileName;
    const { specialty, inferredTitle } = inferSpecialty(textForInference);

    if (!extractedText) {
      return {
        extractedText: [
          'No readable text was extracted from this upload by the local document reader.',
          '',
          `File name: ${fileName}`,
          `MIME type: ${mimeType}`,
          `File size: ${fileBuffer.length} bytes`,
          '',
          'This usually means the file is an image or scan and remote OCR is not configured or could not read the content. Configure Google Cloud Vision OCR for deployed image uploads, or install Tesseract for local image OCR.'
        ].join('\n'),
        specialty,
        inferredTitle
      };
    }

    return {
      extractedText,
      specialty,
      inferredTitle
    };
  }
};
