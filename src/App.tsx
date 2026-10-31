import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
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
import { fetchAdminProfiles, updateProfileRole, type AdminProfile, type ProfileRoleChange } from './data/adminRepository'
import { createSharedIncident, fetchSharedIncidents, importLegacyIncidents, reviewSharedIncident } from './data/incidentRepository'
import {
  addSharedWaterPoint,
  fetchSharedWaterPoints,
  updateSharedWaterPoint,
  type SharedWaterPoint,
  type WaterPointAvailabilityStatus,
  type WaterPointVerificationStatus,
} from './data/waterPointRepository'
import LoginPage from './auth/LoginPage'
import {
  canAccessPage,
  canReviewIncidents,
  isRole,
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
  { id: 'admin', label: 'User access', icon: 'check' },
]

const pageTitles: Record<Page, string> = {
  dashboard: 'Community overview',
  reports: 'Outage reports',
  review: 'Review reports',
  insights: 'Outage insights',
  'water-points': 'Water points',
  details: 'Incident details',
  admin: 'User access',
}

const reportStatuses: IncidentStatus[] = ['Unverified', 'Under review', 'More information requested', 'Confirmed', 'Resolved', 'Rejected']
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
  const { mode } = useAuth()
  const reportTriggerRef = useRef<HTMLButtonElement>(null)
  const reportDialogRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncident, setSelectedIncident] = useState<Incident | HistoricalIncident>(historicalIncidents[0])
  const [storedData, setStoredData] = useState(loadUserIncidents)
  const [sharedIncidents, setSharedIncidents] = useState<Incident[]>([])
  const [sharedLoading, setSharedLoading] = useState(mode === 'supabase')
  const [sharedError, setSharedError] = useState('')
  const [sharedWaterPoints, setSharedWaterPoints] = useState<SharedWaterPoint[]>([])
  const [waterPointsLoading, setWaterPointsLoading] = useState(mode === 'supabase')
  const [waterPointsError, setWaterPointsError] = useState('')
  const [waterPointStatusFilter, setWaterPointStatusFilter] = useState('all')
  const [waterPointFeedback, setWaterPointFeedback] = useState('')
  const [waterPointSubmitting, setWaterPointSubmitting] = useState(false)
  const [waterPointReviewSubmitting, setWaterPointReviewSubmitting] = useState<Record<string, boolean>>({})
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [adminRoleChanges, setAdminRoleChanges] = useState<ProfileRoleChange[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminFeedback, setAdminFeedback] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState<Record<string, boolean>>({})
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
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSubmissionKey, setReportSubmissionKey] = useState('')
  const [observedAtDefault, setObservedAtDefault] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({})
  const [reviewSubmitting, setReviewSubmitting] = useState<Record<string, boolean>>({})
  const [legacyImportOpen, setLegacyImportOpen] = useState(false)
  const [legacySelectedIds, setLegacySelectedIds] = useState<string[]>([])
  const [legacyImportFeedback, setLegacyImportFeedback] = useState('')
  const [legacyImporting, setLegacyImporting] = useState(false)
  const canReview = canReviewIncidents(user.role)
  const initials = user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  const allIncidents = mode === 'supabase' ? sharedIncidents : storedData.incidents
  const allRecordCount = allIncidents.length + historicalIncidents.length

  const refreshSharedIncidents = useCallback(async () => fetchSharedIncidents(), [])

  useEffect(() => {
    if (mode !== 'supabase') return
    let active = true
    const refresh = async () => {
      try {
        const incidents = await refreshSharedIncidents()
        if (active) {
          setSharedIncidents(incidents)
          setSharedError('')
        }
      } catch (error) {
        if (active) {
          setSharedError(error instanceof Error ? error.message : 'Shared reports could not be refreshed.')
        }
      } finally {
        if (active) setSharedLoading(false)
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => { void refresh() }, 20000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [mode, refreshSharedIncidents])

  const refreshSharedWaterPoints = useCallback(async () => fetchSharedWaterPoints(), [])

  useEffect(() => {
    if (mode !== 'supabase') return
    let active = true
    const refresh = async () => {
      try {
        const points = await refreshSharedWaterPoints()
        if (active) {
          setSharedWaterPoints(points)
          setWaterPointsError('')
        }
      } catch (error) {
        if (active) {
          setWaterPointsError(error instanceof Error ? error.message : 'Sourced water points could not be refreshed.')
        }
      } finally {
        if (active) setWaterPointsLoading(false)
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => { void refresh() }, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [mode, refreshSharedWaterPoints])

  const refreshAdminData = useCallback(async () => fetchAdminProfiles(), [])

  useEffect(() => {
    if (mode !== 'supabase' || user.role !== 'admin' || page !== 'admin') return
    let active = true
    const refresh = async () => {
      setAdminLoading(true)
      try {
        const data = await refreshAdminData()
        if (active) {
          setAdminProfiles(data.profiles)
          setAdminRoleChanges(data.roleChanges)
          setAdminError('')
        }
      } catch (error) {
        if (active) setAdminError(error instanceof Error ? error.message : 'Account-role data could not be loaded.')
      } finally {
        if (active) setAdminLoading(false)
      }
    }
    void refresh()
    return () => { active = false }
  }, [mode, page, refreshAdminData, user.role])
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
    for (const incident of allIncidents) {
      const month = incident.observedAt.slice(0, 7)
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
    }
    const userLocationMap = new Map<string, InsightCount>()
    for (const incident of allIncidents) {
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
  }, [allIncidents])

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

  const filteredSharedWaterPoints = useMemo(() => sharedWaterPoints.filter((point) => {
    const searchText = `${point.name} ${point.physicalLocation} ${point.municipality} ${point.type} ${point.source}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
      && (waterPointStatusFilter === 'all'
        || point.verificationStatus === waterPointStatusFilter
        || point.availabilityStatus === waterPointStatusFilter)
  }), [sharedWaterPoints, query, waterPointStatusFilter])

  async function changeAccountRole(event: FormEvent<HTMLFormElement>, profile: AdminProfile) {
    event.preventDefault()
    if (user.role !== 'admin' || profile.id === user.id) return
    const formData = new FormData(event.currentTarget)
    const nextRoleValue = String(formData.get('role') ?? '')
    const explanation = String(formData.get('explanation') ?? '').trim()
    if (!isRole(nextRoleValue)) {
      setAdminFeedback('Choose a valid account role.')
      return
    }
    if (!explanation) {
      setAdminFeedback('Explain why this role change is required.')
      return
    }

    setAdminSubmitting((current) => ({ ...current, [profile.id]: true }))
    setAdminFeedback('')
    try {
      await updateProfileRole(profile.id, nextRoleValue, explanation)
      const data = await refreshAdminData()
      setAdminProfiles(data.profiles)
      setAdminRoleChanges(data.roleChanges)
      setAdminFeedback(`Updated ${profile.email} to ${roleLabels[nextRoleValue]}. The change is recorded in the role audit history.`)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'The account role could not be changed.')
    } finally {
      setAdminSubmitting((current) => ({ ...current, [profile.id]: false }))
    }
  }

  async function handleRefreshSharedWaterPoints() {
    setWaterPointsLoading(true)
    try {
      setSharedWaterPoints(await refreshSharedWaterPoints())
      setWaterPointsError('')
    } catch (error) {
      setWaterPointsError(error instanceof Error ? error.message : 'Sourced water points could not be refreshed.')
    } finally {
      setWaterPointsLoading(false)
    }
  }

  async function submitWaterPoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canReview || waterPointSubmitting) return
    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get('pointName') ?? '').trim()
    const physicalLocation = String(formData.get('pointLocation') ?? '').trim()
    const municipality = String(formData.get('pointMunicipality') ?? '').trim()
    const type = String(formData.get('pointType') ?? '').trim()
    const source = String(formData.get('pointSource') ?? '').trim()
    const sourceUrl = String(formData.get('pointSourceUrl') ?? '').trim()
    const explanation = String(formData.get('pointExplanation') ?? '').trim()
    const latitudeValue = String(formData.get('pointLatitude') ?? '').trim()
    const longitudeValue = String(formData.get('pointLongitude') ?? '').trim()
    const latitude = latitudeValue ? Number(latitudeValue) : null
    const longitude = longitudeValue ? Number(longitudeValue) : null

    if (!name || !physicalLocation || !municipality || !type || !source || !explanation) {
      setWaterPointFeedback('Complete all required water-point and source-review fields.')
      return
    }
    if (latitudeValue && !Number.isFinite(latitude) || longitudeValue && !Number.isFinite(longitude)
      || (latitude === null) !== (longitude === null)
      || (latitude !== null && (latitude < -90 || latitude > 90))
      || (longitude !== null && (longitude < -180 || longitude > 180))) {
      setWaterPointFeedback('Coordinates must be valid latitude/longitude values provided together, or left blank.')
      return
    }
    try {
      if (new URL(sourceUrl).protocol !== 'https:') throw new Error('The original source URL must use HTTPS.')
    } catch {
      setWaterPointFeedback('Enter a valid HTTPS source URL that can be inspected.')
      return
    }

    setWaterPointSubmitting(true)
    setWaterPointFeedback('')
    try {
      await addSharedWaterPoint({
        name,
        physicalLocation,
        municipality,
        latitude,
        longitude,
        type,
        source,
        sourceUrl,
        explanation,
      })
      setSharedWaterPoints(await refreshSharedWaterPoints())
      setWaterPointFeedback('Water-point record saved as Unverified with Availability unknown. A separate evidence-backed review is required before verification.')
      form.reset()
    } catch (error) {
      setWaterPointFeedback(error instanceof Error
        ? error.message
        : 'The water-point record could not be saved. Check your connection and retry.')
    } finally {
      setWaterPointSubmitting(false)
    }
  }

  async function updateWaterPoint(event: FormEvent<HTMLFormElement>, point: SharedWaterPoint) {
    event.preventDefault()
    if (!canReview || waterPointReviewSubmitting[point.id]) return
    const formData = new FormData(event.currentTarget)
    const verificationStatus = String(formData.get('verificationStatus') ?? '') as WaterPointVerificationStatus
    const availabilityStatus = String(formData.get('availabilityStatus') ?? '') as WaterPointAvailabilityStatus
    const explanation = String(formData.get('explanation') ?? '').trim()
    const evidenceUrl = String(formData.get('evidenceUrl') ?? '').trim()
    const verificationStatuses: WaterPointVerificationStatus[] = ['unverified', 'under_review', 'verified', 'closed_or_removed']
    const availabilityStatuses: WaterPointAvailabilityStatus[] = ['available', 'temporarily_unavailable', 'unknown', 'closed_or_removed']

    if (!verificationStatuses.includes(verificationStatus) || !availabilityStatuses.includes(availabilityStatus)) {
      setWaterPointFeedback('Choose valid verification and availability states.')
      return
    }
    if (!explanation) {
      setWaterPointFeedback('Explain the verification or availability decision.')
      return
    }
    if (verificationStatus === 'verified' && !/^https:\/\//i.test(evidenceUrl)) {
      setWaterPointFeedback('An HTTPS evidence URL is required to verify a location.')
      return
    }
    if (evidenceUrl) {
      try {
        if (new URL(evidenceUrl).protocol !== 'https:') throw new Error()
      } catch {
        setWaterPointFeedback('Evidence URLs must use HTTPS.')
        return
      }
    }

    setWaterPointReviewSubmitting((current) => ({ ...current, [point.id]: true }))
    setWaterPointFeedback('')
    try {
      await updateSharedWaterPoint({
        id: point.id,
        verificationStatus,
        availabilityStatus,
        explanation,
        evidenceUrl: evidenceUrl || null,
      })
      setSharedWaterPoints(await refreshSharedWaterPoints())
      setWaterPointFeedback('Verification decision saved with an audit-history entry. Location verification does not confirm current water availability.')
    } catch (error) {
      setWaterPointFeedback(error instanceof Error
        ? error.message
        : 'The verification decision could not be saved. Check your connection and retry.')
    } finally {
      setWaterPointReviewSubmitting((current) => ({ ...current, [point.id]: false }))
    }
  }

  async function handleRefreshSharedData() {
    setSharedLoading(true)
    try {
      setSharedIncidents(await refreshSharedIncidents())
      setSharedError('')
    } catch (error) {
      setSharedError(error instanceof Error ? error.message : 'Shared reports could not be refreshed.')
    } finally {
      setSharedLoading(false)
    }
  }

  async function handleLegacyImport() {
    const selected = storedData.incidents.filter((incident) => legacySelectedIds.includes(incident.id))
    if (!selected.length) {
      setLegacyImportFeedback('Select at least one local report to import.')
      return
    }
    setLegacyImporting(true)
    setLegacyImportFeedback('')
    try {
      const importedCount = await importLegacyIncidents(selected)
      setSharedIncidents(await refreshSharedIncidents())
      setSharedError('')
      setLegacyImportFeedback(`${importedCount} selected report(s) imported as unverified. Your original browser records remain unchanged.`)
    } catch (error) {
      setLegacyImportFeedback(error instanceof Error
        ? `${error.message} You can retry safely; the migration uses each local report ID to prevent duplicates.`
        : 'Import could not be completed. Your local records remain unchanged.')
    } finally {
      setLegacyImporting(false)
    }
  }

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

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reportSubmitting) return
    const formData = new FormData(event.currentTarget)
    const area = String(formData.get('area') ?? '').trim()
    const municipality = String(formData.get('municipality') ?? '').trim()
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
    if (mode === 'supabase') {
      const submissionKey = reportSubmissionKey || crypto.randomUUID()
      if (!reportSubmissionKey) setReportSubmissionKey(submissionKey)
      setReportSubmitting(true)
      setReportFormError('')
      setReportFeedback('')
      try {
        const newIncident = await createSharedIncident({
          reporterId: user.id,
          area,
          municipality: municipality || null,
          category,
          severity,
          description,
          observedAt: new Date(observedAt).toISOString(),
          submissionKey,
        })
        setSharedIncidents((current) => [
          newIncident,
          ...current.filter((incident) => incident.id !== newIncident.id),
        ])
        setSelectedIncident(newIncident)
        setReportSubmitted(true)
      } catch (error) {
        setReportFeedback(error instanceof Error
          ? error.message
          : 'The shared report could not be saved. Your form is still open; check your connection before retrying.')
      } finally {
        setReportSubmitting(false)
      }
      return
    }

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
      municipality: municipality || null,
      reported,
      reportedAt: now.toISOString(),
      reporterId: user.id,
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

  async function updateIncidentStatus(event: FormEvent<HTMLFormElement>, incident: Incident) {
    event.preventDefault()
    if (!canReview) {
      setReviewFeedback((current) => ({ ...current, [incident.id]: 'Your role cannot update incident statuses.' }))
      return
    }
    const formData = new FormData(event.currentTarget)
    const nextStatus = String(formData.get('status') ?? '') as IncidentStatus
    const note = String(formData.get('note') ?? '').trim()
    const verificationClassification = String(formData.get('verificationClassification') ?? 'reviewed')
    const evidenceUrl = String(formData.get('evidenceUrl') ?? '').trim()

    if (mode === 'supabase') {
      if (!reportStatuses.includes(nextStatus)) {
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Choose a valid status before saving.' }))
        return
      }
      if (nextStatus === incident.status
        && verificationClassification === incident.verificationClassification
        && evidenceUrl === (incident.evidenceUrl ?? '')) {
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Choose a different status or verification classification.' }))
        return
      }
      if (!note) {
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Enter an explanation for this review decision.' }))
        return
      }
      if (!['unverified', 'reviewed', 'corroborated', 'externally_verified'].includes(verificationClassification)) {
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Choose a valid verification classification.' }))
        return
      }
      if (['corroborated', 'externally_verified'].includes(verificationClassification)
        && !/^https:\/\//i.test(evidenceUrl)) {
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Add an HTTPS evidence URL for corroborated or externally verified reports.' }))
        return
      }

      setReviewSubmitting((current) => ({ ...current, [incident.id]: true }))
      try {
        await reviewSharedIncident({
          id: incident.id,
          status: nextStatus,
          verificationClassification: verificationClassification as NonNullable<Incident['verificationClassification']>,
          explanation: note,
          evidenceUrl: evidenceUrl || null,
        })
        const latestIncidents = await refreshSharedIncidents()
        setSharedIncidents(latestIncidents)
        const updatedIncident = latestIncidents.find((item) => item.id === incident.id)
        if (updatedIncident && selectedIncident.id === incident.id) setSelectedIncident(updatedIncident)
        setReviewFeedback((current) => ({ ...current, [incident.id]: 'Review saved to the shared service and added to status history.' }))
      } catch (error) {
        setReviewFeedback((current) => ({
          ...current,
          [incident.id]: error instanceof Error ? error.message : 'Could not save this review. Check your connection and retry.',
        }))
      } finally {
        setReviewSubmitting((current) => ({ ...current, [incident.id]: false }))
      }
      return
    }

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
          {pages.filter((item) => canAccessPage(user.role, item.id) && (item.id !== 'admin' || mode === 'supabase')).map((item) => (
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
                <span>{roleLabels[user.role]} · {mode === 'demo' ? 'Demo session' : 'Account session'}</span>
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
          <div className="sidebar-footnote"><span className="footnote-dot" /> {mode === 'demo' ? 'Demonstration view' : 'Shared service'}</div>
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
            <button ref={reportTriggerRef} className="button button-primary top-report-button" type="button" onClick={() => { setReportOpen(true); setReportSubmitted(false); setReportFormError(''); setReportFeedback(''); setReportSubmissionKey(crypto.randomUUID()); setObservedAtDefault(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)) }}>
              <Icon name="plus" size={17} /><span>Report an outage</span>
            </button>
          </div>
        </header>

        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">AQUATRACE <span> / </span> COMMUNITY</div>
              <h1>{pageTitles[page]}</h1>
                  <p>{page === 'dashboard' ? 'A clearer view of water interruptions and nearby alternatives.' : page === 'reports' ? 'Browse reported interruptions and follow their latest status.' : page === 'review' ? 'Review community submissions and record an explicit status update.' : page === 'water-points' ? 'Explore source-attributed water-point information.' : page === 'admin' ? 'Manage account roles and inspect role-change history.' : 'Follow the timeline and details of this report.'}</p>
            </div>
            {page === 'details' && <button className="button button-secondary back-button" type="button" onClick={() => navigate('reports')}>← All reports</button>}
          </div>
          {mode === 'supabase' && (
            <div className={`shared-sync-notice ${sharedError ? 'shared-sync-error' : ''}`} role={sharedError ? 'alert' : 'status'}>
              <span>{sharedError
                ? `Shared service unavailable${navigator.onLine ? '' : ' (offline)'}. ${sharedError} Previously loaded records are still shown.`
                : sharedLoading ? 'Loading shared community reports…' : 'Shared community reports · refreshes automatically every 20 seconds.'}</span>
              <button type="button" onClick={() => { void handleRefreshSharedData() }} disabled={sharedLoading}>Refresh</button>
            </div>
          )}
          {mode === 'demo' && storageNotice && <div className="storage-notice" role="status">{storageNotice}</div>}
          {mode === 'supabase' && storedData.incidents.length > 0 && (
            <div className="legacy-import-notice">
              <p><strong>{storedData.incidents.length} local report(s) remain on this browser.</strong> They are never uploaded automatically. Review and select reports to import; imported copies start Unverified, retain the original displayed submission date as a note, and the original local records stay intact.</p>
              <button type="button" className="button button-secondary" onClick={() => { setLegacyImportOpen(true); setLegacyImportFeedback(''); setLegacySelectedIds([]) }}>Review local reports</button>
            </div>
          )}

          {page === 'dashboard' && (
            <>
              <div className="notice-banner">
                <span className="notice-icon"><Icon name="alert" size={17} /></span>
                <p><strong>Historical source reports are not live service information.</strong> {mode === 'supabase' ? 'Community reports are shared; their review status is not proof of current service availability.' : 'Community reports and review statuses are browser-local and unverified unless independently supported.'}</p>
                <span className="report-origin report-origin-historical">Historical · sourced</span>
              </div>

              <section className="metric-grid" aria-label="Community overview metrics">
                <article className="metric-card"><span className="metric-label">Historical sourced incidents</span><strong>{historicalIncidents.length}</strong><span className="metric-note"><span className="metric-bullet blue" />Time-bound source records</span><span className="metric-icon"><Icon name="alert" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">{mode === 'supabase' ? 'Shared community reports' : 'Community reports'}</span><strong>{allIncidents.length}</strong><span className="metric-note"><span className="metric-bullet amber" />{mode === 'supabase' ? 'Shared; unverified by default' : 'Browser-local; unverified by default'}</span><span className="metric-icon"><Icon name="pin" size={19} /></span></article>
                <article className="metric-card"><span className="metric-label">{mode === 'supabase' ? 'Sourced water points' : 'Fictional water points'}</span><strong>{mode === 'supabase' ? waterPointsLoading ? '…' : sharedWaterPoints.length : waterPoints.length}</strong><span className="metric-note"><span className="metric-bullet green" />{mode === 'supabase' ? 'Location and availability tracked separately' : 'Availability is not verified'}</span><span className="metric-icon"><Icon name="drop" size={19} /></span></article>
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
              <section className="next-step-banner"><div className="next-step-icon"><Icon name="drop" size={20} /></div><div><h2>Looking for another water source?</h2><p>{mode === 'supabase' ? 'Browse source-attributed locations; verification and availability are tracked separately.' : 'Browse the fictional directory; listed availability is not verified.'}</p></div><button className="button button-secondary" type="button" onClick={() => navigate('water-points')}>Explore water points <Icon name="arrow" size={16} /></button></section>
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
                  <article><span>Community reports</span><strong>{allIncidents.length}</strong></article>
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
                <div className="panel-heading"><div><h2>Possible repeat locations</h2><p>{mode === 'supabase' ? 'Repeated reports in the shared dataset' : 'Repeated community reports in this browser only'}</p></div><ReportOriginLabel /></div>
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
                <div className="panel-heading"><div><h2>Reports over time</h2><p>Latest six months with reports · community submissions only</p></div><Icon name="clock" size={18} /></div>
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
                <p><strong>Community reports only.</strong> {mode === 'supabase'
                  ? 'Reviewer and administrator access is enforced by database role checks; review decisions are recorded in shared history. This does not make a status an official municipal determination.'
                  : 'Access is limited to the Incident Reviewer and Administrator demo roles. This is demonstration authentication, not production security, and status changes are saved only in this browser.'} Historical source records are read-only and no municipality receives reports or updates.</p>
              </div>
              {sharedLoading && mode === 'supabase' && <p className="insight-empty" role="status">Loading reports for review…</p>}
              {!allIncidents.length && !sharedLoading && (
                <div className="empty-state review-empty" role="status">
                  <Icon name="check" size={22} />
                  <strong>No community-submitted reports to review</strong>
                  <span>New reports will appear here with Unverified status.</span>
                </div>
              )}
              <div className="review-list">
                {allIncidents.map((incident) => (
                  <article className="panel review-card" key={incident.id}>
                    <div className="review-card-header">
                      <div>
                        <div className="review-card-kicker">COMMUNITY SUBMISSION <span>·</span> {incident.publicId ?? incident.id}</div>
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
                      {mode === 'supabase' && <div><span>Verification classification</span><strong>{incident.verificationClassification ?? 'unverified'}</strong></div>}
                    </div>
                    <form className="review-form" onSubmit={(event) => updateIncidentStatus(event, incident)}>
                      <label className="review-status-field" htmlFor={`review-status-${incident.id}`}>Update status
                        <select id={`review-status-${incident.id}`} name="status" defaultValue={incident.status}>
                          {reportStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                      {mode === 'supabase' && <label className="review-status-field" htmlFor={`review-verification-${incident.id}`}>Evidence classification
                        <select id={`review-verification-${incident.id}`} name="verificationClassification" defaultValue={incident.verificationClassification ?? 'reviewed'}>
                          <option value="unverified">Unverified</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="corroborated">Corroborated by source</option>
                          <option value="externally_verified">Externally verified</option>
                        </select>
                      </label>}
                      <label className="review-note-field" htmlFor={`review-note-${incident.id}`}>{mode === 'supabase' ? 'Review explanation (required)' : 'Optional note'}
                        <input id={`review-note-${incident.id}`} name="note" maxLength={mode === 'supabase' ? 1000 : 240} required={mode === 'supabase'} placeholder="Reason or review context" />
                      </label>
                      {mode === 'supabase' && <label className="review-note-field" htmlFor={`review-evidence-${incident.id}`}>Evidence URL (required for corroborated classifications)
                        <input id={`review-evidence-${incident.id}`} name="evidenceUrl" type="url" pattern="https://.*" maxLength={1000} defaultValue={incident.evidenceUrl ?? ''} placeholder="https://…" />
                      </label>}
                      <button className="button button-primary" type="submit" disabled={reviewSubmitting[incident.id]}>{reviewSubmitting[incident.id] ? 'Saving…' : 'Save update'}</button>
                      {reviewFeedback[incident.id] && <p className={`review-feedback ${/^(Update saved|Review saved)/.test(reviewFeedback[incident.id]) ? 'review-feedback-success' : ''}`} role="status">{reviewFeedback[incident.id]}</p>}
                    </form>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === 'admin' && mode === 'supabase' && user.role === 'admin' && (
            <section className="admin-view">
              <div className="notice-banner"><span className="notice-icon"><Icon name="alert" size={17} /></span><p><strong>Role changes affect database permissions.</strong> Assign reviewer or administrator roles only to authorised people. Changes are recorded with an explanation and cannot be changed by residents.</p></div>
              {adminError && <p className="form-error" role="alert">{adminError}</p>}
              {adminFeedback && <p className="shared-feedback" role="status">{adminFeedback}</p>}
              {adminLoading && <p className="insight-empty" role="status">Loading authorised accounts and role audit history…</p>}
              <section className="panel admin-profiles-panel">
                <div className="panel-heading"><div><h2>Account access</h2><p>Role changes require an administrator and an explanation.</p></div></div>
                {adminProfiles.length ? <div className="admin-profile-list">{adminProfiles.map((profile) => (
                  <article className="admin-profile-row" key={profile.id}>
                    <div className="admin-profile-identity"><strong>{profile.name}</strong><span>{profile.email}</span><small>Created {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(profile.createdAt))}</small></div>
                    <form className="admin-role-form" onSubmit={(event) => { void changeAccountRole(event, profile) }}>
                      <label className="form-label" htmlFor={`account-role-${profile.id}`}>Role<select id={`account-role-${profile.id}`} name="role" defaultValue={profile.role} disabled={profile.id === user.id || adminSubmitting[profile.id]}>{(['resident', 'reviewer', 'admin'] as const).map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
                      <label className="form-label" htmlFor={`account-role-reason-${profile.id}`}>Reason<input id={`account-role-reason-${profile.id}`} name="explanation" required maxLength={500} placeholder="Why is this access needed?" disabled={profile.id === user.id || adminSubmitting[profile.id]} /></label>
                      <button className="button button-secondary" type="submit" disabled={profile.id === user.id || adminSubmitting[profile.id]}>{adminSubmitting[profile.id] ? 'Saving…' : 'Update role'}</button>
                      {profile.id === user.id && <span className="admin-self-note">You cannot change your own role.</span>}
                    </form>
                  </article>
                ))}</div> : !adminLoading && <p className="insight-empty">No registered accounts are available.</p>}
              </section>
              <section className="panel admin-audit-panel">
                <div className="panel-heading"><div><h2>Role audit history</h2><p>Database-recorded role assignments</p></div></div>
                {adminRoleChanges.length ? <ol className="admin-audit-list">{adminRoleChanges.map((change) => {
                  const target = adminProfiles.find((profile) => profile.id === change.profileId)
                  return <li key={change.id}><strong>{target?.email ?? change.profileId}</strong><span>{change.previousRole ? `${roleLabels[change.previousRole]} → ` : 'Initial access: '}{roleLabels[change.newRole]} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(change.createdAt))}</span><p>{change.explanation}</p></li>
                })}</ol> : !adminLoading && <p className="insight-empty">No role changes have been recorded.</p>}
              </section>
            </section>
          )}

          {page === 'water-points' && mode === 'supabase' && (
            <section className="water-points-workspace">
              {canReview && (
                <section className="panel water-point-contribution">
                  <div className="panel-heading"><div><h2>Add a source-backed water point</h2><p>New entries start Unverified with Availability unknown. Do not enter a point without an inspectable original source.</p></div></div>
                  <form className="water-point-add-form" onSubmit={(event) => { void submitWaterPoint(event) }}>
                    <label className="form-label" htmlFor="point-name">Name <span className="required-mark">Required</span><input id="point-name" name="pointName" required maxLength={160} /></label>
                    <label className="form-label" htmlFor="point-location">Physical location <span className="required-mark">Required</span><input id="point-location" name="pointLocation" required maxLength={300} /></label>
                    <label className="form-label" htmlFor="point-municipality">Municipality <span className="required-mark">Required</span><input id="point-municipality" name="pointMunicipality" required maxLength={120} /></label>
                    <label className="form-label" htmlFor="point-type">Water-point type <span className="required-mark">Required</span><input id="point-type" name="pointType" required maxLength={80} placeholder="e.g. municipal standpipe" /></label>
                    <label className="form-label" htmlFor="point-latitude">Latitude <span>Optional</span><input id="point-latitude" name="pointLatitude" type="number" min="-90" max="90" step="any" /></label>
                    <label className="form-label" htmlFor="point-longitude">Longitude <span>Optional</span><input id="point-longitude" name="pointLongitude" type="number" min="-180" max="180" step="any" /></label>
                    <label className="form-label" htmlFor="point-source">Source publisher <span className="required-mark">Required</span><input id="point-source" name="pointSource" required maxLength={200} /></label>
                    <label className="form-label" htmlFor="point-source-url">Original source URL <span className="required-mark">Required</span><input id="point-source-url" name="pointSourceUrl" type="url" pattern="https://.*" required maxLength={1000} placeholder="https://…" /></label>
                    <label className="form-label water-point-source-review" htmlFor="point-explanation">Source inspection notes <span className="required-mark">Required</span><textarea id="point-explanation" name="pointExplanation" required maxLength={1000} rows={2} placeholder="What does the source establish about this location?" /></label>
                    <div className="water-point-add-actions">
                      <p className="form-note">A location can be verified without claiming that water is currently available. Availability is tracked separately.</p>
                      <button className="button button-primary" type="submit" disabled={waterPointSubmitting}>{waterPointSubmitting ? 'Saving…' : 'Save as unverified'}</button>
                    </div>
                  </form>
                </section>
              )}
              {waterPointFeedback && <p className="shared-feedback" role="status">{waterPointFeedback}</p>}
              <section className="panel listing-panel">
                <div className="listing-heading">
                  <div><h2>Sourced water-point directory</h2><p>Location verification and current availability are different claims. Availability may be unknown or stale.</p></div>
                  <button className="button button-secondary" type="button" onClick={() => { void handleRefreshSharedWaterPoints() }} disabled={waterPointsLoading}>Refresh</button>
                </div>
                <div className="filters-row">
                  <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Search water points by name, location or source</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, municipality or source" /></label>
                  <label className="filter-label"><span className="sr-only">Filter water points by verification and availability</span><select value={waterPointStatusFilter} onChange={(event) => setWaterPointStatusFilter(event.target.value)}>
                    <option value="all">All verification and availability states</option>
                    <option value="unverified">Unverified</option><option value="under_review">Under review</option><option value="verified">Verified location</option><option value="available">Availability reported available</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="unknown">Availability unknown</option><option value="closed_or_removed">Closed or removed</option>
                  </select></label>
                </div>
                {waterPointsError && <p className="form-error" role="alert">{waterPointsError} Previously loaded records remain visible.</p>}
                {waterPointsLoading && <p className="insight-empty" role="status">Loading source-backed water points…</p>}
                {!waterPointsLoading && !filteredSharedWaterPoints.length && (
                  <div className="empty-state"><Icon name="search" size={22} /><strong>{sharedWaterPoints.length ? 'No water points match these filters' : 'No source-backed water points have been added'}</strong><span>Unverified example locations are not shown as real places. A reviewer must add an inspectable source before a record appears here.</span></div>
                )}
                <div className="water-point-grid">
                  {filteredSharedWaterPoints.map((point) => (
                    <article className="water-point-card shared-water-point-card" key={point.id}>
                      <div className="point-card-top"><span className="point-icon"><Icon name="drop" size={19} /></span><span className={`availability availability-${point.availabilityStatus}`}>{point.availabilityStatus.replaceAll('_', ' ')}</span></div>
                      <h3>{point.name}</h3>
                      <p className="point-area"><Icon name="pin" size={14} />{point.physicalLocation} · {point.municipality}</p>
                      <div className="point-details"><span>{point.type}</span><span>Location: {point.verificationStatus.replaceAll('_', ' ')}</span></div>
                      {point.latitude !== null && point.longitude !== null && <p className="point-coordinate">Coordinates: {point.latitude}, {point.longitude}</p>}
                      <div className="point-source"><span>Source: {point.source}</span><a className="source-link" href={point.sourceUrl} target="_blank" rel="noopener noreferrer">Open original source <Icon name="arrow" size={14} /></a></div>
                      <div className="point-details"><span>Last location verification: {point.lastVerificationDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(point.lastVerificationDate)) : 'Not verified'}</span><span>Availability update: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(point.lastAvailabilityUpdate))}</span></div>
                      <p className="point-trust">Verified location does not mean water is currently available.</p>
                      <details className="water-point-history"><summary>Verification and availability history ({point.history.length})</summary>
                        {point.history.length ? <ol>{point.history.map((entry) => <li key={entry.id}><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</strong><span>Location: {entry.previousVerificationStatus?.replaceAll('_', ' ') ?? 'new'} → {entry.newVerificationStatus.replaceAll('_', ' ')}; availability: {entry.previousAvailabilityStatus?.replaceAll('_', ' ') ?? 'new'} → {entry.newAvailabilityStatus.replaceAll('_', ' ')}</span><p>{entry.explanation}</p>{entry.evidenceUrl && <a className="source-link" href={entry.evidenceUrl} target="_blank" rel="noopener noreferrer">Review evidence <Icon name="arrow" size={14} /></a>}</li>)}</ol> : <p>No reviewer changes are recorded.</p>}
                      </details>
                      {canReview && <form className="water-point-review-form" onSubmit={(event) => { void updateWaterPoint(event, point) }}>
                        <label className="form-label" htmlFor={`point-verification-${point.id}`}>Location verification status<select id={`point-verification-${point.id}`} name="verificationStatus" defaultValue={point.verificationStatus}><option value="unverified">Unverified</option><option value="under_review">Under review</option><option value="verified">Verified location</option><option value="closed_or_removed">Closed or removed</option></select></label>
                        <label className="form-label" htmlFor={`point-availability-${point.id}`}>Availability status<select id={`point-availability-${point.id}`} name="availabilityStatus" defaultValue={point.availabilityStatus}><option value="unknown">Availability unknown</option><option value="available">Reported available</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="closed_or_removed">Closed or removed</option></select></label>
                        <label className="form-label" htmlFor={`point-evidence-${point.id}`}>Evidence URL (required to verify)<input id={`point-evidence-${point.id}`} name="evidenceUrl" type="url" pattern="https://.*" maxLength={1000} defaultValue={point.sourceUrl} /></label>
                        <label className="form-label" htmlFor={`point-explanation-${point.id}`}>Explanation <textarea id={`point-explanation-${point.id}`} name="explanation" required maxLength={1000} rows={2} /></label>
                        <button className="button button-primary" type="submit" disabled={waterPointReviewSubmitting[point.id]}>{waterPointReviewSubmitting[point.id] ? 'Saving…' : 'Save review'}</button>
                      </form>}
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {page === 'water-points' && mode === 'demo' && (
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
                <div className="detail-report-id">Report ID: <code>{selectedIncident.publicId ?? selectedIncident.id}</code></div>
                <div className="detail-meta"><span><Icon name="pin" size={16} />{selectedIncident.area}</span><span><Icon name="clock" size={16} />Reported {selectedIncident.reported}</span><span>Observed: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedIncident.observedAt))}</span></div>
                <div className="detail-sample"><ReportOriginLabel /><span className="detail-category">{selectedIncident.category}</span></div>
                {selectedIncident.legacyReporterLabel && <div className="detail-section"><h3>Original local account</h3><p>{selectedIncident.legacyReporterLabel}. This legacy label is not an authenticated identity; the signed-in importer is the shared record's reporter.</p></div>}
                {canReview && <button className="button button-secondary detail-review-button" type="button" onClick={() => navigate('review')}>Open reviewer workflow</button>}
                <div className="detail-section"><h3>About this report</h3><p>{selectedIncident.description}</p></div>
                <div className="detail-section"><h3>What this status means</h3><p>{selectedIncident.statusDescription}</p></div>
                {selectedIncident.evidenceUrl && <div className="detail-section"><h3>Review evidence</h3><a className="source-link" href={selectedIncident.evidenceUrl} target="_blank" rel="noopener noreferrer">Open reviewer-linked evidence in a new tab <Icon name="arrow" size={15} /></a></div>}
                <div className="detail-disclaimer"><Icon name="alert" size={16} /><span>{mode === 'supabase'
                  ? 'Shared community report. Review labels and external evidence links are attributed to a reviewer; AquaTrace does not provide official municipal verification or live service status.'
                  : 'This community-submitted report and its status are local prototype records. AquaTrace has not independently verified it or contacted an authority.'}</span></div>
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
                      {change.evidenceUrl && <a className="source-link" href={change.evidenceUrl} target="_blank" rel="noopener noreferrer">Review evidence <Icon name="arrow" size={14} /></a>}
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

      {legacyImportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !legacyImporting) setLegacyImportOpen(false) }}>
          <section className="report-modal legacy-import-modal" role="dialog" aria-modal="true" aria-labelledby="legacy-import-title" tabIndex={-1}>
            <div className="modal-heading">
              <div><span className="eyebrow">OPTIONAL LOCAL DATA MIGRATION</span><h2 id="legacy-import-title">Review browser-only reports</h2></div>
              <button type="button" className="icon-button" aria-label="Close local report review" disabled={legacyImporting} onClick={() => setLegacyImportOpen(false)}><Icon name="close" /></button>
            </div>
            <p className="modal-intro">Nothing uploads until you select reports and choose Import. Each selected report is re-submitted by your signed-in account as Unverified; local status labels and review history are not treated as authenticated evidence. Original browser records are not deleted.</p>
            <div className="legacy-import-list">
              {storedData.incidents.map((incident) => (
                <label key={incident.id} className="legacy-import-item">
                  <input
                    type="checkbox"
                    checked={legacySelectedIds.includes(incident.id)}
                    disabled={legacyImporting}
                    onChange={(event) => setLegacySelectedIds((current) => event.target.checked
                      ? [...current, incident.id]
                      : current.filter((id) => id !== incident.id))}
                  />
                  <span><strong>{incident.area} · {incident.category}</strong><span>Observed {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(incident.observedAt))} · Local status: {incident.status}</span><small>{incident.description}</small></span>
                </label>
              ))}
            </div>
            {legacyImportFeedback && <p className="form-note" role="status">{legacyImportFeedback}</p>}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" disabled={legacyImporting} onClick={() => setLegacyImportOpen(false)}>Cancel</button>
              <button className="button button-primary" type="button" disabled={legacyImporting || !legacySelectedIds.length} onClick={() => { void handleLegacyImport() }}>
                {legacyImporting ? 'Importing…' : `Import ${legacySelectedIds.length} selected`}
              </button>
            </div>
          </section>
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false) }}>
          <section ref={reportDialogRef} className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" tabIndex={-1} onKeyDown={handleReportDialogKeyDown}>
            <div className="modal-heading"><div><span className="eyebrow">COMMUNITY REPORT</span><h2 id="report-modal-title">{reportSubmitted ? 'Thanks for your report' : 'Report a water outage'}</h2></div><button type="button" className="icon-button" aria-label="Close report form" onClick={() => setReportOpen(false)}><Icon name="close" /></button></div>
            {reportSubmitted ? (
              <div className="submission-message">
                <span className="submission-icon"><Icon name="check" size={21} /></span>
                <p>Your report was added with <strong>Unverified</strong> status. {mode === 'supabase' ? 'It is now available in the shared AquaTrace service.' : 'It is saved only in this browser.'} It has not been independently confirmed or sent to a municipality.</p>
                {selectedIncident && !isHistoricalIncident(selectedIncident) && <p className="form-note">Report ID: <code>{selectedIncident.publicId ?? selectedIncident.id}</code></p>}
                {reportFeedback && <p className="form-error" role="status">{reportFeedback}</p>}
                {!reportFeedback && mode === 'demo' && <p className="form-note">Saved in this browser only.</p>}
                <button className="button button-primary" type="button" onClick={() => setReportOpen(false)}>Done</button>
              </div>
            ) : (
              <>
                <p className="modal-intro">{mode === 'supabase'
                  ? 'Share what you observed. The report is shared with AquaTrace users and starts Unverified; it is not sent to an authority.'
                  : 'Share what you observed. Reports are saved in this browser only and are not sent to an authority.'}</p>
                <form noValidate aria-busy={reportSubmitting} onSubmit={(event) => { void submitReport(event) }}>
                  <label className="form-label" htmlFor="report-area">Location or community <span className="required-mark">Required</span><input id="report-area" name="area" required maxLength={100} placeholder="e.g. Mamelodi, Tshwane" /></label>
                  <label className="form-label" htmlFor="report-municipality">Municipality <span>Optional</span><input id="report-municipality" name="municipality" maxLength={120} placeholder="e.g. City of Tshwane" /></label>
                  <label className="form-label" htmlFor="report-category">Outage category <span className="required-mark">Required</span><select id="report-category" name="category" required defaultValue=""><option value="" disabled>Select a category</option>{reportCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="form-label" htmlFor="report-severity">Severity <span className="required-mark">Required</span><select id="report-severity" name="severity" required defaultValue=""><option value="" disabled>Select severity</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                  <label className="form-label" htmlFor="report-observed">Date and time observed <span className="required-mark">Required</span><input id="report-observed" name="observedAt" type="datetime-local" required defaultValue={observedAtDefault} /></label>
                  <label className="form-label" htmlFor="report-description">Issue description <span className="required-mark">Required</span><textarea id="report-description" name="description" required maxLength={1000} rows={3} placeholder="Describe what you noticed…" /></label>
                  {reportFormError && <p className="form-error" role="alert">{reportFormError}</p>}
                  {reportFeedback && <p className="form-error" role="alert">{reportFeedback}</p>}
                  <p className="form-note"><Icon name="alert" size={15} />Please do not include personal or sensitive information.</p>
                  <div className="modal-actions"><button className="button button-secondary" type="button" disabled={reportSubmitting} onClick={() => setReportOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={reportSubmitting}>{reportSubmitting ? 'Saving…' : 'Submit report'} <Icon name="arrow" size={16} /></button></div>
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
  const { user, logout, loading, passwordRecovery } = useAuth()
  if (loading) {
    return <main className="auth-loading" role="status">Loading your AquaTrace session…</main>
  }
  if (passwordRecovery) return <LoginPage />
  return user ? <Workspace user={user} onLogout={logout} /> : <LoginPage />
}

export default App
