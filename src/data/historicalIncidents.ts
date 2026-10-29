export type HistoricalIncidentCategory =
  | 'pipe_burst'
  | 'planned_maintenance'
  | 'bulk_supply_interruption'
  | 'supply_restriction'
  | 'low_reservoir_levels'
  | 'contamination_concern'
  | 'unknown'

export type EvidenceClassification = 'official_statement' | 'news_report' | 'unverified_claim'

export interface HistoricalIncident {
  id: string
  incidentDate: string | null
  incidentDateRange: { start: string; end: string } | null
  publicationDate: string
  municipality: string | null
  city: string | null
  affectedAreas: string[]
  category: HistoricalIncidentCategory
  summary: string
  reportedCause: string | null
  reportedStatusAtPublication: string | null
  sourceTitle: string
  sourceUrl: string
  sourcePublisher: string
  evidenceClassification: EvidenceClassification
  addedDate: string
  notes: string
}

export const historicalDataAsOf = '2026-10-27'

export const historicalIncidents: HistoricalIncident[] = [
  {
    id: 'historical-tshwane-hartebeeshoek-2025-07',
    incidentDate: null,
    incidentDateRange: null,
    publicationDate: '2025-07-18',
    municipality: 'City of Tshwane',
    city: 'Tshwane',
    affectedAreas: ['Region 1; specific suburbs not identified in this follow-up'],
    category: 'planned_maintenance',
    summary: 'The City reported that various areas in Region 1 experienced water-supply interruptions during Rand Water maintenance at Hartebeeshoek Reservoir, and that it dispatched water tankers.',
    reportedCause: 'Rand Water cleaning, maintenance and inspection of Hartebeeshoek Reservoir.',
    reportedStatusAtPublication: 'Maintenance was complete, but the City said its fed reservoirs were empty and the distribution network was still filling. Tankers would continue until supply was fully restored; full restoration was not confirmed in this release.',
    sourceTitle: 'Rand Water completes its maintenance of Hartebeeshoek Reservoir which supplies water to parts of Tshwane 18 July 2025 – City of Tshwane',
    sourceUrl: 'https://www.tshwane.gov.za/?p=90138',
    sourcePublisher: 'City of Tshwane',
    evidenceClassification: 'official_statement',
    addedDate: '2026-10-27',
    notes: 'The release confirms interruptions during the 3–18 July maintenance period in unspecified parts of Region 1 and tanker deployment. It does not give precise interruption dates, name affected suburbs, or state when all affected areas were restored.',
  },
  {
    id: 'historical-tshwane-supply-restriction-2026-10',
    incidentDate: null,
    incidentDateRange: { start: '2026-10-26', end: '2026-10-27' },
    publicationDate: '2026-10-26',
    municipality: 'City of Tshwane',
    city: 'Tshwane',
    affectedAreas: [
      'Amandasig',
      'Rosslyn',
      'The Orchards',
      'Ga-Rankuwa',
      'Claremont',
      'Danville',
      'Lotus Gardens',
      'Olievenhoutbosch',
      'Rooihuiskraal',
      'Winterveld',
    ],
    category: 'supply_restriction',
    summary: 'The City said it began reducing or closing supply to selected reservoirs from 18:00 on 26 October until 06:00 on 27 October to stabilise the network. The notice warned that customers in listed zones might experience low pressure or temporary interruptions.',
    reportedCause: 'The City attributed the intervention to exceptionally high consumption in the affected supply areas and pressure on Rand Water’s upstream systems.',
    reportedStatusAtPublication: 'The restrictions had begun and were scheduled to end at 06:00 on 27 October. The City said supply would be reopened gradually afterward; the notice does not confirm completion or area-by-area restoration.',
    sourceTitle: 'Overnight water restrictions to help stabilise supply -26 October 2026 – City of Tshwane',
    sourceUrl: 'https://www.tshwane.gov.za/?p=106772',
    sourcePublisher: 'City of Tshwane',
    evidenceClassification: 'official_statement',
    addedDate: '2026-10-27',
    notes: 'These are examples from the notice’s much longer reservoir-service-area list, not a complete list. The source forecasts possible low pressure or interruptions; it does not confirm household-level outages. This is a dated historical notice, not live status.',
  },
]

const incidentCategories: HistoricalIncidentCategory[] = [
  'pipe_burst',
  'planned_maintenance',
  'bulk_supply_interruption',
  'supply_restriction',
  'low_reservoir_levels',
  'contamination_concern',
  'unknown',
]
const evidenceClassifications: EvidenceClassification[] = [
  'official_statement',
  'news_report',
  'unverified_claim',
]
const coverageStart = '2025-01-01'
const coverageEnd = '2026-12-31'

function isValidIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
}

function assertNonEmpty(value: string, field: string, id: string): void {
  if (!value.trim()) throw new Error(`Historical incident ${id} is missing ${field}.`)
}

export function validateHistoricalIncidents(records: HistoricalIncident[] = historicalIncidents): void {
  const seenIds = new Set<string>()
  for (const record of records) {
    assertNonEmpty(record.id, 'an ID', record.id)
    if (seenIds.has(record.id)) throw new Error(`Duplicate historical incident ID: ${record.id}.`)
    seenIds.add(record.id)

    for (const field of ['publicationDate', 'addedDate'] as const) {
      if (!isValidIsoDate(record[field])) throw new Error(`Historical incident ${record.id} has an invalid ${field}.`)
      if (record[field] > historicalDataAsOf) throw new Error(`Historical incident ${record.id} has a future ${field}.`)
    }

    const dates = record.incidentDateRange
      ? [record.incidentDateRange.start, record.incidentDateRange.end]
      : record.incidentDate ? [record.incidentDate] : []
    for (const date of dates) {
      if (!isValidIsoDate(date) || date < coverageStart || date > coverageEnd || date > historicalDataAsOf) {
        throw new Error(`Historical incident ${record.id} has an invalid or out-of-coverage incident date.`)
      }
    }
    if (record.incidentDateRange && record.incidentDateRange.start > record.incidentDateRange.end) {
      throw new Error(`Historical incident ${record.id} has a reversed incident date range.`)
    }

    if (!incidentCategories.includes(record.category)) {
      throw new Error(`Historical incident ${record.id} has an unsupported category.`)
    }
    if (!evidenceClassifications.includes(record.evidenceClassification)) {
      throw new Error(`Historical incident ${record.id} has an unsupported evidence classification.`)
    }

    for (const field of ['summary', 'sourceTitle', 'sourcePublisher', 'notes'] as const) {
      assertNonEmpty(record[field], field, record.id)
    }
    if (!record.affectedAreas.length || record.affectedAreas.some((area) => !area.trim())) {
      throw new Error(`Historical incident ${record.id} has invalid affected-area information.`)
    }
    if (record.reportedCause !== null) assertNonEmpty(record.reportedCause, 'reportedCause', record.id)
    if (record.reportedStatusAtPublication !== null) {
      assertNonEmpty(record.reportedStatusAtPublication, 'reportedStatusAtPublication', record.id)
    }

    let sourceUrl: URL
    try {
      sourceUrl = new URL(record.sourceUrl)
    } catch {
      throw new Error(`Historical incident ${record.id} has an invalid source URL.`)
    }
    if (sourceUrl.protocol !== 'https:') throw new Error(`Historical incident ${record.id} source URL must use HTTPS.`)
  }
}

validateHistoricalIncidents()
