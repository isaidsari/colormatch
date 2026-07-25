import { test, expect, beforeAll } from 'bun:test';
import { installDomStubs, makeCanvas, runFrames, type StubCanvas } from './dom-stub.js';
import { RAINBOW_COLOR, findMatches } from '../src/match.js';

installDomStubs();

let Game: typeof import('../src/game.js').Game;

beforeAll(async () => {
    ({ Game } = await import('../src/game.js'));
});

const IDLE = 0, GAMEOVER = 5;
const ROWS = 12, COLS = 8;

// Mirrors the palette in game.ts; the index doubles as the face personality.
const PALETTE = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB'];

function newGame(): { game: any; canvas: StubCanvas } {
    localStorage.clear();
    const canvas = makeCanvas();
    const game = new (Game as any)(canvas, canvas.getContext(), 380, 600);
    return { game, canvas };
}

function settle(game: any, limit = 2000): void {
    for (let i = 0; i < limit; i++) {
        runFrames(1);
        if (game.state === IDLE || game.state === GAMEOVER) return;
    }
}

function setCell(game: any, r: number, c: number, idx: number): void {
    const b = game.grid[r][c];
    b.color = PALETTE[idx];
    b.colorIndex = idx;
    b.power = 'none';
    b.scale = 1;
    b.targetScale = 1;
}

/**
 * Repaint the board as a 4-colour diagonal weave. Neighbours always differ and
 * the nearest same-coloured cell in any row or column is four away, so stamping
 * a shape onto it cannot produce an accidental extra run.
 */
function clearBoard(game: any): void {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) setCell(game, r, c, (r + c) % 4);
    }
}

function countPower(game: any, power: string): number {
    let n = 0;
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) if (game.grid[r][c].power === power) n++;
    return n;
}

test('the blank test board really has no matches', () => {
    const { game } = newGame();
    settle(game);
    clearBoard(game);
    expect(findMatches(game.grid)).toHaveLength(0);
});

test('a run of four creates a striped ball', () => {
    const { game } = newGame();
    settle(game);
    clearBoard(game);
    for (let c = 2; c <= 5; c++) setCell(game, 5, c, 0);

    game.processMatches();

    expect(countPower(game, 'stripedH')).toBe(1);
    expect(countPower(game, 'wrapped')).toBe(0);
});

test('an L-shaped match creates a wrapped bomb at the corner', () => {
    const { game } = newGame();
    settle(game);
    clearBoard(game);
    // Arms along row 4 and column 2, meeting at (4,2).
    for (let c = 2; c <= 4; c++) setCell(game, 4, c, 0);
    for (let r = 4; r <= 6; r++) setCell(game, r, 2, 0);
    expect(findMatches(game.grid)).toHaveLength(2);

    game.processMatches();

    expect(game.grid[4][2].power).toBe('wrapped');
    expect(countPower(game, 'wrapped')).toBe(1);
    // The corner survives its own match — that is what makes it a pivot.
    expect(game.grid[4][2].targetScale).toBe(1);
    expect(countPower(game, 'stripedH') + countPower(game, 'stripedV')).toBe(0);
});

test('a run of five creates a color bomb', () => {
    const { game } = newGame();
    settle(game);
    clearBoard(game);
    for (let c = 1; c <= 5; c++) setCell(game, 7, c, 0);

    game.processMatches();

    expect(countPower(game, 'colorBomb')).toBe(1);
    expect(countPower(game, 'stripedH')).toBe(0);
});

/** Give two adjacent cells powers, swap them, and report the resulting score. */
function comboSwap(game: any, aPower: string, bPower: string): number {
    clearBoard(game);
    const a = game.grid[6][3];
    const b = game.grid[6][4];
    a.power = aPower;
    b.power = bPower;
    if (aPower === 'colorBomb') a.color = RAINBOW_COLOR;
    if (bPower === 'colorBomb') b.color = RAINBOW_COLOR;

    game.score = 0;
    game.beginSwap(a, b);
    settle(game);
    return game.score;
}

test('striped + striped clears a full row and column', () => {
    const { game } = newGame();
    settle(game);
    // 8 across + 12 down, minus the shared cell = 19 balls at 10 points each.
    expect(comboSwap(game, 'stripedH', 'stripedV')).toBeGreaterThanOrEqual(190);
});

test('wrapped + wrapped clears a 5x5 block', () => {
    const { game } = newGame();
    settle(game);
    expect(comboSwap(game, 'wrapped', 'wrapped')).toBeGreaterThanOrEqual(250);
});

test('striped + wrapped clears three rows and three columns', () => {
    const { game } = newGame();
    settle(game);
    // 3*8 + 3*12 - 9 overlapping = 51 balls.
    expect(comboSwap(game, 'stripedH', 'wrapped')).toBeGreaterThanOrEqual(510);
});

test('color bomb + color bomb clears the entire board', () => {
    const { game } = newGame();
    settle(game);
    expect(comboSwap(game, 'colorBomb', 'colorBomb')).toBeGreaterThanOrEqual(960);
});

test('color bomb + striped converts a whole colour and detonates it', () => {
    const { game } = newGame();
    settle(game);
    // A quarter of the board shares the striped ball's colour; each of those
    // becomes striped and sweeps its own line, so the blast far exceeds the
    // 24 balls it starts from.
    expect(comboSwap(game, 'colorBomb', 'stripedH')).toBeGreaterThanOrEqual(500);
});

test('a saturated power-up chain terminates instead of looping forever', () => {
    const { game } = newGame();
    settle(game);
    clearBoard(game);

    // Every ball is a striped: each activation triggers a whole line of others.
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
            game.grid[r][c].power = (r + c) % 2 === 0 ? 'stripedH' : 'stripedV';
        }

    game.beginSwap(game.grid[6][3], game.grid[6][4]);
    settle(game);

    expect(game.state).toBe(IDLE);
    expect(game.score).toBeGreaterThan(0);
});
