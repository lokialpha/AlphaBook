import { useState } from 'react'
import { useI18n } from '../lib/i18n'

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message)
  }
  return null
}

type AuthPanelProps = {
  title: string
  subtitle?: string
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function AuthPanel({ title, subtitle, onSignIn, onSignUp }: AuthPanelProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState<'signin' | 'signup' | null>(null)

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading('signin')
    setStatus(null)

    try {
      await onSignIn(email.trim(), password)
      setStatus(t('auth.status.signedIn'))
    } catch (error) {
      setStatus(getErrorMessage(error) ?? t('auth.status.error'))
    } finally {
      setLoading(null)
    }
  }

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) return

    setLoading('signup')
    setStatus(null)

    try {
      await onSignUp(email.trim(), password)
      setStatus(t('auth.status.signedUp'))
    } catch (error) {
      setStatus(getErrorMessage(error) ?? t('auth.status.error'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="auth-panel">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      <form className="auth-panel-form" onSubmit={handleSignIn}>
        <input
          className="auth-panel-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('auth.placeholder.email')}
          required
        />
        <input
          className="auth-panel-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.placeholder.password')}
          required
        />
        <div className="auth-panel-actions">
          <button className="button" type="submit" disabled={loading !== null}>
            {loading === 'signin' ? t('auth.button.signingIn') : t('auth.button.signIn')}
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={handleSignUp}
            disabled={loading !== null}
          >
            {loading === 'signup' ? t('auth.button.creating') : t('auth.button.create')}
          </button>
        </div>
        {status ? <p className="form-note">{status}</p> : null}
      </form>
    </div>
  )
}
