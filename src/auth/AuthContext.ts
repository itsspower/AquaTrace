import { createContext, useContext } from 'react'
import type { SessionUser } from './demoAccounts'

export type AuthMode = 'demo' | 'supabase' | 'misconfigured'

export interface LoginResult {
  ok: boolean
  error?: string
  message?: string
}

export interface AuthContextValue {
  user: SessionUser | null
  mode: AuthMode
  loading: boolean
  authError: string | null
  passwordRecovery: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  register: (name: string, email: string, password: string) => Promise<LoginResult>
  requestPasswordReset: (email: string) => Promise<LoginResult>
  updatePassword: (password: string) => Promise<LoginResult>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
