import { supabase } from '../auth/supabaseClient'
import { isRole, type Role } from '../auth/demoAccounts'

export interface AdminProfile {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface ProfileRoleChange {
  id: number
  profileId: string
  previousRole: Role | null
  newRole: Role
  changedBy: string | null
  explanation: string
  createdAt: string
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchAdminProfiles(): Promise<{
  profiles: AdminProfile[]
  roleChanges: ProfileRoleChange[]
}> {
  const client = requireSupabase()
  const [{ data: profileData, error: profileError }, { data: historyData, error: historyError }] = await Promise.all([
    client.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: true }),
    client.from('profile_role_history').select('id, profile_id, previous_role, new_role, changed_by, explanation, created_at').order('created_at', { ascending: false }),
  ])
  if (profileError) throw new Error(`Could not load authorised profiles. ${profileError.message}`)
  if (historyError) throw new Error(`Profiles loaded, but role audit history could not be loaded. ${historyError.message}`)

  const profiles = ((profileData ?? []) as unknown as {
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
  }[]).map((profile) => {
    if (!isRole(profile.role)) throw new Error(`Profile ${profile.id} has an unsupported role.`)
    return {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
      createdAt: profile.created_at,
    }
  })

  const roleChanges = ((historyData ?? []) as unknown as {
    id: number
    profile_id: string
    previous_role: string | null
    new_role: string
    changed_by: string | null
    explanation: string
    created_at: string
  }[]).map((change) => {
    if (!isRole(change.new_role) || (change.previous_role !== null && !isRole(change.previous_role))) {
      throw new Error(`Role history entry ${change.id} has an unsupported role.`)
    }
    return {
      id: change.id,
      profileId: change.profile_id,
      previousRole: change.previous_role,
      newRole: change.new_role,
      changedBy: change.changed_by,
      explanation: change.explanation,
      createdAt: change.created_at,
    }
  })

  return { profiles, roleChanges }
}

export async function updateProfileRole(profileId: string, role: Role, explanation: string): Promise<void> {
  const { error } = await requireSupabase().rpc('set_profile_role', {
    target_profile_id: profileId,
    next_role: role,
    explanation,
  })
  if (error) throw new Error(`Could not update the account role. ${error.message}`)
}
