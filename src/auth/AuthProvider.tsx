import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthMode, type LoginResult } from './AuthContext'
import { demoAccounts, isRole, type SessionUser } from './demoAccounts'
import { clearStoredSession, readStoredSession, writeStoredSession } from './sessionStore'
import { supabase, supabaseConfigurationError } from './supabaseClient'

const loginDelayMs = 600

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function authErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email address before signing in.'
  if (/already registered|user already exists/i.test(message)) return 'An account with this email already exists.'
  if (/password should be at least/i.test(message)) return 'Choose a longer password that meets the account requirements.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = supabaseConfigurationError ? 'misconfigured' : supabase ? 'supabase' : 'demo'
  const [user, setUser] = useState<SessionUser | null>(() =>
    mode === 'demo' ? readStoredSession() : null,
  )
  const [loading, setLoading] = useState(mode === 'supabase')
  const [authError, setAuthError] = useState<string | null>(supabaseConfigurationError)
  const [passwordRecovery, setPasswordRecovery] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery',
  )

  const loadProfile = useCallback(async (userId: string): Promise<SessionUser | null> => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(error.message)
    }
    if (!data || !isRole(data.role)) {
      throw new Error('Your account profile has no valid AquaTrace role. Contact an administrator.')
    }

    return {
      id: data.id,
      name: data.full_name,
      email: data.email,
      role: data.role,
      signedInAt: data.created_at,
    }
  }, [])

  const acceptSupabaseSession = useCallback(async (session: { user: { id: string } } | null): Promise<SessionUser | null> => {
    if (!session) {
      setUser(null)
      setAuthError(null)
      return null
    }

    try {
      const profile = await loadProfile(session.user.id)
      if (!profile) throw new Error('The account profile could not be loaded.')
      setUser(profile)
      setAuthError(null)
      return profile
    } catch (error) {
      setUser(null)
      setAuthError(`Could not load your account permissions. ${error instanceof Error ? error.message : 'Try again later.'}`)
      return null
    }
  }, [loadProfile])

  useEffect(() => {
    if (mode !== 'supabase' || !supabase) return

    let active = true
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthError(`Could not restore your session. ${authErrorMessage(error.message)}`)
        setUser(null)
      } else {
        await acceptSupabaseSession(data.session)
      }
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
      window.setTimeout(() => {
        if (active) void acceptSupabaseSession(session)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [acceptSupabaseSession, mode])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    if (mode === 'misconfigured') return { ok: false, error: supabaseConfigurationError ?? 'Supabase is not configured correctly.' }

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) return { ok: false, error: authErrorMessage(error.message) }
      const profile = await acceptSupabaseSession(data.session)
      if (!data.session) return { ok: false, error: 'Sign-in did not return an authenticated session.' }
      if (!profile) return { ok: false, error: 'Signed in, but account permissions could not be loaded. Contact an administrator.' }
      return { ok: true }
    }

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
  }, [acceptSupabaseSession, mode])

  const register = useCallback(async (name: string, email: string, password: string): Promise<LoginResult> => {
    if (!supabase || mode !== 'supabase') {
      return { ok: false, error: 'Account registration is available after a Supabase project is configured.' }
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: name.trim() } },
    })
    if (error) return { ok: false, error: authErrorMessage(error.message) }
    if (data.session) {
      const profile = await acceptSupabaseSession(data.session)
      return profile
        ? { ok: true }
        : { ok: false, error: 'Account created, but account permissions could not be loaded. Contact an administrator.' }
    }
    return { ok: true, message: 'Check your email to confirm your account, then sign in.' }
  }, [acceptSupabaseSession, mode])

  const requestPasswordReset = useCallback(async (email: string): Promise<LoginResult> => {
    if (!supabase || mode !== 'supabase') {
      return { ok: false, error: 'Password recovery is available after a Supabase project is configured.' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    })
    return error
      ? { ok: false, error: authErrorMessage(error.message) }
      : { ok: true, message: 'If an account exists for that email, a password recovery link has been sent.' }
  }, [mode])

  const updatePassword = useCallback(async (password: string): Promise<LoginResult> => {
    if (!supabase || mode !== 'supabase') {
      return { ok: false, error: 'Password recovery is available after a Supabase project is configured.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: authErrorMessage(error.message) }
    setPasswordRecovery(false)
    return { ok: true, message: 'Your password has been updated.' }
  }, [mode])

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setAuthError(`Could not sign out. ${authErrorMessage(error.message)}`)
        return
      }
    }
    clearStoredSession()
    setUser(null)
    setAuthError(null)
    setPasswordRecovery(false)
  }, [])

  const value = useMemo(() => ({
    user,
    mode,
    loading,
    authError,
    passwordRecovery,
    login,
    register,
    requestPasswordReset,
    updatePassword,
    logout,
  }), [user, mode, loading, authError, passwordRecovery, login, register, requestPasswordReset, updatePassword, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
