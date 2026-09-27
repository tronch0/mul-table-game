import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, RefreshCw, Trophy, Trash2 } from 'lucide-react'
import { configured, getScores } from '../lib/api'
import { formatScoreTime } from '../lib/game'
import type { Score } from '../lib/game'
import type { Copy, Language } from '../lib/i18n'
export function Leaderboard({ t, language, onPlay, admin = false, onDelete, revision = 0 }: { t: Copy; language: Language; onPlay: () => void; admin?: boolean; onDelete?: (id: string) => void; revision?: number }) {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [more, setMore] = useState(false)
  const load = useCallback(async (offset = 0) => {
    if (!configured) return
    setLoading(true); setError(false)
    try { const rows = await getScores(offset); setScores(previous => offset ? [...previous, ...rows] : rows); setMore(rows.length === 50) }
    catch { setError(true) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load, revision])
  return <section className="leaderboard-view">
    <div className="board-header"><div><span className="eyebrow"><Trophy size={17}/>{t.board}</span><h1>{t.boardTitle}</h1><p className="muted">{t.boardSubtitle}</p></div><button className="button secondary" onClick={onPlay}>{t.play}{language === 'he' ? <ArrowLeft size={19}/> : <ArrowRight size={19}/>}</button></div>
    <div className="leaderboard-card">
      <div className="table-top"><h2>{t.board}</h2>{configured && <button className="icon-button" aria-label={t.refresh} disabled={loading} onClick={() => void load()}><RefreshCw size={19} className={loading ? 'spin' : ''}/></button>}</div>
      {!configured ? <div className="empty-state"><span className="empty-icon"><Trophy size={36}/></span><h2>{t.boardNotReady}</h2><p>{t.boardNotReadySub}</p><button className="button primary" onClick={onPlay}>{t.practice}</button></div> : <>
        {error && <div className="notice error" role="alert">{t.networkError}<button onClick={() => void load()}>{t.retry}</button></div>}
        {loading && scores.length === 0 && <p className="empty-state" role="status">{t.loading}</p>}
        {!loading && !error && scores.length === 0 && <div className="empty-state"><span className="empty-icon"><Trophy size={36}/></span><h2>{t.noScores}</h2><p>{t.noScoresSub}</p><button className="button primary" onClick={onPlay}>{t.play}</button></div>}
        {scores.length > 0 && <div className="table-scroll"><table><thead><tr><th>{t.rank}</th><th>{t.player}</th><th>{t.score}</th><th><Clock3 size={14}/><span>{t.time}</span></th><th className="date-cell">{t.date}</th>{admin && <th><span className="sr-only">{t.remove}</span></th>}</tr></thead><tbody>{scores.map((score, index) => <tr key={score.id}><td><span className={`rank rank-${index + 1}`}>{index < 3 ? <Trophy size={15}/> : null}{index + 1}</span></td><td className="player-cell"><bdi>{score.player_name}</bdi></td><td><strong>{score.solved}</strong><span className="score-denominator"> / 100</span></td><td className="time-cell" dir="ltr">{formatScoreTime(score.elapsed_ms)}</td><td className="date-cell">{new Date(score.finished_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' })}</td>{admin && <td><button className="icon-button danger-text" aria-label={`${t.remove}: ${score.player_name}`} onClick={() => onDelete?.(score.id)}><Trash2 size={18}/></button></td>}</tr>)}</tbody></table></div>}
        {more && <button className="button secondary load-more" disabled={loading} onClick={() => void load(scores.length)}>{loading ? t.loading : t.loadMore}</button>}
      </>}
    </div>
  </section>
}
