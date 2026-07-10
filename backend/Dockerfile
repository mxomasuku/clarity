# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install all dependencies (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Runtime document readers:
# - poppler-utils provides pdftotext for text-based PDFs.
# - tesseract-ocr is a local fallback for image OCR when Cloud Vision is not configured.
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-eng

# Install production-only deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy mock DB (Firestore fallback during cold start)
COPY mock_db.json ./

# Create uploads directory
RUN mkdir -p uploads

# Cloud Run injects PORT — default to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
