import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { pb } from './lib/pocketbase';
import LoginView from './views/LoginView';

function Dashboard() {
  const { user } = useAuth();
  // Superusers don't have a 'role' field in the record, but we treat them as 'admin'
  const displayRole = user?.role || (user?.collectionName === '_superusers' ? 'admin' : 'unknown');
  
  const handleLogout = () => {
    pb.authStore.clear();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email} (Role: {displayRole})!</p>
      <button 
        onClick={handleLogout}
        style={{ padding: '8px 16px', cursor: 'pointer' }}
      >
        Logout
      </button>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
