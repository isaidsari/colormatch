// Generative music engine.
//
// The first version was a static two-oscillator drone; the second glided a pad
// between chords, which swooped through every pitch in between and sounded
// seasick. This one is built like a small arrangement instead:
//
//   • a bank of modes (dorian, phrygian, lydian, mixolydian, harmonic minor,
//     minor pentatonic) — each with its own root, chord progression, tempo,
//     waveform and drive, picked fresh per section
//   • a pad whose voices duck-retune-return one at a time on a chord change,
//     so the harmony moves by voice leading instead of portamento
//   • a saturated bass through a soft-clip waveshaper, driven harder as the
//     player's combo climbs
//   • a lead that walks the scale (stepwise, snapping to chord tones on strong
//     beats) into a dotted-eighth feedback delay
//   • drums that fade in with intensity, so the bed is ambient at rest and
//     turns into a beat while the board is erupting
//
// Everything is scheduled with a look-ahead clock against ctx.currentTime, so
// setInterval jitter never reaches the output.

type Wave = OscillatorType;

export interface Mood {
    name: string;
    /** Tonic, in semitones from C4. */
    root: number;
    /** Ascending scale degrees within one octave. */
    scale: number[];
    /** Chord roots as indices into `scale`. */
    progression: number[];
    bpm: number;
    padWave: Wave;
    leadWave: Wave;
    /** Base waveshaper drive for the bass, 0..1. */
    drive: number;
    /** How far off-grid the odd sixteenths fall, 0..0.4. */
    swing: number;
}

const MOODS: Mood[] = [
    {
        name: 'dorian dusk',
        root: -3, scale: [0, 2, 3, 5, 7, 9, 10], progression: [0, 3, 5, 4],
        bpm: 84, padWave: 'triangle', leadWave: 'triangle', drive: 0.18, swing: 0.14,
    },
    {
        name: 'lydian drift',
        root: 0, scale: [0, 2, 4, 6, 7, 9, 11], progression: [0, 1, 4, 0],
        bpm: 72, padWave: 'sine', leadWave: 'sine', drive: 0.06, swing: 0,
    },
    {
        name: 'phrygian night',
        root: 4, scale: [0, 1, 3, 5, 7, 8, 10], progression: [0, 1, 0, 6],
        bpm: 92, padWave: 'sawtooth', leadWave: 'triangle', drive: 0.34, swing: 0.08,
    },
    {
        name: 'pentatonic grit',
        root: 2, scale: [0, 3, 5, 7, 10], progression: [0, 3, 4, 3],
        bpm: 100, padWave: 'square', leadWave: 'triangle', drive: 0.5, swing: 0.2,
    },
    {
        name: 'mixolydian roll',
        root: -5, scale: [0, 2, 4, 5, 7, 9, 10], progression: [0, 6, 3, 4],
        bpm: 96, padWave: 'triangle', leadWave: 'sine', drive: 0.24, swing: 0.16,
    },
    {
        name: 'harmonic haze',
        root: -1, scale: [0, 2, 3, 5, 7, 8, 11], progression: [0, 5, 3, 4],
        bpm: 88, padWave: 'sawtooth', leadWave: 'triangle', drive: 0.28, swing: 0.1,
    },
];

const A4 = 440;
/** Semitones from C4 → Hz. */
function freqOf(semi: number): number {
    return A4 * Math.pow(2, (semi - 9) / 12);
}

const STEPS_PER_BAR = 16;      // sixteenth notes
const BARS_PER_CHORD = 2;
const BARS_PER_SECTION = 16;   // how long before a new mood is drawn
const LOOKAHEAD = 0.35;

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let mood: Mood = MOODS[0];
let enabled = true;
let intensity = 0;
let running = false;

// Pad
let padVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
let padFilter: BiquadFilterNode | null = null;
let padGain: GainNode | null = null;

// Bass
let bassOsc: OscillatorNode | null = null;
let bassOscGain: GainNode | null = null;
let bassShaper: WaveShaperNode | null = null;
let bassGain: GainNode | null = null;

// Lead + its delay send
let leadGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;

// Drums
let drumGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

