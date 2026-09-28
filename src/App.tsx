import { useEffect, useRef, useState } from 'react'
import { useAutomaticUpdates } from './lib/useAutomaticUpdates'
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock3, Delete, Download, Flag, Globe2, Heart, Lightbulb, LoaderCircle, Play, RotateCcw, ShieldCheck, Sparkles, Star, Trophy, Volume2, VolumeX, WifiOff, X } from 'lucide-react'
import { messages } from './lib/i18n'
import type { Language } from './lib/i18n'
import { answerPractice, cleanName, formatTime, newPractice, restoreGame, storage } from './lib/game'
import type { GameState } from './lib/game'
import { configured, finishCompetition, GameApiError, resumeCompetition, startCompetition, submitAnswer } from './lib/api'
import { Progress } from './components/Progress'
import { Leaderboard } from './components/Leaderboard'
import { Modal } from './components/Modal'
import { Admin } from './components/Admin'
import { RowCelebration } from './components/RowCelebration'
import type { RowMilestone } from './components/RowCelebration'
import { completedRow, milestones } from './lib/celebrations'

type View = 'home' | 'game' | 'result' | 'board' | 'admin'
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
function readLanguage(): Language { return storage.get('multiply.language') === 'en' ? 'en' : 'he' }
export default function App() {
  const [language, setLanguage] = useState<Language>(readLanguage)
  const t = messages[language]
  const [view, setView] = useState<View>('home')
  const [name, setName] = useState(() => storage.get('multiply.name') || '')
  const [game, setGame] = useState<GameState | null>(restoreGame)
  const [answer, setAnswer] = useState('')
  const [celebration, setCelebration] = useState<RowMilestone | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [error, setError] = useState<'name' | 'network' | 'missing' | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [finishModal, setFinishModal] = useState(false)
  const [installModal, setInstallModal] = useState(false)
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches)
  const [sound, setSound] = useState(() => storage.get('multiply.sound') === 'true')
  const audio = useRef<AudioContext | null>(null)
  const answerInput = useRef<HTMLInputElement>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = game && !game.finished
  useAutomaticUpdates(!active && !busy && !finishModal && !installModal && (view === 'home' || view === 'board'))
  const arrow = language === 'he' ? <ArrowLeft size={20}/> : <ArrowRight size={20}/>

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [view])
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'; document.title = `${t.brand} · ${language === 'he' ? 'משחק לוח הכפל' : 'A multiplication adventure'}`; storage.set('multiply.language', language) }, [language, t.brand])
  useEffect(() => { const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) } }, [])
  useEffect(() => { const onInstall = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent) }; const done = () => { setInstalled(true); setInstallEvent(null) }; window.addEventListener('beforeinstallprompt', onInstall); window.addEventListener('appinstalled', done); return () => { window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('appinstalled', done) } }, [])
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer) }, [active])
  useEffect(() => { if (view === 'game' && !busy && !finishModal && !installModal) { answerInput.current?.focus({ preventScroll: true }); if (feedback === 'incorrect') answerInput.current?.select() } }, [view, busy, feedback, finishModal, installModal])
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); void audio.current?.close() }, [])
  useEffect(() => { if (!active) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [active])

  function updateGame(next: GameState | null) {
    setGame(next)
    if (next) storage.set('multiply.game.v1', JSON.stringify(next)); else storage.remove('multiply.game.v1')
    setNow(Date.now())
  }
  function lock() { if (busyRef.current) return false; busyRef.current = true; setBusy(true); return true }
  function unlock() { busyRef.current = false; setBusy(false) }
  function handleError(err: unknown) {
    if (err instanceof GameApiError && err.code === 'SESSION_NOT_FOUND') { updateGame(null); setView('home'); setFinishModal(false); setError('missing') }
    else setError('network')
  }
  function playSound(row: number | null = null) {
    if (!sound) return
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume()
      const notes = row ? milestones[row - 1].notes : [72, 76, 79]
      for (const [index, note] of notes.entries()) {
        const osc = audio.current.createOscillator(); const gain = audio.current.createGain()
        osc.type = row ? 'triangle' : 'sine'; osc.frequency.value = 440 * 2 ** ((note - 69) / 12)
        const start = audio.current.currentTime + index * (row ? 0.1 : 0.065)
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(row ? 0.045 : 0.06, start + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.17)
        osc.connect(gain); gain.connect(audio.current.destination); osc.start(start); osc.stop(start + 0.18)
        osc.onended = () => { osc.disconnect(); gain.disconnect() }
      }
    } catch { /* Sound is optional. */ }
  }
  async function start(practice = false) {
    const player = cleanName(name)
    if (!player) { setError('name'); document.getElementById('player-name')?.focus(); return }
    if (!lock()) return
    setCelebration(null); setError(null); setFeedback(null); setAnswer(''); storage.set('multiply.name', player)
    try {
      let next: GameState
      if (practice || !configured || !online) next = newPractice(player)
      else {
        let pending: { name: string; token: string } | null = null
        try { pending = JSON.parse(storage.get('multiply.pending') || 'null') } catch { /* Ignore old invalid storage. */ }
        const token = pending?.name === player && typeof pending.token === 'string' ? pending.token : crypto.randomUUID()
        storage.set('multiply.pending', JSON.stringify({ name: player, token }))
        next = await startCompetition(player, token)
      }
      updateGame(next); storage.remove('multiply.pending'); setView(next.finished ? 'result' : 'game')
    } catch (err) { handleError(err) } finally { unlock() }
  }
  async function resume() {
    if (!game || !lock()) return
    setCelebration(null); setError(null); setAnswer(''); setFeedback(null)
    try { const next = game.mode === 'competition' ? await resumeCompetition(game.token) : game; updateGame(next); setView(next.finished ? 'result' : 'game') } catch (err) { handleError(err) } finally { unlock() }
  }
  async function checkAnswer(e?: React.FormEvent) {
    e?.preventDefault()
    if (!game || game.finished || !/^\d{1,3}$/.test(answer) || (!online && game.mode === 'competition') || !lock()) return
    setError(null)
    try {
      const result = game.mode === 'practice' ? answerPractice(game, answer) : await submitAnswer(game, answer)
      updateGame(result.game)
      setFeedback(result.correct ? 'correct' : 'incorrect')
      if (result.correct) {
        const row = completedRow(game.solved, result.game.solved)
        if (row) setCelebration({ row, key: `${game.token}:${row}` })
        setAnswer(''); playSound(row)
        if (result.game.finished) setView('result')
      }
      else { answerInput.current?.select() }
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = result.correct ? setTimeout(() => setFeedback(null), 1800) : null
    } catch (err) { handleError(err) } finally { unlock(); answerInput.current?.focus({ preventScroll: true }) }
  }
  async function finish() {
    if (!game || !lock()) return
    setError(null)
    try {
      const next = game.mode === 'competition' ? await finishCompetition(game.token) : { ...game, finished: true, question: null, elapsed: Date.now() - game.startedAt }
      updateGame(next); setFinishModal(false); setView('result')
    } catch (err) { handleError(err) } finally { unlock() }
  }
  function go(next: View) {
    if (active && view === 'game' && next !== 'game') { setFinishModal(true); return }
    setCelebration(null); setError(null); setView(next); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function again() { setCelebration(null); updateGame(null); setFeedback(null); setError(null); setAnswer(''); setView('home') }
  async function install() { if (installEvent) { await installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null) } else setInstallModal(true) }
  function digit(value: string) {
    if (busyRef.current || (!online && game?.mode === 'competition')) return
    answerInput.current?.focus({ preventScroll: true })
    if (feedback === 'incorrect') { setAnswer(value); setFeedback(null) } else setAnswer(previous => (previous + value).slice(0, 3))
  }
  const elapsed = game ? game.finished ? game.elapsed : Math.max(0, now - game.startedAt) : 0
  const errorText = error === 'name' ? t.emptyName : error === 'missing' ? t.missingGame : t.networkError

  return <div className={`app-shell${view === 'game' ? ' is-playing' : ''}`}>
    <a className="skip-link" href="#main">{t.play}</a>
    <header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => go('home')} aria-label={t.brand}><span className="brand-mark" aria-hidden="true">×<i/></span><span><strong>{t.brand}</strong><small>{t.club}</small></span></button>
      <nav className="main-nav" aria-label={language === 'he' ? 'ניווט ראשי' : 'Main navigation'}><button className={['home', 'game', 'result'].includes(view) ? 'selected' : ''} onClick={() => go(active ? 'game' : 'home')}><Play size={17}/>{t.play}</button><button className={view === 'board' ? 'selected' : ''} onClick={() => go('board')}><Trophy size={17}/>{t.board}</button></nav>
      <div className="header-actions"><button className="language-button" onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}><Globe2 size={17}/><span>{t.language}</span></button><button className="icon-button sound-button" aria-label={sound ? t.soundOn : t.soundOff} onClick={() => { setSound(v => !v); storage.set('multiply.sound', String(!sound)) }}>{sound ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button></div>
    </div></header>
    <main id="main" className={`main-content view-${view}`}>
      {!online && <div className="notice offline" role="status"><WifiOff size={19}/>{active && game.mode === 'competition' ? t.onlineLost : t.offline}</div>}
      {error && !finishModal && <div className="notice error" role="alert">{errorText}<button aria-label={t.close} onClick={() => setError(null)}><X size={17}/></button></div>}
      {view === 'home' && <>
        <div className="intro"><span className="eyebrow"><Sparkles size={17}/>{t.eyebrow}</span><h1>{t.title1}<br/><span>{t.title2}</span></h1><p>{t.intro}</p></div>
        <div className="game-layout start-layout">
          <section className="start-card panel">
            <div className="sample-equation" dir="ltr" aria-hidden="true"><span className="number-tile tile-yellow">7</span><span className="math-symbol">×</span><span className="number-tile tile-coral">8</span><span className="math-symbol">=</span><span className="number-tile tile-teal">?</span><Star className="floating-star" size={25}/><Sparkles className="floating-sparkle" size={23}/></div>
            {active ? <div className="resume-block"><span className="badge"><RotateCcw size={15}/>{game.mode === 'practice' ? t.practiceMode : t.competition}</span><h2>{t.resume}</h2><p><bdi>{game.name}</bdi> · {game.solved} {t.outOf}</p><p className="muted">{t.resumeSub}</p><button className="button primary wide" disabled={busy || (!online && game.mode === 'competition')} onClick={() => void resume()}>{busy ? t.loading : t.resumeButton}{arrow}</button><button className="text-button" onClick={() => setFinishModal(true)}>{t.discard}</button></div> : <form className="start-form" onSubmit={e => { e.preventDefault(); void start() }}><h2>{t.ready}</h2><p className="muted">{t.readySub}</p><label htmlFor="player-name">{t.nameLabel}</label><input id="player-name" maxLength={24} autoComplete="off" placeholder={t.namePlaceholder} value={name} onChange={e => { setName(e.target.value); storage.set('multiply.name', e.target.value); if (error === 'name') setError(null) }} aria-describedby="name-hint"/><p id="name-hint" className="input-hint">{t.nameHint}</p><button className="button primary wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={20}/> : <Play size={19} fill="currentColor"/>}{busy ? t.loading : t.start}{arrow}</button>{configured && online ? <button type="button" className="text-button" disabled={busy} onClick={() => void start(true)}>{t.practice}</button> : <p className="practice-note"><span/>{t.practiceOnly}</p>}</form>}
            <div className="start-card-footer"><span><Heart size={16}/>{t.noRush}</span><span><CircleCheck size={16}/>{t.numbers}</span></div>
          </section>
          <aside className="side-column"><Progress solved={active ? game.solved : 0} t={t}/></aside>
        </div>
        <section className="how-to"><h2>{t.howTitle}</h2><div className="steps"><article><span className="step-number">1</span><div><h3>{t.step1}</h3><p>{t.step1Sub}</p></div></article><article><span className="step-number">2</span><div><h3>{t.step2}</h3><p>{t.step2Sub}</p></div></article><article><span className="step-number">3</span><div><h3>{t.step3}</h3><p>{t.step3Sub}</p></div></article></div></section>
      </>}
      {view === 'game' && game && game.question && <>
        <div className="game-page-heading"><div><span className="eyebrow"><Sparkles size={17}/>{t.hi} <bdi>{game.name}</bdi>!</span><h1>{t.ready}</h1></div><span className={`badge ${game.mode === 'practice' ? 'practice-badge' : ''}`}>{game.mode === 'practice' ? <Lightbulb size={16}/> : <Trophy size={16}/>} {game.mode === 'practice' ? t.practiceMode : t.competition}</span></div>
        <div className="game-layout playing-layout"><section className={`question-card panel ${feedback === 'correct' ? 'success-flash' : ''}`}>
          <div className="question-top"><span><span className="question-dot"/>{t.question} {game.solved + 1} <span className="muted">/ 100</span></span><span className="timer" aria-label={`${t.time}: ${formatTime(elapsed)}`}><Clock3 size={18}/><bdi>{formatTime(elapsed)}</bdi></span></div>
          <form onSubmit={checkAnswer}>
            <div className="question-workspace">
            <div className="equation-answer">
            <div className="equation" dir="ltr" aria-label={`${game.question.a} × ${game.question.b}`}><span>{game.question.a}</span><span className="operator">×</span><span>{game.question.b}</span><span className="operator">=</span><span className="question-mark">?</span></div>
            <label className="sr-only" htmlFor="answer">{t.answer}</label><input ref={answerInput} id="answer" className={`answer-input ${feedback === 'incorrect' ? 'incorrect' : ''}`} dir="ltr" type="text" inputMode="none" autoComplete="off" maxLength={3} placeholder="?" value={answer} onChange={e => { setAnswer(e.target.value.replace(/[^0-9]/g, '').slice(0, 3)); setFeedback(null) }} readOnly={busy || (!online && game.mode === 'competition')} aria-busy={busy} onKeyDown={e => { if (e.key === 'Enter' && e.repeat) e.preventDefault() }} aria-describedby="answer-feedback"/>
            </div><Progress compact solved={game.solved} t={t} celebratingRow={celebration?.row}/></div>
            <p id="answer-feedback" className={`answer-feedback ${feedback || ''}`} aria-live="polite">{feedback === 'correct' ? <><CircleCheck size={17}/>{t.correct}</> : feedback === 'incorrect' ? t.incorrect : t.typeAnswer}</p>
            <div className="keypad" dir="ltr" onPointerDown={e => { if (e.button === 0) e.preventDefault() }}>{['1','2','3','4','5','6','7','8','9'].map(value => <button type="button" key={value} disabled={busy || (!online && game.mode === 'competition')} onClick={() => digit(value)}>{value}</button>)}<button type="button" className="key-erase" aria-label={t.erase} disabled={busy || (!online && game.mode === 'competition')} onClick={() => { setAnswer(v => v.slice(0, -1)); setFeedback(null); answerInput.current?.focus({ preventScroll: true }) }}><Delete size={23}/></button><button type="button" disabled={busy || (!online && game.mode === 'competition')} onClick={() => digit('0')}>0</button><button type="submit" className="key-check" disabled={busy || !answer || (!online && game.mode === 'competition')} aria-label={t.check}>{busy ? <LoaderCircle className="spin" size={22}/> : <Check size={25}/>}<span>{t.check}</span></button></div>
          </form><button className="text-button finish-button" disabled={busy} onClick={() => setFinishModal(true)}><Flag size={16}/>{game.mode === 'practice' ? t.finishPractice : t.finish}</button>
        </section><aside className="side-column"><Progress solved={game.solved} t={t} celebratingRow={celebration?.row}/><div className="gentle-note"><Heart size={22}/><div><strong>{t.noRush}</strong><p>{game.mode === 'practice' ? t.savedLocally : t.step2Sub}</p></div></div></aside></div>
      </>}
      {view === 'result' && game && <div className="result-layout"><section className="result-card panel"><div className="confetti" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties}/>)}</div><span className="result-medal"><Trophy size={55}/><Star size={22} className="medal-star"/></span><span className="eyebrow">{game.name}</span><h1>{game.solved === 100 ? t.resultFull : t.resultPartial}</h1><p className="muted">{t.resultSub}</p><div className="result-stats"><div><strong>{game.solved}<small>/ 100</small></strong><span>{t.solved}</span></div><div><strong dir="ltr">{formatTime(game.elapsed)}</strong><span>{t.time}</span></div></div><p className={`result-save ${game.mode === 'practice' ? 'is-practice' : ''}`}><CircleCheck size={18}/>{game.mode === 'practice' ? t.practiceResult : t.saved}</p><button className="button primary wide" onClick={again}><RotateCcw size={18}/>{t.again}</button><button className="button secondary wide" onClick={() => go('board')}><Trophy size={18}/>{t.viewBoard}</button></section><Progress solved={game.solved} t={t} celebratingRow={celebration?.row}/></div>}
      {view === 'board' && <Leaderboard t={t} language={language} onPlay={() => go(active ? 'game' : 'home')}/>}
      {view === 'admin' && <Admin t={t} language={language} onPlay={() => go('home')}/>}
    </main>
    {celebration && <RowCelebration key={celebration.key} milestone={celebration} language={language} onComplete={() => setCelebration(null)}/>}
    <footer className="site-footer"><span><span className="footer-cross">×</span>{t.footer}</span><div>{!installed && <button onClick={() => void install()}><Download size={16}/>{t.install}</button>}<button onClick={() => go('admin')}><ShieldCheck size={15}/>{t.admin}</button></div></footer>
    {finishModal && game && <Modal title={t.finishTitle} close={() => !busy && setFinishModal(false)} closeLabel={t.close}><p>{game.mode === 'practice' ? t.finishPracticeText : t.finishText}</p>{error && <p className="notice error" role="alert">{errorText}</p>}{!online && game.mode === 'competition' && <p className="notice offline">{t.onlineLost}</p>}<div className="modal-actions"><button className="button primary" disabled={busy} onClick={() => setFinishModal(false)}>{t.continue}</button><button className="button secondary" disabled={busy || (!online && game.mode === 'competition')} onClick={() => void finish()}>{busy ? t.loading : t.confirmFinish}</button></div></Modal>}
    {installModal && <Modal title={t.installTitle} close={() => setInstallModal(false)} closeLabel={t.close}><p>{t.installText}</p><button className="button primary wide" onClick={() => setInstallModal(false)}>{t.close}</button></Modal>}
  </div>
}
