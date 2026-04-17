// Procedural synth — everything generated via Web Audio.
// Starts on first user gesture to satisfy autoplay policies.

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // C major pentatonic, ascending
const BASE_FREQ = 261.63; // C4

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;
let muted = localStorage.getItem('colormatch-mute') === '1';

// Ambient pad
let padOsc1: OscillatorNode | null = null;
let padOsc2: OscillatorNode | null = null;
let padGain: GainNode | null = null;
let padFilter: BiquadFilterNode | null = null;

function freqOf(semi: number): number {
    return BASE_FREQ * Math.pow(2, semi / 12);
}

function ensureCtx(): void {
    if (ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
}

function startOnGesture(): void {
    if (started) return;
    started = true;
    ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    startPad();
}

export function initAudio(): void {
    const handler = () => startOnGesture();
    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('keydown', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true, passive: true });
}

export function isMuted(): boolean {
    return muted;
}

export function setMuted(m: boolean): void {
    muted = m;
    localStorage.setItem('colormatch-mute', m ? '1' : '0');
    if (master && ctx) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.linearRampToValueAtTime(m ? 0 : 0.7, now + 0.1);
    }
}

function playTone(opts: {
    freq: number;
    when?: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    detune?: number;
}): void {
    if (!ctx || !master || muted) return;
    const now = ctx.currentTime + (opts.when ?? 0);
    const dur = opts.dur ?? 0.25;
    const peak = opts.gain ?? 0.18;
    const attack = opts.attack ?? 0.005;

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'triangle';
    osc.frequency.value = opts.freq;
    if (opts.detune) osc.detune.value = opts.detune;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
}

// Subtle low-passed sawtooth "thud" for impact
function playNoiseBurst(when: number, dur: number, peak: number, cutoff: number): void {
    if (!ctx || !master || muted) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;

    const g = ctx.createGain();
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
}

// Ambient pad — two detuned triangle waves lowpass-filtered
function startPad(): void {
    if (!ctx || !master || padOsc1) return;

    padGain = ctx.createGain();
    padGain.gain.value = 0.05;

    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 800;
    padFilter.Q.value = 0.6;

    padOsc1 = ctx.createOscillator();
    padOsc1.type = 'triangle';
    padOsc1.frequency.value = freqOf(-12); // C3

    padOsc2 = ctx.createOscillator();
    padOsc2.type = 'triangle';
    padOsc2.frequency.value = freqOf(-5); // G3
    padOsc2.detune.value = 7;

    padOsc1.connect(padFilter);
    padOsc2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(master);

    padOsc1.start();
    padOsc2.start();
}

// Call whenever combo/intensity changes
export function setPadIntensity(intensity: number): void {
    if (!ctx || !padGain || !padFilter) return;
    const now = ctx.currentTime;
    const cut = 600 + intensity * 240;
    padFilter.frequency.cancelScheduledValues(now);
    padFilter.frequency.linearRampToValueAtTime(cut, now + 0.3);
    padGain.gain.cancelScheduledValues(now);
    padGain.gain.linearRampToValueAtTime(0.04 + intensity * 0.012, now + 0.3);
}

// ── High-level cues ──────────────────────────────────────────────

export function playMatch(combo: number, size: number): void {
    ensureCtx();
    if (!ctx) return;
    // Ascend the pentatonic scale with combo
    const stepIdx = Math.min(SCALE.length - 1, (combo - 1) + Math.max(0, size - 3));
    const semi = SCALE[stepIdx];
    playTone({ freq: freqOf(semi), dur: 0.22, type: 'triangle', gain: 0.16 });
    playTone({ freq: freqOf(semi + 7), dur: 0.18, type: 'sine', gain: 0.07, when: 0.01 });
    playNoiseBurst(0, 0.08, 0.07, 1400);
}

export function playPowerCreated(isColorBomb: boolean): void {
    ensureCtx();
    if (!ctx) return;
    const chord = isColorBomb ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
    chord.forEach((semi, i) => {
        playTone({
            freq: freqOf(semi + 12),
            dur: 0.5,
            type: 'triangle',
            gain: 0.13,
            when: i * 0.04,
            attack: 0.01,
        });
    });
    playTone({ freq: freqOf(24), dur: 0.7, type: 'sine', gain: 0.08, when: 0.1 });
}

export function playPowerDetonate(isColorBomb: boolean): void {
    ensureCtx();
    if (!ctx) return;
    const notes = isColorBomb ? [0, 4, 7, 12, 16, 19, 24] : [0, 7, 12, 19];
    notes.forEach((semi, i) => {
        playTone({
            freq: freqOf(semi + 12),
            dur: 0.28,
            type: 'triangle',
            gain: 0.12,
            when: i * 0.035,
        });
    });
    playNoiseBurst(0, 0.3, 0.1, 600);
}

export function playSwap(): void {
    ensureCtx();
    playTone({ freq: freqOf(7), dur: 0.06, type: 'sine', gain: 0.05 });
    playTone({ freq: freqOf(12), dur: 0.06, type: 'sine', gain: 0.05, when: 0.03 });
}

export function playUndo(): void {
    ensureCtx();
    playTone({ freq: freqOf(4), dur: 0.08, type: 'sine', gain: 0.06 });
    playTone({ freq: freqOf(-3), dur: 0.1, type: 'sine', gain: 0.06, when: 0.04 });
}

export function playDrop(impact: number): void {
    ensureCtx();
    const v = Math.min(1, impact / 14);
    playNoiseBurst(0, 0.08, 0.04 + v * 0.05, 400 + v * 400);
}