let timer: ReturnType<typeof setInterval> | null = null;
let nextStepTime = 0;
let step = 0;
let melodyDeg = 7;
let currentChordDeg = 0;

// ── Theory helpers ───────────────────────────────────────────────

/** Scale degree index (may exceed one octave) → semitones from C4. */
function degToSemi(deg: number): number {
    const n = mood.scale.length;
    const oct = Math.floor(deg / n);
    return mood.root + mood.scale[((deg % n) + n) % n] + oct * 12;
}

/** Fold a pitch into a register so nothing ever lands shrill or muddy. */
function voice(semi: number, lo: number, hi: number): number {
    while (semi < lo) semi += 12;
    while (semi > hi) semi -= 12;
    return semi;
}

/** Seventh chord built in thirds off a scale degree. */
function chordDegrees(rootDeg: number): number[] {
    return [rootDeg, rootDeg + 2, rootDeg + 4, rootDeg + 6];
}

/**
 * Pitch of a scale degree in the current mode, octaves included — the sound
 * effects use this so a match always lands inside whatever mode is playing.
 */
export function noteAt(deg: number): number {
    return degToSemi(deg);
}

/** Read-only view of the mode currently playing. */
export function currentMood(): Readonly<Mood> {
    return mood;
}

// ── Graph ────────────────────────────────────────────────────────

// Return type is left inferred: WaveShaperNode.curve wants a Float32Array
// backed specifically by an ArrayBuffer, which is what this construction gives.
function softClipCurve(amount: number) {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * Float32Array.BYTES_PER_ELEMENT));
    const k = amount * 70;
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
}

function makeNoise(c: AudioContext): AudioBuffer {
    const len = Math.floor(c.sampleRate * 0.4);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

export function start(audioCtx: AudioContext, destination: GainNode): void {
    if (running) return;
    ctx = audioCtx;
    out = destination;
    running = true;

    mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    noiseBuf = makeNoise(ctx);

    // ── Pad: four voices, each independently gated so chords can move by
    //    voice leading rather than everything sliding at once.
    padGain = ctx.createGain();
    padGain.gain.value = 0.05;

    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 780;
    padFilter.Q.value = 0.8;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 200;
    lfo.connect(lfoDepth);
    lfoDepth.connect(padFilter.frequency);
    lfo.start();

    padFilter.connect(padGain);
    padGain.connect(out);

    const opening = chordDegrees(mood.progression[0]);
    padVoices = [];
    for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        osc.type = mood.padWave;
        osc.frequency.value = freqOf(voice(degToSemi(opening[i]), -22, -6));
        osc.detune.value = (i - 1.5) * 7;
        const g = ctx.createGain();
        g.gain.value = 0.25;
        osc.connect(g);
        g.connect(padFilter);
        osc.start();
        padVoices.push({ osc, gain: g });
    }

    // ── Bass: sine through a soft clipper, so it carries on phone speakers.
    bassGain = ctx.createGain();
    bassGain.gain.value = 0.16;

    const bassTone = ctx.createBiquadFilter();
    bassTone.type = 'lowpass';
    bassTone.frequency.value = 420;

    bassShaper = ctx.createWaveShaper();
    bassShaper.curve = softClipCurve(mood.drive);
    bassShaper.oversample = '2x';

    bassOscGain = ctx.createGain();
    bassOscGain.gain.value = 0;

    bassOsc = ctx.createOscillator();
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = freqOf(voice(degToSemi(mood.progression[0]), -34, -22));
    bassOsc.connect(bassOscGain);
    bassOscGain.connect(bassShaper);
    bassShaper.connect(bassTone);
    bassTone.connect(bassGain);
    bassGain.connect(out);
    bassOsc.start();

    // ── Lead bus with a dotted-eighth feedback delay, so sparse notes bloom.
    leadGain = ctx.createGain();
    leadGain.gain.value = 1;
    leadGain.connect(out);

    delayNode = ctx.createDelay(1.5);
    delayNode.delayTime.value = stepDur() * 3;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.34;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2000;
    const delayLevel = ctx.createGain();
    delayLevel.gain.value = 0.42;

    delayNode.connect(delayTone);
    delayTone.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayTone.connect(delayLevel);
    delayLevel.connect(out);

    drumGain = ctx.createGain();
    drumGain.gain.value = 0;
    drumGain.connect(out);

    nextStepTime = ctx.currentTime + 0.2;
    step = 0;
    if (timer !== null) clearInterval(timer);
    timer = setInterval(schedule, 90);
}

