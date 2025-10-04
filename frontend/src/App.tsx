import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Public Pages
import HomePage from './pages/public/HomePage';
import RankingsHub from './pages/public/RankingsHub';
import InstitutionProfile from './pages/public/InstitutionProfile';
import MethodologyPage from './pages/public/MethodologyPage';
import BlogPage from './pages/public/BlogPage';
import BlogPost from './pages/public/BlogPost';
import CompareInstitutions from './pages/public/CompareInstitutions';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInstitutions from './pages/admin/AdminInstitutions';
import AdminMetrics from './pages/admin/AdminMetrics';
import AdminRankings from './pages/admin/AdminRankings';
import AdminBlog from './pages/admin/AdminBlog';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

// Protected Route Component
import ProtectedRoute from './components/auth/ProtectedRoute';

// Error Boundaries
import ErrorBoundary from './components/ui/ErrorBoundary';

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/rankings" element={<RankingsHub />} />
                    <Route path="/rankings/:type" element={<RankingsHub />} />
                    <Route path="/institution/:id" element={<InstitutionProfile />} />
                    <Route path="/methodology" element={<MethodologyPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/compare" element={<CompareInstitutions />} />

                    {/* Auth Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Admin Routes - Protected */}
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin', 'editor', 'analyst']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/institutions" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin', 'editor']}>
                          <AdminInstitutions />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/metrics" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin', 'editor']}>
                          <AdminMetrics />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/rankings" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin']}>
                          <AdminRankings />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/blog" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin', 'editor']}>
                          <AdminBlog />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/users" 
                      element={
                        <ProtectedRoute roles={['super_admin']}>
                          <AdminUsers />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/settings" 
                      element={
                        <ProtectedRoute roles={['super_admin', 'admin']}>
                          <AdminSettings />
                        </ProtectedRoute>
                      } 
                    />

                    {/* 404 Route */}
                    <Route 
                      path="*" 
                      element={
                        <div className="min-h-screen flex items-center justify-center">
                          <div className="text-center">
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                            <p className="text-gray-600 mb-8">Page not found</p>
                            <a href="/" className="btn-primary">Go Home</a>
                          </div>
                        </div>
                      } 
                    />
                  </Routes>
                </main>
                <Footer />

                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      iconTheme: {
                        primary: '#10B981',
                        secondary: '#fff',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#EF4444',
                        secondary: '#fff',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
