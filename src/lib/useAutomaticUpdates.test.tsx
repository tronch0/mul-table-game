// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutomaticUpdates } from './useAutomaticUpdates'

const sw = vi.hoisted(() => ({ waiting: false, activate: vi.fn(async () => {}), callbacks: {} as { onNeedReload: () => void; onRegisteredSW: (url: string, registration: unknown) => void } }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (callbacks: typeof sw.callbacks) => {
    sw.callbacks = callbacks
    return { needRefresh: [sw.waiting], updateServiceWorker: sw.activate }
  },
}))

let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
const reload = vi.fn()
function Probe({ safe }: { safe: boolean }) { useAutomaticUpdates(safe); return null }
const render = (safe: boolean) => act(() => root.render(<Probe safe={safe}/>))
const settle = () => act(() => vi.advanceTimersByTime(1600))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  sw.waiting = false
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
  const realWindow = window
  vi.stubGlobal('window', new Proxy(realWindow, {
    get(target, property) { return property === 'location' ? { reload } : Reflect.get(target, property) },
  }))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('automatic updates', () => {
  it('waits throughout a round and results, then activates and reloads an idle screen', () => {
    sw.waiting = true
    render(false)
    settle()
    expect(sw.activate).not.toHaveBeenCalled()
    render(true)
    settle()
    expect(sw.activate).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
    act(() => sw.callbacks.onNeedReload())
    settle()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('defers a reload from another tab or an activation race until play is over', () => {
    render(false)
    act(() => sw.callbacks.onNeedReload())
    settle()
    expect(reload).not.toHaveBeenCalled()
    render(true)
    act(() => vi.advanceTimersByTime(500))
    render(false) // A child starts a round before the idle timer expires.
    settle()
    expect(reload).not.toHaveBeenCalled()
    render(true)
    settle()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('protects name entry and cancels idle refreshes on interaction or unmount', () => {
    sw.waiting = true
    render(true)
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    settle()
    expect(sw.activate).not.toHaveBeenCalled()
    act(() => input.blur())
    act(() => vi.advanceTimersByTime(1000))
    act(() => document.dispatchEvent(new Event('pointerdown')))
    act(() => vi.advanceTimersByTime(1000))
    expect(sw.activate).not.toHaveBeenCalled()
    act(() => root.render(null))
    settle()
    expect(sw.activate).not.toHaveBeenCalled()
  })

  it('checks on reconnect/return and periodically, with cleanup and offline protection', () => {
    const update = vi.fn(async () => {})
    render(false)
    act(() => sw.callbacks.onRegisteredSW('/sw.js', { update }))
    act(() => window.dispatchEvent(new Event('online')))
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(5 * 60 * 1000))
    expect(update).toHaveBeenCalledTimes(3)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => window.dispatchEvent(new Event('online')))
    expect(update).toHaveBeenCalledTimes(3)
    act(() => root.render(null))
    act(() => vi.advanceTimersByTime(5 * 60 * 1000))
    expect(update).toHaveBeenCalledTimes(3)
  })
})
