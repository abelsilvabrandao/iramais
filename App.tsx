
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import Tasks from './pages/Tasks';
import NewsEditor from './pages/NewsEditor';
import Systems from './pages/Systems';
import MeetingRooms from './pages/MeetingRooms'; 
import VisitorPortal from './pages/VisitorPortal';
import Login from './pages/Login';
import AdminEmployees from './pages/AdminEmployees';
import AdminSystems from './pages/AdminSystems';
import AdminOrganization from './pages/AdminOrganization';
import AdminUsers from './pages/AdminUsers';
import AdminMeetingRooms from './pages/AdminMeetingRooms';
import AdminSignatures from './pages/AdminSignatures';
import AdminTerms from './pages/AdminTerms'; // New Import
import Signatures from './pages/Signatures'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) { return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>; }
  if (!user) { return <Navigate to="/login" replace />; }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<VisitorPortal />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/meeting-rooms" element={<MeetingRooms />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/news-editor" element={<NewsEditor />} />
            <Route path="/signatures" element={<Signatures />} /> 
            
            <Route path="/admin-users" element={<AdminUsers />} />
            <Route path="/admin-employees" element={<AdminEmployees />} />
            <Route path="/admin-systems" element={<AdminSystems />} />
            <Route path="/admin-rooms" element={<AdminMeetingRooms />} />
            <Route path="/admin-org" element={<AdminOrganization />} />
            <Route path="/admin-signatures" element={<AdminSignatures />} />
            <Route path="/admin-terms" element={<AdminTerms />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
