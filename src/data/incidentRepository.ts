import type { Incident, IncidentCategory, IncidentStatus, IncidentStatusChange } from '../data'
import { supabase } from '../auth/supabaseClient'
import { demoAccounts, roleLabels } from '../auth/demoAccounts'

interface SharedIncidentRow {
  id: string
  public_id: string
  reporter_id: string
  area: string
  municipality: string | null
  category: IncidentCategory
  severity: Incident['severity']
  description: string
  observed_at: string
  reported_at: string
  legacy_reported_at: string | null
  legacy_reporter_label: string | null
  status: string
  verification_classification: Incident['verificationClassification']
  evidence_url: string | null
  legacy_reported_label: string | null
}

interface SharedHistoryRow {
  id: number
  incident_id: string
  previous_status: string | null
  new_status: string
  updated_by: string | null
  explanation: string
  evidence_url: string | null
  created_at: string
}

export interface SharedIncidentInput {
  reporterId: string
  area: string
  municipality: string | null
  category: IncidentCategory
  severity: Incident['severity']
  description: string
  observedAt: string
  submissionKey: string
}

export interface IncidentReviewInput {
  id: string
  status: IncidentStatus
  verificationClassification: NonNullable<Incident['verificationClassification']>
  explanation: string
  evidenceUrl: string | null
}

const databaseStatuses: Record<IncidentStatus, string> = {
  Unverified: 'unverified',
  'Under review': 'under_review',
  'More information requested': 'needs_information',
  Confirmed: 'confirmed',
  Resolved: 'resolved',
  Rejected: 'rejected',
}

const displayStatuses: Record<string, IncidentStatus> = Object.fromEntries(
  Object.entries(databaseStatuses).map(([label, value]) => [value, label]),
) as Record<string, IncidentStatus>

function toDisplayStatus(status: string): IncidentStatus {
  const displayStatus = displayStatuses[status]
  if (!displayStatus) throw new Error(`The shared service returned an unsupported incident status: ${status}.`)
  return displayStatus
}

function toIncident(row: SharedIncidentRow, history: SharedHistoryRow[]): Incident {
  const statusHistory: IncidentStatusChange[] = history.map((entry) => ({
    timestamp: entry.created_at,
    previousStatus: entry.previous_status ? toDisplayStatus(entry.previous_status) : 'Unverified',
    newStatus: toDisplayStatus(entry.new_status),
    note: entry.explanation,
    updatedBy: entry.updated_by,
    evidenceUrl: entry.evidence_url,
  }))
  const updates = [{
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.reported_at)),
    title: 'Report submitted',
    description: row.legacy_reported_label
      ? `Imported from local browser storage. Original displayed submission date: ${row.legacy_reported_label}. Shared record created as unverified.`
      : 'Submitted to the shared AquaTrace service. The report remains unverified unless independently supported.',
  }, ...statusHistory.map((change) => ({
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(change.timestamp)),
    title: `Status changed: ${change.previousStatus} → ${change.newStatus}`,
    description: change.note,
  }))]
  const classification = row.verification_classification ?? 'unverified'
  const statusDescription = classification === 'externally_verified'
    ? 'A reviewer recorded external corroboration. Read the linked evidence and review history; this does not establish current service availability.'
    : classification === 'corroborated'
      ? 'A reviewer recorded corroborating evidence. Read the linked source and review history.'
      : classification === 'reviewed'
        ? 'Reviewed by a designated AquaTrace reviewer; this is not necessarily external verification.'
        : 'This community-submitted report has not been independently verified.'

  return {
    id: row.id,
    publicId: row.public_id,
    reporterId: row.reporter_id,
    municipality: row.municipality,
    origin: 'user',
    category: row.category,
    title: row.category,
    area: row.area,
    reported: row.legacy_reported_label ?? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.reported_at)),
    reportedAt: row.legacy_reported_at ?? row.reported_at,
    observedAt: row.observed_at,
    severity: row.severity,
    status: toDisplayStatus(row.status),
    statusHistory,
    description: row.description,
    statusDescription,
    verificationClassification: classification,
    evidenceUrl: row.evidence_url,
    legacyReportedLabel: row.legacy_reported_label,
    legacyReporterLabel: row.legacy_reporter_label,
    updates,
  }
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchSharedIncidents(): Promise<Incident[]> {
  const client = requireSupabase()
  const { data: incidentData, error: incidentError } = await client
    .from('incidents')
    .select('id, public_id, reporter_id, area, municipality, category, severity, description, observed_at, reported_at, legacy_reported_at, legacy_reporter_label, status, verification_classification, evidence_url, legacy_reported_label')
    .order('reported_at', { ascending: false })
  if (incidentError) throw new Error(`Could not load shared reports. ${incidentError.message}`)

  const rows = (incidentData ?? []) as unknown as SharedIncidentRow[]
  if (!rows.length) return []

  const { data: historyData, error: historyError } = await client
    .from('incident_status_history')
    .select('id, incident_id, previous_status, new_status, updated_by, explanation, evidence_url, created_at')
    .in('incident_id', rows.map((row) => row.id))
    .order('created_at', { ascending: true })
  if (historyError) throw new Error(`Reports loaded, but status history could not be loaded. ${historyError.message}`)

  const histories = (historyData ?? []) as unknown as SharedHistoryRow[]
  const byIncident = new Map<string, SharedHistoryRow[]>()
  for (const entry of histories) {
    const entries = byIncident.get(entry.incident_id) ?? []
    entries.push(entry)
    byIncident.set(entry.incident_id, entries)
  }
  return rows.map((row) => toIncident(row, byIncident.get(row.id) ?? []))
}

