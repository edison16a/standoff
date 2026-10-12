import type { AudioEngine } from "@/platform/audio/audio-engine";
import { streetImpulse } from "./street-impulse";

/**
 * Where every gun sound goes on its way to the room's effects bus. Each
 * sound gets its own panner toward the shooter's gun and a send into one
 * shared street echo. Dry and echo then meet in a compressor that glues
 * them and a fast limiter after it, so four shotguns and an AK on the
 * same frame stay loud without clipping the mix.
 */
export class GunBus {
  private readonly dry: GainNode;
  private readonly send: GainNode;
  private readonly nodes: AudioNode[];

  constructor(private readonly engine: AudioEngine) {
    const { ctx } = engine;
    this.dry = ctx.createGain();
    this.send = ctx.createGain();

    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.knee.value = 8;
    glue.ratio.value = 3;
    glue.attack.value = 0.002;
    glue.release.value = 0.18;

    // Fast and hard: catches the first millisecond of a blast the glue lets through.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.0005;
    limiter.release.value = 0.09;

    const echo = ctx.createConvolver();
    echo.buffer = impulseBuffer(ctx);
    const echoLevel = ctx.createGain();
    echoLevel.gain.value = 0.8;

    this.dry.connect(glue);
    this.send.connect(echo).connect(echoLevel).connect(glue);
    glue.connect(limiter).connect(engine.bus("sfx"));
    this.nodes = [this.dry, this.send, glue, limiter, echo, echoLevel];
  }

  /**
   * An input for one sound: panned, with `wet` of it sent to the street
   * echo. It disconnects itself `life` seconds after `at`.
   */
  voice(pan: number, wet: number, at = this.engine.now, life = 3): GainNode {
    const { ctx } = this.engine;
    const input = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    const toEcho = ctx.createGain();
    toEcho.gain.value = wet;
    input.connect(panner).connect(this.dry);
    panner.connect(toEcho).connect(this.send);
    setTimeout(
      () => {
        input.disconnect();
        panner.disconnect();
        toEcho.disconnect();
      },
      Math.max(0, at - this.engine.now + life) * 1000,
    );
    return input;
  }

  dispose(): void {
    for (const node of this.nodes) node.disconnect();
  }
}

/** The street's impulse response as a stereo buffer at the context's rate. */
function impulseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const [left, right] = streetImpulse(ctx.sampleRate);
  const buffer = ctx.createBuffer(2, left.length, ctx.sampleRate);
  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);
  return buffer;
}
