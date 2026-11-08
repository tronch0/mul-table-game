import { useEffect, useRef, useState } from 'react'
import { Crown, Medal, Trophy } from 'lucide-react'
import { getAttemptRank } from '../lib/api'
import type { AttemptRank } from '../lib/api'
import { RowCelebration } from './RowCelebration'
import './ranking.css'

export function ResultRanking({ token, ready, onCelebrate }: { token: string; ready: boolean; onCelebrate: (rank: number) => void }) {
  const [result, setResult] = useState<AttemptRank | null>()
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const celebrated = useRef(false)
  const cue = useRef(onCelebrate)
  cue.current = onCelebrate
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    getAttemptRank(token).then(rank => { if (!cancelled) setResult(rank) }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [token, retry])
  useEffect(() => {
    if (!ready || !result || result.rank > 10 || celebrated.current) return
    celebrated.current = true
    setCelebrate(true)
    cue.current(result.rank)
  }, [ready, result])
  if (failed) return <div className="result-rank" role="status"><p>הדירוג לא נטען. התוצאה שלכם כבר נשמרה.</p><button className="text-button" onClick={() => setRetry(v => v + 1)}>טעינת הדירוג מחדש</button></div>
  if (result === undefined) return <div className="result-rank" role="status">בודקים את המקום שלכם בלוח האלופים…</div>
  if (result === null) return <div className="result-rank" role="status">הניסיון אינו מופיע כעת בלוח האלופים.</div>
  const tier = result.rank === 1 ? 'champion' : result.rank <= 3 ? 'podium' : result.rank <= 10 ? 'top-ten' : 'standard'
  const Icon = result.rank === 1 ? Crown : result.rank <= 3 ? Medal : Trophy
  return <>
    <div className={`result-rank rank-${tier}`} role="status" data-testid="result-rank">
      <Icon size={32}/><div><span>המקום שלכם בלוח האלופים</span><strong>מקום {result.rank.toLocaleString('he-IL')}</strong><small>מתוך {result.total.toLocaleString('he-IL')} ניסיונות · נכון לעכשיו</small></div>
      {result.rank <= 10 && <b>{result.rank === 1 ? 'בראש הטבלה!' : result.rank <= 3 ? 'על הפודיום!' : 'בעשירייה המובילה!'}</b>}
    </div>
    {celebrate && <RowCelebration milestone={{row: result.rank <= 3 ? 10 : 1, key: token}} language="he" awardRank={result.rank} onComplete={() => setCelebrate(false)}/>}
  </>
}
