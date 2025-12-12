import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import Tasks from './pages/Tasks';
import NewsEditor from './pages/NewsEditor';
import Systems from './pages/Systems';
import VisitorPortal from './pages/VisitorPortal';
import Login from './pages/Login';
import AdminEmployees from './pages/AdminEmployees';
import AdminSystems from './pages/AdminSystems';
import AdminOrganization from './pages/AdminOrganization';
import AdminUsers from './pages/AdminUsers';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Componente para proteger rotas que exigem login
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
     return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/visitor" element={<VisitorPortal />} />
          <Route path="/login" element={<Login />} />

          {/* Authenticated Routes - Wrapped in Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/news-editor" element={<NewsEditor />} />
            
            {/* Admin Routes */}
            <Route path="/admin-users" element={<AdminUsers />} />
            <Route path="/admin-employees" element={<AdminEmployees />} />
            <Route path="/admin-systems" element={<AdminSystems />} />
            <Route path="/admin-org" element={<AdminOrganization />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;