import { Flag, Sparkles, Star } from 'lucide-react'
import { memo } from 'react'
import type { CSSProperties } from 'react'
import { milestones } from '../lib/celebrations'
import type { Copy } from '../lib/i18n'
export const Progress = memo(function Progress({ solved, t, celebratingRow, compact = false }: { solved: number; t: Copy; celebratingRow?: number; compact?: boolean }) {
  return <section className={`progress-card${compact ? ' progress-compact' : ''}`} aria-label={t.yourProgress}>
    {!compact && <><div className="section-heading"><span className="section-icon"><Flag size={21}/></span><h2>{t.progressTitle}</h2><Sparkles className="sparkle" size={22}/></div>
    <p className="muted progress-subtitle">{t.progressSub}</p></>}
    <div className="progress-score"><strong>{solved}<span>/ 100</span></strong><span>{t.solved}</span></div>
    <div className="dot-board" role="progressbar" aria-valuenow={solved} aria-valuemin={0} aria-valuemax={100} aria-label={t.yourProgress}>
      {Array.from({ length: 100 }, (_, i) => {
        const row = Math.floor(i / 10) + 1
        const complete = solved >= row * 10
        return <span key={i} className={`progress-dot ${i < solved ? 'filled' : ''} ${i === solved && solved > 0 ? 'next' : ''} ${complete ? 'row-complete' : ''} ${row === celebratingRow && complete ? 'row-celebrating' : ''}`} style={{ '--row-color': milestones[row - 1].color, '--cell-index': i % 10 } as CSSProperties} aria-hidden="true">{i < solved && (i + 1) % 10 === 0 ? <Star size={12} fill="currentColor"/> : null}</span>
      })}
    </div>
    {!compact && <><div className="milestones" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><Flag size={14}/></div>
    <div className="next-goal"><Star size={19}/><span>{solved === 0 ? t.firstStep : solved === 100 ? t.complete : `${t.nextMilestone}: ${Math.min(100, (Math.floor(solved / 10) + 1) * 10)} ${t.milestone}`}</span></div></>}
  </section>
})
