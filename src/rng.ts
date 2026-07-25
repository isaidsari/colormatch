// Seeded PRNG (mulberry32). Everything that decides *outcomes* — grid colors,
// refills, shuffles — draws from here so a run can be reproduced from its seed.
// Purely cosmetic jitter (particle spread, wobble) stays on Math.random; it can
// diverge without changing what the player sees on the board.

let state = 0;

export function setSeed(seed: number): void {
    state = seed >>> 0;
}

/** A fresh unpredictable seed, for normal (non-reproducible) runs. */
export function randomSeed(): number {
    return (Math.random() * 0x100000000) >>> 0;
}

export function rnd(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}

export function rndInt(n: number): number {
    return Math.floor(rnd() * n);
}

export function rndPick<T>(arr: readonly T[]): T {
    return arr[rndInt(arr.length)];
}
