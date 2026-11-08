// Original tracker-style composition: 144 BPM, four voices and synthesized drums.
// No samples, downloads, or third-party music are used.
export const STEP_SECONDS = 60 / 144 / 4
const chords = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]]
const hooks = [
  [76,0,76,79,81,0,79,76,74,0,72,74,76,0,71,72],
  [72,0,76,77,81,0,79,77,76,0,72,76,77,0,76,72],
  [76,0,79,84,83,0,79,76,79,0,76,74,72,0,74,76],
  [74,0,79,83,86,0,83,79,77,0,74,71,74,0,76,79],
]
export type Tone = { midi: number; duration: number; volume: number; wave: OscillatorType }
export function musicStep(step: number): { tones: Tone[]; kick: boolean; snare: boolean; hat: boolean; openHat: boolean } {
  const bar = Math.floor(step / 16) % 16
  const tick = step % 16
  const chord = chords[bar % 4]
  const tones: Tone[] = []
  // Fast arpeggios, octave bass pulses, and a melody that develops over 16 bars.
  tones.push({ midi: chord[[0,1,2,1][tick % 4]] + 24, duration: STEP_SECONDS * .7, volume: .018, wave: 'square' })
  if (tick % 2 === 0) tones.push({ midi: chord[0] - 12 + (tick % 4 === 2 ? 12 : 0), duration: STEP_SECONDS * 1.5, volume: .1, wave: 'triangle' })
  const note = hooks[bar % 4][tick]
  if (note && bar >= 4) tones.push({ midi: note + (bar >= 12 ? 12 : 0), duration: STEP_SECONDS * 1.4, volume: .038, wave: 'square' })
  return { tones, kick: tick % 4 === 0, snare: tick % 8 === 4, hat: tick % 2 === 0, openHat: tick % 4 === 2 }
}

export class RaceMusic {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextTime = 0
  private step = 0
  private enabled = true
  private playing = false
  private disposed = false

  // Called synchronously from a user gesture, before any network request.
  unlock() {
    if (this.disposed) return
    try {
      if (!this.context) {
        const context = new AudioContext()
        this.context = context
        const compressor = context.createDynamicsCompressor()
        compressor.threshold.value = -15; compressor.ratio.value = 5
        compressor.connect(context.destination)
        this.musicGain = context.createGain(); this.effectsGain = context.createGain()
        this.musicGain.gain.value = 0; this.effectsGain.gain.value = this.enabled ? .4 : 0
        this.musicGain.connect(compressor); this.effectsGain.connect(compressor)
        this.noise = context.createBuffer(1, context.sampleRate * .2, context.sampleRate)
        const data = this.noise.getChannelData(0)
        let seed = 179
        for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741824 - 1 }
      }
      void this.context.resume().then(() => { if (!this.disposed) this.sync() }).catch(() => {})
    } catch { /* Audio is optional; a race must always remain playable. */ }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    this.fade(this.effectsGain, enabled ? .4 : 0)
    this.sync()
  }
  setPlaying(playing: boolean) { this.playing = playing; this.sync() }
  private fade(node: GainNode | null, volume: number) {
    if (!node || !this.context) return
    node.gain.cancelScheduledValues(this.context.currentTime)
    node.gain.setTargetAtTime(volume, this.context.currentTime, .015)
  }
  private sync() {
    const shouldPlay = this.enabled && this.playing && this.context?.state === 'running'
    this.fade(this.musicGain, shouldPlay ? .55 : 0)
    if (!shouldPlay) {
      if (this.timer !== null) clearInterval(this.timer)
      this.timer = null
      return
    }
    if (this.timer !== null) return
    this.nextTime = this.context!.currentTime + .04
    this.schedule()
    this.timer = setInterval(() => this.schedule(), 25)
  }
  private schedule() {
    const context = this.context!
    if (context.state !== 'running') return
    // Skip missed beats after an OS interruption instead of scheduling a burst.
    if (this.nextTime < context.currentTime) this.nextTime = context.currentTime + .02
    while (this.nextTime < context.currentTime + .1) {
      const event = musicStep(this.step++)
      for (const tone of event.tones) this.tone(tone, this.nextTime, this.musicGain!)
      if (event.kick) this.kick(this.nextTime)
      if (event.snare) this.percussion(this.nextTime, .12, 1100, .1)
      if (event.hat) this.percussion(this.nextTime, event.openHat ? .09 : .035, 7000, .035)
      this.nextTime += STEP_SECONDS
    }
  }
  private tone(tone: Tone, at: number, destination: AudioNode) {
    const context = this.context!
    const osc = context.createOscillator(), gain = context.createGain()
    osc.type = tone.wave; osc.frequency.value = 440 * 2 ** ((tone.midi - 69) / 12)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(tone.volume, at + .004)
    gain.gain.exponentialRampToValueAtTime(.0001, at + tone.duration)
    osc.connect(gain); gain.connect(destination)
    osc.start(at); osc.stop(at + tone.duration + .01)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }
  private kick(at: number) {
    const context = this.context!, osc = context.createOscillator(), gain = context.createGain()
    osc.frequency.setValueAtTime(145, at); osc.frequency.exponentialRampToValueAtTime(42, at + .13)
    gain.gain.setValueAtTime(.28, at); gain.gain.exponentialRampToValueAtTime(.0001, at + .18)
    osc.connect(gain); gain.connect(this.musicGain!); osc.start(at); osc.stop(at + .19)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
  }
  private percussion(at: number, duration: number, cutoff: number, volume: number) {
    const context = this.context!, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain()
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, at); gain.gain.exponentialRampToValueAtTime(.0001, at + duration)
    source.connect(filter); filter.connect(gain); gain.connect(this.musicGain!)
    source.start(at); source.stop(at + duration)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
  }
  celebrate(notes: number[]) {
    if (!this.enabled || this.context?.state !== 'running') return
    notes.forEach((midi, i) => this.tone({ midi, duration: .15, volume: .09, wave: 'triangle' }, this.context!.currentTime + i * .075, this.effectsGain!))
  }
  dispose() {
    this.disposed = true
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    if (this.context) void this.context.close().catch(() => {})
    this.context = null
  }
}
