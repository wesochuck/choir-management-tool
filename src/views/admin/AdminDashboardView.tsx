import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const dashboardSections = [
  {
    title: "People & membership",
    dotColor: "var(--section-green)",
    links: [
      { to: '/admin/roster', icon: '👥', iconClass: 'ic-green', label: 'Manage Roster', desc: 'Add singers and track status' },
      { to: '/admin/auditions', icon: '🎵', iconClass: 'ic-sage', label: 'Auditions', desc: 'Review public audition requests' },
      { to: '/admin/communications', icon: '✉️', iconClass: 'ic-slate', label: 'Communications', desc: 'Send announcements and review history' },
      { to: '/admin/polls', icon: '📊', iconClass: 'ic-pink', label: 'Engagement Polls', desc: 'Review volunteer responses and counts' },
      { to: '/admin/donations', icon: '🎁', iconClass: 'ic-pink', label: 'Donations', desc: 'Track giving and manage donor levels' },
      { to: '/admin/patrons', icon: '💎', iconClass: 'ic-teal', label: 'Patrons Dashboard', desc: 'View donor/buyer LTV and message patrons' }
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
    <div className="flex flex-col min-h-screen bg-bg">
      <header className="bg-surface border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full max-w-[1200px] mx-auto px-6 py-2 flex flex-row items-center justify-between gap-6">
          <div className="flex flex-row items-center gap-6">
            <div className="flex flex-col">
              <h2 className="m-0 text-xl font-bold text-gray-800">Choir Admin</h2>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            <Link to="/profile" className="btn btn-ghost">My Profile</Link>
            <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="bg-gradient-to-r from-primary-deep to-primary text-surface py-8 w-full mb-6 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-wrap justify-between items-center gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-surface m-0 text-[clamp(2rem,4vw,2.5rem)] font-bold tracking-tight">{greeting}</h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link to="/admin/roster" className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-full px-6 h-11 backdrop-blur transition-all duration-200 hover:bg-white/15 hover:border-white/30 no-underline cursor-pointer">
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Active Singers</span>
              <span className="text-xl font-bold text-section-amber">
                {activeSingers !== null ? activeSingers : '...'}
              </span>
            </Link>
            <Link to="/admin/events" className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-full px-6 h-11 backdrop-blur transition-all duration-200 hover:bg-white/15 hover:border-white/30 no-underline cursor-pointer">
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Upcoming Events</span>
              <span className="text-xl font-bold text-section-amber">
                {upcomingEvents !== null ? upcomingEvents : '...'}
              </span>
            </Link>
            <Link to="/admin/auditions" className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-full px-6 h-11 backdrop-blur transition-all duration-200 hover:bg-white/15 hover:border-white/30 no-underline cursor-pointer">
              <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Pending Auditions</span>
              <span className="text-xl font-bold text-section-amber">
                {pendingAuditions !== null ? pendingAuditions : '...'}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="w-full max-w-[1200px] mx-auto px-6">
        {/* Quick Action Bar */}
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-1">Quick Actions</div>
        <section className="bg-surface border border-gray-200 rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/attendance" className="inline-flex items-center gap-2 bg-bg text-gray-800 border border-gray-200 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-200 cursor-pointer no-underline hover:bg-primary-light hover:text-primary-deep hover:border-primary hover:-translate-y-px active:translate-y-0">
              <span className="text-lg">✅</span> Take Attendance
            </Link>
            <Link to="/admin/communications" className="inline-flex items-center gap-2 bg-bg text-gray-800 border border-gray-200 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-200 cursor-pointer no-underline hover:bg-primary-light hover:text-primary-deep hover:border-primary hover:-translate-y-px active:translate-y-0">
              <span className="text-lg">✉️</span> Send Announcement
            </Link>
            <Link to="/admin/roster?add=true" className="inline-flex items-center gap-2 bg-bg text-gray-800 border border-gray-200 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-200 cursor-pointer no-underline hover:bg-primary-light hover:text-primary-deep hover:border-primary hover:-translate-y-px active:translate-y-0">
              <span className="text-lg">👥</span> Add Singer
            </Link>
            <Link to="/admin/events?add=true" className="inline-flex items-center gap-2 bg-bg text-gray-800 border border-gray-200 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-200 cursor-pointer no-underline hover:bg-primary-light hover:text-primary-deep hover:border-primary hover:-translate-y-px active:translate-y-0">
              <span className="text-lg">📅</span> New Event
            </Link>
            <Link to="/admin/library" className="inline-flex items-center gap-2 bg-bg text-gray-800 border border-gray-200 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-200 cursor-pointer no-underline hover:bg-primary-light hover:text-primary-deep hover:border-primary hover:-translate-y-px active:translate-y-0">
              <span className="text-lg">🎼</span> Add Music
            </Link>
          </div>
        </section>

        {/* Categorized Link Sections */}
        {dashboardSections.map((section) => (
          <section key={section.title}>
            <div className="flex items-center gap-2 mb-4 mt-8">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                // @allow-inline-style - dynamic dot color from section config
                style={{ backgroundColor: section.dotColor }}
              />
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 m-0">{section.title}</h2>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-8">
              {section.links.map((link) => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className="flex flex-col items-start no-underline bg-surface border border-gray-200 rounded-xl p-6 shadow-sm transition-all duration-200 relative min-h-[180px] cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary group"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 transition-transform duration-200 group-hover:scale-105 ${link.iconClass === 'ic-green' ? 'bg-[rgba(16,185,129,0.1)] text-section-green' : link.iconClass === 'ic-sage' ? 'bg-[rgba(74,124,89,0.1)] text-primary' : link.iconClass === 'ic-slate' ? 'bg-[rgba(100,116,139,0.1)] text-section-slate' : link.iconClass === 'ic-pink' ? 'bg-[rgba(236,72,153,0.1)] text-section-pink' : link.iconClass === 'ic-amber' ? 'bg-[rgba(245,158,11,0.1)] text-section-amber' : link.iconClass === 'ic-teal' ? 'bg-[rgba(6,182,212,0.1)] text-section-cyan' : ''}`}>
                    {link.icon}
                  </div>
                  <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">{link.label}</h3>
                  <p className="m-0 text-sm text-gray-500 leading-relaxed flex-1 mb-4">{link.desc}</p>
                  <span className="self-end text-xl text-gray-500 transition-all duration-200 mt-auto leading-none group-hover:translate-x-1 group-hover:text-primary">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
