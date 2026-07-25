import { test, expect } from 'bun:test';
import { setSeed, rnd, rndInt, rndPick } from '../src/rng.js';

function take(n: number): number[] {
    return Array.from({ length: n }, () => rnd());
}

test('the same seed replays the same sequence', () => {
    setSeed(12345);
    const a = take(20);
    setSeed(12345);
    expect(take(20)).toEqual(a);
});

test('different seeds diverge', () => {
    setSeed(1);
    const a = take(20);
    setSeed(2);
    expect(take(20)).not.toEqual(a);
});

test('values stay in [0,1)', () => {
    setSeed(99);
    for (const v of take(1000)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
    }
});

test('rndInt covers every bucket and never overflows', () => {
    setSeed(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
        const v = rndInt(6);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(6);
        seen.add(v);
    }
    expect(seen.size).toBe(6);
});

test('rndPick only returns members of the array', () => {
    setSeed(3);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 200; i++) {
        expect(items).toContain(rndPick(items));
    }
});
