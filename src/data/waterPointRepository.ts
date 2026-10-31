import { supabase } from '../auth/supabaseClient'

export type WaterPointVerificationStatus = 'unverified' | 'under_review' | 'verified' | 'closed_or_removed'
export type WaterPointAvailabilityStatus = 'available' | 'temporarily_unavailable' | 'unknown' | 'closed_or_removed'

export interface SharedWaterPointHistory {
  id: number
  previousVerificationStatus: WaterPointVerificationStatus | null
  newVerificationStatus: WaterPointVerificationStatus
  previousAvailabilityStatus: WaterPointAvailabilityStatus | null
  newAvailabilityStatus: WaterPointAvailabilityStatus
  reviewerId: string | null
  explanation: string
  evidenceUrl: string | null
  createdAt: string
}

export interface SharedWaterPoint {
  id: string
  name: string
  physicalLocation: string
  municipality: string
  latitude: number | null
  longitude: number | null
  type: string
  source: string
  sourceUrl: string
  verificationStatus: WaterPointVerificationStatus
  lastVerificationDate: string | null
  availabilityStatus: WaterPointAvailabilityStatus
  lastAvailabilityUpdate: string
  history: SharedWaterPointHistory[]
}

export interface NewWaterPointInput {
  name: string
  physicalLocation: string
  municipality: string
  latitude: number | null
  longitude: number | null
  type: string
  source: string
  sourceUrl: string
  explanation: string
}

export interface UpdateWaterPointInput {
  id: string
  verificationStatus: WaterPointVerificationStatus
  availabilityStatus: WaterPointAvailabilityStatus
  explanation: string
  evidenceUrl: string | null
}

interface WaterPointRow {
  id: string
  name: string
  physical_location: string
  municipality: string
  latitude: number | null
  longitude: number | null
  water_point_type: string
  data_source: string
  data_source_url: string
  verification_status: WaterPointVerificationStatus
  last_verification_date: string | null
  availability_status: WaterPointAvailabilityStatus
  last_availability_update: string
}

interface WaterPointHistoryRow {
  id: number
  water_point_id: string
  previous_verification_status: WaterPointVerificationStatus | null
  new_verification_status: WaterPointVerificationStatus
  previous_availability_status: WaterPointAvailabilityStatus | null
  new_availability_status: WaterPointAvailabilityStatus
  reviewer_id: string | null
  evidence_or_explanation: string
  evidence_url: string | null
  created_at: string
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchSharedWaterPoints(): Promise<SharedWaterPoint[]> {
  const client = requireSupabase()
  const { data: pointData, error: pointError } = await client
    .from('water_points')
    .select('id, name, physical_location, municipality, latitude, longitude, water_point_type, data_source, data_source_url, verification_status, last_verification_date, availability_status, last_availability_update')
    .order('municipality', { ascending: true })
    .order('name', { ascending: true })
  if (pointError) throw new Error(`Could not load sourced water points. ${pointError.message}`)

  const points = (pointData ?? []) as unknown as WaterPointRow[]
  if (!points.length) return []

  const { data: historyData, error: historyError } = await client
    .from('water_point_verification_history')
    .select('id, water_point_id, previous_verification_status, new_verification_status, previous_availability_status, new_availability_status, reviewer_id, evidence_or_explanation, evidence_url, created_at')
    .in('water_point_id', points.map((point) => point.id))
    .order('created_at', { ascending: false })
  if (historyError) throw new Error(`Water points loaded, but verification history could not be loaded. ${historyError.message}`)

  const history = (historyData ?? []) as unknown as WaterPointHistoryRow[]
  const historyByPoint = new Map<string, SharedWaterPointHistory[]>()
  for (const entry of history) {
    const records = historyByPoint.get(entry.water_point_id) ?? []
    records.push({
      id: entry.id,
      previousVerificationStatus: entry.previous_verification_status,
      newVerificationStatus: entry.new_verification_status,
      previousAvailabilityStatus: entry.previous_availability_status,
      newAvailabilityStatus: entry.new_availability_status,
      reviewerId: entry.reviewer_id,
      explanation: entry.evidence_or_explanation,
      evidenceUrl: entry.evidence_url,
      createdAt: entry.created_at,
    })
    historyByPoint.set(entry.water_point_id, records)
  }

  return points.map((point) => ({
    id: point.id,
    name: point.name,
    physicalLocation: point.physical_location,
    municipality: point.municipality,
    latitude: point.latitude,
    longitude: point.longitude,
    type: point.water_point_type,
    source: point.data_source,
    sourceUrl: point.data_source_url,
    verificationStatus: point.verification_status,
    lastVerificationDate: point.last_verification_date,
    availabilityStatus: point.availability_status,
    lastAvailabilityUpdate: point.last_availability_update,
    history: historyByPoint.get(point.id) ?? [],
  }))
}

export async function addSharedWaterPoint(input: NewWaterPointInput): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('add_water_point', {
    point_name: input.name,
    point_location: input.physicalLocation,
    point_municipality: input.municipality,
    point_latitude: input.latitude,
    point_longitude: input.longitude,
    point_type: input.type,
    source_name: input.source,
    source_url: input.sourceUrl,
    explanation: input.explanation,
  })
  if (error) throw new Error(`Could not add the sourced water point. ${error.message}`)
}

export async function updateSharedWaterPoint(input: UpdateWaterPointInput): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('update_water_point', {
    target_water_point_id: input.id,
    next_verification_status: input.verificationStatus,
    next_availability_status: input.availabilityStatus,
    explanation: input.explanation,
    evidence_url: input.evidenceUrl,
  })
  if (error) throw new Error(`Could not save water-point verification. ${error.message}`)
}
