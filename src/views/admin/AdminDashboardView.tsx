import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './AdminDashboardView.css';
import './Dashboards.css';

const dashboardSections = [
  {
    title: "People & membership",
    dotColor: "var(--section-green)",
    links: [
      { to: '/admin/roster', icon: '👥', iconClass: 'ic-green', label: 'Manage Roster', desc: 'Add singers and track status' },
      { to: '/admin/auditions', icon: '🎵', iconClass: 'ic-sage', label: 'Auditions', desc: 'Review public audition requests' },
      { to: '/admin/communications', icon: '✉️', iconClass: 'ic-slate', label: 'Communications', desc: 'Send announcements and review history' },
      { to: '/admin/polls', icon: '📊', iconClass: 'ic-pink', label: 'Engagement Polls', desc: 'Review volunteer responses and counts' },
      { to: '/admin/donations', icon: '🎁', iconClass: 'ic-pink', label: 'Donations', desc: 'Track giving and manage donor levels' }
    ]
  },
  {
    title: "Events & attendance",
    dotColor: "var(--section-amber)",
    links: [
      { to: '/admin/events', icon: '📅', iconClass: 'ic-amber', label: 'Manage Events', desc: 'Schedule performances and rehearsals' },
      { to: '/admin/tickets', icon: '🎟️', iconClass: 'ic-amber', label: 'Ticket Sales', desc: 'Track sales and process refunds' },
      { to: '/admin/rsvp', icon: '🗓️', iconClass: 'ic-amber', label: 'Event RSVPs', desc: 'Track responses and roster balances' },
      { to: '/admin/attendance', icon: '✅', iconClass: 'ic-green', label: 'Take Attendance', desc: 'Track check-ins for events' },
      { to: '/admin/venues', icon: '🏛️', iconClass: 'ic-slate', label: 'Manage Venues', desc: 'Configure venue capacities' },
      { to: '/admin/seating', icon: '🪑', iconClass: 'ic-sage', label: 'Seating Charts', desc: 'Design layouts and assign seats' }
    ]
  },
  {
    title: "Music & performance",
    dotColor: "var(--section-teal)",
    links: [
      { to: '/admin/library', icon: '🎼', iconClass: 'ic-teal', label: 'Music Library', desc: 'Catalog, repertoire, and CSV import' },
      { to: '/admin/setlists', icon: '📋', iconClass: 'ic-teal', label: 'Set Lists', desc: 'Build and reorder event music' },
      { to: '/admin/resources', icon: '📂', iconClass: 'ic-teal', label: 'Singer Resources', desc: 'Upload documents and links for singers' }
    ]
  },
  {
    title: "Admin",
    dotColor: "var(--section-slate)",
    links: [
      { to: '/admin/reports', icon: '📈', iconClass: 'ic-slate', label: 'Reports & Insights', desc: 'Attendance trends and concert summaries' },
      { to: '/admin/settings', icon: '⚙️', iconClass: 'ic-slate', label: 'System Settings', desc: 'Configure global preferences' }
    ]
  }
];

export default function AdminDashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Choir Admin");

  const [activeSingers, setActiveSingers] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<number | null>(null);
  const [pendingAuditions, setPendingAuditions] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch active singers count (globalStatus = "Active" AND voicePart != "")
    pb.collection('profiles').getList(1, 1, {
      filter: pb.filter('globalStatus = {:status} && voicePart != ""', { status: 'Active' })
    })
    .then(res => setActiveSingers(res.totalItems))
    .catch(err => console.error('Failed to fetch active singers count:', err));

    // 2. Fetch upcoming events count (date >= today in ISO representation)
    const todayStr = new Date().toISOString();
    pb.collection('events').getList(1, 1, {
      filter: pb.filter('date >= {:todayStr}', { todayStr })
    })
    .then(res => setUpcomingEvents(res.totalItems))
    .catch(err => console.error('Failed to fetch upcoming events count:', err));

    // 3. Fetch pending auditions count (status != Closed)
    pb.collection('auditions').getList(1, 1, {
      filter: pb.filter('status != {:status}', { status: 'Closed' })
    })
    .then(res => setPendingAuditions(res.totalItems))
    .catch(err => console.error('Failed to fetch pending auditions count:', err));
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Admin';
  const greeting = `${getGreeting()}, ${userName}`;

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-header-container">
          <div className="admin-dashboard-brand">
            <div className="admin-dashboard-titles">
              <h2 className="admin-dashboard-title">Choir Admin</h2>
            </div>
          </div>
          <div className="admin-dashboard-actions">
            <Link to="/profile" className="btn btn-ghost">My Profile</Link>
            <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-container">
          <div className="admin-dashboard-hero-welcome">
            <h1>{greeting}</h1>
          </div>

          <div className="admin-dashboard-stats-row">
            <Link to="/admin/roster" className="admin-dashboard-stat-pill">
              <span className="admin-dashboard-stat-label">Active Singers</span>
              <span className="admin-dashboard-stat-value">
                {activeSingers !== null ? activeSingers : '...'}
              </span>
            </Link>
            <Link to="/admin/events" className="admin-dashboard-stat-pill">
              <span className="admin-dashboard-stat-label">Upcoming Events</span>
              <span className="admin-dashboard-stat-value">
                {upcomingEvents !== null ? upcomingEvents : '...'}
              </span>
            </Link>
            <Link to="/admin/auditions" className="admin-dashboard-stat-pill">
              <span className="admin-dashboard-stat-label">Pending Auditions</span>
              <span className="admin-dashboard-stat-value">
                {pendingAuditions !== null ? pendingAuditions : '...'}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container">
        {/* Quick Action Bar */}
        <div className="admin-dashboard-quick-actions-title-outside">Quick Actions</div>
        <section className="admin-dashboard-quick-actions">
          <div className="admin-dashboard-quick-actions-row">
            <Link to="/admin/attendance" className="admin-dashboard-quick-btn">
              <span className="admin-dashboard-quick-icon">✅</span> Take Attendance
            </Link>
            <Link to="/admin/communications" className="admin-dashboard-quick-btn">
              <span className="admin-dashboard-quick-icon">✉️</span> Send Announcement
            </Link>
            <Link to="/admin/roster?add=true" className="admin-dashboard-quick-btn">
              <span className="admin-dashboard-quick-icon">👥</span> Add Singer
            </Link>
            <Link to="/admin/events?add=true" className="admin-dashboard-quick-btn">
              <span className="admin-dashboard-quick-icon">📅</span> New Event
            </Link>
            <Link to="/admin/library" className="admin-dashboard-quick-btn">
              <span className="admin-dashboard-quick-icon">🎼</span> Add Music
            </Link>
          </div>
        </section>

        {/* Categorized Link Sections */}
        {dashboardSections.map((section) => (
          <section key={section.title}>
            <div className="admin-dashboard-section-header">
              <div 
                className="admin-dashboard-section-dot" 
                // @allow-inline-style - dynamic dot color from section config
                style={{ backgroundColor: section.dotColor }}
              />
              <h2 className="admin-dashboard-section-title">{section.title}</h2>
            </div>

            <div className="admin-dashboard-grid">
              {section.links.map((link) => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className="admin-dashboard-card"
                >
                  <div className={`admin-dashboard-card-icon-block ${link.iconClass}`}>
                    {link.icon}
                  </div>
                  <h3>{link.label}</h3>
                  <p>{link.desc}</p>
                  <span className="admin-dashboard-card-arrow">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
