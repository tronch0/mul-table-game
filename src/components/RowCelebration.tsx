import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CircleDot, Crown, Heart, Orbit, PartyPopper, Rainbow, Rocket, Sparkles, Star, Sun, Zap } from 'lucide-react'
import { celebrationDuration, milestones } from '../lib/celebrations'
import { createParticles, drawParticles } from '../lib/celebration-particles'
import type { Language } from '../lib/i18n'
import './celebrations.css'

export type RowMilestone = { row: number; key: string }
const icons = [Star, CircleDot, Rocket, Rainbow, Sun, Orbit, Heart, Zap, PartyPopper, Crown]

export function RowCelebration({ milestone, language, onComplete }: { milestone: RowMilestone; language: Language; onComplete: () => void }) {
  const { row } = milestone
  const theme = milestones[row - 1]
  const canvas = useRef<HTMLCanvasElement>(null)
  const complete = useRef(onComplete)
  complete.current = onComplete
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const duration = celebrationDuration(row)
  const Icon = icons[row - 1]

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', changed)
    const timer = setTimeout(() => complete.current(), duration)
    return () => { clearTimeout(timer); preference.removeEventListener('change', changed) }
  }, [duration])

  useEffect(() => {
    if (reducedMotion || !canvas.current) return
    const surface = canvas.current
    const context = surface.getContext('2d')
    if (!context) return
    let width = 0, height = 0, frame = 0
    let particles: ReturnType<typeof createParticles> = []
    const start = performance.now()
    function resize() {
      width = window.innerWidth; height = window.innerHeight
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      surface.width = Math.round(width * scale); surface.height = Math.round(height * scale)
      context!.setTransform(scale, 0, 0, scale, 0, 0)
      particles = createParticles(theme.effect, theme.palette, width, height)
    }
    function draw(timestamp: number) {
      context!.clearRect(0, 0, width, height)
      const elapsed = timestamp - start
      if (elapsed >= duration || document.hidden) return
      drawParticles(context!, particles, elapsed / 1000)
      frame = requestAnimationFrame(draw)
    }
    function visibility() { cancelAnimationFrame(frame); if (!document.hidden) frame = requestAnimationFrame(draw) }
    resize(); frame = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', visibility)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); context.clearRect(0, 0, width, height) }
  }, [theme, duration, reducedMotion])

  return <div className={`row-celebration celebration-${theme.effect}`} data-testid="row-celebration" data-row={row} style={{ '--party-color': theme.color, '--party-duration': `${duration}ms` } as CSSProperties}>
    {!reducedMotion && <canvas ref={canvas} className="celebration-canvas" aria-hidden="true"/>}
    <div className="celebration-banner" role="status" aria-live="polite" aria-atomic="true">
      <div className="celebration-emblem" aria-hidden="true"><Icon size={30} strokeWidth={1.8}/><Sparkles className="emblem-sparkle" size={16}/></div>
      <div className="celebration-copy"><span>{language === 'he' ? `שורה ${row} הושלמה!` : `Row ${row} complete!`}</span><strong>{theme.title[language]}</strong></div>
      <span className="celebration-count" aria-hidden="true">{row * 10}<small>/100</small></span>
    </div>
  </div>
}
