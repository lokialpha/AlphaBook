import { Link, NavLink } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useI18n } from '../lib/useI18n'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

type HeaderProps = {
  user: User | null
  onSignOut: () => void
}

export default function Header({ user, onSignOut }: HeaderProps) {
  const { locale, setLocale, t } = useI18n()

  return (
    <header className="site-header">
      <div className="brand">
        <Link to="/" className="brand-link">
          <span className="brand-mark">AB</span>
          <div>
            <p className="brand-title">AlphaBook</p>
            <p className="brand-subtitle">{t('header.subtitle')}</p>
          </div>
        </Link>
      </div>
      <nav className="nav">
        <NavLink to="/" className={navLinkClass}>
          {t('header.nav.sessions')}
        </NavLink>
        <NavLink to="/create" className={navLinkClass}>
          {t('header.nav.create')}
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          {t('header.nav.profile')}
        </NavLink>
      </nav>
      <div className="auth-actions">
        <div className="lang-toggle">
          <button
            className={`lang-button ${locale === 'en' ? 'lang-button-active' : ''}`}
            type="button"
            onClick={() => setLocale('en')}
            aria-pressed={locale === 'en'}
            aria-label={t('header.language.en')}
          >
            {t('header.language.en')}
          </button>
          <button
            className={`lang-button ${locale === 'my' ? 'lang-button-active' : ''}`}
            type="button"
            onClick={() => setLocale('my')}
            aria-pressed={locale === 'my'}
            aria-label={t('header.language.my')}
          >
            {t('header.language.my')}
          </button>
        </div>
        {user ? (
          <>
            <div className="user-chip">
              <span className="user-dot" />
              <span className="user-email">{user.email}</span>
            </div>
            <button className="button button-ghost" onClick={onSignOut}>
              {t('header.signOut')}
            </button>
          </>
        ) : (
          <Link className="button" to="/profile">
            {t('header.signIn')}
          </Link>
        )}
      </div>
    </header>
  )
}
