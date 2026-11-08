import { afterEach, expect, it, vi } from 'vitest'
import { RaceMusic, musicStep } from './raceMusic'
const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() })
const start = vi.fn(), close = vi.fn(async () => {})
class FakeAudio {
 state = 'running'; currentTime = 0; sampleRate = 44100; destination = {}
 resume = vi.fn(async () => {}); close = close
 createGain() { return { gain: param(), connect: vi.fn(), disconnect: vi.fn() } }
 createDynamicsCompressor() { return { threshold: param(), ratio: param(), connect: vi.fn() } }
 createBuffer() { return { getChannelData: () => new Float32Array(100) } }
 createOscillator() { return { frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn() } }
 createBufferSource() { return { connect: vi.fn(), disconnect: vi.fn(), start, stop: vi.fn() } }
 createBiquadFilter() { return { frequency: param(), connect: vi.fn(), disconnect: vi.fn() } }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })
it('has a bounded, repeatable 16-bar arrangement with a developing melody', () => {
 for (let i=0;i<256;i++) {
  const s=musicStep(i)
  expect(s).toEqual(musicStep(i+256))
  expect(s.tones.length).toBeLessThanOrEqual(3)
  for(const n of s.tones) { expect(n.midi).toBeGreaterThan(20); expect(n.midi).toBeLessThan(100); expect(n.volume).toBeLessThanOrEqual(.1) }
 }
 expect(musicStep(64).tones.length).toBeGreaterThan(musicStep(0).tones.length)
})
it('never stacks schedulers and stops scheduling on pause, mute, and disposal', async () => {
 vi.useFakeTimers();vi.stubGlobal('AudioContext',FakeAudio)
 const music=new RaceMusic()
 music.unlock();await Promise.resolve();music.setPlaying(true)
 expect(start).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(1)
 music.setPlaying(true);expect(vi.getTimerCount()).toBe(1)
 music.setPlaying(false);expect(vi.getTimerCount()).toBe(0)
 const count=start.mock.calls.length
 vi.advanceTimersByTime(1000);expect(start).toHaveBeenCalledTimes(count)
 music.setPlaying(true);expect(vi.getTimerCount()).toBe(1)
 music.setEnabled(false);expect(vi.getTimerCount()).toBe(0)
 const muted=start.mock.calls.length;music.celebrate([72,76,79]);expect(start).toHaveBeenCalledTimes(muted)
 music.setEnabled(true);expect(vi.getTimerCount()).toBe(1)
 music.dispose();expect(vi.getTimerCount()).toBe(0);expect(close).toHaveBeenCalledTimes(1)
})
it('remains playable when audio is unavailable', () => {
 vi.stubGlobal('AudioContext', class { constructor() { throw Error('Unavailable') } })
 const music=new RaceMusic();expect(()=>{music.unlock();music.setPlaying(true);music.dispose()}).not.toThrow()
})
it('unlocks suspended mobile audio inside the gesture and recovers after interruption', async () => {
 vi.useFakeTimers()
 let context: MobileAudio
 class MobileAudio extends FakeAudio {
  state = 'suspended'
  onstatechange: (() => void) | null = null
  constructor() { super(); context = this }
  resume = vi.fn(async () => { this.state = 'running'; this.onstatechange?.() })
 }
 const session = { type: 'auto' }
 vi.stubGlobal('navigator', { audioSession: session })
 vi.stubGlobal('AudioContext', MobileAudio)
 const music = new RaceMusic()
 music.setPlaying(true)
 music.unlock()
 expect(session.type).toBe('playback')
 expect(start).toHaveBeenCalledWith(0)
 await Promise.resolve()
 expect(vi.getTimerCount()).toBe(1)
 context!.state = 'interrupted'; context!.onstatechange?.()
 expect(vi.getTimerCount()).toBe(0)
 music.unlock(); await Promise.resolve()
 expect(vi.getTimerCount()).toBe(1)
 music.setEnabled(false)
 const calls = context!.resume.mock.calls.length
 music.unlock()
 expect(context!.resume).toHaveBeenCalledTimes(calls)
 music.dispose()
 expect(context!.onstatechange).toBeNull()
})
it('still plays when the audio session API is unsupported', async () => {
 vi.useFakeTimers(); vi.stubGlobal('AudioContext', FakeAudio)
 vi.stubGlobal('navigator', { get audioSession() { throw Error('Unsupported') } })
 const music = new RaceMusic()
 music.unlock(); music.setPlaying(true); await Promise.resolve()
 expect(vi.getTimerCount()).toBe(1)
 music.dispose()
})
