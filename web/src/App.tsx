import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import Header from './components/Header'
import { supabase } from './lib/supabaseClient'
import { useI18n } from './lib/i18n'
import CreateSession from './pages/CreateSession'
import Home from './pages/Home'
import Profile from './pages/Profile'
import SessionPage from './pages/Session'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    let active = true

    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      setLoading(false)
    }

    initSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
  }

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  const user: User | null = session?.user ?? null

  return (
    <div className="app">
      <Header user={user} onSignOut={handleSignOut} />
      <main className="main">
        {loading ? (
          <div className="page">
            <div className="empty-state">{t('app.loading')}</div>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Home user={user} onSignIn={handleSignIn} onSignUp={handleSignUp} />
              }
            />
            <Route
              path="/create"
              element={
                <CreateSession
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              }
            />
            <Route
              path="/sessions/:id"
              element={
                <SessionPage
                  user={user}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <Profile user={user} onSignIn={handleSignIn} onSignUp={handleSignUp} />
              }
            />
          </Routes>
        )}
      </main>
      <footer className="footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  )
}

export default App
