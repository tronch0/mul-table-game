import { describe, expect, it } from 'vitest'
import { answerPractice, cleanName, formatTime, makeDeck, questionFor, sortScores } from './game'
import type { GameState, Score } from './game'

describe('multiplication rounds', () => {
  it('contains all 100 ordered pairs exactly once, including mirrors', () => {
    const deck = makeDeck()
    expect(deck).toHaveLength(100)
    expect(new Set(deck).size).toBe(100)
    expect(deck.map(questionFor)).toContainEqual({ id: 23, a: 3, b: 4 })
    expect(deck.map(questionFor)).toContainEqual({ id: 32, a: 4, b: 3 })
    expect([...deck].sort((a,b) => a-b)).toEqual(Array.from({ length: 100 }, (_,i) => i))
    expect(deck).not.toEqual([...deck].sort((a,b) => a-b))
  })
  it('keeps the same question after a mistake, and completes only after 100 correct answers', () => {
    const deck = makeDeck()
    let game: GameState = { token: 'test', name: 'נועה', mode: 'practice', solved: 0, startedAt: 1000, elapsed: 0, question: questionFor(deck[0]), deck, finished: false }
    expect(answerPractice(game, '999', 2000)).toEqual({ game, correct: false })
    expect(answerPractice(game, '1e2', 2000).correct).toBe(false)
    for (let i = 0; i < 100; i++) {
      const q = game.question!
      const result = answerPractice(game, String(q.a * q.b), 2000 + i * 1000)
      expect(result.correct).toBe(true)
      game = result.game
      expect(game.solved).toBe(i + 1)
      expect(game.finished).toBe(i === 99)
    }
    expect(game.question).toBeNull()
    expect(answerPractice(game, '100').correct).toBe(false)
  })
})
it('ranks quantity before time and never groups attempts by name', () => {
  const score = (id: string, solved: number, elapsed_ms: number): Score => ({ id, player_name: 'Same name', solved, elapsed_ms, finished_at: '2026-09-27T12:00:00Z' })
  expect(sortScores([score('a', 10, 1000), score('b', 11, 99999), score('c', 10, 500)]).map(s => s.id)).toEqual(['b', 'c', 'a'])
})
it('formats elapsed minutes without wrapping at one hour', () => { expect(formatTime(3661999)).toBe('61:01'); expect(formatTime(-1)).toBe('00:00') })
it('accepts Hebrew and removes invisible control characters from names', () => { expect(cleanName('  נועה  ')).toBe('נועה'); expect(cleanName('A\u202eB\n')).toBe('AB'); expect(cleanName('a'.repeat(50))).toHaveLength(24) })
