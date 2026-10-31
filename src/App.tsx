import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  loadUserIncidents,
  saveUserIncidents,
  waterPoints,
  type Incident,
  type IncidentCategory,
  type IncidentStatus,
  type Page,
} from './data'
import {
  historicalIncidents,
  type HistoricalIncident,
  type HistoricalIncidentCategory,
} from './data/historicalIncidents'
import { useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import {
  canAccessPage,
  canReviewIncidents,
  roleLabels,
  type SessionUser,
} from './auth/demoAccounts'
import './App.css'

const pages: { id: Page; label: string; icon: 'grid' | 'alert' | 'drop' | 'check' }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'reports', label: 'Outage reports', icon: 'alert' },
  { id: 'review', label: 'Review reports', icon: 'check' },
  { id: 'insights', label: 'Insights', icon: 'grid' },
  { id: 'water-points', label: 'Water points', icon: 'drop' },
]

const pageTitles: Record<Page, string> = {
  dashboard: 'Community overview',
  reports: 'Outage reports',
  review: 'Review reports',
  insights: 'Outage insights',
  'water-points': 'Water points',
  details: 'Incident details',
}

const reportStatuses: IncidentStatus[] = ['Unverified', 'Under review', 'Confirmed', 'Resolved', 'Rejected']
const reportCategories: IncidentCategory[] = ['Water outage', 'Low water pressure', 'Water quality concern', 'Other']
const historicalCategoryLabels: Record<HistoricalIncidentCategory, string> = {
  pipe_burst: 'Pipe burst',
  planned_maintenance: 'Planned maintenance',
  bulk_supply_interruption: 'Bulk-supply interruption',
  supply_restriction: 'Supply restriction',
  low_reservoir_levels: 'Low reservoir levels',
  contamination_concern: 'Contamination concern',
  unknown: 'Unknown',
}

function isHistoricalIncident(incident: Incident | HistoricalIncident): incident is HistoricalIncident {
  return 'sourceUrl' in incident
}

function historicalDateRange(incident: HistoricalIncident): string {
  if (incident.incidentDateRange) {
    const { start, end } = incident.incidentDateRange
    return start === end ? start : `${start} to ${end}`
  }
  return incident.incidentDate ?? 'Not specified by source'
}

function evidenceLabel(incident: HistoricalIncident): string {
  if (incident.evidenceClassification === 'official_statement') return 'Official statement'
  if (incident.evidenceClassification === 'news_report') return 'News report'
  return 'Unverified claim'
}

