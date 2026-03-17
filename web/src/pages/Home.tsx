import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Session } from '../lib/types'
import AuthPanel from '../components/AuthPanel'
import { useI18n } from '../lib/i18n'

type HomeProps = {
  user: User | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export default function Home({ user, onSignIn, onSignUp }: HomeProps) {
  const { t } = useI18n()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const fetchSessions = async () => {
      if (!user) {
        setSessions([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(
          `id,
           created_at,
           created_by,
           book:books (id, title, author, total_chapters, total_pages, cover_url)`
        )
        .order('created_at', { ascending: false })

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setSessions([])
      } else {
        setError(null)
        setSessions((data as unknown as Session[]) || [])
      }
      setLoading(false)
    }

    fetchSessions()

    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
          <p className="hero-subtitle">{t('home.subtitle')}</p>
          <div className="hero-actions">
            {user ? (
              <Link className="button" to="/create">
                {t('home.cta.create')}
              </Link>
            ) : (
              <AuthPanel
                title={t('home.auth.title')}
                subtitle={t('home.auth.subtitle')}
                onSignIn={onSignIn}
                onSignUp={onSignUp}
              />
            )}
            <Link className="button button-ghost" to="/create">
              {t('home.cta.preview')}
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <p className="card-title">{t('home.heroCard.title')}</p>
          <p className="card-copy">{t('home.heroCard.subtitle')}</p>
          <div className="card-grid">
            <div className="stat-card">
              <p className="stat-label">{t('home.heroCard.stat.sessions.label')}</p>
              <p className="stat-value">{t('home.heroCard.stat.sessions.value')}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{t('home.heroCard.stat.pace.label')}</p>
              <p className="stat-value">{t('home.heroCard.stat.pace.value')}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{t('home.heroCard.stat.next.label')}</p>
              <p className="stat-value">{t('home.heroCard.stat.next.value')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('home.section.title')}</h2>
            <p className="section-subtitle">{t('home.section.subtitle')}</p>
          </div>
          <Link className="button button-ghost" to="/create">
            {t('home.section.action')}
          </Link>
        </div>

        {!user ? (
          <div className="empty-state">
            {t('home.section.signIn')}
          </div>
        ) : loading ? (
          <div className="empty-state">{t('home.section.loading')}</div>
        ) : error ? (
          <div className="empty-state">{t('home.section.error', { error })}</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">{t('home.section.empty')}</div>
        ) : (
          <div className="session-grid">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="session-card"
              >
                <div>
                  <p className="session-title">
                    {session.book?.title ?? t('home.session.untitled')}
                  </p>
                  <p className="session-meta">
                    {session.book?.author ?? t('home.session.unknownAuthor')}
                  </p>
                </div>
                <div className="session-stats">
                  <span>
                    {t('home.session.chapters', {
                      count: session.book?.total_chapters ?? 0,
                    })}
                  </span>
                  <span>
                    {t('home.session.pages', { count: session.book?.total_pages ?? 0 })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
