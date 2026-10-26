import { useMemo, useState, type FormEvent } from 'react'
import { incidents, waterPoints, type Incident, type Page } from './data'
import './App.css'

const pages: { id: Page; label: string; icon: 'grid' | 'alert' | 'drop' }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'reports', label: 'Outage reports', icon: 'alert' },
  { id: 'water-points', label: 'Water points', icon: 'drop' },
]

const pageTitles: Record<Page, string> = {
  dashboard: 'Community overview',
  reports: 'Outage reports',
  'water-points': 'Water points',
  details: 'Incident details',
}

function Icon({
  name,
  size = 18,
}: {
  name: 'grid' | 'alert' | 'drop' | 'plus' | 'search' | 'chevron' | 'close' | 'menu' | 'arrow' | 'clock' | 'pin' | 'check'
  size?: number
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    alert: <><path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    drop: <path d="M12 2.8S5.5 10 5.5 14.7a6.5 6.5 0 0 0 13 0C18.5 10 12 2.8 12 2.8Z" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function StatusBadge({ status }: { status: Incident['status'] }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
}

function SampleLabel() {
  return <span className="sample-label">Sample data · not verified</span>
}

function IncidentRow({
  incident,
  onSelect,
}: {
  incident: Incident
  onSelect: (incident: Incident) => void
}) {
  return (
    <button className="incident-row" onClick={() => onSelect(incident)} type="button">
      <span className={`severity-mark severity-${incident.severity.toLowerCase()}`} aria-hidden="true" />
      <span className="incident-main">
        <span className="incident-title">{incident.title}</span>
        <span className="incident-meta"><Icon name="pin" size={14} />{incident.area}<span className="meta-dot">·</span>{incident.reported}</span>
      </span>
      <span className="incident-row-end">
        <StatusBadge status={incident.status} />
        <Icon name="chevron" size={17} />
      </span>
    </button>
  )
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncident, setSelectedIncident] = useState<Incident>(incidents[0])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [pointFilter, setPointFilter] = useState('All sources')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

  const filteredIncidents = useMemo(() => incidents.filter((incident) => {
    const searchText = `${incident.title} ${incident.area} ${incident.description}`.toLowerCase()
    return searchText.includes(query.toLowerCase()) && (statusFilter === 'All statuses' || incident.status === statusFilter)
  }), [query, statusFilter])

  const filteredPoints = useMemo(() => waterPoints.filter((point) => {
    const searchText = `${point.name} ${point.area} ${point.sourceType}`.toLowerCase()
    return searchText.includes(query.toLowerCase()) && (pointFilter === 'All sources' || point.sourceType === pointFilter)
  }), [query, pointFilter])

  function navigate(nextPage: Page) {
    setPage(nextPage)
    setMenuOpen(false)
    setQuery('')
    setStatusFilter('All statuses')
  }

  function selectIncident(incident: Incident) {
    setSelectedIncident(incident)
    setPage('details')
    setMenuOpen(false)
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReportSubmitted(true)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <a className="brand" href="#dashboard" onClick={(event) => { event.preventDefault(); navigate('dashboard') }}>
          <span className="brand-mark"><Icon name="drop" size={21} /></span>
          <span><strong>AquaTrace</strong><small>Track the problem. Find the next step.</small></span>
        </a>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="side-nav">
          {pages.map((item) => (
            <button
              className={`nav-link ${page === item.id || (page === 'details' && item.id === 'reports') ? 'nav-link-active' : ''}`}
              key={item.id}
              onClick={() => navigate(item.id)}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'reports' && <span className="nav-count">{incidents.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="community-card">
            <span className="community-icon"><Icon name="pin" size={17} /></span>
            <div><strong>Community first</strong><p>Local information, made clearer.</p></div>
          </div>
          <div className="sidebar-footnote"><span className="footnote-dot" /> Demonstration view</div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <div className="mobile-brand"><span className="brand-mark"><Icon name="drop" size={18} /></span><strong>AquaTrace</strong></div>
          <div className="topbar-context"><span>South Africa</span><span className="context-separator">/</span><span>Community dashboard</span></div>
          <button className="button button-primary top-report-button" type="button" onClick={() => { setReportOpen(true); setReportSubmitted(false) }}>
            <Icon name="plus" size={17} /><span>Report an outage</span>
          </button>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">AQUATRACE <span> / </span> COMMUNITY</div>
              <h1>{pageTitles[page]}</h1>
              <p>{page === 'dashboard' ? 'A clearer view of water interruptions and nearby alternatives.' : page === 'reports' ? 'Browse reported interruptions and follow their latest status.' : page === 'water-points' ? 'Explore alternative water sources in your area.' : 'Follow the timeline and details of this report.'}</p>
            </div>
            {page === 'details' && <button className="button button-secondary back-button" type="button" onClick={() => navigate('reports')}>← All reports</button>}
          </div>

          {page === 'dashboard' && (
            <>
              <div className="notice-banner">
                <span className="notice-icon"><Icon name="alert" size={17} /></span>
                <p><strong>Demonstration data.</strong> Reports and water-point listings shown here are examples, not verified live information.</p>
                <SampleLabel />
              </div>

              <section className="metric-grid" aria-label="Community overview metrics">
                <article className="metric-card"><span className="metric-label">Open reports</span><strong>{incidents.filter((item) => item.status !== 'Resolved').length}</strong><span className="metric-note"><span className="metric-bullet blue" />Across sample locations</span><span className="metric-icon"><Icon name="alert" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">Areas affected</span><strong>{new Set(incidents.filter((item) => item.status !== 'Resolved').map((item) => item.area)).size}</strong><span className="metric-note"><span className="metric-bullet amber" />In sample reports</span><span className="metric-icon"><Icon name="pin" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">Water points listed</span><strong>{waterPoints.length}</strong><span className="metric-note"><span className="metric-bullet green" />All require verification</span><span className="metric-icon"><Icon name="drop" size={19} /></span></article>
              </section>

              <div className="dashboard-grid">
                <section className="panel recent-panel">
                  <div className="panel-heading"><div><h2>Recent reports</h2><p>Latest sample community reports</p></div><button className="text-button" type="button" onClick={() => navigate('reports')}>View all <Icon name="arrow" size={15} /></button></div>
                  <div className="incident-list">{incidents.slice(0, 3).map((incident) => <IncidentRow key={incident.id} incident={incident} onSelect={selectIncident} />)}</div>
                  <div className="panel-footer"><SampleLabel /></div>
                </section>
                <section className="panel status-panel">
                  <div className="panel-heading"><div><h2>Report status</h2><p>Breakdown of sample reports</p></div><span className="panel-icon"><Icon name="grid" size={17} /></span></div>
                  <div className="status-breakdown">
                    {(['Investigating', 'Monitoring', 'Resolved'] as const).map((status) => {
                      const count = incidents.filter((incident) => incident.status === status).length
                      return <div className="status-line" key={status}><span className={`status-dot dot-${status.toLowerCase()}`} /><span>{status}</span><span className="status-line-track"><span className={`status-line-fill fill-${status.toLowerCase()}`} style={{ width: `${(count / incidents.length) * 100}%` }} /></span><strong>{count}</strong></div>
                    })}
                  </div>
                  <div className="status-disclaimer"><Icon name="check" size={15} /><span>Statuses are illustrative only</span></div>
                </section>
              </div>
              <section className="next-step-banner"><div className="next-step-icon"><Icon name="drop" size={20} /></div><div><h2>Looking for another water source?</h2><p>Browse the sample directory of alternative water points.</p></div><button className="button button-secondary" type="button" onClick={() => navigate('water-points')}>Explore water points <Icon name="arrow" size={16} /></button></section>
            </>
          )}

          {page === 'reports' && (
            <section className="panel listing-panel">
              <div className="listing-heading"><div><h2>All outage reports</h2><p>{filteredIncidents.length} sample {filteredIncidents.length === 1 ? 'report' : 'reports'} · sorted by most recent</p></div><SampleLabel /></div>
              <div className="filters-row">
                <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search reports by area or keyword</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area or keyword" /></label>
                <label className="filter-label"><span className="sr-only">Filter reports by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Investigating</option><option>Monitoring</option><option>Resolved</option></select></label>
              </div>
              {filteredIncidents.length ? <div className="incident-list listing-rows">{filteredIncidents.map((incident) => <IncidentRow key={incident.id} incident={incident} onSelect={selectIncident} />)}</div> : <div className="empty-state"><Icon name="search" size={22} /><strong>No reports match your search</strong><span>Try another area, keyword, or status.</span></div>}
            </section>
          )}

          {page === 'water-points' && (
            <section className="panel listing-panel">
              <div className="listing-heading"><div><h2>Alternative water points</h2><p>Sample directory · availability must be confirmed locally</p></div><SampleLabel /></div>
              <div className="filters-row">
                <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search water points by name or area</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or area" /></label>
                <label className="filter-label"><span className="sr-only">Filter by source type</span><select value={pointFilter} onChange={(event) => setPointFilter(event.target.value)}><option>All sources</option><option>Community tap</option><option>Borehole</option><option>Water tanker</option></select></label>
              </div>
              {filteredPoints.length ? <div className="water-point-grid">{filteredPoints.map((point) => <article className="water-point-card" key={point.id}><div className="point-card-top"><span className="point-icon"><Icon name="drop" size={19} /></span><span className="availability"><span className={`availability-dot availability-${point.availability.toLowerCase()}`} />{point.availability}</span></div><h3>{point.name}</h3><p className="point-area"><Icon name="pin" size={14} />{point.area}</p><div className="point-details"><span>{point.sourceType}</span><span>Last verified: {point.lastVerified}</span></div><div className="point-trust"><SampleLabel /></div></article>)}</div> : <div className="empty-state"><Icon name="search" size={22} /><strong>No water points match your search</strong><span>Try another area or source type.</span></div>}
            </section>
          )}

          {page === 'details' && (
            <div className="detail-layout">
              <section className="panel detail-panel">
                <div className="detail-topline"><span className={`severity-tag severity-tag-${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity} severity</span><StatusBadge status={selectedIncident.status} /></div>
                <h2 className="detail-title">{selectedIncident.title}</h2>
                <div className="detail-meta"><span><Icon name="pin" size={16} />{selectedIncident.area}</span><span><Icon name="clock" size={16} />Reported {selectedIncident.reported}</span></div>
                <div className="detail-sample"><SampleLabel /></div>
                <div className="detail-section"><h3>About this report</h3><p>{selectedIncident.description}</p></div>
                <div className="detail-section"><h3>What this status means</h3><p>{selectedIncident.statusDescription}</p></div>
                <div className="detail-disclaimer"><Icon name="alert" size={16} /><span>This is a fictional sample report for demonstration. It does not describe a confirmed outage.</span></div>
              </section>
              <section className="panel timeline-panel">
                <div className="panel-heading"><div><h2>Update history</h2><p>Sample report timeline</p></div><Icon name="clock" size={18} /></div>
                <ol className="timeline">{selectedIncident.updates.map((update, index) => <li className="timeline-entry" key={`${update.time}-${index}`}><span className={`timeline-marker ${index === 0 ? 'timeline-marker-current' : ''}`} /><div><span className="timeline-time">{update.time}</span><strong>{update.title}</strong><p>{update.description}</p></div></li>)}</ol>
              </section>
            </div>
          )}
          <footer className="page-footer"><span>AquaTrace <span className="footer-dot">·</span> A community information concept</span><span>Sample information only — not municipal or live data.</span></footer>
        </main>
      </div>

      {menuOpen && <button type="button" aria-label="Close navigation menu" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}

      {reportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false) }}>
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
            <div className="modal-heading"><div><span className="eyebrow">COMMUNITY REPORT</span><h2 id="report-modal-title">{reportSubmitted ? 'Thanks for your input' : 'Report a water outage'}</h2></div><button type="button" className="icon-button" aria-label="Close report form" onClick={() => setReportOpen(false)}><Icon name="close" /></button></div>
            {reportSubmitted ? <div className="submission-message"><span className="submission-icon"><Icon name="check" size={21} /></span><p>This is a demonstration form. Your entry has not been sent or saved.</p><button className="button button-primary" type="button" onClick={() => setReportOpen(false)}>Done</button></div> : <><p className="modal-intro">Share what you have noticed. This prototype does not send or store reports.</p><form onSubmit={submitReport}><label className="form-label">Area<input required placeholder="e.g. Mamelodi, Tshwane" /></label><label className="form-label">What is happening?<select defaultValue=""><option value="" disabled>Select an option</option><option>Water outage</option><option>Low water pressure</option><option>Water quality concern</option></select></label><label className="form-label">Details<textarea required rows={3} placeholder="Add any helpful details…" /></label><p className="form-note"><Icon name="alert" size={15} />Please do not include personal or sensitive information.</p><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setReportOpen(false)}>Cancel</button><button className="button button-primary" type="submit">Continue <Icon name="arrow" size={16} /></button></div></form></>}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
