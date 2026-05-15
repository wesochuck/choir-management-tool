import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';

export default function AdminDashboardView() {
  const { user } = useAuth();
  const handleLogout = () => pb.authStore.clear();

  return (
    <div style={{ padding: '20px' }}>
      <nav style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 'bold' }}>Dashboard</Link>
        <Link to="/admin/roster">Manage Roster</Link>
        <Link to="/admin/events">Manage Events</Link>
        <Link to="/admin/venues">Manage Venues</Link>
        <button 
          onClick={handleLogout}
          style={{ marginLeft: 'auto', padding: '6px 12px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </nav>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.email}!</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginTop: '24px' 
      }}>
        <Link to="/admin/roster" style={{ 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          textDecoration: 'none',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
          <strong>Manage Roster</strong>
        </Link>
        
        <Link to="/admin/events" style={{ 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          textDecoration: 'none',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          <strong>Manage Events</strong>
        </Link>

        <Link to="/admin/seating" style={{ 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          textDecoration: 'none',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🪑</div>
          <strong>Seating Charts</strong>
        </Link>

        <Link to="/admin/venues" style={{ 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          textDecoration: 'none',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️</div>
          <strong>Manage Venues</strong>
        </Link>

        <Link to="/admin/attendance" style={{ 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          textDecoration: 'none',
          color: '#2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <strong>Take Attendance</strong>
        </Link>
      </div>
    </div>
  );
}