export async function createSharedIncident(input: SharedIncidentInput): Promise<Incident> {
  const client = requireSupabase()
  const insertResult = await client.from('incidents').insert({
    reporter_id: input.reporterId,
    area: input.area,
    municipality: input.municipality,
    category: input.category,
    severity: input.severity,
    description: input.description,
    observed_at: input.observedAt,
    submission_key: input.submissionKey,
  })

  if (insertResult.error && insertResult.error.code !== '23505') {
    throw new Error(`Could not submit the shared report. ${insertResult.error.message}`)
  }

  const { data, error } = await client
    .from('incidents')
    .select('id, public_id, reporter_id, area, municipality, category, severity, description, observed_at, reported_at, legacy_reported_at, legacy_reporter_label, status, verification_classification, evidence_url, legacy_reported_label')
    .eq('submission_key', input.submissionKey)
    .single()
  if (error || !data) {
    throw new Error(`The report may not have been saved. Check your connection before retrying. ${error?.message ?? ''}`.trim())
  }

  return toIncident(data as unknown as SharedIncidentRow, [])
}

export async function reviewSharedIncident(input: IncidentReviewInput): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('review_incident', {
    target_incident_id: input.id,
    next_status: databaseStatuses[input.status],
    next_verification_classification: input.verificationClassification,
    explanation: input.explanation,
    evidence_url: input.evidenceUrl,
  })
  if (error) throw new Error(`Could not save the review. ${error.message}`)
}

export async function importLegacyIncidents(incidents: Incident[]): Promise<number> {
  const client = requireSupabase()
  let imported = 0

  for (const incident of incidents) {
    const originalReporter = demoAccounts.find((account) => account.id === incident.reporterId)
    const { error } = await client.rpc('import_legacy_incident', {
      legacy_id: incident.id,
      incident_area: incident.area,
      incident_municipality: incident.municipality ?? null,
      incident_category: incident.category,
      incident_severity: incident.severity,
      incident_description: incident.description,
      incident_observed_at: incident.observedAt,
      source_reported_label: incident.reported,
      source_reported_at: incident.reportedAt ?? null,
      source_reporter_label: originalReporter
        ? `${originalReporter.name} (${roleLabels[originalReporter.role]} demo account)`
        : null,
      request_key: crypto.randomUUID(),
    })
    if (error) throw new Error(`Could not import local report ${incident.id}. ${error.message}`)
    imported += 1
  }
  return imported
}
