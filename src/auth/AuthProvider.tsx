import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type LoginResult } from './AuthContext'
import { demoAccounts, type SessionUser } from './demoAccounts'
import { clearStoredSession, readStoredSession, writeStoredSession } from './sessionStore'

const loginDelayMs = 600

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredSession)

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    await wait(loginDelayMs)

    const normalizedEmail = email.trim().toLowerCase()
    const account = demoAccounts.find((item) =>
      item.email.toLowerCase() === normalizedEmail && item.password === password,
    )

    if (!account) {
      return {
        ok: false,
        error: 'Incorrect email or password. Use one of the demo accounts listed below.',
      }
    }

    try {
      setUser(writeStoredSession(account))
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: 'AquaTrace could not start a browser session. Check that browser storage is available.',
      }
    }
  }, [])

  const logout = useCallback(() => {
    clearStoredSession()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
