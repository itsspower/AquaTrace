import type { Page } from '../data'

export type Role = 'resident' | 'reviewer' | 'admin'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  signedInAt: string
}

export interface DemoAccount {
  id: string
  name: string
  email: string
  password: string
  role: Role
}

export const demoAccounts: DemoAccount[] = [
  {
    id: 'demo-resident',
    name: 'Demo Resident',
    email: 'resident@aquatrace.demo',
    password: 'Aqua123!',
    role: 'resident',
  },
  {
    id: 'demo-reviewer',
    name: 'Demo Reviewer',
    email: 'reviewer@aquatrace.demo',
    password: 'Review123!',
    role: 'reviewer',
  },
  {
    id: 'demo-admin',
    name: 'Demo Administrator',
    email: 'admin@aquatrace.demo',
    password: 'Admin123!',
    role: 'admin',
  },
]

export const roleLabels: Record<Role, string> = {
  resident: 'Resident',
  reviewer: 'Incident Reviewer',
  admin: 'Administrator',
}

export const roleSummaries: Record<Role, string> = {
  resident: 'Report outages, follow community updates and explore insights.',
  reviewer: 'Review community reports and record explicit status updates.',
  admin: 'Full demonstration access, including the incident-review workflow.',
}

export function isRole(value: unknown): value is Role {
  return value === 'resident' || value === 'reviewer' || value === 'admin'
}

export function canReviewIncidents(role: Role): boolean {
  return role === 'reviewer' || role === 'admin'
}

export function canAccessPage(role: Role, page: Page): boolean {
  return page !== 'review' || canReviewIncidents(role)
}

export function toSessionUser(account: DemoAccount): SessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    signedInAt: new Date().toISOString(),
  }
}
