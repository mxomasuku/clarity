import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api, Case } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, ChevronRight, Activity, Clock, FileCheck2, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      if (!user) return;
      try {
        const data = await api.getCases({ patientId: user.id });
        // Sort cases: newest first
        setCases(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        setError('Failed to load cases.');
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [user]);

  const handleCreateNewCase = async () => {
    if (!user) return;
    try {
      // Create a skeleton case first
      const newCase = await api.createCase({
        patientId: user.id,
        title: 'New Recommendation Analysis',
        specialty: 'Pending OCR Auto-Classification'
      });
      // Redirect to upload file for this case
      navigate(`/upload/${newCase.id}`);
    } catch (err) {
      console.error('Failed to create case:', err);
    }
  };

  const getStatusBadge = (status: Case['status']) => {
    switch (status) {
      case 'pending_upload':
        return { label: 'Pending Upload', bg: '#EDF2F7', color: '#4A5568' };
      case 'processing':
        return { label: 'Processing OCR & AI...', bg: 'var(--accent-light)', color: 'var(--accent)', isPulse: true };
      case 'completed':
        return { label: 'AI Report Ready', bg: 'var(--success-light)', color: 'var(--success)' };
      case 'second_opinion_requested':
        return { label: 'Awaiting MD Review', bg: 'var(--primary-light)', color: 'var(--primary)' };
      case 'reviewed':
        return { label: 'Clinical Review Completed', bg: 'hsl(280, 75%, 95%)', color: 'hsl(280, 75%, 35%)' };
      default:
        return { label: status, bg: '#E2E8F0', color: '#4A5568' };
    }
  };

  const realCases = cases.filter(c => c.status !== 'pending_upload');
  const activeCases = realCases.filter(c => c.status !== 'reviewed');
  const aiReportCases = realCases.filter(c =>
    c.status === 'completed' ||
    c.status === 'second_opinion_requested' ||
    c.status === 'reviewed'
  );
  const reviewedCases = realCases.filter(c => c.status === 'reviewed');

  const openCase = (caseData?: Case, tab = 'summary') => {
    if (!caseData) return;
    navigate(`/cases/${caseData.id}${tab ? `?tab=${tab}` : ''}`);
  };

  const getStats = () => {
    const active = activeCases.length;
    const completed = aiReportCases.length;
    const reviewed = reviewedCases.length;
    return { active, completed, reviewed };
  };

  const stats = getStats();
  const recentActivity = realCases
    .slice(0, 3);

  const formatActivityDate = (dateValue: string) =>
    new Date(dateValue).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const getActivityCopy = (c: Case) => {
    switch (c.status) {
      case 'processing':
        return `Processing uploaded document for "${c.title}"`;
      case 'completed':
        return `AI extraction report ready for "${c.title}"`;
      case 'second_opinion_requested':
        return `Clinical review requested for "${c.title}"`;
      case 'reviewed':
        return `Clinical review completed for "${c.title}"`;
      default:
        return `Document activity recorded for "${c.title}"`;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), var(--primary-medium))',
        color: 'white',
        padding: '30px 40px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Welcome back, patient!</h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.85, fontSize: '15px' }}>
            Understand your healthcare recommendations, view educational alternative pathways, and get second opinions.
          </p>
        </div>
        <button
          onClick={handleCreateNewCase}
          className="interactive-hover"
          style={{
            background: 'white',
            color: 'var(--primary)',
            border: 'none',
            padding: '14px 24px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <FilePlus2 size={18} />
          Analyze New Document
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        <button
          onClick={() => openCase(activeCases[0], activeCases[0]?.status === 'processing' ? '' : 'summary')}
          disabled={activeCases.length === 0}
          aria-label="Open active recommendations"
          className="interactive-hover"
          style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)', cursor: activeCases.length ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', opacity: activeCases.length ? 1 : 0.7 }}
        >
          <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.active}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Active Recommendations</div>
          </div>
        </button>

        <button
          onClick={() => openCase(aiReportCases[0], 'summary')}
          disabled={aiReportCases.length === 0}
          aria-label="Open generated AI reports"
          className="interactive-hover"
          style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)', cursor: aiReportCases.length ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', opacity: aiReportCases.length ? 1 : 0.7 }}
        >
          <div style={{ background: 'var(--success-light)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}>
            <FileCheck2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.completed}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>AI Reports Generated</div>
          </div>
        </button>

        <button
          onClick={() => openCase(reviewedCases[0], 'second_opinion')}
          disabled={reviewedCases.length === 0}
          aria-label="Open completed reviews"
          className="interactive-hover"
          style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)', cursor: reviewedCases.length ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', opacity: reviewedCases.length ? 1 : 0.7 }}
        >
          <div style={{ background: 'hsl(280, 75%, 95%)', padding: '12px', borderRadius: '12px', color: 'hsl(280, 75%, 35%)' }}>
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.reviewed}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Completed Reviews</div>
          </div>
        </button>
      </div>

      {/* Main Layout: Recent Cases and Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Cases List */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)' }}>My Medical Recommendations</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading cases...</div>
          ) : error ? (
            <div style={{ color: 'var(--danger)', padding: '20px 0' }}>{error}</div>
          ) : realCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <FileSpreadsheet size={48} color="var(--border-color)" />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No medical cases found</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-8px' }}>
                Upload a doctor note, prescription, or clinical MRI to get started.
              </div>
              <button 
                onClick={handleCreateNewCase}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {realCases.map((c) => {
                const badge = getStatusBadge(c.status);
                return (
                  <div
                    key={c.id}
                    className="interactive-hover"
                    onClick={() => {
                      openCase(c, c.status === 'processing' ? '' : 'summary');
                    }}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FDFDFD'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '16px' }}>
                        {c.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', alignItems: 'center' }}>
                        <span>Specialty: <strong style={{ color: 'var(--text-primary)' }}>{c.specialty}</strong></span>
                        <span>•</span>
                        <span>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={badge.isPulse ? 'processing-indicator' : ''} style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.color}22`
                      }}>
                        {badge.label}
                      </span>
                      <ChevronRight size={20} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} />
            Transparency Log
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Your upload and review activity will appear here after you process a document.
              </div>
            ) : recentActivity.map((c) => (
              <button
                key={c.id}
                onClick={() => openCase(c, c.status === 'processing' ? '' : 'summary')}
                className="interactive-hover"
                style={{ border: 'none', borderLeft: '2px solid var(--border-color)', padding: '0 0 0 16px', position: 'relative', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.status === 'completed' ? 'var(--success)' : 'var(--accent)', position: 'absolute', left: '-5px', top: '6px' }}></div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatActivityDate(c.createdAt)}</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {getActivityCopy(c)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
