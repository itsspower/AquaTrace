export type Page = 'dashboard' | 'reports' | 'review' | 'insights' | 'water-points' | 'details'
export type IncidentCategory = 'Water outage' | 'Low water pressure' | 'Water quality concern' | 'Other'
export type IncidentStatus = 'Unverified' | 'Under review' | 'Confirmed' | 'Resolved' | 'Rejected'

export interface IncidentUpdate {
  time: string
  title: string
  description: string
}

export interface IncidentStatusChange {
  timestamp: string
  previousStatus: IncidentStatus
  newStatus: IncidentStatus
  note: string
}

export interface Incident {
  id: string
  origin: 'sample' | 'user'
  category: IncidentCategory
  title: string
  area: string
  reported: string
  observedAt: string
  severity: 'High' | 'Medium' | 'Low'
  status: IncidentStatus
  statusHistory: IncidentStatusChange[]
  description: string
  statusDescription: string
  updates: IncidentUpdate[]
}

export interface WaterPoint {
  id: string
  name: string
  area: string
  sourceType: 'Community tap' | 'Borehole' | 'Water tanker'
  availability: 'Listed' | 'Limited' | 'Unavailable'
  lastVerified: string
}

export const incidents: Incident[] = [
  {
    id: 'sample-001',
    origin: 'sample',
    category: 'Water outage',
    title: 'Intermittent water supply',
    area: 'Mamelodi East, Tshwane',
    reported: 'Today, 09:20',
    observedAt: 'Sample only',
    severity: 'High',
    status: 'Under review',
    statusHistory: [{
      timestamp: '2026-10-26T09:35:00.000Z',
      previousStatus: 'Unverified',
      newStatus: 'Under review',
      note: 'Fictional sample history only; no real review took place.',
    }],
    description: 'Residents in this sample report area have described intermittent water supply since early morning. The source and extent of the issue have not been confirmed.',
    statusDescription: 'This fictional sample uses an illustrative status. No investigation or municipal response has taken place.',
    updates: [
      { time: 'Today · 09:20', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Today · 09:35', title: 'Status set to under review (sample)', description: 'Illustrative status only. No real-world review has taken place.' },
    ],
  },
  {
    id: 'sample-002',
    origin: 'sample',
    category: 'Low water pressure',
    title: 'Low water pressure reported',
    area: 'Soweto, Johannesburg',
    reported: 'Today, 08:05',
    observedAt: 'Sample only',
    severity: 'Medium',
    status: 'Confirmed',
    statusHistory: [{
      timestamp: '2026-10-26T08:40:00.000Z',
      previousStatus: 'Unverified',
      newStatus: 'Confirmed',
      note: 'Fictional sample history only; this is not a real-world confirmation.',
    }],
    description: 'A sample report describes lower-than-usual water pressure in the area. This example is not an independently verified community report.',
    statusDescription: 'This fictional sample uses an illustrative status. It does not indicate a confirmed real-world outage.',
    updates: [
      { time: 'Today · 08:05', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Today · 08:40', title: 'Status set to confirmed (sample)', description: 'Illustrative status only. No real-world confirmation has taken place.' },
    ],
  },
  {
    id: 'sample-003',
    origin: 'sample',
    category: 'Water outage',
    title: 'Unplanned supply interruption',
    area: 'Paarl, Drakenstein',
    reported: 'Yesterday, 16:45',
    observedAt: 'Sample only',
    severity: 'High',
    status: 'Under review',
    statusHistory: [{
      timestamp: '2026-10-25T17:10:00.000Z',
      previousStatus: 'Unverified',
      newStatus: 'Under review',
      note: 'Fictional sample history only; no real review took place.',
    }],
    description: 'This fictional report represents an unplanned supply interruption. No current outage or affected residents are confirmed.',
    statusDescription: 'This fictional sample uses an illustrative status. No investigation or municipal response has taken place.',
    updates: [
      { time: 'Yesterday · 16:45', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: 'Yesterday · 17:10', title: 'Status set to under review (sample)', description: 'Illustrative status only. No real-world review has taken place.' },
    ],
  },
  {
    id: 'sample-004',
    origin: 'sample',
    category: 'Water outage',
    title: 'Supply interruption (sample resolved)',
    area: 'KwaMashu, eThekwini',
    reported: '22 Oct, 11:30',
    observedAt: 'Sample only',
    severity: 'Low',
    status: 'Resolved',
    statusHistory: [{
      timestamp: '2026-10-22T14:00:00.000Z',
      previousStatus: 'Unverified',
      newStatus: 'Resolved',
      note: 'Fictional sample history only; no real outage or restoration is confirmed.',
    }],
    description: 'A fictional, resolved example included to show how completed reports appear. This does not confirm that a real interruption occurred.',
    statusDescription: 'Resolved is an illustrative sample state, not a real-world service restoration confirmation.',
    updates: [
      { time: '22 Oct · 11:30', title: 'Sample report created', description: 'An example report was added to demonstrate the incident timeline.' },
      { time: '22 Oct · 14:00', title: 'Marked resolved (sample)', description: 'Illustrative status only. No real-world verification has taken place.' },
    ],
  },
]

export const waterPoints: WaterPoint[] = [
  { id: 'point-001', name: 'Mamelodi Community Tap', area: 'Mamelodi East, Tshwane', sourceType: 'Community tap', availability: 'Listed', lastVerified: 'Sample only' },
  { id: 'point-002', name: 'Jabulani Community Borehole', area: 'Soweto, Johannesburg', sourceType: 'Borehole', availability: 'Limited', lastVerified: 'Sample only' },
  { id: 'point-003', name: 'Paarl Central Water Tanker', area: 'Paarl, Drakenstein', sourceType: 'Water tanker', availability: 'Listed', lastVerified: 'Sample only' },
  { id: 'point-004', name: 'KwaMashu Public Tap', area: 'KwaMashu, eThekwini', sourceType: 'Community tap', availability: 'Unavailable', lastVerified: 'Sample only' },
]

const incidentStatuses: IncidentStatus[] = ['Unverified', 'Under review', 'Confirmed', 'Resolved', 'Rejected']
const legacyIncidentStatuses = ['Investigating', 'Monitoring']
const incidentCategories: IncidentCategory[] = ['Water outage', 'Low water pressure', 'Water quality concern', 'Other']
const severities: Incident['severity'][] = ['High', 'Medium', 'Low']
const maxFieldLengths = { id: 100, title: 120, area: 100, reported: 100, observedAt: 40, description: 1000, statusDescription: 500 }
const sampleIncidentIds = new Set(incidents.map((incident) => incident.id))

function isValidStoredStatus(value: unknown): boolean {
  return incidentStatuses.includes(value as IncidentStatus) || legacyIncidentStatuses.includes(String(value))
}

function migrateStatus(value: unknown): IncidentStatus {
  return value === 'Investigating' || value === 'Monitoring' ? 'Under review' : value as IncidentStatus
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isIncidentRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.origin === 'user'
    && isNonEmptyString(record.id, maxFieldLengths.id)
    && isNonEmptyString(record.title, maxFieldLengths.title)
    && isNonEmptyString(record.area, maxFieldLengths.area)
    && isNonEmptyString(record.reported, maxFieldLengths.reported)
    && isNonEmptyString(record.observedAt, maxFieldLengths.observedAt)
    && !Number.isNaN(Date.parse(record.observedAt))
    && isNonEmptyString(record.description, maxFieldLengths.description)
    && isNonEmptyString(record.statusDescription, maxFieldLengths.statusDescription)
    && incidentCategories.includes(record.category as IncidentCategory)
    && isValidStoredStatus(record.status)
    && severities.includes(record.severity as Incident['severity'])
    && Array.isArray(record.updates)
    && record.updates.every((update: unknown) => {
      if (!update || typeof update !== 'object') return false
      const item = update as Record<string, unknown>
      return isNonEmptyString(item.time, 100)
        && isNonEmptyString(item.title, 120)
        && isNonEmptyString(item.description, 1000)
    })
    && (record.statusHistory === undefined || (
      Array.isArray(record.statusHistory)
      && record.statusHistory.every((change: unknown) => {
        if (!change || typeof change !== 'object') return false
        const item = change as Record<string, unknown>
        return typeof item.timestamp === 'string'
          && !Number.isNaN(Date.parse(item.timestamp))
          && isValidStoredStatus(item.previousStatus)
          && isValidStoredStatus(item.newStatus)
          && item.previousStatus !== item.newStatus
          && typeof item.note === 'string'
          && item.note.length <= 240
      })
    ))
}

function normalizeIncident(record: Record<string, unknown>): Incident {
  const status = migrateStatus(record.status)
  const statusHistory = ((record.statusHistory ?? []) as IncidentStatusChange[]).map((change) => ({
    ...change,
    previousStatus: migrateStatus(change.previousStatus),
    newStatus: migrateStatus(change.newStatus),
  }))
  return {
    ...record,
    status,
    statusHistory,
  } as Incident
}

export function loadUserIncidents(): {
  incidents: Incident[]
  warning: string | null
  canPersist: boolean
  storageSnapshot: string | null
} {
  try {
    const saved = window.localStorage.getItem('aquatrace-user-reports')
    if (saved === null) return { incidents: [], warning: null, canPersist: true, storageSnapshot: null }

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      return {
        incidents: [],
        warning: 'Saved reports are malformed and have been preserved. New reports are session-only until this data is repaired or cleared.',
        canPersist: false,
        storageSnapshot: saved,
      }
    }

    const seenIds = new Set<string>(sampleIncidentIds)
    const validIncidents: Incident[] = []
    let invalidRecordFound = false
    for (const item of parsed) {
      if (!isIncidentRecord(item) || typeof item.id !== 'string' || seenIds.has(item.id)) {
        invalidRecordFound = true
        continue
      }
      seenIds.add(item.id)
      validIncidents.push(normalizeIncident(item))
    }
    return {
      incidents: validIncidents,
      warning: invalidRecordFound
        ? 'Some saved reports are invalid or have duplicate IDs. The original data is preserved; new reports are session-only until this data is repaired or cleared.'
        : null,
      canPersist: !invalidRecordFound,
      storageSnapshot: saved,
    }
  } catch {
    return {
      incidents: [],
      warning: 'Saved reports are unavailable. New reports are session-only until browser storage is available.',
      canPersist: false,
      storageSnapshot: null,
    }
  }
}

export function saveUserIncidents(userIncidents: Incident[], expectedSnapshot: string | null): string {
  const currentSnapshot = window.localStorage.getItem('aquatrace-user-reports')
  if (currentSnapshot !== expectedSnapshot) {
    throw new Error('Saved reports changed since they were loaded.')
  }
  const nextSnapshot = JSON.stringify(userIncidents)
  window.localStorage.setItem('aquatrace-user-reports', nextSnapshot)
  return nextSnapshot
}
