import React, { useEffect, useState } from 'react';
import { api, AnalyticsResponse, Doctor, Case, User } from '../services/api.js';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Landmark, 
  Users, 
  CheckCircle, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Search, 
  MapPin, 
  Stethoscope, 
  UserSquare2, 
  FileCheck2, 
  ChevronRight, 
  X, 
  Clock, 
  HelpCircle,
  AlertCircle,
  GraduationCap
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  
  // Selection states for Drawers
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorDetail, setDoctorDetail] = useState<{ doctor: Doctor; cases: Case[] } | null>(null);
  const [doctorReviewsList, setDoctorReviewsList] = useState<any[]>([]);
  const [loadingDoctorDetail, setLoadingDoctorDetail] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<{ user: User; cases: Case[] } | null>(null);
  const [loadingPatientDetail, setLoadingPatientDetail] = useState(false);

  const isDoctorFlagged = (doc: Doctor) => {
    if (doc.specialty !== 'Obstetrics & Gynecology') return false;
    const cSections = doc.cSectionCount || 0;
    const normalDeliveries = doc.normalDeliveryCount || 0;
    const totalDeliveries = cSections + normalDeliveries;
    if (totalDeliveries < 3) return false;

    const cSectionRatio = cSections / totalDeliveries;
    return cSectionRatio > 0.40;
  };

  // Filter states
  const [activeTab, setActiveTab] = useState<'analytics' | 'doctors' | 'explorer'>('analytics');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorRegion, setDoctorRegion] = useState('All');
  const [explorerSearch, setExplorerSearch] = useState('');
  const [explorerStatus, setExplorerStatus] = useState('All');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const SAVINGS_COLORS = ['#22c55e', '#ef4444'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [analytics, docs, cases] = await Promise.all([
        api.getAnalytics(),
        api.getDoctors(),
        api.getCases({ role: 'cimas_executive' }) // fetch all cases
      ]);
      setAnalyticsData(analytics);
      setDoctorsList(docs);
      setAllCases(cases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError('Failed to load executive statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDoctorDetail = async (docId: string) => {
    setSelectedDoctorId(docId);
    setLoadingDoctorDetail(true);
    setDoctorReviewsList([]);
    try {
      const [response, reviews] = await Promise.all([
        api.getDoctorDetail(docId),
        api.getDoctorReviews(docId)
      ]);
      setDoctorDetail(response);
      setDoctorReviewsList(reviews);
    } catch (err) {
      console.error('Failed to load doctor detail', err);
    } finally {
      setLoadingDoctorDetail(false);
    }
  };

  const handleOpenPatientDetail = async (patId: string) => {
    setSelectedPatientId(patId);
    setLoadingPatientDetail(true);
    try {
      const response = await api.getUserProfile(patId);
      setPatientDetail(response);
    } catch (err) {
      console.error('Failed to load patient detail', err);
    } finally {
      setLoadingPatientDetail(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading analytics workspace...</div>;
  }

  if (error || !analyticsData) {
    return (
      <div style={{ padding: '20px', background: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}>
        {error || 'Failed to load executive data.'}
      </div>
    );
  }

  const { metrics, charts } = analyticsData;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered doctors list
  const filteredDoctors = doctorsList.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) || 
                          doc.specialty.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchesRegion = doctorRegion === 'All' || doc.region === doctorRegion;
    return matchesSearch && matchesRegion;
  });

  // Filtered case explorer list
  const filteredCases = allCases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(explorerSearch.toLowerCase()) || 
                          c.specialty.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                          c.id.toLowerCase().includes(explorerSearch.toLowerCase());
    const matchesStatus = explorerStatus === 'All' || c.status === explorerStatus;
    return matchesSearch && matchesStatus;
  });

  // Helper to map status labels
  const getStatusBadge = (status: Case['status']) => {
    switch (status) {
      case 'pending_upload':
        return { label: 'Pending Upload', bg: '#EDF2F7', color: '#4A5568' };
      case 'processing':
        return { label: 'Processing...', bg: 'var(--accent-light)', color: 'var(--accent)' };
      case 'completed':
        return { label: 'Report Ready', bg: 'var(--success-light)', color: 'var(--success)' };
      case 'second_opinion_requested':
        return { label: 'MD Review Queued', bg: 'var(--primary-light)', color: 'var(--primary)' };
      case 'reviewed':
        return { label: 'Reviewed by Doctor', bg: 'hsl(280, 75%, 95%)', color: 'hsl(280, 75%, 35%)' };
      default:
        return { label: status, bg: '#E2E8F0', color: '#4A5568' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
      
      {/* Title Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), #1e293b)',
        color: 'white',
        padding: '30px 40px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '50%' }}>
            <Landmark size={36} />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Operations Administration Panel</h1>
            <p style={{ margin: '6px 0 0 0', opacity: 0.9, fontSize: '15px' }}>
              Godlike Access: Audit attending doctor referrals, analyze claims payouts by region, and view patient clinical timelines.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        gap: '20px'
      }}>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          System Analytics
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'doctors' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'doctors' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Attending Doctor directory
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          style={{
            padding: '14px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'explorer' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'explorer' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Case & Member Explorer
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL CASES REVIEWED</span>
                <CheckCircle size={16} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{metrics.totalCasesReviewed}</div>
              <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ 12% increase this week</div>
            </div>

            <div style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>2ND OPINIONS REQUESTED</span>
                <Users size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{metrics.secondOpinionsRequested}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>25% of overall cases</div>
            </div>

            <div style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MEMBER UNDERSTANDING</span>
                <Sparkles size={16} color="var(--success)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{metrics.memberUnderstandingScore}%</div>
              <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ 4.2% based on surveys</div>
            </div>

            <div style={{ background: 'white', padding: '20px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>TRANSPARENCY SCORE</span>
                <TrendingUp size={16} color="var(--warning)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{metrics.transparencyScore}%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grade B+ compliance</div>
            </div>
          </div>

          {/* Claims Exposure Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ background: 'white', padding: '24px 30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ background: 'var(--danger-light)', padding: '16px', borderRadius: '50%', color: 'var(--danger)' }}>
                <ShieldAlert size={32} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>HIGH-COST CLAIMS EXPOSURE</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                  {formatCurrency(metrics.potentialClaimsExposure)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Total value of procedures submitted for member transparency audits.
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px 30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ background: 'var(--success-light)', padding: '16px', borderRadius: '50%', color: 'var(--success)' }}>
                <DollarSign size={32} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>POTENTIAL CLAIMS AUDITED</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                  {formatCurrency(metrics.potentialClaimsReviewed)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Value of procedures successfully reviewed for cost clarity & network fit.
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)' }}>
                Case Volume by Medical Specialty
              </h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={charts.caseVolumeByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)' }}>
                Member Engagement Trends (Weekly)
              </h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <AreaChart data={charts.memberEngagementTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="activeUsers" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Active Members" />
                    <Area type="monotone" dataKey="reportsViewed" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" name="Reports Viewed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)' }}>
                Most Reviewed Procedure Types
              </h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={charts.mostReviewedProcedures} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--primary)' }}>
                Claims Exposure Saved vs Remaining
              </h3>
              <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '60%', height: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={charts.potentialClaimsExposure}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {charts.potentialClaimsExposure.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SAVINGS_COLORS[index % SAVINGS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {charts.potentialClaimsExposure.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', background: SAVINGS_COLORS[index], borderRadius: '2px' }}></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 600 }}>{entry.name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{formatCurrency(entry.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDING DOCTORS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'doctors' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Filters Bar */}
          <div style={{
            background: 'white',
            padding: '16px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search doctors by name or specialty..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>REGION:</span>
              <select
                value={doctorRegion}
                onChange={(e) => setDoctorRegion(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Regions</option>
                <option value="Harare">Harare</option>
                <option value="Bulawayo">Bulawayo</option>
                <option value="Mutare">Mutare</option>
                <option value="Gweru">Gweru</option>
              </select>
            </div>
          </div>

          {/* Doctors Table */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>DOCTOR NAME</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>SPECIALTY</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>REGION</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>TOTAL PAYOUTS</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>CASES</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>2ND OPINIONS</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>UNDERSTANDING</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No doctors found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map(doc => (
                    <tr 
                      key={doc.id} 
                      className="interactive-hover"
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                      onClick={() => handleOpenDoctorDetail(doc.id)}
                    >
                      <td style={{ padding: '18px 24px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Stethoscope size={16} color="var(--accent)" />
                        {doc.name}
                        {isDoctorFlagged(doc) && (
                          <span 
                            title={`C-Section Rate Flagged: ${(((doc.cSectionCount || 0) / ((doc.cSectionCount || 0) + (doc.normalDeliveryCount || 0))) * 100).toFixed(0)}% (threshold 40%)`}
                            style={{
                              marginLeft: '8px',
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: '1px solid var(--danger)'
                            }}
                          >
                            ⚠️ C-SECTION FLAG
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '18px 24px', color: 'var(--text-primary)' }}>{doc.specialty}</td>
                      <td style={{ padding: '18px 24px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} />
                          {doc.region}
                        </span>
                      </td>
                      <td style={{ padding: '18px 24px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(doc.payout)}</td>
                      <td style={{ padding: '18px 24px', textAlign: 'center' }}>{doc.casesCount}</td>
                      <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          color: doc.secondOpinionsCount > 3 ? 'var(--danger)' : 'var(--text-primary)',
                          background: doc.secondOpinionsCount > 3 ? 'var(--danger-light)' : 'transparent',
                          padding: doc.secondOpinionsCount > 3 ? '2px 8px' : '0',
                          borderRadius: '10px'
                        }}>
                          {doc.secondOpinionsCount}
                        </span>
                      </td>
                      <td style={{ padding: '18px 24px', textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>
                        {doc.understandingScore}%
                      </td>
                      <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                        <button
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          View Profile
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{
            background: 'var(--primary-light)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--primary)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <GraduationCap size={24} color="var(--primary)" />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>Referral Training Opportunities:</strong> Doctors with elevated 2nd opinion requests (e.g., &gt; 3 requests) or low understanding scores are highlighted in red for potential invite to upcoming clinical guidelines and patient communication workshops.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CASE & MEMBER EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'explorer' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Search bar */}
          <div style={{
            background: 'white',
            padding: '16px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search cases by title, specialty, or case ID..."
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS:</span>
              <select
                value={explorerStatus}
                onChange={(e) => setExplorerStatus(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="completed">AI Report Ready</option>
                <option value="second_opinion_requested">MD Review Queued</option>
                <option value="reviewed">Reviewed</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>

          {/* Cases Explorer Table */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>CASE ID</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>PROCEDURE RECOMMENDATION</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>PATIENT</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>ATTENDING DOCTOR</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>SPECIALTY</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>AUDIT</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No cases found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => {
                    const badge = getStatusBadge(c.status);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '18px 24px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {c.id}
                        </td>
                        <td style={{ padding: '18px 24px', fontWeight: 700, color: 'var(--primary)' }}>
                          {c.title}
                        </td>
                        <td 
                          style={{ padding: '18px 24px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handleOpenPatientDetail(c.patientId)}
                        >
                          Patient Profile
                        </td>
                        <td 
                          style={{ padding: '18px 24px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                          onClick={() => {
                            if (c.doctorId) handleOpenDoctorDetail(c.doctorId);
                          }}
                        >
                          {c.doctorId === 'doc_ndlovu' ? 'Dr. S. Ndlovu' : 
                           c.doctorId === 'doc_sibanda' ? 'Dr. A. Sibanda' :
                           c.doctorId === 'doc_chimuka' ? 'Dr. G. Chimuka' : 
                           c.doctorId === 'doc_moyo' ? 'Dr. T. Moyo' : 'Unassigned Referrer'}
                        </td>
                        <td style={{ padding: '18px 24px', color: 'var(--text-primary)' }}>{c.specialty}</td>
                        <td style={{ padding: '18px 24px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            backgroundColor: badge.bg,
                            color: badge.color
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <a
                            href={`/cases/${c.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textDecoration: 'none',
                              display: 'inline-block'
                            }}
                          >
                            Open Report
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER 1: DOCTOR PROFILE DRAWER */}
      {/* ========================================================================= */}
      {selectedDoctorId && (
        <>
          {/* Overlay */}
          <div 
            onClick={() => setSelectedDoctorId(null)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1090 }}
          />

          {/* Drawer Body */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: '600px',
            background: 'white',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {/* Header */}
            <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Stethoscope size={24} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                    {doctorDetail?.doctor.name || 'Loading Doctor...'}
                  </h3>
                  <span style={{ fontSize: '13px', opacity: 0.85 }}>
                    {doctorDetail?.doctor.specialty} • {doctorDetail?.doctor.region} Attending
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoctorId(null)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {loadingDoctorDetail ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading doctor profile details...</div>
              ) : doctorDetail ? (
                <>
                  {/* C-Section flag block */}
                  {isDoctorFlagged(doctorDetail.doctor) && (
                    <div style={{
                      background: 'var(--danger-light)',
                      border: '1px solid var(--danger)',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--danger)',
                      fontSize: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={18} />
                        AUDIT WARNING: Elevated C-Section Rate
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
                        This provider is flagged due to an exceptionally high ratio of C-section procedures relative to normal deliveries:
                        <strong style={{ marginLeft: '4px' }}>
                          {(((doctorDetail.doctor.cSectionCount || 0) / ((doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0))) * 100).toFixed(0)}% C-Section Rate
                        </strong> ({doctorDetail.doctor.cSectionCount} C-sections out of {(doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0)} deliveries). The audit threshold is 40%.
                      </p>
                    </div>
                  )}

                  {/* Doctor Stats Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL PAYOUTS</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                        {formatCurrency(doctorDetail.doctor.payout)}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>2ND OPINION RATE</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: doctorDetail.doctor.secondOpinionsCount >= 3 ? 'var(--danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                        {((doctorDetail.doctor.secondOpinionsCount / doctorDetail.doctor.casesCount) * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>UNDERSTANDING</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                        {doctorDetail.doctor.understandingScore}%
                      </div>
                    </div>
                  </div>

                  {/* Delivery type breakdown */}
                  {(doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0) > 0 && (
                    <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Delivery Type Discrepancy Breakdown</h4>
                      <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '12px', overflow: 'hidden', background: '#e2e8f0', width: '100%' }}>
                        {(doctorDetail.doctor.cSectionCount || 0) > 0 && (
                          <div 
                            style={{
                              background: 'var(--danger)',
                              width: `${((doctorDetail.doctor.cSectionCount || 0) / ((doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0))) * 100}%`,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700
                            }}
                          >
                            {doctorDetail.doctor.cSectionCount} C-Sec ({(((doctorDetail.doctor.cSectionCount || 0) / ((doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0))) * 100).toFixed(0)}%)
                          </div>
                        )}
                        {(doctorDetail.doctor.normalDeliveryCount || 0) > 0 && (
                          <div 
                            style={{
                              background: 'var(--success)',
                              width: `${((doctorDetail.doctor.normalDeliveryCount || 0) / ((doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0))) * 100}%`,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700
                            }}
                          >
                            {doctorDetail.doctor.normalDeliveryCount} Normal ({(((doctorDetail.doctor.normalDeliveryCount || 0) / ((doctorDetail.doctor.cSectionCount || 0) + (doctorDetail.doctor.normalDeliveryCount || 0))) * 100).toFixed(0)}%)
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Vaginal Normal Delivery cost: $185</span>
                        <span>Surgical C-Section cost: $1,700</span>
                      </div>
                    </div>
                  )}

                  {/* Doctor Info Details */}
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <div><strong>Email Contact:</strong> {doctorDetail.doctor.email}</div>
                    <div><strong>Accredited Clinic:</strong> {doctorDetail.doctor.region} Region</div>
                    <div><strong>Affiliation Status:</strong> Network Accredited Practitioner</div>
                  </div>

                  {/* Patient surveys */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
                      Patient Survey Reviews ({doctorReviewsList.length})
                    </h4>
                    {doctorReviewsList.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No patient reviews submitted.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {doctorReviewsList.map(r => (
                          <div key={r.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#FAFAFA', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ color: 'var(--primary)' }}>Overall Rating: {r.overallRating} / 5</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>
                              "{r.overallComment}"
                            </p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                              <span>Communication: <strong>{r.easeOfCommunication}/5</strong></span>
                              <span>Explained Decision: <strong>{r.explanationOfDecision}/5</strong></span>
                              <span>Justified Recommendation: <strong>{r.decisionJustified}/5</strong></span>
                              <span>Value: <strong>{r.valueForMoney}/5</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cases List */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>
                      Referred Recommendations ({doctorDetail.cases.length})
                    </h4>
                    {doctorDetail.cases.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recommendations uploaded for this doctor.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {doctorDetail.cases.map(c => {
                          const badge = getStatusBadge(c.status);
                          return (
                            <div key={c.id} style={{ padding: '14px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>{c.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Case ID: {c.id} • Created {new Date(c.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '12px', background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* DRAWER 2: PATIENT USER PROFILE DRAWER */}
      {/* ========================================================================= */}
      {selectedPatientId && (
        <>
          {/* Overlay */}
          <div 
            onClick={() => setSelectedPatientId(null)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1090 }}
          />

          {/* Drawer Body */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: '600px',
            background: 'white',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {/* Header */}
            <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserSquare2 size={24} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                    {patientDetail?.user?.name || 'Loading Patient...'}
                  </h3>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>
                    Member ID: {patientDetail?.user?.medicalAidNo || 'N/A'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatientId(null)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {loadingPatientDetail ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading patient profile details...</div>
              ) : patientDetail ? (
                <>
                  {/* Demographics Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>MEMBER AGE</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                        {patientDetail.user.age || '45'} Years
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>GENDER</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                        {patientDetail.user.gender || 'Male'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>REGION</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                        {patientDetail.user.region || 'Harare'}
                      </div>
                    </div>
                  </div>

                  {/* Patient Contact Info */}
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <div><strong>Email:</strong> {patientDetail.user.email}</div>
                    <div><strong>Join Date:</strong> {new Date(patientDetail.user.createdAt).toLocaleDateString()}</div>
                    <div><strong>Coverage Tier:</strong> Private Hospital Plan</div>
                  </div>

                  {/* Patient Case History Timeline */}
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} />
                      Member Upload History ({patientDetail.cases?.length || 0})
                    </h4>
                    {!patientDetail.cases || patientDetail.cases.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No medical recommendations uploaded.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px solid var(--border-color)', paddingLeft: '20px', marginLeft: '10px' }}>
                        {patientDetail.cases.map((c: any) => {
                          const badge = getStatusBadge(c.status);
                          return (
                            <div key={c.id} style={{ position: 'relative' }}>
                              {/* Timeline dot */}
                              <div style={{
                                width: '12px',
                                height: '12px',
                                background: c.status === 'reviewed' ? 'hsl(280, 75%, 35%)' : 'var(--primary)',
                                borderRadius: '50%',
                                position: 'absolute',
                                left: '-27px',
                                top: '4px'
                              }} />
                              
                              <div style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '16px',
                                background: '#FCFCFC'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>{c.title}</div>
                                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: badge.bg, color: badge.color }}>
                                    {badge.label}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                                  <span>Specialty: <strong>{c.specialty}</strong></span>
                                  <span>•</span>
                                  <span>Uploaded: {new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* CSS Drawer animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