export function setEnabled(on: boolean): void {
    enabled = on;
}

export function setIntensity(level: number): void {
    intensity = level;
    if (!ctx) return;
    const now = ctx.currentTime;
    const t = Math.min(level, 10) / 10;

    if (padFilter) {
        padFilter.frequency.cancelScheduledValues(now);
        padFilter.frequency.linearRampToValueAtTime(700 + t * 2200, now + 0.3);
    }
    if (padGain) {
        padGain.gain.cancelScheduledValues(now);
        padGain.gain.linearRampToValueAtTime(0.045 + t * 0.03, now + 0.3);
    }
    if (bassShaper) {
        // Chain a combo and the bass grits up under you.
        bassShaper.curve = softClipCurve(Math.min(1, mood.drive + t * 0.5));
    }
    if (drumGain) {
        drumGain.gain.cancelScheduledValues(now);
        drumGain.gain.linearRampToValueAtTime(0.12 + t * 0.75, now + 0.4);
    }
}

/** Draw a new mood — called when a run starts so no two games sound alike. */
export function newSection(): void {
    if (!ctx || !running) return;
    const next = MOODS[Math.floor(Math.random() * MOODS.length)];
    applyMood(next, ctx.currentTime + 0.05);
    step = 0;
    nextStepTime = Math.max(nextStepTime, ctx.currentTime + 0.1);
}

function applyMood(next: Mood, when: number): void {
    mood = next;
    melodyDeg = 7;
    for (const v of padVoices) v.osc.type = mood.padWave;
    if (bassShaper) bassShaper.curve = softClipCurve(mood.drive);
    if (delayNode) {
        delayNode.delayTime.cancelScheduledValues(when);
        delayNode.delayTime.linearRampToValueAtTime(stepDur() * 3, when + 0.5);
    }
    setChord(mood.progression[0], when);
}

// ── Scheduling ───────────────────────────────────────────────────

function stepDur(): number {
    return 60 / mood.bpm / 4;
}

function schedule(): void {
    if (!ctx || !running || ctx.state !== 'running') return;
    // Returning from a suspended context, skip the missed steps rather than
    // firing them all at once.
    if (nextStepTime < ctx.currentTime) nextStepTime = ctx.currentTime + 0.05;

    const horizon = ctx.currentTime + LOOKAHEAD;
    while (nextStepTime < horizon) {
        const dur = stepDur();
        // Swing pushes the odd sixteenths late.
        const swung = step % 2 === 1 ? nextStepTime + dur * mood.swing : nextStepTime;
        playStep(step, swung);
        step++;
        nextStepTime += dur;
    }
}

function playStep(s: number, when: number): void {
    const barStep = s % STEPS_PER_BAR;
    const bar = Math.floor(s / STEPS_PER_BAR);

    if (barStep === 0 && bar > 0 && bar % BARS_PER_SECTION === 0) {
        applyMood(MOODS[Math.floor(Math.random() * MOODS.length)], when);
        return;
    }

    if (barStep === 0 && bar % BARS_PER_CHORD === 0) {
        const idx = Math.floor(bar / BARS_PER_CHORD) % mood.progression.length;
        setChord(mood.progression[idx], when);
    }

    if (!enabled) return;

    playDrums(barStep, when);
    playBassStep(barStep, when);
    playLeadStep(barStep, when);
}

/** Duck each voice, retune it while silent, bring it back — staggered, so the
 *  chord change reads as movement between voices instead of a swoop. */
