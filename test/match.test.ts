import { test, expect } from 'bun:test';
import {
    RAINBOW_COLOR,
    findMatches,
    makesMatchAt,
    swapCreatesMatch,
    findValidMove,
    type Cell,
} from '../src/match.js';

/**
 * Grids are written as strings, one row per line, one letter per cell — far
 * easier to eyeball than nested arrays. '*' is the rainbow (wildcard) cell.
 */
function grid(art: string): Cell[][] {
    return art
        .trim()
        .split('\n')
        .map(line => line.trim().split('').map(ch => ({
            color: ch === '*' ? RAINBOW_COLOR : ch,
        })));
}

function snapshot(g: Cell[][]): string {
    return g.map(row => row.map(c => c.color).join('')).join('\n');
}

test('finds a horizontal run of three', () => {
    const g = grid(`
        RRRB
        GBGB
        BGBG
    `);
    const m = findMatches(g);
    expect(m).toHaveLength(1);
    expect(m[0].orientation).toBe('h');
    expect(m[0].balls).toHaveLength(3);
});

test('finds a vertical run and reports its full length', () => {
    const g = grid(`
        RGB
        RBG
        RGB
        RBG
    `);
    const m = findMatches(g);
    expect(m).toHaveLength(1);
    expect(m[0].orientation).toBe('v');
    expect(m[0].balls).toHaveLength(4);
});

test('an L shape yields one horizontal and one vertical group sharing a cell', () => {
    const g = grid(`
        RRR
        RGB
        RBG
    `);
    const m = findMatches(g);
    expect(m).toHaveLength(2);

    const h = m.find(x => x.orientation === 'h')!;
    const v = m.find(x => x.orientation === 'v')!;
    // The corner belongs to both runs — that intersection is what earns a wrapped bomb.
    const shared = h.balls.filter(b => v.balls.includes(b));
    expect(shared).toHaveLength(1);
});

test('rainbow cells never form a match', () => {
    expect(findMatches(grid(`
        ***
        GBG
        BGB
    `))).toHaveLength(0);
});

test('runs of two are not matches', () => {
    expect(findMatches(grid(`
        RRB
        GBG
        BGB
    `))).toHaveLength(0);
});

test('makesMatchAt agrees with findMatches for the cell it is asked about', () => {
    const g = grid(`
        RRRB
        GBGB
        BGBG
    `);
    expect(makesMatchAt(g, 0, 1)).toBe(true);
    expect(makesMatchAt(g, 0, 3)).toBe(false);
    expect(makesMatchAt(g, 2, 0)).toBe(false);
});

test('makesMatchAt counts a run that straddles the queried cell', () => {
    const g = grid(`
        RGRG
        GBGB
        BGBG
    `);
    expect(makesMatchAt(g, 0, 1)).toBe(false);
    // Filling the gap joins the cells on both sides into one run of three.
    g[0][1].color = 'R';
    expect(makesMatchAt(g, 0, 1)).toBe(true);
});

test('swapCreatesMatch detects a move and leaves the grid untouched', () => {
    const g = grid(`
        RRG
        GGR
        BBG
    `);
    const before = snapshot(g);
    // Swapping (0,2)G with (1,2)R gives R R R on the top row.
    expect(swapCreatesMatch(g, 0, 2, 1, 2)).toBe(true);
    expect(snapshot(g)).toBe(before);
});

test('swapCreatesMatch rejects a move that produces nothing', () => {
    const g = grid(`
        RGRG
        GRGR
        RGRG
        GRGR
    `);
    expect(swapCreatesMatch(g, 0, 0, 0, 1)).toBe(false);
});

test('findValidMove returns null on a fully deadlocked board', () => {
    // A 4-colour diagonal weave has no swap that lines up three.
    const g = grid(`
        RGBY
        GBYR
        BYRG
        YRGB
    `);
    expect(findValidMove(g)).toBeNull();
});

test('findValidMove finds a move when one exists, and that move really works', () => {
    // Row 0 is R R Y R: swapping the last two lines up three R's.
    const g = grid(`
        RRYR
        GBGB
        BGBG
        YRYR
    `);
    expect(findMatches(g)).toHaveLength(0);

    const move = findValidMove(g);
    expect(move).not.toBeNull();
    const [r1, c1, r2, c2] = move!;
    expect(swapCreatesMatch(g, r1, c1, r2, c2)).toBe(true);
});

test('findValidMove leaves the grid unmodified', () => {
    const g = grid(`
        RRYR
        GBGB
        BGBG
        YRYR
    `);
    const before = snapshot(g);
    findValidMove(g);
    expect(snapshot(g)).toBe(before);
});
