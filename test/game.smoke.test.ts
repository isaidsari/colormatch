import { test, expect, beforeAll } from 'bun:test';
import { installDomStubs, makeCanvas, runFrames, type StubCanvas } from './dom-stub.js';
import { swapCreatesMatch } from '../src/match.js';

installDomStubs();

// perf.ts and audio.ts read browser globals at import time, so the stubs above
// must already be in place — hence the dynamic import.
let Game: typeof import('../src/game.js').Game;
let getFaceTime: typeof import('../src/balls.js').getFaceTime;

beforeAll(async () => {
    ({ Game } = await import('../src/game.js'));
    ({ getFaceTime } = await import('../src/balls.js'));
});

// State enum values, mirrored from game.ts (a const enum, so not importable).
const IDLE = 0, DRAGGING = 1, GAMEOVER = 5;

const CELL = 44;
const OFFSET_X = (380 - 7 * CELL) / 2;
const OFFSET_Y = (600 - 11 * CELL) / 2;

function cellPos(r: number, c: number) {
    return { x: OFFSET_X + c * CELL, y: OFFSET_Y + r * CELL };
}

/**
 * Each Game cancels the outstanding frame on init, and the stub treats that as
 * "drop every pending callback" — so only the newest game is ever running and
 * tests stay isolated.
 */
function newGame(): { game: any; canvas: StubCanvas } {
    localStorage.clear();
    const canvas = makeCanvas();
    const game = new (Game as any)(canvas, canvas.getContext(), 380, 600);
    return { game, canvas };
}

/** Run until the board is interactive again (or the run ends). */
function settle(game: any, limit = 2000): void {
    for (let i = 0; i < limit; i++) {
        runFrames(1);
        if (game.state === IDLE || game.state === GAMEOVER) return;
    }
}

function pointer(type: string, canvas: StubCanvas, x: number, y: number): void {
    canvas.fire(type, { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y });
}

function drag(canvas: StubCanvas, from: { x: number; y: number }, to: { x: number; y: number }): void {
    pointer('pointerdown', canvas, from.x, from.y);
    pointer('pointermove', canvas, to.x, to.y);
    pointer('pointerup', canvas, to.x, to.y);
}

test('board settles into a playable state with no matches left standing', () => {
    const { game } = newGame();
    settle(game);
    expect(game.state).toBe(IDLE);
    // Every opening board must be solvable — the shuffle guard guarantees it.
    expect(game.findValidMove()).not.toBeNull();
});

test('a legal swap clears balls and scores', () => {
    const { game, canvas } = newGame();
    settle(game);

    const move = game.findValidMove();
    expect(move).not.toBeNull();
    const [r1, c1, r2, c2] = move!;

    drag(canvas, cellPos(r1, c1), cellPos(r2, c2));
    expect(game.state).not.toBe(IDLE); // swap animation is running

    settle(game);
    expect(game.score).toBeGreaterThan(0);
    expect(game.state).toBe(IDLE);
});

test('an illegal swap is undone and costs nothing', () => {
    const { game, canvas } = newGame();
    settle(game);

    let found: [number, number] | null = null;
    for (let r = 0; r < 12 && !found; r++) {
        for (let c = 0; c < 7; c++) {
            const a = game.grid[r][c], b = game.grid[r][c + 1];
            if (a.power === 'none' && b.power === 'none'
                && !swapCreatesMatch(game.grid, r, c, r, c + 1)) {
                found = [r, c];
                break;
            }
        }
    }
    expect(found).not.toBeNull();

    const [r, c] = found!;
    const colorBefore = game.grid[r][c].color;
    drag(canvas, cellPos(r, c), cellPos(r, c + 1));
    settle(game);

    expect(game.score).toBe(0);
    expect(game.grid[r][c].color).toBe(colorBefore);
});

