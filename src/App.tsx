import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { pb } from './lib/pocketbase';
import LoginView from './views/LoginView';
import RosterView from './views/admin/RosterView';

function Dashboard() {
  const { user } = useAuth();
  // Superusers don't have a 'role' field in the record, but we treat them as 'admin'
  const displayRole = user?.role || (user?.collectionName === '_superusers' ? 'admin' : 'unknown');
  const isAdmin = displayRole === 'admin';
  
  const handleLogout = () => {
    pb.authStore.clear();
  };

  return (
    <div style={{ padding: '20px' }}>
      <nav style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 'bold' }}>Dashboard</Link>
        {isAdmin && <Link to="/admin/roster">Manage Roster</Link>}
        <button 
          onClick={handleLogout}
          style={{ marginLeft: 'auto', padding: '6px 12px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </nav>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email} (Role: {displayRole})!</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Upcoming Tasks</h3>
        <ul>
          <li>Create Events</li>
          <li>Set Seating Charts</li>
          <li>Take Attendance</li>
        </ul>
      </div>
    </div>
  );
}

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
