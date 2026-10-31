import {
  demoAccounts,
  isRole,
  toSessionUser,
  type DemoAccount,
  type SessionUser,
} from './demoAccounts'

const sessionStorageKey = 'aquatrace-demo-session'
const sessionVersion = 1

interface StoredSession {
  version: number
  user: SessionUser
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(sessionStorageKey)
  } catch {
    return
  }
}

export function readStoredSession(): SessionUser | null {
  try {
    const saved = window.localStorage.getItem(sessionStorageKey)
    if (saved === null) return null

    const parsed: unknown = JSON.parse(saved)
    if (!isRecord(parsed) || parsed.version !== sessionVersion || !isRecord(parsed.user)) {
      clearStoredSession()
      return null
    }

    const candidate = parsed.user
    if (
      typeof candidate.id !== 'string'
      || typeof candidate.name !== 'string'
      || typeof candidate.email !== 'string'
      || typeof candidate.signedInAt !== 'string'
      || Number.isNaN(Date.parse(candidate.signedInAt))
      || !isRole(candidate.role)
    ) {
      clearStoredSession()
      return null
    }

    const account = demoAccounts.find((item) =>
      item.id === candidate.id
      && item.email === candidate.email
      && item.role === candidate.role
      && item.name === candidate.name,
    )
    if (!account) {
      clearStoredSession()
      return null
    }

    return toSessionUser(account)
  } catch {
    clearStoredSession()
    return null
  }
}

export function writeStoredSession(account: DemoAccount): SessionUser {
  const user = toSessionUser(account)
  const session: StoredSession = { version: sessionVersion, user }

  try {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
  } catch {
    throw new Error('Browser storage is unavailable.')
  }

  return user
}
