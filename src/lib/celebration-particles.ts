import { celebrationDuration } from './celebrations'
import type { CelebrationEffect } from './celebrations'

type Shape = 'star' | 'bubble' | 'rocket' | 'ribbon' | 'ring' | 'comet' | 'heart' | 'bolt' | 'confetti' | 'spark'
type Particle = {
  shape: Shape; x: number; y: number; vx: number; vy: number; gravity: number
  size: number; color: string; delay: number; life: number; spin: number; angle: number; wave: number
}
const TAU = Math.PI * 2
const between = (min: number, max: number) => min + Math.random() * (max - min)

// Small, bounded canvas effects: one animation loop, no per-frame React renders,
// and fewer particles on phones. All coordinates are CSS pixels.
export function createParticles(effect: CelebrationEffect, colors: string[], width: number, height: number): Particle[] {
  const particles: Particle[] = []
  const count = (n: number) => Math.round(n * (width < 680 ? 0.65 : 1))
  const color = () => colors[Math.floor(Math.random() * colors.length)]
  function add(shape: Shape, values: Partial<Particle>) {
    particles.push({ shape, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, size: 8, color: color(), delay: 0, life: 2.6, spin: between(-2, 2), angle: between(0, TAU), wave: 0, ...values })
  }
  function burst(x: number, y: number, amount: number, delay = 0, shape: Shape = 'star', speed = 150) {
    for (let i = 0; i < count(amount); i++) {
      const angle = between(0, TAU)
      const velocity = between(speed * 0.3, speed)
      add(shape, { x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, gravity: 45, size: between(3, 11), delay: delay + between(0, 0.08), life: between(1.3, 2.3) })
    }
  }
  function fountain(amount: number, shape: Shape, life = 2.9) {
    for (let i = 0; i < count(amount); i++) {
      const left = i % 2 === 0
      add(shape, { x: left ? -12 : width + 12, y: height * between(0.55, 0.95), vx: (left ? 1 : -1) * between(width * 0.12, width * 0.42), vy: between(-height * 0.6, -height * 0.2), gravity: height * 0.38, size: between(5, 12), delay: between(0, 0.65), life })
    }
  }
  function fireworks(finale = false) {
    const locations = finale ? [[0.17, 0.28], [0.8, 0.24], [0.5, 0.2], [0.25, 0.45], [0.78, 0.48]] : [[0.2, 0.29], [0.8, 0.25], [0.5, 0.38]]
    locations.forEach(([x, y], i) => {
      const delay = i * (finale ? 0.38 : 0.34)
      add('comet', { x: width * x, y: height + 20, vx: 0, vy: -(height * (1 - y) + 20) / 0.65, size: 3, delay, life: 0.65, spin: 0 })
      burst(width * x, height * y, finale ? 30 : 34, delay + 0.65, 'spark', width < 680 ? 120 : 200)
      add('ring', { x: width * x, y: height * y, size: 90, delay: delay + 0.65, life: 1.1 })
    })
  }
  switch (effect) {
    case 'stars':
      fountain(64, 'star')
      burst(width * 0.5, height * 0.23, 20, 0.12, 'star', 160)
      break
    case 'bubbles':
      for (let i = 0; i < count(40); i++) add('bubble', { x: between(0, width), y: height + between(0, 120), vy: -between(height * 0.3, height * 0.65), vx: between(-15, 15), size: between(9, 33), delay: between(0, 0.5), life: 2.7, wave: between(8, 25), spin: 0 })
      break
    case 'rockets':
      [0.13, 0.87, 0.35, 0.65].forEach((fraction, i) => {
        const x = width * fraction, target = height * (0.2 + (i % 2) * 0.09), delay = i * 0.25
        add('rocket', { x, y: height + 40, vy: -(height + 40 - target) / 0.9, size: 12, delay, life: 0.9, angle: 0, spin: 0 })
        burst(x, target, 19, delay + 0.9, 'star', 125)
      })
      break
    case 'rainbow':
      for (let i = 0; i < count(38); i++) add('ribbon', { x: width * (i / count(38)), y: -between(10, 250), vx: between(-20, 20), vy: between(height * 0.22, height * 0.42), size: between(3, 6), color: colors[i % colors.length], life: 3, wave: between(12, 28), delay: between(0, 0.35), spin: 0 })
      break
    case 'sunburst':
      for (let i = 0; i < 3; i++) add('ring', { x: width / 2, y: height * 0.32, size: Math.min(width * 0.6, 360), delay: i * 0.2, life: 1.9 })
      burst(width / 2, height * 0.32, 92, 0.05, 'spark', width < 680 ? 180 : 320)
      fountain(30, 'star')
      break
    case 'comets':
      for (let i = 0; i < count(32); i++) add('comet', { x: between(-width * 0.4, width), y: between(-height * 0.2, height * 0.32), vx: between(170, 340), vy: between(190, 370), size: between(3, 7), delay: between(0, 1.3), life: 1.45, spin: 0 })
      break
    case 'hearts':
      for (let i = 0; i < count(42); i++) add('heart', { x: between(0, width), y: height + between(0, 80), vy: -between(height * 0.28, height * 0.52), size: between(9, 21), delay: between(0, 0.6), life: 2.55, spin: between(-0.3, 0.3), angle: between(-0.25, 0.25), wave: between(7, 20) })
      break
    case 'lightning':
      for (let i = 0; i < count(26); i++) {
        const left = i % 2 === 0
        add('bolt', { x: left ? between(10, width * 0.28) : between(width * 0.72, width - 10), y: between(height * 0.15, height * 0.85), vx: left ? 15 : -15, vy: -25, size: between(13, 29), delay: between(0, 1.4), life: 1.4, angle: between(-0.3, 0.3), spin: 0 })
      }
      for (let i = 0; i < 2; i++) add('ring', { x: width / 2, y: height * 0.38, size: width * 0.52, delay: i * 0.35, life: 1.7 })
      break
    case 'fireworks': fireworks(); break
    case 'finale':
      fireworks(true)
      fountain(96, 'confetti', 3.6)
      for (let i = 0; i < count(46); i++) add(i % 4 === 0 ? 'star' : 'confetti', { x: between(0, width), y: -between(20, height * 0.3), vy: between(height * 0.2, height * 0.38), vx: between(-35, 35), gravity: 30, size: between(5, 11), delay: between(0.3, 1.1), life: 3.4, wave: 10 })
      break
  }
  const end = celebrationDuration(effect === 'finale' ? 10 : 1) / 1000
  for (const particle of particles) particle.life = Math.min(particle.life, end - particle.delay - 0.1)
  return particles
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], elapsed: number) {
  for (const p of particles) {
    const age = elapsed - p.delay
    if (age <= 0 || age >= p.life) continue
    const progress = age / p.life
    const fade = Math.min(1, age * 7) * Math.min(1, (1 - progress) * 3)
    const x = p.x + p.vx * age + Math.sin(age * 3 + p.angle) * p.wave
    const y = p.y + p.vy * age + p.gravity * age * age / 2
    ctx.save()
    ctx.globalAlpha = fade * (p.shape === 'bubble' ? 0.7 : 0.9)
    ctx.fillStyle = p.color
    ctx.strokeStyle = p.color
    if (p.shape === 'ring') {
      ctx.globalAlpha = (1 - progress) * 0.55
      ctx.lineWidth = 3 * (1 - progress) + 1
      ctx.beginPath(); ctx.arc(x, y, p.size * (1 - (1 - progress) ** 3), 0, TAU); ctx.stroke()
    } else if (p.shape === 'comet' || p.shape === 'rocket' || p.shape === 'spark') {
      const trail = p.shape === 'comet' ? 0.2 : 0.085
      const tailX = x - p.vx * trail, tailY = y - (p.vy + p.gravity * age) * trail
      const gradient = ctx.createLinearGradient(tailX, tailY, x, y)
      gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, p.color)
      ctx.strokeStyle = gradient; ctx.lineWidth = p.size * (p.shape === 'rocket' ? 0.55 : 0.7); ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke()
      ctx.translate(x, y)
      if (p.shape === 'rocket') {
        ctx.fillStyle = '#fff1bb'; ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.65, p.size * 0.7); ctx.lineTo(0, p.size * 0.4); ctx.lineTo(-p.size * 0.65, p.size * 0.7); ctx.closePath(); ctx.fill()
      } else {
        ctx.beginPath(); ctx.arc(0, 0, p.size * (p.shape === 'spark' ? 0.35 : 0.65), 0, TAU); ctx.fill()
      }
    } else if (p.shape === 'ribbon') {
      ctx.lineWidth = p.size; ctx.lineCap = 'round'; ctx.beginPath()
      for (let n = 0; n <= 15; n++) {
        const ribbonX = x + Math.sin(n * 0.43 + age * 5) * p.wave
        const ribbonY = y - n * 5
        if (n === 0) ctx.moveTo(ribbonX, ribbonY); else ctx.lineTo(ribbonX, ribbonY)
      }
      ctx.stroke()
    } else {
      ctx.translate(x, y); ctx.rotate(p.angle + p.spin * age)
      const s = p.size
      if (p.shape === 'star') {
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 ? s * 0.45 : s
          const angle = i * Math.PI / 5 - Math.PI / 2
          if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
          else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        }
        ctx.closePath(); ctx.fill()
      } else if (p.shape === 'bubble') {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke()
        ctx.globalAlpha *= 0.18; ctx.fill(); ctx.globalAlpha = fade * 0.8
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, s * 0.65, Math.PI, Math.PI * 1.45); ctx.stroke()
      } else if (p.shape === 'heart') {
        ctx.beginPath(); ctx.moveTo(0, s * 0.8); ctx.bezierCurveTo(-s * 1.5, -s * 0.15, -s * 0.75, -s * 1.25, 0, -s * 0.5); ctx.bezierCurveTo(s * 0.75, -s * 1.25, s * 1.5, -s * 0.15, 0, s * 0.8); ctx.fill()
      } else if (p.shape === 'bolt') {
        ctx.beginPath(); ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.55, s * 0.15); ctx.lineTo(0, s * 0.15); ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.55, -s * 0.2); ctx.lineTo(0, -s * 0.2); ctx.closePath(); ctx.fill()
      } else {
        ctx.scale(1, Math.cos(age * 8 + p.angle) * 0.8); ctx.fillRect(-s / 2, -s / 3, s, s * 0.65)
      }
    }
    ctx.restore()
  }
}