function Icon({
  name,
  size = 18,
}: {
  name: 'grid' | 'alert' | 'drop' | 'plus' | 'search' | 'chevron' | 'close' | 'menu' | 'arrow' | 'clock' | 'pin' | 'check' | 'logout'
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
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
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
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

function ReportOriginLabel() {
  return <span className="report-origin report-origin-user">Community report</span>
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
        <span className="incident-meta"><Icon name="pin" size={14} />{incident.area}<span className="meta-dot">·</span>{incident.category}<span className="meta-dot">·</span>{incident.reported}<ReportOriginLabel /></span>
      </span>
      <span className="incident-row-end">
        <StatusBadge status={incident.status} />
        <Icon name="chevron" size={17} />
      </span>
    </button>
  )
}

interface InsightCount {
  label: string
  total: number
  user: number
  historical: number
}

function InsightBreakdown({ title, description, entries }: { title: string; description: string; entries: InsightCount[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.total))
  return (
    <section className="panel insight-panel">
      <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>
      {entries.length ? (
        <ul className="insight-list">
          {entries.map((entry) => (
            <li className="insight-row" key={entry.label}>
              <div className="insight-row-label"><strong>{entry.label}</strong><span>{entry.total} {entry.total === 1 ? 'report' : 'reports'}</span></div>
              <div className="insight-bar" aria-hidden="true"><span style={{ width: `${(entry.total / max) * 100}%` }} /></div>
              <div className="insight-origin-counts"><span>Community reports: <strong>{entry.user}</strong></span><span>Historical sources: <strong>{entry.historical}</strong></span></div>
            </li>
          ))}
        </ul>
      ) : <p className="insight-empty">No report data is available for this breakdown.</p>}
    </section>
  )
}

function HistoricalIncidentRow({
  incident,
  onSelect,
}: {
  incident: HistoricalIncident
  onSelect: (incident: HistoricalIncident) => void
}) {
  const place = incident.affectedAreas.length ? incident.affectedAreas.join(', ') : 'Area not specified'
  return (
    <button className="incident-row historical-incident-row" onClick={() => onSelect(incident)} type="button">
      <span className="severity-mark historical-mark" aria-hidden="true" />
      <span className="incident-main">
        <span className="incident-title">{incident.summary}</span>
        <span className="incident-meta"><Icon name="pin" size={14} />{place}<span className="meta-dot">·</span>{historicalCategoryLabels[incident.category]}<span className="meta-dot">·</span>{historicalDateRange(incident)}<span className="report-origin report-origin-historical">Historical · sourced</span></span>
      </span>
      <span className="incident-row-end"><span className="evidence-badge">{evidenceLabel(incident)}</span><Icon name="chevron" size={17} /></span>
    </button>
  )
}

function Workspace({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const reportTriggerRef = useRef<HTMLButtonElement>(null)
  const reportDialogRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncident, setSelectedIncident] = useState<Incident | HistoricalIncident>(historicalIncidents[0])
  const [storedData, setStoredData] = useState(loadUserIncidents)
  const [storageNotice, setStorageNotice] = useState(storedData.warning)
  const [storageCanPersist, setStorageCanPersist] = useState(storedData.canPersist)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'All statuses'>('All statuses')
  const [categoryFilter, setCategoryFilter] = useState<string>('All categories')
  const [pointFilter, setPointFilter] = useState('All sources')
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportFormError, setReportFormError] = useState('')
  const [reportFeedback, setReportFeedback] = useState('')
  const [observedAtDefault, setObservedAtDefault] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({})
  const canReview = canReviewIncidents(user.role)
  const initials = user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  const allIncidents = storedData.incidents
  const allRecordCount = allIncidents.length + historicalIncidents.length
  const insights = useMemo(() => {
    const summarize = (entries: { label: string; origin: 'user' | 'historical' }[]) => {
      const summary = new Map<string, InsightCount>()
      for (const entry of entries) {
        const key = entry.label.trim().toLocaleLowerCase()
        const counts = summary.get(key) ?? { label: entry.label.trim(), total: 0, user: 0, historical: 0 }
        counts.total += 1
        counts[entry.origin] += 1
        summary.set(key, counts)
      }
      return [...summary.values()].sort((left, right) => right.total - left.total || left.label.localeCompare(right.label))
    }

    const locations = [
      ...allIncidents.map((incident) => ({ label: incident.area, origin: 'user' as const })),
      ...historicalIncidents.map((incident) => ({
        label: incident.affectedAreas.length === 1
          ? incident.affectedAreas[0]
          : `Multiple affected areas (${incident.city ?? incident.municipality ?? 'location not specified'})`,
        origin: 'historical' as const,
      })),
    ]
    const categories = [
      ...allIncidents.map((incident) => ({ label: incident.category, origin: 'user' as const })),
      ...historicalIncidents.map((incident) => ({ label: historicalCategoryLabels[incident.category], origin: 'historical' as const })),
    ]
    const byMonth = new Map<string, number>()
    for (const incident of storedData.incidents) {
      const month = incident.observedAt.slice(0, 7)
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
    }
    const userLocationMap = new Map<string, InsightCount>()
    for (const incident of storedData.incidents) {
      const key = incident.area.trim().toLocaleLowerCase()
      const counts = userLocationMap.get(key) ?? { label: incident.area.trim(), total: 0, user: 0, historical: 0 }
      counts.total += 1
      counts.user += 1
      userLocationMap.set(key, counts)
    }
    return {
      byArea: summarize(locations),
      byCategory: summarize(categories),
      byStatus: summarize(allIncidents.map((incident) => ({ label: incident.status, origin: 'user' as const }))),
      repeatedUserLocations: [...userLocationMap.values()]
        .filter((entry) => entry.user > 1)
        .sort((left, right) => right.user - left.user || left.label.localeCompare(right.label)),
      byMonth: [...byMonth.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-6),
      reviewedCommunityReports: allIncidents.filter((incident) => incident.status !== 'Unverified').length,
      unverifiedCommunityReports: allIncidents.filter((incident) => incident.status === 'Unverified').length,
      unverifiedHistoricalClaims: historicalIncidents.filter((incident) => incident.evidenceClassification === 'unverified_claim').length,
    }
  }, [allIncidents, storedData.incidents])

  useEffect(() => {
    if (!reportOpen) return
    reportDialogRef.current?.focus()
    const reportTrigger = reportTriggerRef.current
    return () => reportTrigger?.focus()
  }, [reportOpen])

  const filteredIncidents = useMemo(() => allIncidents.filter((incident) => {
    const searchText = `${incident.title} ${incident.area} ${incident.description} ${incident.category}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
      && (statusFilter === 'All statuses' || incident.status === statusFilter)
      && (categoryFilter === 'All categories' || incident.category === categoryFilter)
  }), [allIncidents, query, statusFilter, categoryFilter])

  const filteredHistoricalIncidents = useMemo(() => historicalIncidents.filter((incident) => {
    const searchText = `${incident.summary} ${incident.sourceTitle} ${incident.municipality ?? ''} ${incident.city ?? ''} ${incident.affectedAreas.join(' ')} ${historicalCategoryLabels[incident.category]}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
      && (categoryFilter === 'All categories' || historicalCategoryLabels[incident.category] === categoryFilter)
  }), [query, categoryFilter])

  const filteredPoints = useMemo(() => waterPoints.filter((point) => {
    const searchText = `${point.name} ${point.area} ${point.sourceType}`.toLowerCase()
    return searchText.includes(query.toLowerCase()) && (pointFilter === 'All sources' || point.sourceType === pointFilter)
  }), [query, pointFilter])

  function navigate(nextPage: Page) {
    if (!canAccessPage(user.role, nextPage)) {
      setPage('dashboard')
      setMenuOpen(false)
      return
    }
    setPage(nextPage)
    setMenuOpen(false)
    setQuery('')
    setStatusFilter('All statuses')
    setCategoryFilter('All categories')
  }

  function selectIncident(incident: Incident) {
    setSelectedIncident(incident)
    setPage('details')
    setMenuOpen(false)
  }

  function selectHistoricalIncident(incident: HistoricalIncident) {
    setSelectedIncident(incident)
    setPage('details')
    setMenuOpen(false)
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const area = String(formData.get('area') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const category = String(formData.get('category') ?? '') as IncidentCategory
    const severity = String(formData.get('severity') ?? '') as Incident['severity']
    const observedAt = String(formData.get('observedAt') ?? '')

    if (
      !area
      || !description
      || !reportCategories.includes(category)
      || !['High', 'Medium', 'Low'].includes(severity)
      || !observedAt
    ) {
      setReportFormError('Complete all required fields before submitting your report.')
      return
    }

    const observedDate = new Date(observedAt)
    if (Number.isNaN(observedDate.getTime()) || observedDate.getTime() > Date.now()) {
      setReportFormError('Enter a valid observation date and time that is not in the future.')
      return
    }

    const now = new Date()
    const reported = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(now)
    let id = ''
    do {
      id = `user-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`
    } while (allIncidents.some((incident) => incident.id === id) || historicalIncidents.some((incident) => incident.id === id))
    const newIncident: Incident = {
      id,
      origin: 'user',
      category,
      title: category,
      area,
      reported,
      observedAt,
      severity,
      status: 'Unverified',
      statusHistory: [],
      description,
      statusDescription: 'This community-submitted report has not been independently verified.',
      updates: [{
        time: reported,
        title: 'Report submitted',
        description: 'Submitted by a user and saved in this browser only. No authority has been contacted.',
      }],
    }
    const updatedReports = [newIncident, ...storedData.incidents]
    setSelectedIncident(newIncident)
    setReportFormError('')
    setReportFeedback('')
    try {
      if (!storageCanPersist) throw new Error('Saved records must be repaired before writing.')
      const storageSnapshot = saveUserIncidents(updatedReports, storedData.storageSnapshot)
      setStoredData({ incidents: updatedReports, warning: null, canPersist: true, storageSnapshot })
      setStorageNotice(null)
    } catch {
      setReportFeedback('The report was added for this session only. Browser storage may be unavailable or saved data may have changed; existing stored data was not overwritten.')
      setStorageCanPersist(false)
      setStoredData({ ...storedData, incidents: updatedReports, canPersist: false })
      setStorageNotice(storageNotice ?? 'Browser storage is unavailable or changed in another tab. New reports are session-only.')
    }
    setReportSubmitted(true)
  }

  function updateIncidentStatus(event: FormEvent<HTMLFormElement>, incident: Incident) {
    event.preventDefault()
    if (!canReview) {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Your role cannot update incident statuses.' }))
      return
    }
    const formData = new FormData(event.currentTarget)
    const nextStatus = String(formData.get('status') ?? '') as IncidentStatus
    const note = String(formData.get('note') ?? '').trim()

    if (!storageCanPersist) {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Saved reports are unavailable or malformed. No change was made to avoid overwriting stored data.' }))
      return
    }
    if (!reportStatuses.includes(nextStatus)) {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Choose a valid status before saving.' }))
      return
    }
    if (nextStatus === incident.status) {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Choose a different status to record a change.' }))
      return
    }

    const timestamp = new Date().toISOString()
    const readableTimestamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
    const statusChange = {
      timestamp,
      previousStatus: incident.status,
      newStatus: nextStatus,
      note,
    }
    const updatedIncidents = storedData.incidents.map((item) => item.id === incident.id
      ? {
          ...item,
          status: nextStatus,
          statusDescription: note
            ? `${note} Status is managed locally in this prototype and is not official verification.`
            : `Status updated locally to ${nextStatus}. This is not an official review or verification.`,
          statusHistory: [...item.statusHistory, statusChange],
          updates: [...item.updates, {
            time: readableTimestamp,
            title: `Status changed: ${incident.status} → ${nextStatus}`,
            description: note || 'No note provided.',
          }],
        }
      : item)

    try {
      const storageSnapshot = saveUserIncidents(updatedIncidents, storedData.storageSnapshot)
      const updatedIncident = updatedIncidents.find((item) => item.id === incident.id)
      if (updatedIncident && selectedIncident.id === incident.id) setSelectedIncident(updatedIncident)
      setStoredData({ incidents: updatedIncidents, warning: null, canPersist: true, storageSnapshot })
      setStorageNotice(null)
    } catch {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Could not save this change because browser storage is unavailable or has changed. No change was made.' }))
      setStorageCanPersist(false)
      setStorageNotice('Browser storage is unavailable or changed in another tab. Reload before continuing to avoid overwriting newer data.')
      return
    }

    setReviewFeedback((current) => ({ ...current, [incident.id]: 'Update saved in this browser. It has not been sent to a municipality.' }))
  }

  function handleReportDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      setReportOpen(false)
      return
    }
    if (event.key !== 'Tab' || !reportDialogRef.current) return

    const focusable = reportDialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable.item(0)
    const last = focusable.item(focusable.length - 1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === reportDialogRef.current)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="app-shell">
      <aside id="primary-navigation" className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <a className="brand" href="#dashboard" onClick={(event) => { event.preventDefault(); navigate('dashboard') }}>
          <span className="brand-mark"><Icon name="drop" size={21} /></span>
          <span><strong>AquaTrace</strong><small>Track the problem. Find the next step.</small></span>
        </a>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="side-nav">
          {pages.filter((item) => canAccessPage(user.role, item.id)).map((item) => (
            <button
              className={`nav-link ${page === item.id || (page === 'details' && item.id === 'reports') ? 'nav-link-active' : ''}`}
              aria-current={page === item.id || (page === 'details' && item.id === 'reports') ? 'page' : undefined}
              key={item.id}
              onClick={() => navigate(item.id)}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'reports' && <span className="nav-count">{allRecordCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-account">
            <div className="sidebar-account-identity">
              <span className="sidebar-account-avatar" aria-hidden="true">{initials}</span>
              <div className="sidebar-account-copy">
                <strong>{user.name}</strong>
                <span>{roleLabels[user.role]} · Demo session</span>
              </div>
            </div>
            <button className="logout-button" type="button" onClick={onLogout}>
              <Icon name="logout" size={15} /><span>Log out</span>
            </button>
          </div>
          <div className="community-card">
            <span className="community-icon"><Icon name="pin" size={17} /></span>
            <div><strong>Community first</strong><p>Local information, made clearer.</p></div>
          </div>
          <div className="sidebar-footnote"><span className="footnote-dot" /> Demonstration view</div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <div className="mobile-brand"><span className="brand-mark"><Icon name="drop" size={18} /></span><strong>AquaTrace</strong></div>
          <div className="topbar-context"><span>South Africa</span><span className="context-separator">/</span><span>Community dashboard</span></div>
          <div className="topbar-actions">
            <span className={`role-pill role-pill-${user.role}`}>{roleLabels[user.role]}</span>
            <button ref={reportTriggerRef} className="button button-primary top-report-button" type="button" onClick={() => { setReportOpen(true); setReportSubmitted(false); setReportFormError(''); setReportFeedback(''); setObservedAtDefault(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)) }}>
              <Icon name="plus" size={17} /><span>Report an outage</span>
            </button>
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">AQUATRACE <span> / </span> COMMUNITY</div>
              <h1>{pageTitles[page]}</h1>
              <p>{page === 'dashboard' ? 'A clearer view of water interruptions and nearby alternatives.' : page === 'reports' ? 'Browse reported interruptions and follow their latest status.' : page === 'review' ? 'Review local submissions and record an explicit status update.' : page === 'water-points' ? 'Explore alternative water sources in your area.' : 'Follow the timeline and details of this report.'}</p>
            </div>
            {page === 'details' && <button className="button button-secondary back-button" type="button" onClick={() => navigate('reports')}>← All reports</button>}
          </div>
          {storageNotice && <div className="storage-notice" role="status">{storageNotice}</div>}

          {page === 'dashboard' && (
            <>
              <div className="notice-banner">
                <span className="notice-icon"><Icon name="alert" size={17} /></span>
                <p><strong>Historical source reports are not live service information.</strong> Community reports and review statuses are browser-local and unverified unless independently supported.</p>
                <span className="report-origin report-origin-historical">Historical · sourced</span>
              </div>

              <section className="metric-grid" aria-label="Community overview metrics">
                <article className="metric-card"><span className="metric-label">Historical sourced incidents</span><strong>{historicalIncidents.length}</strong><span className="metric-note"><span className="metric-bullet blue" />Time-bound source records</span><span className="metric-icon"><Icon name="alert" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">Community reports</span><strong>{allIncidents.length}</strong><span className="metric-note"><span className="metric-bullet amber" />Browser-local; unverified by default</span><span className="metric-icon"><Icon name="pin" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">Fictional water points</span><strong>{waterPoints.length}</strong><span className="metric-note"><span className="metric-bullet green" />Availability is not verified</span><span className="metric-icon"><Icon name="drop" size={19} /></span></article>
              </section>

              <div className="dashboard-grid">
                <section className="panel recent-panel">
                  <div className="panel-heading"><div><h2>Historical source reports</h2><p>Published dates and evidence are shown in each record</p></div><button className="text-button" type="button" onClick={() => navigate('reports')}>View all <Icon name="arrow" size={15} /></button></div>
                  <div className="incident-list">{historicalIncidents.slice(0, 3).map((incident) => <HistoricalIncidentRow key={incident.id} incident={incident} onSelect={selectHistoricalIncident} />)}</div>
                  <div className="panel-footer"><span className="report-origin report-origin-historical">Historical · sourced</span></div>
                </section>
                <section className="panel status-panel">
                  <div className="panel-heading"><div><h2>Community report workflow</h2><p>Local labels, not live outage status</p></div><span className="panel-icon"><Icon name="grid" size={17} /></span></div>
                  <div className="status-breakdown">
                    {reportStatuses.map((status) => {
                      const count = allIncidents.filter((incident) => incident.status === status).length
                      const statusClass = status.toLowerCase().replaceAll(' ', '-')
                      return <div className="status-line" key={status}><span className={`status-dot dot-${statusClass}`} /><span>{status}</span><span className="status-line-track"><span className={`status-line-fill fill-${statusClass}`} style={{ width: `${allIncidents.length ? (count / allIncidents.length) * 100 : 0}%` }} /></span><strong>{count}</strong></div>
                    })}
                  </div>
                  <div className="status-disclaimer"><Icon name="check" size={15} /><span>New community submissions start unverified</span></div>
                </section>
              </div>
              <section className="next-step-banner"><div className="next-step-icon"><Icon name="drop" size={20} /></div><div><h2>Looking for another water source?</h2><p>Browse the fictional directory; listed availability is not verified.</p></div><button className="button button-secondary" type="button" onClick={() => navigate('water-points')}>Explore water points <Icon name="arrow" size={16} /></button></section>
            </>
          )}

          {page === 'reports' && (
            <section className="panel listing-panel">
              <div className="listing-heading"><div><h2>Historical incidents and community reports</h2><p>{filteredHistoricalIncidents.length} historical sourced · {filteredIncidents.length} community reports shown</p></div><span className="report-origin report-origin-historical">Historical records are not live</span></div>
              <div className="filters-row">
                <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search historical and community reports by area or keyword</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area or keyword" /></label>
                <label className="filter-label"><span className="sr-only">Filter community reports by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | 'All statuses')}><option value="All statuses">All community statuses</option>{reportStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="filter-label"><span className="sr-only">Filter reports by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{[...reportCategories, ...new Set(Object.values(historicalCategoryLabels))].map((category) => <option key={category}>{category}</option>)}</select></label>
                {(query || statusFilter !== 'All statuses' || categoryFilter !== 'All categories') && <button className="clear-filters-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All statuses'); setCategoryFilter('All categories') }}>Reset filters</button>}
              </div>
              <div className="report-data-section">
                <h3>Historical sourced incidents <span>{filteredHistoricalIncidents.length}</span></h3>
                {filteredHistoricalIncidents.length ? <div className="incident-list listing-rows">{filteredHistoricalIncidents.map((incident) => <HistoricalIncidentRow key={incident.id} incident={incident} onSelect={selectHistoricalIncident} />)}</div> : <p className="insight-empty">No historical source records match the search or category.</p>}
                <p className="historical-filter-note">The status filter applies only to community reports; historical records show what their sources reported at publication.</p>
              </div>
              <div className="report-data-section">
                <h3>Community-submitted reports <span>{filteredIncidents.length}</span></h3>
                {filteredIncidents.length ? <div className="incident-list listing-rows">{filteredIncidents.map((incident) => <IncidentRow key={incident.id} incident={incident} onSelect={selectIncident} />)}</div> : <div className="empty-state"><Icon name="search" size={22} /><strong>{allIncidents.length ? 'No community reports match these filters' : 'No community reports yet'}</strong><span>Try another search or reset your filters.</span></div>}
              </div>
            </section>
          )}

          {page === 'insights' && (
            <section className="insights-view">
              <div className="insights-context">
                <div className="insight-summary">
                  <article><span>Records shown (unique IDs)</span><strong>{allRecordCount}</strong></article>
                  <article><span>Historical sourced incidents</span><strong>{historicalIncidents.length}</strong></article>
                  <article><span>Community reports</span><strong>{storedData.incidents.length}</strong></article>
                  <article><span>Reviewed community reports</span><strong>{insights.reviewedCommunityReports}</strong></article>
                  <article><span>Unverified community reports</span><strong>{insights.unverifiedCommunityReports}</strong></article>
                  <article><span>Historical unverified claims</span><strong>{insights.unverifiedHistoricalClaims}</strong></article>
                </div>
                <p>Historical records and community reports remain separate and each unique ID is counted once. Historical status is as described by its source at publication; community review labels do not establish current service availability.</p>
              </div>

              <div className="insights-grid">
                <InsightBreakdown title="Records by location" description="Each historical record is counted once; multi-area notices use one combined location group. Differently spelled community areas may remain separate." entries={insights.byArea} />
                <InsightBreakdown title="Records by category" description="Each historical incident is counted once, alongside community reports." entries={insights.byCategory} />
                <InsightBreakdown title="Community reports by review status" description="Local workflow statuses only; historical records do not receive community-review statuses." entries={insights.byStatus} />
              </div>

              <section className="panel pattern-panel">
                <div className="panel-heading"><div><h2>Possible repeat locations</h2><p>Repeated community reports in this browser only</p></div><ReportOriginLabel /></div>
                {insights.repeatedUserLocations.length ? (
                  <>
                    <ul className="repeat-location-list">{insights.repeatedUserLocations.map((location) => <li key={location.label}><strong>{location.label}</strong><span>{location.user} reports</span></li>)}</ul>
                    <p className="caution-copy">This shows repeated reports, not proof of a common infrastructure cause. Reports may be duplicates or separate observations; media coverage is incomplete, and reporting frequency does not necessarily equal actual outage frequency.</p>
                  </>
                ) : (
                  <div className="insight-empty"><strong>Not enough matching reports to identify a repeat location.</strong><span>At least two browser-local reports with the same entered area are needed for this comparison.</span></div>
                )}
              </section>

              <section className="panel time-insight-panel">
                <div className="panel-heading"><div><h2>Reports over time</h2><p>Latest six months with reports · browser-local submissions only</p></div><Icon name="clock" size={18} /></div>
                {insights.byMonth.length ? (
                  <ul className="time-insight-list">{insights.byMonth.map(([month, count]) => <li key={month}><span>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))}</span><span className="time-insight-bar" aria-hidden="true"><span style={{ width: `${(count / Math.max(...insights.byMonth.map(([, value]) => value))) * 100}%` }} /></span><strong>{count}</strong></li>)}</ul>
                ) : <p className="insight-empty">No community-submitted observation dates are available yet. Historical source records are excluded from this summary.</p>}
              </section>

              <section className="panel insight-guidance">
                <div><span className="guidance-step">1</span><h2>Review possible duplicates</h2><p>Compare description, entered area, and observation time before treating similar reports as separate events.</p></div>
                <div><span className="guidance-step">2</span><h2>Check evidence and status</h2><p>Read the linked source and its publication date. A historical article reports status at that time, and a local community-review label is not external confirmation.</p></div>
                <div><span className="guidance-step">3</span><h2>Compare over time</h2><p>Use consistent area names and dates across a longer period before proposing that a pattern may be recurring.</p></div>
                <p className="insight-boundary"><strong>What these insights cannot establish:</strong> live water availability, root cause, outage prediction, or municipal performance. Media coverage is incomplete, and reporting frequency does not necessarily equal actual outage frequency. Confirming a suspected pattern would require deduplicated reports, consistent timestamps and locations, corroborating observations, and independently sourced service information.</p>
              </section>
            </section>
          )}

          {page === 'review' && canReview && (
            <section className="review-view">
              <div className="review-disclaimer">
                <Icon name="alert" size={17} />
                <p><strong>Community reports only.</strong> Access is limited to the Incident Reviewer and Administrator demo roles. This is demonstration authentication, not production security, and status changes are saved only in this browser. Historical source records are read-only and no municipality receives reports or updates.</p>
              </div>
              {!storedData.incidents.length && (
                <div className="empty-state review-empty" role="status">
                  <Icon name="check" size={22} />
                  <strong>No user-submitted reports to review</strong>
                  <span>New reports will appear here with Unverified status.</span>
                </div>
              )}
              <div className="review-list">
                {allIncidents.map((incident) => (
                  <article className="panel review-card" key={incident.id}>
                    <div className="review-card-header">
                      <div>
                        <div className="review-card-kicker">COMMUNITY SUBMISSION <span>·</span> {incident.id}</div>
                        <h2>{incident.title}</h2>
                      </div>
                      <div className="review-card-actions"><StatusBadge status={incident.status} /><button className="text-button" type="button" onClick={() => selectIncident(incident)}>View details</button></div>
                    </div>
                    <div className="review-fields">
                      <div><span>Location</span><strong>{incident.area}</strong></div>
                      <div><span>Category</span><strong>{incident.category}</strong></div>
                      <div><span>Severity</span><strong>{incident.severity}</strong></div>
                      <div><span>Observed</span><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(incident.observedAt))}</strong></div>
                      <div className="review-field-description"><span>Description</span><p>{incident.description}</p></div>
                      <div><span>Submission origin</span><ReportOriginLabel /></div>
                    </div>
                    <form className="review-form" onSubmit={(event) => updateIncidentStatus(event, incident)}>
                      <label className="review-status-field" htmlFor={`review-status-${incident.id}`}>Update status
                        <select id={`review-status-${incident.id}`} name="status" defaultValue={incident.status}>
                          {reportStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                      <label className="review-note-field" htmlFor={`review-note-${incident.id}`}>Optional note
                        <input id={`review-note-${incident.id}`} name="note" maxLength={240} placeholder="Short reason or context" />
                      </label>
                      <button className="button button-primary" type="submit">Save update</button>
                      {reviewFeedback[incident.id] && <p className={`review-feedback ${reviewFeedback[incident.id].startsWith('Update saved') ? 'review-feedback-success' : ''}`} role="status">{reviewFeedback[incident.id]}</p>}
                    </form>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === 'water-points' && (
            <section className="panel listing-panel">
              <div className="listing-heading"><div><h2>Alternative water points</h2><p>Fictional demonstration directory · availability is not verified</p></div><span className="report-origin report-origin-fictional">Fictional examples</span></div>
              <div className="filters-row">
                <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search water points by name or area</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or area" /></label>
                <label className="filter-label"><span className="sr-only">Filter by source type</span><select value={pointFilter} onChange={(event) => setPointFilter(event.target.value)}><option>All sources</option><option>Community tap</option><option>Borehole</option><option>Water tanker</option></select></label>
              </div>
              {filteredPoints.length ? <div className="water-point-grid">{filteredPoints.map((point) => <article className="water-point-card" key={point.id}><div className="point-card-top"><span className="point-icon"><Icon name="drop" size={19} /></span><span className="availability"><span className={`availability-dot availability-${point.availability.toLowerCase()}`} />{point.availability}</span></div><h3>{point.name}</h3><p className="point-area"><Icon name="pin" size={14} />{point.area}</p><div className="point-details"><span>{point.sourceType}</span><span>Last verified: {point.lastVerified}</span></div><div className="point-trust"><span className="report-origin report-origin-fictional">Fictional example · not verified</span></div></article>)}</div> : <div className="empty-state"><Icon name="search" size={22} /><strong>No water points match your search</strong><span>Try another area or source type.</span></div>}
            </section>
          )}

          {page === 'details' && isHistoricalIncident(selectedIncident) && (
            <div className="detail-layout historical-detail-layout">
              <section className="panel detail-panel">
                <div className="detail-topline">
                  <span className="report-origin report-origin-historical">Historical · not live</span>
                  <span className="evidence-badge">{evidenceLabel(selectedIncident)}</span>
                </div>
                <h2 className="detail-title">{historicalCategoryLabels[selectedIncident.category]}</h2>
                <div className="detail-report-id">Record ID: <code>{selectedIncident.id}</code></div>
                <div className="detail-meta">
                  <span><Icon name="pin" size={16} />{[selectedIncident.city, selectedIncident.municipality].filter(Boolean).join(' · ') || 'Location not specified'}</span>
                  <span><Icon name="clock" size={16} />Incident date: {historicalDateRange(selectedIncident)}</span>
                  <span>Published: {selectedIncident.publicationDate}</span>
                </div>
                <div className="detail-section"><h3>What the source reports</h3><p>{selectedIncident.summary}</p></div>
                <div className="detail-section"><h3>Affected areas named</h3><p>{selectedIncident.affectedAreas.join(', ') || 'Not specified by source'}</p></div>
                {selectedIncident.reportedCause && <div className="detail-section"><h3>Cause as reported</h3><p>{selectedIncident.reportedCause}</p></div>}
                {selectedIncident.reportedStatusAtPublication && <div className="detail-section"><h3>Status at publication</h3><p>{selectedIncident.reportedStatusAtPublication}</p></div>}
                <div className="detail-section"><h3>Source and evidence</h3><p>{selectedIncident.sourcePublisher}: {selectedIncident.sourceTitle}</p><a className="source-link" href={selectedIncident.sourceUrl} target="_blank" rel="noopener noreferrer">Open original source in a new tab <Icon name="arrow" size={15} /></a><p className="evidence-explanation">{selectedIncident.evidenceClassification === 'official_statement' ? 'This classification means the official source directly documents the statement. It does not mean AquaTrace independently verified the incident.' : selectedIncident.evidenceClassification === 'news_report' ? 'This classification means a traceable news organisation reported the claim; it is not independent verification by AquaTrace.' : 'The available source reports a claim that has not been independently confirmed.'}</p></div>
                <div className="detail-section"><h3>Notes and limitations</h3><p>{selectedIncident.notes}</p></div>
                <div className="detail-disclaimer"><Icon name="alert" size={16} /><span>This is a dated historical record. Its status is only what the source described at publication; AquaTrace does not provide live water availability.</span></div>
              </section>
              <section className="panel timeline-panel">
                <div className="panel-heading"><div><h2>Record provenance</h2><p>Source-backed historical entry</p></div><Icon name="clock" size={18} /></div>
                <div className="status-history">
                  <article className="status-history-entry"><span>Source publication</span><p>{selectedIncident.publicationDate} · {selectedIncident.sourcePublisher}</p></article>
                  <article className="status-history-entry"><span>Added to AquaTrace</span><p>{selectedIncident.addedDate}</p></article>
                  <article className="status-history-entry"><span>Evidence classification</span><p>{evidenceLabel(selectedIncident)}</p></article>
                </div>
              </section>
            </div>
          )}

          {page === 'details' && !isHistoricalIncident(selectedIncident) && (
            <div className="detail-layout">
              <section className="panel detail-panel">
                <div className="detail-topline"><span className={`severity-tag severity-tag-${selectedIncident.severity.toLowerCase()}`}>{selectedIncident.severity} severity</span><StatusBadge status={selectedIncident.status} /></div>
                <h2 className="detail-title">{selectedIncident.title}</h2>
                <div className="detail-report-id">Report ID: <code>{selectedIncident.id}</code></div>
                <div className="detail-meta"><span><Icon name="pin" size={16} />{selectedIncident.area}</span><span><Icon name="clock" size={16} />Reported {selectedIncident.reported}</span><span>Observed: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedIncident.observedAt))}</span></div>
                <div className="detail-sample"><ReportOriginLabel /><span className="detail-category">{selectedIncident.category}</span></div>
                {canReview && <button className="button button-secondary detail-review-button" type="button" onClick={() => navigate('review')}>Open reviewer workflow</button>}
                <div className="detail-section"><h3>About this report</h3><p>{selectedIncident.description}</p></div>
                <div className="detail-section"><h3>What this status means</h3><p>{selectedIncident.statusDescription}</p></div>
                <div className="detail-disclaimer"><Icon name="alert" size={16} /><span>This community-submitted report and its status are local prototype records. AquaTrace has not independently verified it or contacted an authority.</span></div>
              </section>
              <section className="panel timeline-panel">
                <div className="panel-heading"><div><h2>Update history</h2><p>Updates for this community submission</p></div><Icon name="clock" size={18} /></div>
                <ol className="timeline">{selectedIncident.updates.map((update, index) => <li className="timeline-entry" key={`${update.time}-${index}`}><span className={`timeline-marker ${index === 0 ? 'timeline-marker-current' : ''}`} /><div><span className="timeline-time">{update.time}</span><strong>{update.title}</strong><p>{update.description}</p></div></li>)}</ol>
                <div className="status-history">
                  <h3>Status change history</h3>
                  {selectedIncident.statusHistory.length ? selectedIncident.statusHistory.map((change, index) => (
                    <article className="status-history-entry" key={`${change.timestamp}-${index}`}>
                      <span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(change.timestamp))}</span>
                      <p><StatusBadge status={change.previousStatus} /> <span aria-label="changed to">→</span> <StatusBadge status={change.newStatus} /></p>
                      {change.note && <p className="status-history-note">{change.note}</p>}
                    </article>
                  )) : <p className="history-empty">No status changes have been recorded.</p>}
                </div>
              </section>
            </div>
          )}
          <footer className="page-footer"><span>AquaTrace <span className="footer-dot">·</span> A community information concept</span><span>Historical source records are not live data; water-point examples are fictional.</span></footer>
        </main>
      </div>

      {menuOpen && <button type="button" aria-label="Close navigation menu" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}

      {reportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false) }}>
          <section ref={reportDialogRef} className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" tabIndex={-1} onKeyDown={handleReportDialogKeyDown}>
            <div className="modal-heading"><div><span className="eyebrow">COMMUNITY REPORT</span><h2 id="report-modal-title">{reportSubmitted ? 'Thanks for your report' : 'Report a water outage'}</h2></div><button type="button" className="icon-button" aria-label="Close report form" onClick={() => setReportOpen(false)}><Icon name="close" /></button></div>
            {reportSubmitted ? (
              <div className="submission-message">
                <span className="submission-icon"><Icon name="check" size={21} /></span>
                <p>Your report was added with <strong>Unverified</strong> status. It has not been sent to a municipality or independently confirmed.</p>
                {reportFeedback && <p className="form-error" role="status">{reportFeedback}</p>}
                {!reportFeedback && <p className="form-note">Saved in this browser only.</p>}
                <button className="button button-primary" type="button" onClick={() => setReportOpen(false)}>Done</button>
              </div>
            ) : (
              <>
                <p className="modal-intro">Share what you observed. Reports are saved in this browser only and are not sent to an authority.</p>
                <form noValidate onSubmit={submitReport}>
                  <label className="form-label" htmlFor="report-area">Location or community <span className="required-mark">Required</span><input id="report-area" name="area" required maxLength={100} placeholder="e.g. Mamelodi, Tshwane" /></label>
                  <label className="form-label" htmlFor="report-category">Outage category <span className="required-mark">Required</span><select id="report-category" name="category" required defaultValue=""><option value="" disabled>Select a category</option>{reportCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="form-label" htmlFor="report-severity">Severity <span className="required-mark">Required</span><select id="report-severity" name="severity" required defaultValue=""><option value="" disabled>Select severity</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                  <label className="form-label" htmlFor="report-observed">Date and time observed <span className="required-mark">Required</span><input id="report-observed" name="observedAt" type="datetime-local" required defaultValue={observedAtDefault} /></label>
                  <label className="form-label" htmlFor="report-description">Issue description <span className="required-mark">Required</span><textarea id="report-description" name="description" required maxLength={1000} rows={3} placeholder="Describe what you noticed…" /></label>
                  {reportFormError && <p className="form-error" role="alert">{reportFormError}</p>}
                  <p className="form-note"><Icon name="alert" size={15} />Please do not include personal or sensitive information.</p>
                  <div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setReportOpen(false)}>Cancel</button><button className="button button-primary" type="submit">Submit report <Icon name="arrow" size={16} /></button></div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function App() {
  const { user, logout } = useAuth()
  return user ? <Workspace user={user} onLogout={logout} /> : <LoginPage />
}

export default App
