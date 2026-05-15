import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginView from './views/LoginView';
import RosterView from './views/admin/RosterView';
import EventsView from './views/admin/EventsView';
import AttendanceView from './views/admin/AttendanceView';
import AdminDashboardView from './views/admin/AdminDashboardView';
import SingerDashboardView from './views/singer/DashboardView';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role || (user.collectionName === '_superusers' ? 'admin' : 'singer');
  if (adminOnly && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function MainDashboard() {
  const { user } = useAuth();
  const role = user?.role || (user?.collectionName === '_superusers' ? 'admin' : 'singer');

  if (role === 'admin') {
    return <AdminDashboardView />;
  }

  return <SingerDashboardView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/roster" 
          element={
            <ProtectedRoute adminOnly>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '10px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px' }}>
                   <Link to="/">← Back to Dashboard</Link>
                </header>
                <RosterView />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events" 
          element={
            <ProtectedRoute adminOnly>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '10px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px' }}>
                   <Link to="/">← Back to Dashboard</Link>
                </header>
                <EventsView />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/attendance" 
          element={
            <ProtectedRoute adminOnly>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '10px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px' }}>
                   <Link to="/">← Back to Dashboard</Link>
                </header>
                <AttendanceView />
              </div>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
