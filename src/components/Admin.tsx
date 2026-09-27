import { useEffect, useState } from 'react'
import { LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { configured, rpc, supabase } from '../lib/api'
import type { Copy, Language } from '../lib/i18n'
import { Modal } from './Modal'
import { Leaderboard } from './Leaderboard'
export function Admin({ t, language, onPlay }: { t: Copy; language: Language; onPlay: () => void }) {
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => { let active = true; void (async () => { try { if (configured && (await supabase!.auth.getSession()).data.session) { const allowed = await rpc<boolean>('is_game_admin'); if (active) setAuthorized(allowed) } } catch { /* Offer sign-in. */ } finally { if (active) setChecking(false) } })(); return () => { active = false } }, [])
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { const { error: loginError } = await supabase!.auth.signInWithPassword({ email, password }); if (loginError) { setError(t.loginError); return }; const allowed = await rpc<boolean>('is_game_admin'); setAuthorized(allowed); setPassword(''); if (!allowed) { await supabase!.auth.signOut(); setError(t.adminDenied) } } catch { setError(t.networkError) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try { await rpc(confirm === 'all' ? 'reset_competition' : 'delete_attempt', confirm === 'all' ? {} : { p_id: confirm }); setRevision(v => v + 1); setConfirm(null) } catch { setError(t.networkError) } finally { setBusy(false) }
  }
  async function logout() { setBusy(true); try { await supabase!.auth.signOut(); setAuthorized(false) } catch { setError(t.networkError) } finally { setBusy(false) } }
  if (!configured) return <section className="admin-login panel"><ShieldCheck size={36}/><h1>{t.adminTitle}</h1><p>{t.adminSetup}</p><button className="button primary" onClick={onPlay}>{t.play}</button></section>
  if (checking) return <p className="empty-state">{t.loading}</p>
  return <>
    {authorized ? <><div className="admin-toolbar"><span><ShieldCheck size={20}/>{t.adminTitle}</span><button className="button secondary danger-text" onClick={() => setConfirm('all')}><Trash2 size={16}/>{t.clearAll}</button><button className="icon-button" disabled={busy} onClick={() => void logout()} aria-label={t.logout}><LogOut size={20}/></button></div>{error && !confirm && <p className="notice error" role="alert">{error}</p>}<Leaderboard t={t} language={language} onPlay={onPlay} admin onDelete={setConfirm} revision={revision}/></> : <form onSubmit={login} className="admin-login panel"><span className="empty-icon"><ShieldCheck size={32}/></span><h1>{t.adminTitle}</h1><label htmlFor="admin-email">{t.email}</label><input id="admin-email" type="email" autoComplete="username" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required/><label htmlFor="admin-password">{t.password}</label><input id="admin-password" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required/>{error && <p className="notice error" role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? t.loading : t.login}</button></form>}
    {confirm && <Modal title={confirm === 'all' ? t.clearTitle : t.deleteTitle} close={() => !busy && setConfirm(null)} closeLabel={t.close}><p>{confirm === 'all' ? t.clearText : t.deleteText}</p>{error && <p className="notice error" role="alert">{error}</p>}<div className="modal-actions"><button className="button danger" disabled={busy} onClick={() => void remove()}>{busy ? t.loading : confirm === 'all' ? t.clearAll : t.remove}</button><button className="button secondary" disabled={busy} onClick={() => setConfirm(null)}>{t.cancel}</button></div></Modal>}
  </>
}
