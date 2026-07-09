export interface OcrResult {
  extractedText: string;
  specialty: string;
  inferredTitle: string;
}

const cleanText = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractReadableText = (fileBuffer: Buffer, fileName: string, mimeType: string) => {
  const nameLower = fileName.toLowerCase();

  if (
    mimeType.startsWith('text/') ||
    nameLower.endsWith('.txt') ||
    nameLower.endsWith('.md') ||
    nameLower.endsWith('.csv')
  ) {
    return cleanText(fileBuffer.toString('utf8'));
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

  if (lower.includes('mri') || lower.includes('ct') || lower.includes('ultrasound') || lower.includes('x-ray')) {
    return { specialty: 'Radiology', inferredTitle: 'Imaging Report Analysis' };
  }

  return { specialty: 'General Medicine', inferredTitle: 'Uploaded Document Analysis' };
};

export const ocrService = {
  async extractText(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<OcrResult> {
    // Simulate OCR processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const extractedText = extractReadableText(fileBuffer, fileName, mimeType);
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
          'This usually means the file is a scanned image, a photo, or a PDF whose text is embedded in compressed streams. Connect a real OCR provider for image-based documents, or upload a text-based PDF/TXT file to verify the AI analysis path.'
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
