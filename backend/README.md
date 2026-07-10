# Clarity Backend

## Remote OCR

Image uploads are read with Google Cloud Vision first, then local Tesseract as a fallback.

For Cloud Run, enable the Cloud Vision API and give the backend service account permission to call it. The app uses the Cloud Run metadata token automatically.

Alternatively, set `GOOGLE_VISION_API_KEY` in the backend environment to use an API key.

Text-based PDFs are read with `pdftotext`, which is installed in the production container through `poppler-utils`.
