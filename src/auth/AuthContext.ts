import { createContext, useContext } from 'react'
import type { SessionUser } from './demoAccounts'

export interface LoginResult {
  ok: boolean
  error?: string
}

export interface AuthContextValue {
  user: SessionUser | null
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
