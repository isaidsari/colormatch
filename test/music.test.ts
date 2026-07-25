import { test, expect, beforeAll } from 'bun:test';

// A recording AudioContext: every oscillator reports the pitches it is given,
// so the generated music can be checked as notes rather than as sound.

interface Scheduled {
    kind: string;
    freqs: number[];
    ramped: boolean;
}

const scheduled: Scheduled[] = [];
let fakeNow = 0;
let tick: (() => void) | null = null;

function param(initial = 0) {
    return {
        value: initial,
        setValueAtTime() { return this; },
        linearRampToValueAtTime() { return this; },
        exponentialRampToValueAtTime() { return this; },
        cancelScheduledValues() { return this; },
    };
}

function makeFakeCtx(): any {
    const node = () => ({ connect() { }, disconnect() { } });
    return {
        state: 'running',
        sampleRate: 48000,
        get currentTime() { return fakeNow; },
        destination: node(),
        createOscillator() {
            const rec: Scheduled = { kind: 'osc', freqs: [], ramped: false };
            scheduled.push(rec);
            const freq = {
                _v: 0,
                get value() { return this._v; },
                set value(v: number) { this._v = v; rec.freqs.push(v); },
                setValueAtTime(v: number) { this._v = v; rec.freqs.push(v); },
                linearRampToValueAtTime(v: number) { rec.freqs.push(v); rec.ramped = true; },
                exponentialRampToValueAtTime(v: number) { rec.freqs.push(v); rec.ramped = true; },
                cancelScheduledValues() { },
            };
            return {
                type: 'sine', frequency: freq, detune: param(),
                connect() { }, start() { }, stop() { },
            };
        },
        createGain: () => ({ gain: param(1), connect() { }, disconnect() { } }),
        createBiquadFilter: () => ({ type: '', frequency: param(1000), Q: param(1), connect() { } }),
        createWaveShaper: () => ({ curve: null, oversample: '', connect() { } }),
        createDelay: () => ({ delayTime: param(0.2), connect() { } }),
        createStereoPanner: () => ({ pan: param(0), connect() { } }),
        createBufferSource: () => ({ buffer: null, connect() { }, start() { }, stop() { } }),
        createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
    };
}

let music: typeof import('../src/music.js');

beforeAll(async () => {
    // Capture the scheduler's callback instead of letting it run on a real timer.
    (globalThis as any).setInterval = (fn: () => void) => { tick = fn; return 1 as any; };
    (globalThis as any).clearInterval = () => { tick = null; };
    music = await import('../src/music.js');
});

/** Run the engine forward, collecting everything it schedules. */
function render(seconds: number): void {
    scheduled.length = 0;
    const slice = 0.1;
    for (let t = 0; t < seconds; t += slice) {
        fakeNow += slice;
        tick?.();
    }
}

/** Hz → semitones from C4, rounded to the nearest semitone. */
function toSemi(hz: number): number {
    return Math.round(12 * Math.log2(hz / 440) + 9);
}

test('the engine starts and picks a mode', () => {
    const ctx = makeFakeCtx();
    music.start(ctx, ctx.createGain());
    music.setEnabled(true);
    const mood = music.currentMood();
    expect(mood.scale.length).toBeGreaterThanOrEqual(5);
    expect(mood.bpm).toBeGreaterThan(60);
});

test('every pitch it plays is inside the current mode', () => {
    const mood = music.currentMood();
    const allowed = new Set(mood.scale.map(s => (((mood.root + s) % 12) + 12) % 12));

    render(30);
    expect(scheduled.length).toBeGreaterThan(10);

    const offenders: number[] = [];
    for (const rec of scheduled) {
        for (const hz of rec.freqs) {
            // The kick drum is a pitch sweep, not a note — it is not in any key.
            if (hz < 130 && rec.freqs.length > 1 && rec.ramped) continue;
            const pc = ((toSemi(hz) % 12) + 12) % 12;
            if (!allowed.has(pc)) offenders.push(hz);
        }
    }
    expect(offenders).toEqual([]);
});

test('nothing lands shrill or subsonic', () => {
    render(30);
    for (const rec of scheduled) {
        for (const hz of rec.freqs) {
            expect(Number.isFinite(hz)).toBe(true);
            expect(hz).toBeGreaterThan(35);
            // The old engine put bell partials above 3 kHz, which is what made
            // stray notes sound harsh.
            expect(hz).toBeLessThan(2100);
        }
    }
});

test('chord changes step rather than glide', () => {
    render(40);
    // A pad voice that ramps its frequency is the swoop we removed; only the
    // kick drum is allowed to sweep pitch, and it stays under 130 Hz.
    for (const rec of scheduled) {
        if (!rec.ramped) continue;
        for (const hz of rec.freqs) expect(hz).toBeLessThan(130);
    }
});

test('a new section can change the mode', () => {
    const names = new Set<string>();
    for (let i = 0; i < 40; i++) {
        music.newSection();
        names.add(music.currentMood().name);
    }
    // Six modes in the pool; drawing 40 times should hit more than one.
    expect(names.size).toBeGreaterThan(1);
});

test('scale degrees map to pitches monotonically', () => {
    let last = -Infinity;
    for (let d = 0; d < 14; d++) {
        const semi = music.noteAt(d);
        expect(semi).toBeGreaterThan(last);
        last = semi;
    }
    // Seven degrees up is an octave in a heptatonic mode, five in a pentatonic.
    const n = music.currentMood().scale.length;
    expect(music.noteAt(n) - music.noteAt(0)).toBe(12);
});

test('muting stops it scheduling notes at all', () => {
    music.setEnabled(false);
    render(20);
    const pitched = scheduled.filter(r => r.freqs.some(f => f > 200));
    expect(pitched).toEqual([]);
    music.setEnabled(true);
});
