import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api, Case, CaseDetailResponse } from '../services/api.js';
import { Stethoscope, ClipboardList, CheckCircle, FileText, ChevronRight, Send, HelpCircle, AlertCircle } from 'lucide-react';

export const ReviewerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCases();
  }, [user]);

  const fetchCases = async () => {
    setLoadingList(true);
    try {
      const response = await api.getCases({ role: 'reviewer' });
      const urgencyScore = { critical: 3, urgent: 2, routine: 1 };
      const sorted = response.sort((a, b) => {
        // Reviewed cases go to the bottom of the queue
        if (a.status === 'reviewed' && b.status !== 'reviewed') return 1;
        if (a.status !== 'reviewed' && b.status === 'reviewed') return -1;

        const scoreA = urgencyScore[a.urgencyLevel || 'routine'] || 1;
        const scoreB = urgencyScore[b.urgencyLevel || 'routine'] || 1;
        if (scoreA !== scoreB) return scoreB - scoreA;

        if (a.procedureDate && b.procedureDate) {
          return new Date(a.procedureDate).getTime() - new Date(b.procedureDate).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setCases(sorted);
    } catch (err) {
      setError('Failed to load review cases.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setLoadingDetail(true);
    setComments('');
    setSuccessMsg('');
    setError('');
    try {
      const detail = await api.getCaseDetail(caseId);
      setCaseDetail(detail);
    } catch (err) {
      setError('Failed to load case details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !comments || !user) return;
    setSubmitting(true);
    setError('');
    try {
      await api.submitReview(selectedCaseId, user.id, comments);
      setSuccessMsg('Clinical review submitted successfully!');
      
      // Refresh list and detail
      await fetchCases();
      const detail = await api.getCaseDetail(selectedCaseId);
      setCaseDetail(detail);
    } catch (err) {
      setError('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  // Preset clinical comments for local testing
  const applyPreset = (type: 'meniscus' | 'cad') => {
    if (type === 'meniscus') {
      setComments(
        'Review of the left knee MRI report confirms a complex medial meniscus posterior horn tear and joint effusion. Given the reported physical locking, starting with physical therapy is reasonable but may fail if the flap is unstable. A keyhole partial meniscectomy is standard, highly successful, and has a quick recovery. I support the referral to Orthopedics. Recommend checking network coverage and pre-authorization requirements before proceeding.'
      );
    } else if (type === 'cad') {
      setComments(
        'Triple-vessel coronary artery disease with severe (85%) proximal LAD stenosis is a high-risk configuration. The recommendation for CABG is clinically justified and aligns with international cardiology guidelines. Complete surgical revascularization is preferred over stenting (PCI) for long-term survival in multi-vessel disease. Case approved for clinical authorization. Recommend patient request a pre-authorization estimate from the hospital.'
      );
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(172, 70%, 25%), hsl(var(--accent-hue), 70%, 40%))',
        color: 'white',
        padding: '30px 40px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '50%' }}>
          <Stethoscope size={36} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Reviewer Portal</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.9, fontSize: '15px' }}>
            Provide clinical second opinions and advisory reviews on patient cases to improve informed consent and transparent approvals.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        {/* Cases Queue List */}
        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} />
            Review Queue
          </h2>

          {loadingList ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Loading queue...</div>
          ) : cases.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', fontSize: '14px' }}>
              No cases currently in the review queue.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className="interactive-hover"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedCaseId === c.id ? 'var(--accent-light)' : '#FAFAFA',
                    borderColor: selectedCaseId === c.id ? 'hsl(var(--accent-hue), 70%, 85%)' : 'var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: c.status === 'reviewed' ? 'var(--success-light)' : 'var(--primary-light)',
                      color: c.status === 'reviewed' ? 'var(--success)' : 'var(--primary)'
                    }}>
                      {c.status === 'reviewed' ? 'Reviewed' : 'Awaiting Review'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {c.urgencyLevel && c.status === 'second_opinion_requested' && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: c.urgencyLevel === 'critical' ? 'var(--danger-light)' : (c.urgencyLevel === 'urgent' ? 'hsl(38, 92%, 92%)' : 'var(--bg-main)'),
                      color: c.urgencyLevel === 'critical' ? 'var(--danger)' : (c.urgencyLevel === 'urgent' ? 'hsl(38, 90%, 35%)' : 'var(--text-muted)'),
                      marginTop: '6px',
                      border: '1px solid currentColor',
                      alignSelf: 'flex-start'
                    }}>
                      🚨 {c.urgencyLabel || c.urgencyLevel.toUpperCase()}
                    </div>
                  )}

                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginTop: '6px' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Specialty: {c.specialty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Case Workspace Detail */}
        <div style={{ minHeight: '500px' }}>
          {selectedCaseId ? (
            loadingDetail ? (
              <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading case details...
              </div>
            ) : caseDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Case overview card */}
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', margin: '0 0 16px 0' }}>
                    {caseDetail.case.title}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Specialty:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{caseDetail.case.specialty}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{caseDetail.case.status}</strong>
                    </div>
                  </div>

                  {/* Document extracted text */}
                  {caseDetail.documents.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} />
                        Extracted Clinical Records
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: '16px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        color: 'var(--text-primary)',
                        maxHeight: '200px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {caseDetail.documents[0].extractedText}
                      </pre>
                    </div>
                  )}
                </div>

                {/* AI report summary */}
                {caseDetail.aiReport && (
                  <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 10px 0' }}>
                      AI Generated Report Summary
                    </h3>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                      {caseDetail.aiReport.summary}
                    </p>
                  </div>
                )}

                {/* Clinical Feedback Form */}
                <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={18} />
                    Clinical Reviewer Commentary
                  </h3>

                  {successMsg && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: 'var(--success-light)',
                      border: '1px solid var(--success)',
                      color: 'var(--success)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '16px',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      <CheckCircle size={18} />
                      {successMsg}
                    </div>
                  )}

                  {caseDetail.case.status === 'second_opinion_requested' ? (
                    <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                            MD COMMENTS / RECOMMENDATIONS
                          </label>
                          
                          {/* Presets */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => applyPreset('meniscus')}
                              style={{ fontSize: '11px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Preset: Meniscus Tear
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset('cad')}
                              style={{ fontSize: '11px', background: 'var(--accent-light)', color: 'var(--accent)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Preset: Coronary CABG
                            </button>
                          </div>
                        </div>
                        
                        <textarea
                          rows={6}
                          placeholder="Provide educational context, comment on standard surgical indications, or recommend specific questions the member should clarify with their surgeon..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !comments}
                        style={{
                          background: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          alignSelf: 'flex-start'
                        }}
                      >
                        <Send size={16} />
                        {submitting ? 'Submitting Review...' : 'Submit Second Opinion'}
                      </button>
                    </form>
                  ) : caseDetail.case.status === 'reviewed' && caseDetail.secondOpinion ? (
                    <div style={{
                      background: 'var(--success-light)',
                      border: '1px solid hsl(142, 60%, 85%)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>
                        <CheckCircle size={18} />
                        Submitted Review
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-primary)' }}>
                        "{caseDetail.secondOpinion.comments}"
                      </p>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                        Completed by Reviewer ID: {caseDetail.secondOpinion.reviewerId} on {new Date(caseDetail.secondOpinion.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'var(--bg-main)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px'
                    }}>
                      <AlertCircle size={18} />
                      This case has not been submitted for a second opinion review yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null
          ) : (
            <div style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '80px 40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Stethoscope size={48} color="var(--border-color)" />
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>No Case Selected</div>
              <p style={{ fontSize: '14px', margin: 0, maxWidth: '300px' }}>
                Select a case from the review queue on the left to begin your medical second opinion assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
