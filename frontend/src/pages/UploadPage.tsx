import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Document } from '../services/api.js';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader } from 'lucide-react';

export const UploadPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<number>(0); // 0: Idle, 1: Uploading, 2: OCR Extraction, 3: AI Generation, 4: Done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [processedDocument, setProcessedDocument] = useState<Document | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (fileToUpload: File) => {
    if (!caseId) return;
    setUploading(true);
    setStep(1);
    setProgress(15);
    setError('');

    // Simulate progress updates for uploading phase
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 15;
      });
    }, 300);

    try {
      // Step 1: Upload and trigger backend pipeline (OCR + AI)
      // We pass the actual file. On backend, this saves to storage, triggers OCR, and AI.
      const result = await api.uploadDocument(caseId, fileToUpload, () => {
        // Axios upload progress callback
      });
      setProcessedDocument(result.document);

      clearInterval(progressInterval);
      setProgress(100);
      
      // Step 2: Transition to OCR Extraction
      setStep(2);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 3: Transition to AI Generation
      setStep(3);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 4: Done!
      setStep(4);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.response?.data?.error || 'Failed to process the document.');
      setUploading(false);
      setStep(0);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="premium-card" style={{ padding: '40px', background: 'white' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 10px 0' }}>
          Upload Medical Recommendation
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: '0 0 30px 0' }}>
          Upload your doctor notes, scanning reports (MRI, CT), prescriptions, or discharge letters. Our AI will securely extract the clinical recommendations for explanation.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px',
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px'
          }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Upload Form (Idle State) */}
        {step === 0 && (
          <form onSubmit={onFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--bg-main)',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <UploadCloud size={48} color="var(--primary-medium)" style={{ margin: '0 auto 16px auto' }} />
              {file ? (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '16px' }}>{file.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>
                    Drag and drop your file here, or click to browse
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Supports PDF, PNG, JPG (Max 10MB)
                  </div>
                </div>
              )}
            </div>

            {file && (
              <button
                type="submit"
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Start AI Extraction Pipeline
                <ArrowRight size={18} />
              </button>
            )}
          </form>
        )}

        {/* Processing State */}
        {step > 0 && step < 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="processing-indicator" style={{ display: 'inline-flex', padding: '16px', background: 'var(--accent-light)', color: 'var(--accent)', marginBottom: '16px' }}>
                <Loader size={36} className="spinner" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 8px 0' }}>
                Processing Clinical Record...
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                Please wait while we run our secure pipeline.
              </p>
            </div>

            {/* Pipeline Step Tracker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: step >= 1 ? 1 : 0.4 }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step > 1 ? 'var(--success)' : 'var(--accent)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Storing Document securely</div>
                  {step === 1 && (
                    <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '6px' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: OCR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: step >= 2 ? 1 : 0.4 }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step > 2 ? 'var(--success)' : (step === 2 ? 'var(--accent)' : 'var(--border-color)'),
                  color: step >= 2 ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Document Reader: Text Extraction</div>
                  {step === 2 && <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginTop: '2px' }}>Reading available text from the uploaded file...</div>}
                </div>
              </div>

              {/* Step 3: AI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: step >= 3 ? 1 : 0.4 }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step > 3 ? 'var(--success)' : (step === 3 ? 'var(--accent)' : 'var(--border-color)'),
                  color: step >= 3 ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {step > 3 ? '✓' : '3'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>AI Service: Structuring Transparency Report</div>
                  {step === 3 && <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginTop: '2px' }}>Translating extracted text and building review prompts...</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Done State */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ color: 'var(--success)' }}>
              <CheckCircle2 size={64} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 8px 0' }}>
                AI Analysis Complete
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
                Your clinical records have been fully processed. The plain-language translation, pathways, and consultation questions are ready.
              </p>
            </div>
            {processedDocument && (
              <div style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                  Extracted Document Text
                </div>
                <pre style={{
                  margin: 0,
                  padding: '16px',
                  maxHeight: '220px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace'
                }}>
                  {processedDocument.extractedText}
                </pre>
              </div>
            )}
            <button
              onClick={() => navigate(`/cases/${caseId}?tab=documents`)}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              View Explanation Report
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
