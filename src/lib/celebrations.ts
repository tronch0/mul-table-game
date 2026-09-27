import type { Language } from './i18n'

export type CelebrationEffect = 'stars' | 'bubbles' | 'rockets' | 'rainbow' | 'sunburst' | 'comets' | 'hearts' | 'lightning' | 'fireworks' | 'finale'
type Milestone = {
  effect: CelebrationEffect
  color: string
  palette: string[]
  title: Record<Language, string>
  notes: number[]
}

export const milestones: readonly Milestone[] = [
  { effect: 'stars', color: '#c68b19', palette: ['#ffcf57', '#ffe9a8', '#f6a63d'], title: { he: 'הכוכב הראשון שלכם!', en: 'Your first star!' }, notes: [72, 76, 79, 84] },
  { effect: 'bubbles', color: '#078d9b', palette: ['#39cddd', '#79e5db', '#a4edff'], title: { he: 'מבעבעים מכישרון!', en: 'Bubbling with brilliance!' }, notes: [76, 79, 83, 88, 83] },
  { effect: 'rockets', color: '#8652d6', palette: ['#b28aff', '#e6b6ff', '#ffbd68'], title: { he: 'ממריאים לחלל!', en: 'Ready for liftoff!' }, notes: [60, 64, 67, 72, 76, 84] },
  { effect: 'rainbow', color: '#3986c2', palette: ['#ff8585', '#ffc85c', '#78d5b4', '#60beec', '#af93ef'], title: { he: 'צובעים את השמיים!', en: 'Color the sky!' }, notes: [72, 74, 76, 77, 79, 81, 83, 84] },
  { effect: 'sunburst', color: '#d58721', palette: ['#ffd451', '#ffab45', '#fff1a8'], title: { he: 'וואו! כבר חצי מהלוח!', en: 'Halfway. Fully amazing!' }, notes: [72, 79, 84, 79, 88, 84] },
  { effect: 'comets', color: '#3677d2', palette: ['#6ab7ff', '#96e6ff', '#d3c1ff'], title: { he: 'בקצב של כוכב שביט!', en: 'You’re a shooting star!' }, notes: [88, 84, 81, 79, 76, 84] },
  { effect: 'hearts', color: '#ce5988', palette: ['#ff8cb6', '#ffb5ca', '#d9a0f2'], title: { he: 'הלב אומר: אלופים!', en: 'A whole lot of awesome!' }, notes: [72, 76, 79, 76, 81, 84] },
  { effect: 'lightning', color: '#4c9b68', palette: ['#9ef065', '#60dec0', '#d7f882'], title: { he: 'יש לכם כוחות־על!', en: 'Superpowers unlocked!' }, notes: [60, 72, 67, 79, 72, 84] },
  { effect: 'fireworks', color: '#ae5ec1', palette: ['#ed9cff', '#ffbc5b', '#75dcd0', '#95adff'], title: { he: 'השמיים חוגגים איתכם!', en: 'The sky is cheering!' }, notes: [72, 76, 79, 84, 88, 91] },
  { effect: 'finale', color: '#c39125', palette: ['#ffd65c', '#ff9c82', '#61d3bb', '#bb9cff', '#fff0bb'], title: { he: '100! אתם אלופי הכפל!', en: '100! Multiply champions!' }, notes: [72, 72, 76, 79, 84, 79, 84, 88, 91, 96] },
]

// Trigger only when a confirmed answer crosses a new row boundary. Restoring a
// round and retrying an already-counted answer must not replay a celebration.
export function completedRow(previous: number, next: number): number | null {
  if (!Number.isInteger(previous) || !Number.isInteger(next) || previous < 0 || next > 100 || next <= previous) return null
  const row = Math.floor(next / 10)
  return row > Math.floor(previous / 10) ? row : null
}
export const celebrationDuration = (row: number) => row === 10 ? 4800 : 3200
