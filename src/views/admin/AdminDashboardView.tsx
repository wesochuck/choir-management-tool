import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';
import { PageLayout } from '../../components/common/PageLayout';

export default function AdminDashboardView() {
  const { user } = useAuth();
  const handleLogout = () => pb.authStore.clear();

  return (
    <PageLayout 
      title="Choir Admin" 
      subtitle={`Welcome back, ${user?.email}`}
      actions={<button onClick={handleLogout} className="btn btn-ghost">Logout</button>}
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 'var(--space-lg)',
        padding: 'var(--space-xl) 0'
      }}>
        {[
          { to: '/admin/roster', icon: '👥', label: 'Manage Roster', desc: 'Add singers and track status' },
          { to: '/admin/events', icon: '📅', label: 'Manage Events', desc: 'Schedule performances and rehearsals' },
          { to: '/admin/library', icon: '🎼', label: 'Music Library', desc: 'Catalog, repertoire, and CSV import' },
          { to: '/admin/setlists', icon: '📋', label: 'Set Lists', desc: 'Build and reorder event music' },
          { to: '/admin/seating', icon: '🪑', label: 'Seating Charts', desc: 'Design layouts and assign seats' },
          { to: '/admin/venues', icon: '🏛️', label: 'Manage Venues', desc: 'Configure venue capacities' },
          { to: '/admin/attendance', icon: '📊', label: 'Take Attendance', desc: 'Track check-ins for events' },
          { to: '/admin/reports', icon: '📈', label: 'Reports & Insights', desc: 'Attendance trends and concert summaries' },
          { to: '/admin/auditions', icon: '🎵', label: 'Auditions', desc: 'Review public audition requests' },
          { to: '/admin/communications', icon: '✉️', label: 'Communications', desc: 'Send announcements and review history' },
          { to: '/admin/settings', icon: '⚙️', label: 'Settings', desc: 'System-wide preferences and defaults' }
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card flex-col" style={{ textDecoration: 'none', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>{item.icon}</div>
            <h3 style={{ margin: 0 }}>{item.label}</h3>
            <p className="text-muted" style={{ margin: 0 }}>{item.desc}</p>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
