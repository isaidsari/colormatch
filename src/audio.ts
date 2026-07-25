// Procedural synth — everything generated via Web Audio.
// Starts on first user gesture to satisfy autoplay policies.

import * as music from './music.js';

/** One octave of C major pentatonic, used before the music engine has started. */
const FALLBACK_SCALE = [0, 2, 4, 7, 9];
const BASE_FREQ = 261.63; // C4

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null; // drone / ambient pad
let sfxBus: GainNode | null = null;   // one-shot effects
let started = false;

// Migrate the old single mute flag into both buses on first run.
const legacyMute = localStorage.getItem('colormatch-mute') === '1';
let musicMuted = (localStorage.getItem('colormatch-music') ?? (legacyMute ? '1' : '0')) === '1';
let sfxMuted = (localStorage.getItem('colormatch-sfx') ?? (legacyMute ? '1' : '0')) === '1';

// The musical bed lives in music.ts; this module owns the buses and the
// one-shot game sounds.

function freqOf(semi: number): number {
    return BASE_FREQ * Math.pow(2, semi / 12);
}

function ensureCtx(): void {
    if (ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicMuted ? 0 : 1;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxMuted ? 0 : 1;
    sfxBus.connect(master);
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

    // The pad is a continuously running oscillator: rAF stops when the tab is
    // hidden but Web Audio does not, so without this the drone keeps humming
    // in the background.
    document.addEventListener('visibilitychange', () => {
        if (!ctx || !started) return;
        if (document.hidden) {
            if (ctx.state === 'running') ctx.suspend();
        } else if (ctx.state === 'suspended') {
            ctx.resume();
        }
    });
}

export function isMusicMuted(): boolean {
    return musicMuted;
}

export function setMusicMuted(m: boolean): void {
    musicMuted = m;
    localStorage.setItem('colormatch-music', m ? '1' : '0');
    music.setEnabled(!m); // stop scheduling notes, not just silence them
    if (musicBus && ctx) {
        const now = ctx.currentTime;
        const g = musicBus.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now); // anchor so the ramp has a defined start
        g.linearRampToValueAtTime(m ? 0 : 1, now + 0.2);
    }
}

export function isSfxMuted(): boolean {
    return sfxMuted;
}

export function setSfxMuted(m: boolean): void {
    sfxMuted = m;
    localStorage.setItem('colormatch-sfx', m ? '1' : '0');
    if (sfxBus && ctx) {
        const now = ctx.currentTime;
        const g = sfxBus.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now); // anchor so the ramp has a defined start
        g.linearRampToValueAtTime(m ? 0 : 1, now + 0.1);
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
    if (!ctx || !sfxBus || sfxMuted) return;
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
    g.connect(sfxBus);
    osc.start(now);
    osc.stop(now + dur + 0.02);
}

// Subtle low-passed sawtooth "thud" for impact
function playNoiseBurst(when: number, dur: number, peak: number, cutoff: number): void {
    if (!ctx || !sfxBus || sfxMuted) return;
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
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
}

function startPad(): void {
    if (!ctx || !musicBus) return;
    music.start(ctx, musicBus);
    music.setEnabled(!musicMuted);
}

/** Combo intensity — drives the pad's brightness, the bass drive and the beat. */
export function setPadIntensity(level: number): void {
    music.setIntensity(level);
}

/** New run: draw a fresh mode so no two games sound the same. */
export function newMusicSection(): void {
    music.newSection();
}

// ── High-level cues ──────────────────────────────────────────────

/**
 * Pitch of a scale degree in whatever mode the music is currently in. Every
 * cue is written in degrees rather than fixed semitones, so effects stay in
 * key when the music changes mode mid-session.
 */
function note(d: number): number {
    if (started) return music.noteAt(d);
    const n = FALLBACK_SCALE.length;
    return FALLBACK_SCALE[((d % n) + n) % n] + Math.floor(d / n) * 12;
}

export function playMatch(combo: number, size: number): void {
    ensureCtx();
    if (!ctx) return;
    // Climb the mode as the combo builds.
    const d = Math.min(11, (combo - 1) + Math.max(0, size - 3));
    playTone({ freq: freqOf(note(d)), dur: 0.22, type: 'triangle', gain: 0.16 });
    playTone({ freq: freqOf(note(d + 2)), dur: 0.18, type: 'sine', gain: 0.07, when: 0.01 });
    playNoiseBurst(0, 0.08, 0.07, 1400);
}

export function playPowerCreated(isColorBomb: boolean): void {
    ensureCtx();
    if (!ctx) return;
    const arp = isColorBomb ? [0, 2, 4, 6, 8] : [0, 2, 4, 6];
    arp.forEach((d, i) => {
        playTone({
            freq: freqOf(note(d) + 12),
            dur: 0.5,
            type: 'triangle',
            gain: 0.13,
            when: i * 0.04,
            attack: 0.01,
        });
    });
    playTone({ freq: freqOf(note(0) + 24), dur: 0.7, type: 'sine', gain: 0.08, when: 0.1 });
}

export function playPowerDetonate(isColorBomb: boolean): void {
    ensureCtx();
    if (!ctx) return;
    const arp = isColorBomb ? [0, 2, 4, 6, 8, 10, 12] : [0, 4, 7, 11];
    arp.forEach((d, i) => {
        playTone({
            freq: freqOf(note(d) + 12),
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
    playTone({ freq: freqOf(note(4)), dur: 0.06, type: 'sine', gain: 0.05 });
    playTone({ freq: freqOf(note(7)), dur: 0.06, type: 'sine', gain: 0.05, when: 0.03 });
}

export function playUndo(): void {
    ensureCtx();
    playTone({ freq: freqOf(note(2)), dur: 0.08, type: 'sine', gain: 0.06 });
    playTone({ freq: freqOf(note(-2)), dur: 0.1, type: 'sine', gain: 0.06, when: 0.04 });
}

export function playDrop(impact: number): void {
    ensureCtx();
    const v = Math.min(1, impact / 14);
    playNoiseBurst(0, 0.08, 0.04 + v * 0.05, 400 + v * 400);
}

/** Detonation of two combined power-ups — bigger and lower than a normal one. */
export function playComboBlast(): void {
    ensureCtx();
    if (!ctx) return;
    [0, 2, 4, 6, 8, 10, 12, 14].forEach((d, i) => {
        playTone({ freq: freqOf(note(d)), dur: 0.45, type: 'triangle', gain: 0.11, when: i * 0.03 });
    });
    playNoiseBurst(0, 0.5, 0.13, 500);
}

/** Descending figure down the current mode — the run is over. */
export function playGameOver(): void {
    ensureCtx();
    if (!ctx) return;
    [7, 4, 2, 0].forEach((d, i) => {
        playTone({
            freq: freqOf(note(d)),
            dur: 0.65,
            type: 'triangle',
            gain: 0.13,
            when: i * 0.13,
            attack: 0.02,
        });
    });
    playTone({ freq: freqOf(note(0) - 12), dur: 1.4, type: 'sine', gain: 0.09, when: 0.4 });
}

/** Short blip for each of the final seconds in timed mode. */
export function playTimeWarning(final: boolean): void {
    ensureCtx();
    playTone({ freq: freqOf(note(final ? 7 : 4)), dur: 0.09, type: 'square', gain: 0.05 });
}
