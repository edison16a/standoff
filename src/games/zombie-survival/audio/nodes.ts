import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * Small helpers the game's sounds are built from, on top of the
 * platform's tone and noise voices: a stereo send, a gritty distortion
 * curve, and a looping noise source for beds that never stop.
 */

/** A gain and a panner feeding a bus. Returns the input to connect sounds to. */
export function sendTo(engine: AudioEngine, bus: AudioNode, gain: number, pan = 0, at = engine.now, lifeS = 4): GainNode {
  const { ctx } = engine;
  const input = ctx.createGain();
  input.gain.value = gain;
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  input.connect(panner).connect(bus);
  // Disconnect once every voice routed here has finished.
  setTimeout(() => {
    input.disconnect();
    panner.disconnect();
  }, Math.max(0, (at - engine.now + lifeS) * 1000));
  return input;
}

let curve: Float32Array<ArrayBuffer> | null = null;

/** A soft clipping curve, for the grit in gunshots and roars. */
export function drive(engine: AudioEngine, amount = 3): WaveShaperNode {
  const shaper = engine.ctx.createWaveShaper();
  if (!curve) {
    const n = 1024;
    curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount);
    }
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

/** Endless noise through a filter, for wind, rotor wash and radio hiss. Returns a stop function. */
export function noiseBed(engine: AudioEngine, out: AudioNode, filter: BiquadFilterType, frequency: number, q = 1): { filter: BiquadFilterNode; gain: GainNode; stop(): void } {
  const { ctx } = engine;
  const source = ctx.createBufferSource();
  source.buffer = engine.noiseBuffer();
  source.loop = true;
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = frequency;
  biquad.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(biquad).connect(gain).connect(out);
  source.start();
  return {
    filter: biquad,
    gain,
    stop: () => {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => {
        source.stop();
        gain.disconnect();
      }, 1200);
    },
  };
}

/** A running oscillator with its own gain, for drones. */
export function hum(engine: AudioEngine, out: AudioNode, type: OscillatorType, frequency: number): { osc: OscillatorNode; gain: GainNode; stop(): void } {
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain).connect(out);
  osc.start();
  return {
    osc,
    gain,
    stop: () => {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => {
        osc.stop();
        gain.disconnect();
      }, 1500);
    },
  };
}
