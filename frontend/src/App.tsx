import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from './pages/LandingPage.js';
import { Dashboard } from './pages/Dashboard.js';
import { UploadPage } from './pages/UploadPage.js';
import { CaseDetailPage } from './pages/CaseDetailPage.js';
import { ReviewerDashboard } from './pages/ReviewerDashboard.js';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard.js';
import { Layout } from './components/Layout.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Patient Routes */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/upload/:caseId" element={<Layout><UploadPage /></Layout>} />
            <Route path="/cases/:id" element={<Layout><CaseDetailPage /></Layout>} />

            {/* Protected Reviewer Route */}
            <Route path="/reviewer" element={<Layout><ReviewerDashboard /></Layout>} />

            {/* Protected Executive Route */}
            <Route path="/executive" element={<Layout><ExecutiveDashboard /></Layout>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
