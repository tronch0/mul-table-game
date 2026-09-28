// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { answerPractice, newPractice } from './lib/game'
import type { GameState } from './lib/game'

const api = vi.hoisted(() => ({ start: vi.fn(), submit: vi.fn() }))
vi.mock('./lib/api', () => ({ configured: true, supabase: null, startCompetition: api.start, submitAnswer: api.submit, finishCompetition: vi.fn(), resumeCompetition: vi.fn(), GameApiError: class extends Error {} }))
vi.mock('./lib/useAutomaticUpdates', () => ({ useAutomaticUpdates: vi.fn() }))
let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
let round: GameState
const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text || b.getAttribute('aria-label') === text)!
const click = async (text: string) => act(async () => { button(text).click() })
const input = () => host.querySelector<HTMLInputElement>('#answer')!
const score = () => host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  localStorage.clear()
  localStorage.setItem('multiply.language', 'en')
  localStorage.setItem('multiply.name', 'Test player')
  round = { ...newPractice('Test player'), mode: 'competition' }
  api.start.mockResolvedValue(round)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<App/>))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fast answer controls', () => {
  it('replaces a wrong answer even after a thinking pause and supports deleting digits', async () => {
    await click('Just practicing')
    await click('0')
    await click('Check')
    act(() => vi.advanceTimersByTime(5000))
    expect(score()).toBe('0')
    await click('8')
    expect(input().value).toBe('8')
    expect(document.activeElement).toBe(input())
    await click('Delete a digit')
    expect(input().value).toBe('')
    expect(button('Check').disabled).toBe(true)
    await click('1'); await click('0'); await click('0')
    expect(input().value).toBe('100')
  })

  it('locks pending submissions, keeps focus, and immediately enables the next answer', async () => {
    let resolve!: (result: ReturnType<typeof answerPractice>) => void
    api.submit.mockReturnValue(new Promise(r => { resolve = r }))
    await click('Let’s do this!')
    const answer = String(round.question!.a * round.question!.b)
    for (const digit of answer) await click(digit)
    await click('Check')
    expect(input().readOnly).toBe(true)
    expect(document.activeElement).toBe(input())
    await click('Check')
    await act(async () => { input().form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(api.submit).toHaveBeenCalledTimes(1)
    expect(score()).toBe('0')
    await act(async () => resolve(answerPractice(round, answer)))
    expect(score()).toBe('1')
    expect(input().value).toBe('')
    expect(input().readOnly).toBe(false)
    await click('2')
    expect(input().value).toBe('2')
    expect(document.activeElement).toBe(input())
  })
})
