import { describe, expect, it } from 'vitest'
import { completedRow, milestones } from './celebrations'
import { createParticles } from './celebration-particles'

describe('row celebrations', () => {
  it('celebrates each of the ten completed rows, including the final answer', () => {
    const rows = Array.from({ length: 100 }, (_, i) => completedRow(i, i + 1)).filter(row => row !== null)
    expect(rows).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
  it('does not replay on incorrect answers, restored rounds, retries, or regressions', () => {
    for (const [previous, next] of [[9, 9], [10, 10], [20, 20], [100, 100], [11, 10], [10, 11]]) expect(completedRow(previous, next)).toBeNull()
    expect(completedRow(9, 11)).toBe(1) // A second tab may have advanced the same round.
    expect(completedRow(90, 101)).toBeNull()
  })
  it('keeps all ten effects bounded and valid on phone and desktop canvases', () => {
    expect(new Set(milestones.map(m => m.effect)).size).toBe(10)
    for (const width of [320, 1366]) {
      for (const theme of milestones) {
        const particles = createParticles(theme.effect, theme.palette, width, 900)
        expect(particles.length).toBeGreaterThan(0)
        expect(particles.length).toBeLessThan(320)
        for (const particle of particles) {
          for (const [key, value] of Object.entries(particle)) if (typeof value === 'number') expect(Number.isFinite(value), `${theme.effect}.${key}`).toBe(true)
          expect(particle.delay + particle.life).toBeLessThanOrEqual(theme.effect === 'finale' ? 4.8 : 3.2)
        }
      }
    }
  })
})