test('a cancelled pointer never strands the drag', () => {
    const { game, canvas } = newGame();
    settle(game);

    const p = cellPos(5, 3);
    pointer('pointerdown', canvas, p.x, p.y);
    expect(game.state).toBe(DRAGGING);

    // Pointer capture routes the cancel back to us even off-canvas.
    pointer('pointercancel', canvas, -500, -500);
    expect(game.state).toBe(IDLE);
    expect(game.dragging).toBeNull();
    expect(game.findValidMove()).not.toBeNull(); // still interactive
});

test('the drag is clamped to one cell so the ball never leaves its neighbourhood', () => {
    const { game, canvas } = newGame();
    settle(game);

    const p = cellPos(6, 3);
    pointer('pointerdown', canvas, p.x, p.y);
    pointer('pointermove', canvas, p.x + 300, p.y + 40);

    const ball = game.dragging;
    expect(Math.abs(ball.x - p.x)).toBeLessThanOrEqual(CELL);
    expect(Math.abs(ball.y - p.y)).toBeLessThanOrEqual(CELL);
    // Horizontal drag dominates, so the neighbour to the right slides aside.
    expect(game.previewNeighbor).toBe(game.grid[6][4]);

    pointer('pointerup', canvas, p.x + 300, p.y + 40);
});

test('simulation speed is independent of refresh rate', () => {
    const { game } = newGame();
    settle(game);

    const t0 = getFaceTime();
    runFrames(60, 1000 / 60);   // one second at 60Hz
    const slow = getFaceTime() - t0;

    const t1 = getFaceTime();
    runFrames(120, 1000 / 120); // one second at 120Hz
    const fast = getFaceTime() - t1;

    // Both windows cover one second of wall clock, so both advance the sim by
    // ~one second. (Frame-count-based updates would give 1s vs 2s here.) The
    // residue in the accumulator can shift a window by a step or two.
    expect(slow).toBeCloseTo(1, 1);
    expect(fast).toBeCloseTo(1, 1);
    expect(Math.abs(fast - slow)).toBeLessThanOrEqual(3 / 60);
});

test('a long stall does not fast-forward the whole backlog', () => {
    const { game } = newGame();
    settle(game);

    const before = getFaceTime();
    runFrames(1, 10_000); // tab was hidden for ten seconds
    // Clamped to MAX_FRAME (0.25s) and further capped at 5 steps per frame.
    expect(getFaceTime() - before).toBeLessThanOrEqual(5 / 60 + 1e-9);
});

test('moves mode ends the run when the move budget is spent', () => {
    const { game, canvas } = newGame();
    game.setMode('moves');
    settle(game);
    expect(game.movesLeft).toBe(25);

    for (let i = 0; i < 60 && game.state !== GAMEOVER; i++) {
        const move = game.findValidMove();
        if (!move) break;
        drag(canvas, cellPos(move[0], move[1]), cellPos(move[2], move[3]));
        settle(game);
    }

    expect(game.state).toBe(GAMEOVER);
    expect(game.movesLeft).toBeLessThanOrEqual(0);
    expect(game.score).toBeGreaterThan(0);
});

test('game over is dismissed by a tap once the overlay has faded in', () => {
    const { game, canvas } = newGame();
    game.setMode('moves');
    settle(game);

    game.movesLeft = 0;
    game.triggerGameOver();
    expect(game.state).toBe(GAMEOVER);

    runFrames(90); // let the overlay ease in
    pointer('pointerdown', canvas, 190, 300);
    expect(game.state).not.toBe(GAMEOVER);
    expect(game.movesLeft).toBe(25);
});

test('zen mode never ends', () => {
    const { game, canvas } = newGame();
    settle(game);
    expect(game.getMode()).toBe('zen');

    for (let i = 0; i < 30; i++) {
        const move = game.findValidMove();
        if (!move) break;
        drag(canvas, cellPos(move[0], move[1]), cellPos(move[2], move[3]));
        settle(game);
        expect(game.state).not.toBe(GAMEOVER);
    }
});
