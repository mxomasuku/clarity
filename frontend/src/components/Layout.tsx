import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, LogOut, FileText, LayoutDashboard, UserCheck, Landmark } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-main)',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Determine role badge style
  const getBadgeStyle = (role: string) => {
    switch (role) {
      case 'cimas_executive':
        return { bg: 'hsl(142, 60%, 96%)', color: 'hsl(142, 60%, 25%)', border: '1px solid hsl(142, 60%, 85%)', label: 'Operations' };
      case 'reviewer':
        return { bg: 'var(--accent-light)', color: 'hsl(var(--accent-hue), 70%, 25%)', border: '1px solid hsl(var(--accent-hue), 70%, 85%)', label: 'Reviewer' };
      default:
        return { bg: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid hsl(var(--primary-hue), 85%, 85%)', label: 'Patient' };
    }
  };

  const badge = getBadgeStyle(user.role);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={28} color="var(--primary)" />
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>
            Clarity<span style={{ color: 'var(--accent)' }}>Health</span>
          </span>
        </div>

        {/* Links */}
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {user.role === 'patient' && (
            <>
              <Link 
                to="/dashboard" 
                style={{ 
                  color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-muted)', 
                  textDecoration: 'none', 
                  fontWeight: 600,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <LayoutDashboard size={18} />
                My Dashboard
              </Link>
            </>
          )}

          {user.role === 'reviewer' && (
            <Link 
              to="/reviewer" 
              style={{ 
                color: location.pathname === '/reviewer' ? 'var(--primary)' : 'var(--text-muted)', 
                textDecoration: 'none', 
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <UserCheck size={18} />
              Reviewer Portal
            </Link>
          )}

          {user.role === 'cimas_executive' && (
            <Link 
              to="/executive" 
              style={{ 
                color: location.pathname === '/executive' ? 'var(--primary)' : 'var(--text-muted)', 
                textDecoration: 'none', 
                fontWeight: 600,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Landmark size={18} />
              Operations Dashboard
            </Link>
          )}
        </nav>

        {/* User profile and logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {user.email}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: badge.bg,
            color: badge.color,
            border: badge.border,
            textTransform: 'uppercase'
          }}>
            {badge.label}
          </span>
          <button 
            onClick={logout}
            className="interactive-hover"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main style={{ flex: 1, padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
};
