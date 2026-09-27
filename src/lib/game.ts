export type Question = { id: number; a: number; b: number }
export type Score = { id: string; player_name: string; solved: number; elapsed_ms: number; finished_at: string }
export type GameState = {
  token: string; name: string; mode: 'practice' | 'competition'; solved: number;
  startedAt: number; elapsed: number; question: Question | null; finished: boolean;
  deck?: number[];
}
export const questionFor = (id: number): Question => ({ id, a: Math.floor(id / 10) + 1, b: id % 10 + 1 })
export function makeDeck(random = Math.random): number[] {
  const deck = Array.from({ length: 100 }, (_, i) => i)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
export function newPractice(name: string): GameState {
  const deck = makeDeck()
  return { token: crypto.randomUUID(), name, mode: 'practice', solved: 0, startedAt: Date.now(), elapsed: 0, question: questionFor(deck[0]), finished: false, deck }
}
export function answerPractice(game: GameState, answer: string, now = Date.now()): { game: GameState; correct: boolean } {
  if (game.finished || !game.question || !/^\d{1,3}$/.test(answer) || Number(answer) !== game.question.a * game.question.b) return { game, correct: false }
  const solved = game.solved + 1
  return { correct: true, game: { ...game, solved, finished: solved === 100, elapsed: now - game.startedAt, question: solved < 100 ? questionFor(game.deck![solved]) : null } }
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export function formatScoreTime(ms: number): string { return `${formatTime(ms)}.${Math.floor(ms % 1000 / 100)}` }
export function sortScores(scores: Score[]): Score[] { return [...scores].sort((a, b) => b.solved - a.solved || a.elapsed_ms - b.elapsed_ms || a.finished_at.localeCompare(b.finished_at) || a.id.localeCompare(b.id)) }
export function cleanName(value: string): string { return value.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/g, ' ').slice(0, 24) }
export const storage = {
  get(key: string) { try { return localStorage.getItem(key) } catch { return null } },
  set(key: string, value: string) { try { localStorage.setItem(key, value) } catch { /* Private browsing can deny storage. */ } },
  remove(key: string) { try { localStorage.removeItem(key) } catch { /* Best effort. */ } },
}
export function restoreGame(): GameState | null {
  try {
    const game = JSON.parse(storage.get('multiply.game.v1') || 'null') as GameState | null
    if (!game || !['practice', 'competition'].includes(game.mode) || !Number.isInteger(game.solved) || game.solved < 0 || game.solved > 100 || typeof game.token !== 'string' || typeof game.name !== 'string' || !Number.isFinite(game.startedAt) || typeof game.finished !== 'boolean') return null
    if (game.mode === 'practice' && (!game.deck || game.deck.length !== 100 || new Set(game.deck).size !== 100 || game.deck.some(id => !Number.isInteger(id) || id < 0 || id > 99))) return null
    if (game.mode === 'practice') game.question = game.solved < 100 ? questionFor(game.deck![game.solved]) : null
    return game
  } catch { return null }
}
