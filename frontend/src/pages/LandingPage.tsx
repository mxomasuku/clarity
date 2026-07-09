import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import { Shield, Sparkles, HeartPulse, UserRound, ArrowRight, UserCheck, Landmark, Eye, EyeOff } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-color)',
  fontSize: '15px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  marginBottom: '6px',
  color: 'var(--text-muted)',
  letterSpacing: '0.5px',
};

const DEMO_ACCOUNTS = [
  {
    email: 'patient@clarity.com',
    password: 'Clarity2024!',
    label: 'Patient Demo',
    description: 'Upload docs, see AI explanations & request second opinions',
    role: 'patient',
    icon: <UserRound size={16} />,
    bg: 'var(--primary-light)',
    border: 'hsl(var(--primary-hue), 85%, 85%)',
    iconBg: 'var(--primary)',
    textColor: 'var(--primary)',
  },
  {
    email: 'reviewer@clarity.com',
    password: 'Clarity2024!',
    label: 'Medical Reviewer Demo',
    description: 'Verify cases and write second opinion comments',
    role: 'reviewer',
    icon: <UserCheck size={16} />,
    bg: 'var(--accent-light)',
    border: 'hsl(var(--accent-hue), 70%, 85%)',
    iconBg: 'var(--accent)',
    textColor: 'hsl(var(--accent-hue), 70%, 25%)',
  },
  {
    email: 'exec@example.com',
    password: 'Clarity2024!',
    label: 'Operations Workspace',
    description: 'Track transparency metrics and exposure analytics',
    role: 'cimas_executive',
    icon: <Landmark size={16} />,
    bg: 'hsl(142, 60%, 96%)',
    border: 'hsl(142, 60%, 85%)',
    iconBg: 'var(--success)',
    textColor: 'hsl(142, 60%, 25%)',
  },
];

export const LandingPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [activeOption, setActiveOption] = useState<'register' | 'login'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectUser = (role: string) => {
    if (role === 'cimas_executive') navigate('/executive');
    else if (role === 'reviewer') navigate('/reviewer');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setLoading(true);
    setError('');
    try {
      if (activeOption === 'register') {
        if (!partnerIdInput) { setError('CIMAS Partner ID is required.'); return; }
        const u = await register(emailInput, passwordInput, nameInput || undefined, partnerIdInput);
        redirectUser(u.role);
      } else {
        const u = await login(emailInput, passwordInput);
        redirectUser(u.role);
      }
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email. Please register first.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please sign in.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Connection failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const u = await login(email, password);
      redirectUser(u.role);
    } catch (err) {
      setError('Demo login failed. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={32} color="var(--primary)" />
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
            Clarity<span style={{ color: 'var(--accent)' }}>Health</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#problem" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>Problem</a>
          <a href="#how-it-works" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>How It Works</a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '60px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Hero Section */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', marginBottom: '80px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '20px', color: 'var(--primary)', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
              <Sparkles size={16} />
              Healthcare Transparency Workspace
            </div>
            <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.15, color: 'var(--primary)', margin: '0 0 20px 0', letterSpacing: '-1px' }}>
              Healthcare Decisions <br />
              Should Run on <span className="gradient-text">Trust</span>, Not Stress.
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 30px 0' }}>
              Clarity Health translates complex medical recommendations into plain language, maps out educational alternative pathways, and supports informed consent—helping patients make confident decisions while providing medical aids with deep transparency.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--accent)', paddingLeft: '16px', margin: '20px 0 30px 0' }}>
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>
                "This is an educational platform. It is not diagnostic, does not make medical decisions, and does not judge doctor correctness. Its purpose is transparency and trust."
              </p>
            </div>
          </div>

          {/* Auth Card */}
          <div className="premium-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toggle */}
            <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
              {(['login', 'register'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setActiveOption(opt); setError(''); }}
                  style={{
                    flex: 1, padding: '10px',
                    background: activeOption === opt ? '#ffffff' : 'transparent',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 700, fontSize: '14px',
                    color: activeOption === opt ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    boxShadow: activeOption === opt ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeOption === 'register' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>FULL NAME</label>
                    <input type="text" placeholder="e.g. Mxolisi Blessed Masuku" value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>MEMBER ID</label>
                    <input type="text" placeholder="e.g. 88712-B" value={partnerIdInput}
                      onChange={(e) => setPartnerIdInput(e.target.value)} style={inputStyle} required />
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>EMAIL ADDRESS</label>
                <input type="email" placeholder="name@example.com" value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={activeOption === 'register' ? 'Create a password (min 6 chars)' : 'Enter your password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: 'var(--primary)', color: 'white', border: 'none',
                  padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '16px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1, marginTop: '4px',
                }}
              >
                {loading ? 'Please wait...' : activeOption === 'login' ? 'Sign In to Workspace' : 'Create Account'}
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Test Accounts */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TEST ACCOUNTS</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  onClick={() => handleDemoLogin(acct.email, acct.password)}
                  disabled={loading}
                  className="interactive-hover"
                  style={{
                    background: acct.bg, border: `1px solid ${acct.border}`,
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', opacity: loading ? 0.7 : 1,
                  }}
                >
                  <div style={{ background: acct.iconBg, padding: '6px', borderRadius: '50%', color: 'white', flexShrink: 0 }}>
                    {acct.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: acct.textColor }}>{acct.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{acct.description}</div>
                  </div>
                </button>
              ))}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0 0' }}>
                Password for all test accounts: <strong>Clarity2024!</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Problem & How it works */}
        <section id="problem" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '60px', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)', textAlign: 'center', marginBottom: '40px' }}>
            The Healthcare Decision Gap
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '16px' }}><HeartPulse size={36} /></div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px 0' }}>Stressful Complexity</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Patients receive medical recommendations for expensive or invasive surgeries under massive pressure, without understanding what they truly entail.
              </p>
            </div>
            <div style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--accent)', marginBottom: '16px' }}><Shield size={36} /></div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px 0' }}>Informed Consent</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                True health engagement requires understanding. We provide clear, objective questions patients can bring directly to their clinical visits.
              </p>
            </div>
            <div style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--success)', marginBottom: '16px' }}><Landmark size={36} /></div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px 0' }}>Medical Aid Transparency</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Medical aid teams gain visibility into member understanding and treatment transparency, allowing for better claims forecasting and clinical audits.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--primary)', color: '#ffffff', padding: '40px', textAlign: 'center', fontSize: '14px' }}>
        <p style={{ margin: 0, opacity: 0.8 }}>Clarity Health - Healthcare Transparency Platform &copy; 2026</p>
        <p style={{ margin: '8px 0 0 0', opacity: 0.6, fontSize: '12px' }}>
          Disclaimer: This system is for educational purposes, does not diagnose patients, and does not override professional medical opinions.
        </p>
      </footer>
    </div>
  );
};
