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
