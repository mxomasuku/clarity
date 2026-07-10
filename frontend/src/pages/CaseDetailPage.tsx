import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, CaseDetailResponse } from '../services/api.js';
import { FileText, Sparkles, MessageSquareHeart, HelpCircle, FileCheck, Stethoscope, ChevronLeft, AlertCircle, AlertTriangle } from 'lucide-react';

type CaseDetailTab = 'documents' | 'summary' | 'explanation' | 'pathways' | 'questions' | 'second_opinion' | 'rate_doctor';

const tabFromUrl = (value: string | null): CaseDetailTab => {
  const allowedTabs: CaseDetailTab[] = ['documents', 'summary', 'explanation', 'pathways', 'questions', 'second_opinion', 'rate_doctor'];
  return allowedTabs.includes(value as CaseDetailTab) ? value as CaseDetailTab : 'summary';
};

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<CaseDetailTab>(tabFromUrl(searchParams.get('tab')));
  const [requestingOpinion, setRequestingOpinion] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});

  // Procedure details for opinion request
  const [procedureDateInput, setProcedureDateInput] = useState('');
  const [urgencyLabelInput, setUrgencyLabelInput] = useState('');
  const [showOpinionForm, setShowOpinionForm] = useState(false);

  // Review states
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  // Individual Rating Toggles
  const [easeOfCommunication, setEaseOfCommunication] = useState(5);
  const [easeOfCommunicationComment, setEaseOfCommunicationComment] = useState('');
  const [explanationOfDecision, setExplanationOfDecision] = useState(5);
  const [explanationOfDecisionComment, setExplanationOfDecisionComment] = useState('');
  const [otherConcernsRaise, setOtherConcernsRaise] = useState(5); // 1-5 where 5 means they raised all concerns
  const [otherConcernsRaiseComment, setOtherConcernsRaiseComment] = useState('');
  const [recommendToCaredOne, setRecommendToCaredOne] = useState(5);
  const [recommendToCaredOneComment, setRecommendToCaredOneComment] = useState('');
  const [servedOnTime, setServedOnTime] = useState(5);
  const [servedOnTimeComment, setServedOnTimeComment] = useState('');
  const [valueForMoney, setValueForMoney] = useState(5);
  const [valueForMoneyComment, setValueForMoneyComment] = useState('');
  const [decisionJustified, setDecisionJustified] = useState(5);
  const [decisionJustifiedComment, setDecisionJustifiedComment] = useState('');
  const [overallComment, setOverallComment] = useState('');

  useEffect(() => {
    fetchCaseDetail();
  }, [id]);

  useEffect(() => {
    setActiveTab(tabFromUrl(searchParams.get('tab')));
  }, [searchParams]);

  const fetchCaseDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.getCaseDetail(id);
      setData(response);

      // Get existing patient review if any
      try {
        const review = await api.getDoctorReview(id);
        setExistingReview(review);
      } catch (err) {
        console.warn('No review found for this case.', err);
      }
    } catch (err) {
      setError('Failed to load case details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSecondOpinion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setRequestingOpinion(true);
    try {
      await api.requestSecondOpinion(id, procedureDateInput, urgencyLabelInput);
      await fetchCaseDetail(); // Refresh case state
      setActiveTab('second_opinion');
      setShowOpinionForm(false);
    } catch (err) {
      setError('Failed to request second opinion.');
    } finally {
      setRequestingOpinion(false);
    }
  };

  const handleSubmitDoctorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingReview(true);
    setReviewSuccessMsg('');
    try {
      const reviewData = {
        easeOfCommunication,
        easeOfCommunicationComment,
        explanationOfDecision,
        explanationOfDecisionComment,
        otherConcernsRaise: 6 - otherConcernsRaise, // Invert scale: 5 (raised all) becomes 1 for backend
        otherConcernsRaiseComment,
        recommendToCaredOne,
        recommendToCaredOneComment,
        servedOnTime,
        servedOnTimeComment,
        valueForMoney,
        valueForMoneyComment,
        decisionJustified,
        decisionJustifiedComment,
        overallComment
      };
      const review = await api.submitDoctorReview(id, reviewData);
      setExistingReview(review);
      setReviewSuccessMsg('Your review has been successfully submitted to clinical operations.');
    } catch (err) {
      console.error(err);
      setError('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setCheckedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading case details...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: '20px', background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}>
        {error || 'Case not found.'}
      </div>
    );
  }

  const { case: caseData, documents, aiReport, secondOpinion } = data;

  // Tabs structure
  const tabs = [
    { id: 'summary', label: 'AI Summary', icon: <Sparkles size={16} /> },
    { id: 'explanation', label: 'Plain Explanation', icon: <FileText size={16} /> },
    { id: 'pathways', label: 'Treatment Pathways', icon: <MessageSquareHeart size={16} /> },
    { id: 'questions', label: 'Questions To Ask', icon: <HelpCircle size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileCheck size={16} /> },
    { id: 'second_opinion', label: 'Second Opinion', icon: <Stethoscope size={16} /> },
    ...(caseData.status === 'completed' || caseData.status === 'reviewed'
      ? [{ id: 'rate_doctor' as const, label: 'Rate Doctor Visit', icon: <MessageSquareHeart size={16} /> }]
      : [])
  ] as const;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button and case header */}
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '12px',
            padding: 0
          }}
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
              {caseData.title}
            </h1>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px', alignItems: 'center' }}>
              <span>Case ID: <strong style={{ color: 'var(--text-primary)' }}>{caseData.id}</strong></span>
              <span>•</span>
              <span>Specialty: <strong style={{ color: 'var(--text-primary)' }}>{caseData.specialty}</strong></span>
              <span>•</span>
              <span>Date: {new Date(caseData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '20px',
            background: caseData.status === 'reviewed' ? 'hsl(280, 75%, 95%)' : (caseData.status === 'completed' ? 'var(--success-light)' : 'var(--primary-light)'),
            color: caseData.status === 'reviewed' ? 'hsl(280, 75%, 35%)' : (caseData.status === 'completed' ? 'var(--success)' : 'var(--primary)'),
            border: '1px solid currentColor'
          }}>
            {caseData.status === 'completed' ? 'Report Ready' : (caseData.status === 'reviewed' ? 'Reviewed by Doctor' : 'Awaiting Review')}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '1px'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 18px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              border: '1px solid transparent',
              borderBottomColor: activeTab === tab.id ? 'transparent' : 'var(--border-color)',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              top: '1px',
              borderLeftColor: activeTab === tab.id ? 'var(--border-color)' : 'transparent',
              borderRightColor: activeTab === tab.id ? 'var(--border-color)' : 'transparent',
              borderTopColor: activeTab === tab.id ? 'var(--border-color)' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="premium-card" style={{ padding: '40px', background: 'white', minHeight: '350px' }}>
        
        {/* TAB 1: AI Summary */}
        {activeTab === 'summary' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Recommendation Summary</h3>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
              {aiReport?.summary || 'No summary available.'}
            </p>
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--primary)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <AlertCircle size={20} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Patient Safety Note</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {aiReport?.disclaimer || 'This information is educational and should not replace advice from a qualified healthcare professional.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Plain Explanation */}
        {activeTab === 'explanation' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Plain Language Explanation</h3>
              <span style={{ fontSize: '12px', color: 'var(--success)', background: 'var(--success-light)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                Target: Grade 8 Reading Level
              </span>
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-line' }}>
              {aiReport?.explanation || 'No explanation available.'}
            </p>
          </div>
        )}

        {/* TAB 3: Pathways */}
        {activeTab === 'pathways' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0' }}>Educational Treatment Pathways</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                Possible treatment pathways that may be considered in some situations include the following. These are for educational context, not recommendations.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {aiReport?.pathways.map((path, idx) => (
                <div key={idx} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px',
                  background: '#FCFCFC'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                    {idx + 1}. {path.title}
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                    <strong>Description:</strong> {path.description}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    <div style={{ background: 'var(--success-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '12px', marginBottom: '4px' }}>BENEFITS</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{path.benefits}</div>
                    </div>

                    <div style={{ background: 'var(--danger-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '12px', marginBottom: '4px' }}>RISKS</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{path.risks}</div>
                    </div>

                    <div style={{ background: 'hsl(210, 80%, 95%)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '12px', marginBottom: '4px' }}>CONSIDERATIONS</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{path.considerations}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Questions To Ask */}
        {activeTab === 'questions' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0' }}>Questions To Ask Your Healthcare Team</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                Bring these questions to your next appointment. Tick them off as you discuss them to support informed consent.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              {aiReport?.questions.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleQuestion(idx)}
                  className="interactive-hover"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: checkedQuestions[idx] ? 'var(--primary-light)' : '#FCFCFC',
                    borderColor: checkedQuestions[idx] ? 'hsl(var(--primary-hue), 85%, 85%)' : 'var(--border-color)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedQuestions[idx]}
                    onChange={() => {}} // handled by parent div click
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: '15px',
                    color: checkedQuestions[idx] ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: 500,
                    textDecoration: checkedQuestions[idx] ? 'line-through' : 'none'
                  }}>
                    {q}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Documents */}
        {activeTab === 'documents' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Original Uploaded Documents</h3>
            
            {documents.map((doc, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ background: 'var(--bg-main)', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary)' }}>Document File (GCS: {doc.fileUrl})</span>
                  <a
                    href={`${(import.meta.env.VITE_API_URL as string ?? 'http://localhost:5001/api').replace(/\/api\/?$/, '')}${doc.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    View Original
                  </a>
                </div>
                <div style={{ padding: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700 }}>Extracted Clinical Text</h4>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    color: 'var(--text-primary)'
                  }}>
                    {doc.extractedText}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: Second Opinion */}
        {activeTab === 'second_opinion' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0' }}>Request Second Opinion</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                If you have concerns about this recommendation, you can request a review from a qualified clinical panel member directly through this platform.
              </p>
            </div>

            {caseData.status === 'completed' && (
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <Stethoscope size={48} color="var(--primary)" />
                <div style={{ fontWeight: 700, fontSize: '18px' }}>Submit Case for Review</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 0 10px 0', textAlign: 'center' }}>
                  Your original files, extracted clinical text, and AI translation report will be securely shared with an independent clinical reviewer.
                </p>

                {!showOpinionForm ? (
                  <button
                    onClick={() => setShowOpinionForm(true)}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Provide Details & Submit
                  </button>
                ) : (
                  <form onSubmit={handleRequestSecondOpinion} style={{ width: '100%', maxWidth: '500px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>PROCEDURE DATE & TIME</label>
                      <input
                        type="datetime-local"
                        value={procedureDateInput}
                        onChange={(e) => setProcedureDateInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>URGENCY OR PROCEDURE DETAILS</label>
                      <input
                        type="text"
                        placeholder="e.g. Baby delivery happening soon, or Gut surgery scheduled in 2 days"
                        value={urgencyLabelInput}
                        onChange={(e) => setUrgencyLabelInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowOpinionForm(false)}
                        style={{
                          flex: 1,
                          background: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={requestingOpinion}
                        style={{
                          flex: 1,
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {requestingOpinion ? 'Requesting...' : 'Request Review'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {caseData.status === 'second_opinion_requested' && (
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid hsl(var(--primary-hue), 85%, 85%)',
                borderRadius: 'var(--radius-md)',
                padding: '30px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <AlertTriangle size={48} color="var(--primary)" />
                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>Awaiting Medical Review</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: 0 }}>
                  Your case is in the reviewer queue. A clinical expert will review your recommendation and submit advisory comments. You will be notified once complete.
                </p>
              </div>
            )}

            {caseData.status === 'reviewed' && secondOpinion && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  background: 'var(--success-light)',
                  border: '1px solid hsl(142, 60%, 85%)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--success)'
                }}>
                  <Stethoscope size={20} />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Independent Clinical Review Completed</span>
                </div>

                <div style={{
                  background: '#FAFAFA',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '6px', borderRadius: '50%' }}>
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>Independent Clinical Reviewer</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed on {new Date(secondOpinion.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    fontStyle: 'italic',
                    borderLeft: '4px solid var(--accent)',
                    paddingLeft: '16px',
                    margin: '10px 0'
                  }}>
                    "{secondOpinion.comments}"
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '10px' }}>
                    <strong>Note:</strong> Reviewer comments are educational advisory notes. They do not constitute formal prescriptions or direct treatments. Always consult your attending physician before making changes to a prescribed plan.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: Rate Doctor Visit */}
        {activeTab === 'rate_doctor' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0' }}>Patient Doctor Visit Audit</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                Please review your recent visit. Your quantitative scores are aggregated by clinical operations to flag high-cost discrepancies (such as high C-section vs normal delivery ratios) and monitor care communication.
              </p>
              <div style={{ background: 'var(--accent-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent)', marginTop: '14px', fontSize: '13px', color: 'hsl(var(--accent-hue), 70%, 25%)', fontWeight: 600 }}>
                ⚠️ Focus on this specific visit. Do not base reviews on general assumptions about the doctor.
              </div>
            </div>

            {reviewSuccessMsg && (
              <div style={{ padding: '14px', background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontWeight: 600, fontSize: '14px' }}>
                {reviewSuccessMsg}
              </div>
            )}

            {existingReview ? (
              <div style={{ background: '#FAFAFA', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--primary)' }}>Your Submitted Review</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {new Date(existingReview.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '15px' }}>
                    Score: {existingReview.overallRating} / 5
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Ease of Communication:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.easeOfCommunication} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Doctor explained decision clearly:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.explanationOfDecision} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Could raise all concerns:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(6 - existingReview.otherConcernsRaise)} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Would recommend to loved ones:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.recommendToCaredOne} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Served on time / Punctuality:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.servedOnTime} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Value for money:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.valueForMoney} / 5 stars</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Recommendation decision justified:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{existingReview.decisionJustified} / 5 stars</span>
                  </div>
                </div>

                {existingReview.overallComment && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
                    <span style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Your Commentary:</span>
                    <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      "{existingReview.overallComment}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitDoctorReview} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Communication */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>1. Ease of Communication</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEaseOfCommunication(star)}
                          style={{
                            background: easeOfCommunication >= star ? 'var(--primary)' : 'transparent',
                            color: easeOfCommunication >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about communication (optional)..."
                    value={easeOfCommunicationComment}
                    onChange={(e) => setEaseOfCommunicationComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 2. Explain Decision */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>2. Did the doctor explain the decision clearly?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setExplanationOfDecision(star)}
                          style={{
                            background: explanationOfDecision >= star ? 'var(--primary)' : 'transparent',
                            color: explanationOfDecision >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about decision explanations (optional)..."
                    value={explanationOfDecisionComment}
                    onChange={(e) => setExplanationOfDecisionComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 3. Raise Concerns */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>3. Did you feel comfortable raising all your concerns?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setOtherConcernsRaise(star)}
                          style={{
                            background: otherConcernsRaise >= star ? 'var(--primary)' : 'transparent',
                            color: otherConcernsRaise >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about raising concerns (optional)..."
                    value={otherConcernsRaiseComment}
                    onChange={(e) => setOtherConcernsRaiseComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 4. Recommend */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>4. Would you recommend him to someone you deeply care about?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRecommendToCaredOne(star)}
                          style={{
                            background: recommendToCaredOne >= star ? 'var(--primary)' : 'transparent',
                            color: recommendToCaredOne >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about recommending the doctor (optional)..."
                    value={recommendToCaredOneComment}
                    onChange={(e) => setRecommendToCaredOneComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 5. Served On Time */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>5. Were you served on time?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setServedOnTime(star)}
                          style={{
                            background: servedOnTime >= star ? 'var(--primary)' : 'transparent',
                            color: servedOnTime >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about wait times (optional)..."
                    value={servedOnTimeComment}
                    onChange={(e) => setServedOnTimeComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 6. Value for Money */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>6. Did you get value for your money?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setValueForMoney(star)}
                          style={{
                            background: valueForMoney >= star ? 'var(--primary)' : 'transparent',
                            color: valueForMoney >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about payouts or value (optional)..."
                    value={valueForMoneyComment}
                    onChange={(e) => setValueForMoneyComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 7. Decision Justified */}
                <div style={{ background: '#FCFCFC', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '15px' }}>7. Was the medical decision justified on a scale?</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setDecisionJustified(star)}
                          style={{
                            background: decisionJustified >= star ? 'var(--primary)' : 'transparent',
                            color: decisionJustified >= star ? '#ffffff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Provide comments about decision justification (optional)..."
                    value={decisionJustifiedComment}
                    onChange={(e) => setDecisionJustifiedComment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Overall commentary */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>OVERALL COMMENTARY SUMMARY</label>
                  <textarea
                    rows={4}
                    placeholder="Write a general summary of your visit experience..."
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '15px',
                    alignSelf: 'flex-start'
                  }}
                >
                  {submittingReview ? 'Submitting Review...' : 'Submit Visit Review'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