function setChord(rootDeg: number, when: number): void {
    currentChordDeg = rootDeg;
    const degs = chordDegrees(rootDeg);

    padVoices.forEach((v, i) => {
        const target = freqOf(voice(degToSemi(degs[i]), -22, -6));
        const t0 = when + i * 0.11;
        const g = v.gain.gain;
        g.cancelScheduledValues(t0);
        g.setValueAtTime(g.value, t0);
        g.linearRampToValueAtTime(0.0001, t0 + 0.22);
        v.osc.frequency.setValueAtTime(target, t0 + 0.24);
        g.linearRampToValueAtTime(0.25, t0 + 0.7);
    });

    if (bassOsc) {
        bassOsc.frequency.setValueAtTime(
            freqOf(voice(degToSemi(rootDeg), -34, -22)),
            when,
        );
    }
}

function playBassStep(barStep: number, when: number): void {
    if (!ctx || !bassOscGain) return;
    // Root on the downbeat, a shorter push on the second half of the bar.
    const hit = barStep === 0 ? 1 : barStep === 10 ? 0.7 : 0;
    if (hit === 0) return;

    const g = bassOscGain.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0.0001, when);
    g.exponentialRampToValueAtTime(hit, when + 0.02);
    g.exponentialRampToValueAtTime(0.0001, when + (barStep === 0 ? 1.1 : 0.5));
}

function playLeadStep(barStep: number, when: number): void {
    if (!ctx || !leadGain || !delayNode) return;

    const strong = barStep % 4 === 0;
    const density = (strong ? 0.34 : 0.13) + Math.min(intensity, 10) * 0.03;
    if (Math.random() > density) return;

    const chord = chordDegrees(currentChordDeg);
    if (strong) {
        // Land on a chord tone near wherever the line already is.
        let best = chord[0], bestGap = Infinity;
        for (const cd of chord) {
            for (let oct = -1; oct <= 2; oct++) {
                const cand = cd + oct * mood.scale.length;
                const gap = Math.abs(cand - melodyDeg);
                if (gap < bestGap) { bestGap = gap; best = cand; }
            }
        }
        melodyDeg = best;
    } else {
        // Otherwise step, with the occasional leap for shape.
        const leap = Math.random() < 0.18;
        const dir = Math.random() < 0.5 ? -1 : 1;
        melodyDeg += dir * (leap ? 3 : 1);
    }
    melodyDeg = Math.max(0, Math.min(mood.scale.length * 2 + 2, melodyDeg));

    const semi = voice(degToSemi(melodyDeg), 0, 21); // C4..A5 — never shrill
    const gain = (strong ? 0.05 : 0.036) + Math.min(intensity, 10) * 0.002;
    playPluck(semi, when, gain);
}

/** Fundamental plus a quiet sub-octave: warm, and it stays out of the ear's
 *  harshest band no matter which degree comes up. */
function playPluck(semi: number, when: number, gain: number): void {
    if (!ctx || !leadGain || !delayNode) return;

    let dest: AudioNode = leadGain;
    if (typeof ctx.createStereoPanner === 'function') {
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() * 2 - 1) * 0.6;
        pan.connect(leadGain);
        pan.connect(delayNode);
        dest = pan;
    } else {
        leadGain.connect(delayNode);
    }

    for (const [offset, level, dur, wave] of [
        [0, 1, 1.5, mood.leadWave],
        [-12, 0.26, 0.9, 'sine'],
    ] as const) {
        const osc = ctx.createOscillator();
        osc.type = wave as Wave;
        osc.frequency.value = freqOf(semi + offset);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(gain * level, when + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

        osc.connect(g);
        g.connect(dest);
        osc.start(when);
        osc.stop(when + dur + 0.05);
    }
}

function playDrums(barStep: number, when: number): void {
    if (!ctx || !drumGain) return;

    if (barStep === 0 || barStep === 6 || barStep === 10) {
        // Kick: a fast pitch drop is all it takes to read as one.
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, when);
        osc.frequency.exponentialRampToValueAtTime(42, when + 0.09);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.34, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
        osc.connect(g);
        g.connect(drumGain);
        osc.start(when);
        osc.stop(when + 0.25);
    }

    if (barStep % 2 === 1 && noiseBuf) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const g = ctx.createGain();
        const accent = barStep % 4 === 3 ? 0.05 : 0.028;
        g.gain.setValueAtTime(accent, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
        src.connect(hp);
        hp.connect(g);
        g.connect(drumGain);
        src.start(when);
        src.stop(when + 0.06);
    }
}
