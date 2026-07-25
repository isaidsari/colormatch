// Pure grid logic — no DOM, no canvas, no Ball. Works on anything with a
// `color`, which keeps it unit-testable and lets the per-move scan stay cheap.

export const RAINBOW_COLOR = '#RAINBOW';

export interface Cell {
    color: string;
}

export interface MatchGroup<T extends Cell = Cell> {
    balls: T[];
    orientation: 'h' | 'v';
}

/** All horizontal + vertical runs of 3 or more. Rainbow cells never match. */
export function findMatches<T extends Cell>(grid: T[][]): MatchGroup<T>[] {
    const rows = grid.length;
    const cols = grid[0].length;
    const matches: MatchGroup<T>[] = [];

    for (let r = 0; r < rows; r++) {
        let run: T[] = [grid[r][0]];
        for (let c = 1; c < cols; c++) {
            const b = grid[r][c];
            if (b.color === run[0].color && b.color !== RAINBOW_COLOR) {
                run.push(b);
            } else {
                if (run.length >= 3) matches.push({ balls: run, orientation: 'h' });
                run = [b];
            }
        }
        if (run.length >= 3) matches.push({ balls: run, orientation: 'h' });
    }

    for (let c = 0; c < cols; c++) {
        let run: T[] = [grid[0][c]];
        for (let r = 1; r < rows; r++) {
            const b = grid[r][c];
            if (b.color === run[0].color && b.color !== RAINBOW_COLOR) {
                run.push(b);
            } else {
                if (run.length >= 3) matches.push({ balls: run, orientation: 'v' });
                run = [b];
            }
        }
        if (run.length >= 3) matches.push({ balls: run, orientation: 'v' });
    }

    return matches;
}

/** How many cells of `color` run outward from (r,c) in direction (dr,dc), excluding (r,c). */
function runLength<T extends Cell>(
    grid: T[][], r: number, c: number, dr: number, dc: number, color: string,
): number {
    const rows = grid.length;
    const cols = grid[0].length;
    let n = 0;
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc].color === color) {
        n++;
        rr += dr;
        cc += dc;
    }
    return n;
}

/**
 * Whether the cell at (r,c) sits in a run of 3+. Only walks the cross through
 * that one cell, so it is O(board width) instead of a full-board rescan.
 */
export function makesMatchAt<T extends Cell>(grid: T[][], r: number, c: number): boolean {
    const color = grid[r][c].color;
    if (color === RAINBOW_COLOR) return false;
    if (1 + runLength(grid, r, c, 0, -1, color) + runLength(grid, r, c, 0, 1, color) >= 3) return true;
    return 1 + runLength(grid, r, c, -1, 0, color) + runLength(grid, r, c, 1, 0, color) >= 3;
}

/**
 * Whether swapping two cells' colors would produce a match. Swaps in place and
 * restores, so callers must not rely on identity of the cell objects moving.
 */
export function swapCreatesMatch<T extends Cell>(
    grid: T[][], r1: number, c1: number, r2: number, c2: number,
): boolean {
    const a = grid[r1][c1];
    const b = grid[r2][c2];
    const tmp = a.color;
    a.color = b.color;
    b.color = tmp;

    const hit = makesMatchAt(grid, r1, c1) || makesMatchAt(grid, r2, c2);

    b.color = a.color;
    a.color = tmp;
    return hit;
}

/** First legal swap found, as [r1,c1,r2,c2] — used for hints and deadlock detection. */
export function findValidMove<T extends Cell>(grid: T[][]): [number, number, number, number] | null {
    const rows = grid.length;
    const cols = grid[0].length;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (c + 1 < cols && swapCreatesMatch(grid, r, c, r, c + 1)) return [r, c, r, c + 1];
            if (r + 1 < rows && swapCreatesMatch(grid, r, c, r + 1, c)) return [r, c, r + 1, c];
        }
    }
    return null;
}
