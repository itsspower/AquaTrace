import { useId, useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import {
  demoAccounts,
  roleLabels,
  roleSummaries,
  type DemoAccount,
  type Role,
} from './demoAccounts'
import './LoginPage.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function DropMark() {
  return (
    <svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.8S5.5 10 5.5 14.7a6.5 6.5 0 0 0 13 0C18.5 10 12 2.8 12 2.8Z" />
    </svg>
  )
}

function PasswordIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a17.5 17.5 0 0 1-3.1 3.8" />
        <path d="M6.3 6.3A17.6 17.6 0 0 0 3 12s3.5 7 9 7a10.5 10.5 0 0 0 4.1-.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

function copyWithFallback(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(area)
  if (!copied) throw new Error('Copy failed.')
}

function LoginPage() {
  const { login } = useAuth()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Enter both your email address and password.')
      return
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError('Enter a valid email address, for example resident@aquatrace.demo.')
      return
    }

    setError('')
    setLoading(true)
    const result = await login(normalizedEmail, password)
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed. Check your credentials and try again.')
      setLoading(false)
    }
  }

  async function copyCredentials(account: DemoAccount) {
    const text = `AquaTrace demo account\nEmail: ${account.email}\nPassword: ${account.password}\nRole: ${roleLabels[account.role]}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        copyWithFallback(text)
      }
      setCopyFeedback(`${roleLabels[account.role]} credentials copied to the clipboard.`)
    } catch {
      setCopyFeedback('Clipboard access is unavailable here. Select the email and password manually.')
    }
  }

  return (
    <main className="login-shell">
      <div className="login-layout">
        <section className="login-hero" aria-labelledby="login-title">
          <div className="login-brand">
            <span className="login-brand-mark"><DropMark /></span>
            <span>
              <strong>AquaTrace</strong>
              <small>Track the problem. Find the next step.</small>
            </span>
          </div>

          <div className="login-hero-copy">
            <span className="login-eyebrow">DEMONSTRATION ACCESS</span>
            <h1 id="login-title">A clearer view of water service interruptions.</h1>
            <p>Sign in with a demonstration account to explore community reports, sourced historical incidents and local review controls.</p>
          </div>

          <ul className="login-role-list" aria-label="Demonstration roles">
            {(Object.keys(roleLabels) as Role[]).map((role) => (
              <li key={role}>
                <span className="login-role-dot" aria-hidden="true" />
                <span><strong>{roleLabels[role]}</strong>{roleSummaries[role]}</span>
              </li>
            ))}
          </ul>

          <p className="login-demo-note"><strong>Demonstration mode.</strong> Credentials and sessions are stored in your browser only. Do not enter real or personal credentials.</p>
        </section>

        <section className="login-panel" aria-labelledby="login-form-title">
          <div className="login-form-heading">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h2 id="login-form-title">Sign in to AquaTrace</h2>
            <p>Use one of the demo accounts below to enter the workspace.</p>
          </div>

          <form className="login-form" noValidate aria-busy={loading} onSubmit={handleSubmit}>
            <label className="login-field" htmlFor={emailId}>
              Email address
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                value={email}
                onChange={(event) => { setEmail(event.target.value); if (error) setError('') }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                placeholder="resident@aquatrace.demo"
              />
            </label>

            <label className="login-field" htmlFor={passwordId}>
              Password
              <span className="login-password-wrap">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); if (error) setError('') }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  placeholder="Enter your demo password"
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <PasswordIcon visible={showPassword} />
                </button>
              </span>
            </label>

            {error && <p id={errorId} className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? (<><span className="login-spinner" aria-hidden="true" />Signing in…</>) : (<>Sign in <span aria-hidden="true">→</span></>)}
            </button>
            <p className="login-storage-note">Your demonstration session persists in this browser until you sign out.</p>
          </form>

          <section className="demo-accounts" aria-labelledby="demo-accounts-title">
            <div className="demo-heading">
              <div>
                <h2 id="demo-accounts-title">Demo Accounts</h2>
                <p>Use these credentials to test each role.</p>
              </div>
              <span className="demo-badge">Demo only</span>
            </div>
            <p className="demo-instruction">Copy the credentials or type them into the form. Accounts are not signed in automatically.</p>
            <ul className="demo-list">
              {demoAccounts.map((account) => (
                <li className="demo-account" key={account.id}>
                  <div className="demo-account-top">
                    <span className={`demo-role demo-role-${account.role}`}>{roleLabels[account.role]}</span>
                    <button className="demo-copy-button" type="button" onClick={() => copyCredentials(account)}>Copy</button>
                  </div>
                  <div className="demo-credentials">
                    <div><span>Email</span><code>{account.email}</code></div>
                    <div><span>Password</span><code>{account.password}</code></div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="demo-copy-feedback" role="status" aria-live="polite">{copyFeedback}</p>
          </section>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
