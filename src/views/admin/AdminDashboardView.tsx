import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pb } from '../../lib/pocketbase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui';

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
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-row items-center justify-between gap-6 px-6 py-2">
          <div className="flex flex-row items-center gap-6">
            <div className="flex flex-col">
              <h2 className="m-0 text-xl font-bold text-gray-800">Choir Admin</h2>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            <Button as={Link} to="/profile" variant="outline">My Profile</Button>
            <Button onClick={handleLogout} variant="outline">Logout</Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="mb-6 w-full bg-gradient-to-r from-primary-deep to-primary py-8 text-surface shadow-sm">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[clamp(2rem,4vw,2.5rem)] font-bold tracking-tight text-surface">{greeting}</h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link to="/admin/roster" className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15">
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">Active Singers</span>
              <span className="text-xl font-bold text-section-amber">
                {activeSingers !== null ? activeSingers : '...'}
              </span>
            </Link>
            <Link to="/admin/events" className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15">
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">Upcoming Events</span>
              <span className="text-xl font-bold text-section-amber">
                {upcomingEvents !== null ? upcomingEvents : '...'}
              </span>
            </Link>
            <Link to="/admin/auditions" className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15">
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">Pending Auditions</span>
              <span className="text-xl font-bold text-section-amber">
                {pendingAuditions !== null ? pendingAuditions : '...'}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1200px] px-6">
        {/* Quick Action Bar */}
        <div className="mt-1 mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">Quick Actions</div>
        <section className="mb-8 rounded-xl border border-gray-200 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/attendance" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-bg px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary-light hover:text-primary-deep active:translate-y-0">
              <span className="text-lg">✅</span> Take Attendance
            </Link>
            <Link to="/admin/communications" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-bg px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary-light hover:text-primary-deep active:translate-y-0">
              <span className="text-lg">✉️</span> Send Announcement
            </Link>
            <Link to="/admin/roster?add=true" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-bg px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary-light hover:text-primary-deep active:translate-y-0">
              <span className="text-lg">👥</span> Add Singer
            </Link>
            <Link to="/admin/events?add=true" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-bg px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary-light hover:text-primary-deep active:translate-y-0">
              <span className="text-lg">📅</span> New Event
            </Link>
            <Link to="/admin/library" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-bg px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px hover:border-primary hover:bg-primary-light hover:text-primary-deep active:translate-y-0">
              <span className="text-lg">🎼</span> Add Music
            </Link>
          </div>
        </section>

        {/* Categorized Link Sections */}
        {dashboardSections.map((section) => (
          <section key={section.title}>
            <div className="mt-8 mb-4 flex items-center gap-2">
              <div 
                className="size-2.5 flex-shrink-0 rounded-full" 
                // @allow-inline-style - dynamic dot color from section config
                style={{ backgroundColor: section.dotColor }}
              />
              <h2 className="m-0 text-sm font-bold tracking-widest text-gray-500 uppercase">{section.title}</h2>
            </div>

            <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {section.links.map((link) => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className="group relative flex min-h-[180px] cursor-pointer flex-col items-start rounded-xl border border-gray-200 bg-surface p-6 no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <div className={`mb-4 flex size-12 items-center justify-center rounded-lg text-2xl transition-transform duration-200 group-hover:scale-105 ${link.iconClass === 'ic-green' ? 'bg-[rgba(16,185,129,0.1)] text-section-green' : link.iconClass === 'ic-sage' ? 'bg-[rgba(74,124,89,0.1)] text-primary' : link.iconClass === 'ic-slate' ? 'bg-[rgba(100,116,139,0.1)] text-section-slate' : link.iconClass === 'ic-pink' ? 'bg-[rgba(236,72,153,0.1)] text-section-pink' : link.iconClass === 'ic-amber' ? 'bg-[rgba(245,158,11,0.1)] text-section-amber' : link.iconClass === 'ic-teal' ? 'bg-[rgba(6,182,212,0.1)] text-section-cyan' : ''}`}>
                    {link.icon}
                  </div>
                  <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">{link.label}</h3>
                  <p className="m-0 mb-4 flex-1 text-sm leading-relaxed text-gray-500">{link.desc}</p>
                  <span className="mt-auto self-end text-xl leading-none text-gray-500 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
