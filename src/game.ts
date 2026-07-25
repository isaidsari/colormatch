import { Ball, updateFaceTime, getFaceTime, PowerType, prewarmSprites } from './balls.js';
import { Particle, ScorePopup, Shockwave, drawParticles } from './particle.js';
import { RAINBOW_COLOR, MatchGroup, findMatches, findValidMove } from './match.js';
import * as audio from './audio.js';
import { isLowPower } from './perf.js';
import { rndInt, rndPick, setSeed, randomSeed } from './rng.js';

const enum State {
    IDLE,
    DRAGGING,
    SWAP_ANIM,
    BREAK_ANIM,
    FALL_ANIM,
    GAMEOVER,
}

export type Mode = 'zen' | 'moves' | 'time';

const MOVE_LIMIT = 25;
const TIME_LIMIT = 60;

/** One simulation step. The loop runs a fixed number of these per second no
 *  matter the refresh rate, so every `1/60` constant below stays honest. */
const STEP = 1 / 60;
/** Never simulate more than this much wall time in one frame (tab-switch guard). */
const MAX_FRAME = 0.25;

const COLORS = [
    '#E74C3C', // 0 → smirk
    '#F1C40F', // 1 → open
    '#2ECC71', // 2 → grin
    '#3498DB', // 3 → smug
    '#9B59B6', // 4 → flat
    '#E67E22', // 5 → worried
];

const POWER_BONUS: Record<PowerType, number> = {
    none: 0,
    stripedH: 50,
    stripedV: 50,
    wrapped: 75,
    colorBomb: 120,
};

function colorToIndex(color: string): number {
    const idx = COLORS.indexOf(color);
    return idx >= 0 ? idx : 0;
}

function isStriped(p: PowerType): boolean {
    return p === 'stripedH' || p === 'stripedV';
}

/** Update every entry and drop the dead ones in place — no per-frame array churn. */
function updateAndPrune<T extends { update(): boolean }>(arr: T[]): void {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].update()) arr[w++] = arr[i];
    }
    arr.length = w;
}

export class Game {
    // Grid
    private grid: Ball[][] = [];
    private rows = 12;
    private cols = 8;
    private cellSize = 44;
    private ballRadius = 18;
    private offsetX: number;
    private offsetY: number;
    private logicalW: number;
    private logicalH: number;
    private gridDotCache: OffscreenCanvas | null = null;

    // State
    private state: State = State.FALL_ANIM;
    private dragging: Ball | null = null;
    private dragOrigin: { x: number; y: number } | null = null;
    private dragDX = 0;
    private dragDY = 0;
    private previewNeighbor: Ball | null = null;
    private swap1: Ball | null = null;
    private swap2: Ball | null = null;
    private swapIsReverse = false;
    private animId = 0;
    private pendingPivot: Ball | null = null;
    private pendingColorBombSwap: { bomb: Ball; partner: Ball } | null = null;
    private pendingCombo: { a: Ball; b: Ball } | null = null;

    // Loop timing
    private lastFrame = 0;
    private accumulator = 0;

    // Mode
    private mode: Mode;
    private movesLeft = 0;
    private timeLeft = 0;
    private started = false;
    private lastWarnSecond = -1;
    private gameOverAnim = 0;

    // Effects
    private particles: Particle[] = [];
    private popups: ScorePopup[] = [];
    private shockwaves: Shockwave[] = [];
    private dropSoundCooldown = 0;
    private detonationsThisPass = 0;

    // Cursor / input tracking
    private cursorX = 0;
    private cursorY = 0;
    private cursorActive = false;
    private activePointer: number | null = null;

    // Drag visuals
    private dragTrail: { x: number; y: number; age: number }[] = [];
    private dragTilt = 0;
    private lastDragX = 0;
    private dragTiltTarget = 0;
    private shakeX = 0;
    private shakeY = 0;
    private shakeMag = 0;
    private flashAlpha = 0;
    private flashColor = '#fff';
    private comboDisplayAlpha = 0;
    private comboDisplayScale = 1;
    private comboDisplayText = '';
    private comboDisplayColor = '#fff';

    // Hint
    private idleTimer = 0;
    private hintMove: [number, number, number, number] | null = null;
    private readonly HINT_DELAY = 5;

    // Score
    private score = 0;
    private displayScore = 0;
    private displayHigh = 0;
    private combo = 0;
    private bestCombo = 0;
    private highScore = 0;
    private newRecord = false;

    // UI refs
    private elScore: HTMLElement;
    private elHigh: HTMLElement;
    private elModeStat: HTMLElement | null;

    constructor(
        private canvas: HTMLCanvasElement,
        private ctx: CanvasRenderingContext2D,
        logicalW: number = 380,
        logicalH: number = 600,
        private onTickAmbient?: (now: number) => void,
    ) {
        this.logicalW = logicalW;
        this.logicalH = logicalH;
        this.offsetX = (logicalW - (this.cols - 1) * this.cellSize) / 2;
        this.offsetY = (logicalH - (this.rows - 1) * this.cellSize) / 2;

        this.elScore = document.getElementById('score')!;
        this.elHigh = document.getElementById('high-score')!;
        this.elModeStat = document.getElementById('mode-stat');

        this.mode = (localStorage.getItem('colormatch-mode') as Mode) || 'zen';
        this.highScore = this.loadHighScore();

        this.buildGridDotCache();
        prewarmSprites(COLORS, this.ballRadius);

        this.bindEvents();
        this.init();
    }

    // ── Mode / persistence ────────────────────────────

    private hsKey(mode: Mode): string {
        return `colormatch-hs-${mode}`;
    }

    private loadHighScore(): number {
        // Pre-mode saves lived under a single key; fold them into zen once.
        const legacy = localStorage.getItem('colormatch-hs');
        if (legacy !== null && localStorage.getItem(this.hsKey('zen')) === null) {
            localStorage.setItem(this.hsKey('zen'), legacy);
        }
        return parseInt(localStorage.getItem(this.hsKey(this.mode)) || '0') || 0;
    }

    public getMode(): Mode {
        return this.mode;
    }

    public setMode(mode: Mode): void {
        if (mode === this.mode) return;
        this.mode = mode;
        localStorage.setItem('colormatch-mode', mode);
        this.highScore = this.loadHighScore();
        this.init();
    }

    private init(): void {
        cancelAnimationFrame(this.animId);
        setSeed(randomSeed());

        this.score = 0;
        this.displayScore = 0;
        this.displayHigh = this.highScore;
        this.combo = 0;
        this.bestCombo = 0;
        this.newRecord = false;
        this.particles = [];
        this.popups = [];
        this.shockwaves = [];
        this.dragTrail = [];
        this.dragTilt = 0;
        this.dragTiltTarget = 0;
        this.state = State.FALL_ANIM;
        this.pendingPivot = null;
        this.pendingColorBombSwap = null;
        this.pendingCombo = null;
        this.dragging = null;
        this.dragOrigin = null;
        this.previewNeighbor = null;
        this.activePointer = null;
        this.hintMove = null;
        this.idleTimer = 0;

        this.movesLeft = MOVE_LIMIT;
        this.timeLeft = TIME_LIMIT;
        this.started = false;
        this.lastWarnSecond = -1;
        this.gameOverAnim = 0;

        this.lastFrame = 0;
        this.accumulator = 0;
        this.shakeMag = 0;
        this.flashAlpha = 0;
        this.comboDisplayAlpha = 0;

        this.elScore.textContent = '0';
        this.elHigh.textContent = String(this.highScore);

        this.buildGrid();
        this.purgeInitialMatches();
        this.cascadeEntrance();
        this.renderModeStat();
        audio.setPadIntensity(0);
        audio.newMusicSection();
        this.animId = requestAnimationFrame(this.tick);
    }

    public restart(): void {
        this.init();
    }

    // ── Grid ──────────────────────────────────────────

    private pos(r: number, c: number) {
        return {
            x: this.offsetX + c * this.cellSize,
            y: this.offsetY + r * this.cellSize,
        };
    }

    private cell(px: number, py: number) {
        const c = Math.round((px - this.offsetX) / this.cellSize);
        const r = Math.round((py - this.offsetY) / this.cellSize);
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) return { r, c };
        return null;
    }

    private rndColor() {
        return rndPick(COLORS);
    }

    private buildGrid(): void {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const p = this.pos(r, c);
                const color = this.rndColor();
                const b = new Ball(p.x, p.y, this.ballRadius, color);
                b.row = r;
                b.col = c;
                b.colorIndex = colorToIndex(color);
                this.grid[r][c] = b;
            }
        }
    }

    private purgeInitialMatches(): void {
        for (let i = 0; i < 200; i++) {
            const m = findMatches(this.grid);
            if (m.length === 0) break;
            for (const g of m) for (const b of g.balls) {
                b.color = this.rndColor();
                b.colorIndex = colorToIndex(b.color);
            }
        }
    }

    private cascadeEntrance(): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                b.y = b.targetY - this.logicalH - r * 20 - Math.random() * 10;
            }
        }
    }

    private buildGridDotCache(): void {
        const oc = new OffscreenCanvas(this.logicalW, this.logicalH);
        const ctx = oc.getContext('2d')!;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                ctx.beginPath();
                ctx.arc(
                    this.offsetX + c * this.cellSize,
                    this.offsetY + r * this.cellSize,
                    1.5, 0, Math.PI * 2,
                );
                ctx.fill();
            }
        }
        this.gridDotCache = oc;
    }

    // ── Cell selectors ─────────────────────────────────

    private aliveCells(): Ball[] {
        const out: Ball[] = [];
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b && b.targetScale > 0.5) out.push(b);
            }
        return out;
    }

    private cellsInRow(r: number): Ball[] {
        if (r < 0 || r >= this.rows) return [];
        const out: Ball[] = [];
        for (let c = 0; c < this.cols; c++) {
            const b = this.grid[r][c];
            if (b && b.targetScale > 0.5) out.push(b);
        }
        return out;
    }

    private cellsInCol(c: number): Ball[] {
        if (c < 0 || c >= this.cols) return [];
        const out: Ball[] = [];
        for (let r = 0; r < this.rows; r++) {
            const b = this.grid[r][c];
            if (b && b.targetScale > 0.5) out.push(b);
        }
        return out;
    }

    private cellsInBox(r0: number, c0: number, rad: number): Ball[] {
        const out: Ball[] = [];
        for (let r = r0 - rad; r <= r0 + rad; r++) {
            if (r < 0 || r >= this.rows) continue;
            for (let c = c0 - rad; c <= c0 + rad; c++) {
                if (c < 0 || c >= this.cols) continue;
                const b = this.grid[r][c];
                if (b && b.targetScale > 0.5) out.push(b);
            }
        }
        return out;
    }

    // ── Move detection ─────────────────────────────────

    private findValidMove(): [number, number, number, number] | null {
        // Color bombs are always swappable for a clear
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].power === 'colorBomb') {
                    if (c + 1 < this.cols) return [r, c, r, c + 1];
                    if (c > 0) return [r, c, r, c - 1];
                    if (r + 1 < this.rows) return [r, c, r + 1, c];
                    if (r > 0) return [r, c, r - 1, c];
                }
            }
        return findValidMove(this.grid);
    }

    private shuffleGrid(): void {
        const colors: { color: string; idx: number; power: PowerType }[] = [];
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                colors.push({ color: b.color, idx: b.colorIndex, power: b.power });
            }

        for (let i = colors.length - 1; i > 0; i--) {
            const j = rndInt(i + 1);
            [colors[i], colors[j]] = [colors[j], colors[i]];
        }

        let k = 0;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].color = colors[k].color;
                this.grid[r][c].colorIndex = colors[k].idx;
                this.grid[r][c].power = colors[k].power;
                k++;
            }

        this.purgeInitialMatches();

        // Tell the player why the board just rearranged itself.
        this.popups.push(new ScorePopup(this.logicalW / 2, this.logicalH / 2, 'NO MOVES — SHUFFLE', '#fff', 1.1));
        this.addShockwave(new Shockwave(this.logicalW / 2, this.logicalH / 2, 260, '#ffffff', 0.7));
        for (const b of this.aliveCells()) b.offsetVy -= 1.5 + Math.random() * 1.5;
        audio.playUndo();
    }

    // ── Game logic ────────────────────────────────────

    /**
     * A saturated chain can detonate dozens of power-ups in a single pass;
     * voicing every one of them turns into noise (and a pile of oscillators),
     * so only the first few are heard.
     */
    private detonationAudio(isColorBomb: boolean): void {
        if (this.detonationsThisPass++ < 4) audio.playPowerDetonate(isColorBomb);
    }

    private activationAffected(p: Ball): Ball[] {
        const out: Ball[] = [];
        if (p.power === 'stripedH') {
            for (const b of this.cellsInRow(p.row)) if (b !== p) out.push(b);
            this.detonationAudio(false);
        } else if (p.power === 'stripedV') {
            for (const b of this.cellsInCol(p.col)) if (b !== p) out.push(b);
            this.detonationAudio(false);
        } else if (p.power === 'wrapped') {
            for (const b of this.cellsInBox(p.row, p.col, 1)) if (b !== p) out.push(b);
            this.detonationAudio(false);
        } else if (p.power === 'colorBomb') {
            // Pick most populous non-bomb color
            const counts = new Map<string, number>();
            for (const b of this.aliveCells()) {
                if (b.color !== RAINBOW_COLOR) counts.set(b.color, (counts.get(b.color) ?? 0) + 1);
            }
            let best = '', bestN = 0;
            for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
            for (const b of this.aliveCells()) if (b !== p && b.color === best) out.push(b);
            this.detonationAudio(true);
        }
        return out;
    }

    /**
     * Two power-ups swapped into each other. Each pairing has its own blast
     * shape; bomb + X converts every ball of X's color into an X and lets the
     * normal chain reaction take it from there.
     */
    private resolveCombo(a: Ball, b: Ball, destroy: Set<Ball>, queue: Ball[]): void {
        const add = (list: Ball[]) => {
            for (const x of list) {
                if (destroy.has(x)) continue;
                destroy.add(x);
                if (x.power !== 'none' && x !== a && x !== b) queue.push(x);
            }
        };

        destroy.add(a);
        destroy.add(b);

        const pa = a.power, pb = b.power;

        if (pa === 'colorBomb' && pb === 'colorBomb') {
            add(this.aliveCells());
        } else if (pa === 'colorBomb' || pb === 'colorBomb') {
            const other = pa === 'colorBomb' ? b : a;
            const inherited = other.power;
            const targets = this.aliveCells()
                .filter(x => x !== a && x !== b && x.color === other.color);
            let i = 0;
            for (const t of targets) {
                // Striped inherits alternating orientation so the board erupts
                // in both directions instead of one flat sweep.
                t.power = inherited === 'wrapped'
                    ? 'wrapped'
                    : (i++ % 2 === 0 ? 'stripedH' : 'stripedV');
            }
            add(targets);
        } else if (isStriped(pa) && isStriped(pb)) {
            add(this.cellsInRow(a.row));
            add(this.cellsInCol(a.col));
        } else if (isStriped(pa) || isStriped(pb)) {
            for (let d = -1; d <= 1; d++) {
                add(this.cellsInRow(a.row + d));
                add(this.cellsInCol(a.col + d));
            }
        } else {
            add(this.cellsInBox(a.row, a.col, 2));
        }

        audio.playComboBlast();
        this.addShockwave(new Shockwave(a.x, a.y, 340, '#ffffff', 0.85));
        this.flashAlpha = 0.34;
        this.flashColor = '#ffffff';
    }

    private applyAmbientCharacterBehaviors(): void {
        // A 240px radius covered nearly the whole board, so every ball stared at
        // once — which reads as a blank hive rather than characters noticing you,
        // and costs the whole board its cached sprite. Two and a half cells is a
        // small cluster around the cursor: more deliberate, and far cheaper.
        const GAZE_RADIUS = this.cellSize * 2.5;
        const LEAN_MAX = 4.5;
        const LEAN_CELL = this.cellSize * 1.2;

        const dragging = this.dragging;
        const origin = this.dragOrigin;
        const preview = this.previewNeighbor;

        // Cursor gaze forces every ball off the cached idle sprite and onto the
        // full per-frame face path. During a cascade the balls are flying past
        // and nobody is reading their eyes, so skip it and let the whole board
        // fall back to the cheap draw — that is where the refill stutter was.
        const gaze = this.cursorActive
            && this.state !== State.FALL_ANIM
            && this.state !== State.BREAK_ANIM;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b || b.targetScale < 0.5) continue;

                // ── Universal cursor gaze — weak, only wins when no blast gaze active ──
                if (gaze) {
                    const dx = this.cursorX - b.x;
                    const dy = this.cursorY - b.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < GAZE_RADIUS && b.lookAtAmount < 0.95) {
                        b.lookAtX = this.cursorX;
                        b.lookAtY = this.cursorY;
                        // Steep falloff: the ball under the cursor locks on, the
                        // ones at the edge of the cluster only glance over.
                        const near = 1 - dist / GAZE_RADIUS;
                        const want = 0.25 + near * near * 0.7;
                        if (want > b.lookAtAmount) b.lookAtAmount = want;
                    }
                }

                // ── Swap preview — the ball being displaced slides into the
                //    vacated cell so the pending swap is legible before release.
                if (b === preview) {
                    b.offsetTargetX = -this.dragDX * 0.92;
                    b.offsetTargetY = -this.dragDY * 0.92;
                    continue;
                }

                // ── Neighbor lean — toward the dragged ball's origin cell ──
                if (dragging && origin && b !== dragging) {
                    const dx = origin.x - b.targetX;
                    const dy = origin.y - b.targetY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 1 && dist < LEAN_CELL) {
                        const fall = 1 - dist / LEAN_CELL;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        b.offsetTargetX = nx * LEAN_MAX * fall;
                        b.offsetTargetY = ny * LEAN_MAX * fall;
                    }
                }
            }
        }
    }

    private pokeWobbleFrom(x: number, y: number, reach: number, strength: number, src?: Ball): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b || b === src || b.targetScale < 0.5) continue;
                const dx = b.x - x;
                const dy = b.y - y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1 || dist > reach) continue;
                const fall = 1 - dist / reach;
                const kick = strength * fall;
                b.offsetVx += (dx / dist) * kick;
                b.offsetVy += (dy / dist) * kick * 0.7;
            }
        }
    }

    private spawnStripeFx(b: Ball): void {
        const horizontal = b.power === 'stripedH';
        const n = 14;
        for (let i = 0; i < n; i++) {
            const spread = (i - n / 2) * 1.2;
            const jitter = (Math.random() - 0.5) * 1.6;
            const vx = horizontal ? spread : jitter;
            const vy = horizontal ? jitter : spread;
            this.particles.push(new Particle(b.x, b.y, vx, vy, 2 + Math.random() * 2, b.color));
        }
    }

    private spawnSparkleRing(b: Ball, color: string): void {
        const n = 20;
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 * i) / n;
            const spd = 2 + Math.random() * 2;
            this.particles.push(
                new Particle(b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, 2 + Math.random() * 3, color),
            );
        }
    }

    /**
     * Which balls get promoted to power-ups, in descending priority:
     * 5-in-a-row → color bomb, L/T intersection → wrapped, 4-in-a-row → striped.
     * A group that already produced a wrapped ball does not also produce a striped.
     */
    private decidePowerCreations(groups: MatchGroup<Ball>[]): { ball: Ball; type: PowerType }[] {
        const created: { ball: Ball; type: PowerType }[] = [];
        const taken = new Set<Ball>();
        const consumed = new Set<MatchGroup<Ball>>();
        const pending = this.pendingPivot;

        // Prefer the ball the player actually dragged — it feels like their doing.
        const pick = (g: MatchGroup<Ball>): Ball | null => {
            if (pending && g.balls.includes(pending) && pending.power === 'none' && !taken.has(pending)) {
                return pending;
            }
            const mid = g.balls[Math.floor(g.balls.length / 2)];
            if (mid.power === 'none' && !taken.has(mid)) return mid;
            for (const b of g.balls) if (b.power === 'none' && !taken.has(b)) return b;
            return null;
        };

        for (const g of groups) {
            if (g.balls.length < 5) continue;
            const p = pick(g);
            if (!p) continue;
            taken.add(p);
            consumed.add(g);
            created.push({ ball: p, type: 'colorBomb' });
        }

        // A ball belonging to both a horizontal and a vertical run is an L or T.
        const hOwner = new Map<Ball, MatchGroup<Ball>>();
        const vOwner = new Map<Ball, MatchGroup<Ball>>();
        for (const g of groups) {
            if (consumed.has(g)) continue;
            const m = g.orientation === 'h' ? hOwner : vOwner;
            for (const b of g.balls) m.set(b, g);
        }
        for (const [b, hg] of hOwner) {
            const vg = vOwner.get(b);
            if (!vg || b.power !== 'none' || taken.has(b)) continue;
            taken.add(b);
            consumed.add(hg);
            consumed.add(vg);
            created.push({ ball: b, type: 'wrapped' });
        }

        for (const g of groups) {
            if (g.balls.length !== 4 || consumed.has(g)) continue;
            const p = pick(g);
            if (!p) continue;
            taken.add(p);
            consumed.add(g);
            created.push({ ball: p, type: g.orientation === 'h' ? 'stripedH' : 'stripedV' });
        }

        return created;
    }

    private processMatches(): void {
        const groups = findMatches(this.grid) as MatchGroup<Ball>[];
        const hasSpecialSwap = !!this.pendingColorBombSwap || !!this.pendingCombo;
        this.detonationsThisPass = 0;

        if (groups.length === 0 && !hasSpecialSwap) {
            this.combo = 0;
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++) {
                    // A ball still playing its landing "oh!" keeps it; the timer clears it.
                    if (this.grid[r][c].faceState !== 'landing') this.grid[r][c].faceState = 'idle';
                }

            if (!this.findValidMove()) {
                this.shuffleGrid();
                if (!this.findValidMove()) this.shuffleGrid();
            }

            this.state = State.IDLE;
            this.started = true;
            this.idleTimer = 0;
            this.hintMove = null;
            this.pendingPivot = null;
            audio.setPadIntensity(0);
            this.checkGameOver();
            return;
        }

        this.combo++;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        if (this.combo === 1 && this.mode === 'moves') this.movesLeft--;

        const powerCreations = this.decidePowerCreations(groups);
        const preserve = new Set<Ball>(powerCreations.map(p => p.ball));

        // ── Build destroy set via BFS over power activations ──
        const destroy = new Set<Ball>();
        const queue: Ball[] = [];

        if (this.pendingCombo) {
            const { a, b } = this.pendingCombo;
            this.pendingCombo = null;
            this.resolveCombo(a, b, destroy, queue);
        }

        // From color bomb swap (bomb + plain ball → clear that color)
        if (this.pendingColorBombSwap) {
            const { bomb, partner } = this.pendingColorBombSwap;
            if (!preserve.has(bomb)) destroy.add(bomb);
            const targetColor = partner.color;
            for (const b of this.aliveCells()) {
                if (b.color === targetColor && !preserve.has(b) && !destroy.has(b)) {
                    destroy.add(b);
                    if (b.power !== 'none') queue.push(b);
                }
            }
            this.pendingColorBombSwap = null;
        }

        // From line matches
        for (const g of groups) {
            for (const b of g.balls) {
                if (preserve.has(b)) continue;
                if (!destroy.has(b)) {
                    destroy.add(b);
                    if (b.power !== 'none') queue.push(b);
                }
            }
        }

        // Chain activations
        let chainCount = 0;
        while (queue.length > 0 && chainCount < 400) {
            chainCount++;
            const p = queue.shift()!;
            const affected = this.activationAffected(p);
            for (const b of affected) {
                if (preserve.has(b)) continue;
                if (!destroy.has(b)) {
                    destroy.add(b);
                    if (b.power !== 'none') queue.push(b);
                }
            }
        }

        // ── Apply destruction ──
        let sumX = 0, sumY = 0;
        const representativeColors: string[] = [];
        // Poking neighbours per destroyed ball is O(board) each — fine for a
        // three-match, a spike for a board-wide clear. Past a threshold one
        // shove from the blast centre reads the same and costs one pass.
        const perBallWobble = destroy.size <= 10;

        for (const b of destroy) {
            b.faceState = 'scared';
            b.targetScale = 0;
            const displayColor = b.color === RAINBOW_COLOR ? '#ffffff' : b.color;
            this.spawnBurst(b.x, b.y, displayColor, 8);
            if (isStriped(b.power)) {
                this.spawnStripeFx(b);
                this.addShockwave(new Shockwave(b.x, b.y, 140, b.color, 0.5));
            } else if (b.power === 'wrapped') {
                this.spawnSparkleRing(b, b.color);
                this.addShockwave(new Shockwave(b.x, b.y, 110, b.color, 0.45));
            } else if (b.power === 'colorBomb') {
                this.spawnSparkleRing(b, '#ffffff');
                this.addShockwave(new Shockwave(b.x, b.y, 220, '#ffffff', 0.7));
            }
            if (perBallWobble) this.pokeWobbleFrom(b.x, b.y, this.cellSize * 2.2, 2.6, b);
            sumX += b.x;
            sumY += b.y;
            if (displayColor !== '#ffffff' && representativeColors.length < 4) {
                representativeColors.push(displayColor);
            }
        }

        // Extra shockwave on big clears
        if (destroy.size >= 6) {
            const dw = destroy.size >= 12 ? 280 : 180;
            this.addShockwave(new Shockwave(sumX / destroy.size, sumY / destroy.size, dw, representativeColors[0] ?? '#ffffff', 0.6));
        }
        if (!perBallWobble && destroy.size > 0) {
            this.pokeWobbleFrom(sumX / destroy.size, sumY / destroy.size, this.cellSize * 6, 3.4);
        }

        const cx = destroy.size > 0 ? sumX / destroy.size : this.logicalW / 2;
        const cy = destroy.size > 0 ? sumY / destroy.size : this.logicalH / 2;

        // ── Create power balls (with ceremony) ──
        for (const { ball, type } of powerCreations) {
            ball.power = type;
            ball.powerCreateAge = 0;
            if (type === 'colorBomb') {
                ball.color = RAINBOW_COLOR;
            }
            audio.playPowerCreated(type === 'colorBomb');
            this.spawnSparkleRing(ball, type === 'colorBomb' ? '#ffffff' : ball.color);
        }

        // ── Scoring ──
        const destroyCount = destroy.size;
        const basePoints = destroyCount * 10;
        let powerBonus = 0;
        for (const { type } of powerCreations) powerBonus += POWER_BONUS[type];
        const pts = (basePoints + powerBonus) * this.combo;
        this.score += pts;
        if (this.score > this.highScore) {
            if (!this.newRecord && this.highScore > 0) this.newRecord = true;
            this.highScore = this.score;
            localStorage.setItem(this.hsKey(this.mode), String(this.highScore));
        }

        // ── Audio — main match note + pad ──
        const intensity = Math.min(this.combo + Math.floor(destroyCount / 4), 10);
        audio.playMatch(this.combo, destroyCount);
        audio.setPadIntensity(intensity);

        // ── FX ──
        this.shakeMag = Math.max(this.shakeMag, Math.min(2 + intensity * 1.6, 18));
        if (this.combo >= 2 || destroyCount >= 8) {
            this.flashAlpha = Math.max(this.flashAlpha, Math.min(0.08 + intensity * 0.03, 0.32));
            this.flashColor = representativeColors[0] ?? '#ffffff';
        }

        // Nearby balls gaze at blast center
        for (const nb of this.aliveCells()) {
            if (destroy.has(nb)) continue;
            const dist = Math.hypot(nb.x - cx, nb.y - cy);
            if (dist < this.cellSize * 4) {
                nb.lookAtX = cx;
                nb.lookAtY = cy;
                nb.lookAtAmount = Math.min(1, (this.cellSize * 4) / (dist + 1));
            }
        }

        const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
        const popupScale = this.combo > 1 ? 1 + Math.min(intensity * 0.15, 0.8) : 1;
        this.popups.push(new ScorePopup(cx, cy - 10, label, '#fff', popupScale));

        if (this.combo >= 2) {
            this.comboDisplayText = `COMBO x${this.combo}`;
            this.comboDisplayAlpha = 1;
            this.comboDisplayScale = 1.6;
            this.comboDisplayColor = representativeColors[0] ?? '#fff';
        }

        this.pendingPivot = null;
        this.state = State.BREAK_ANIM;
    }

    private gravity(): void {
        for (let c = 0; c < this.cols; c++) {
            let write = this.rows - 1;

            for (let r = this.rows - 1; r >= 0; r--) {
                const b = this.grid[r][c];
                if (b.targetScale > 0.5) {
                    if (r !== write) {
                        this.grid[write][c] = b;
                        this.grid[r][c] = null!;
                        b.row = write;
                        b.col = c;
                        const p = this.pos(write, c);
                        b.targetX = p.x;
                        b.targetY = p.y;
                        b.useGravity = true;
                    }
                    write--;
                }
            }

            for (let r = write; r >= 0; r--) {
                const p = this.pos(r, c);
                const startY = -this.ballRadius * 2 - (write - r) * this.cellSize;
                const nb = new Ball(p.x, startY, this.ballRadius, this.rndColor());
                nb.colorIndex = colorToIndex(nb.color);
                nb.targetX = p.x;
                nb.targetY = p.y;
                nb.row = r;
                nb.col = c;
                nb.scale = 0.6;
                nb.targetScale = 1;
                nb.useGravity = true;
                this.grid[r][c] = nb;
            }
        }

        this.state = State.FALL_ANIM;
    }

    // ── Game over ─────────────────────────────────────

    private checkGameOver(): boolean {
        if (this.state === State.GAMEOVER) return true;
        if (this.mode === 'moves' && this.movesLeft <= 0) { this.triggerGameOver(); return true; }
        if (this.mode === 'time' && this.timeLeft <= 0) { this.triggerGameOver(); return true; }
        return false;
    }

    private triggerGameOver(): void {
        this.state = State.GAMEOVER;
        this.gameOverAnim = 0;
        this.dragging = null;
        this.dragOrigin = null;
        this.previewNeighbor = null;
        this.hintMove = null;
        this.shakeMag = 10;
        for (const b of this.aliveCells()) {
            b.faceState = 'scared';
            b.offsetVy -= 1 + Math.random();
        }
        audio.setPadIntensity(0);
        audio.playGameOver();
    }

    // ── FX ────────────────────────────────────────────

    /** Shockwaves are the priciest effect on screen; keep only the newest few. */
    private addShockwave(s: Shockwave): void {
        const cap = isLowPower() ? 4 : 8;
        if (this.shockwaves.length >= cap) this.shockwaves.shift();
        this.shockwaves.push(s);
    }

    private spawnBurst(x: number, y: number, color: string, n: number): void {
        // A board-wide clear would otherwise spawn ~800 particles at once.
        if (this.particles.length > 700) return;
        if (isLowPower()) n = Math.ceil(n / 2); // fewer particles on weak devices
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
            const spd = 3 + Math.random() * 4;
            this.particles.push(
                new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 2.5 + Math.random() * 4, color),
            );
        }
    }

    // ── Input ─────────────────────────────────────────

    private bindEvents(): void {
        const cv = this.canvas;
        cv.style.cursor = 'grab';

        // Pointer events unify mouse/touch/pen, and capture guarantees we still
        // get the release even if the finger leaves the canvas mid-drag.
        cv.addEventListener('pointerdown', e => {
            if (this.activePointer !== null) return;
            this.activePointer = e.pointerId;
            try { cv.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
            const p = this.pointerXY(e);
            this.updateCursor(p, true);
            this.onDown(p);
        });

        cv.addEventListener('pointermove', e => {
            if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
            const p = this.pointerXY(e);
            this.updateCursor(p, true);
            this.onMove(p);
        });

        const release = (e: PointerEvent, cancelled: boolean) => {
            if (e.pointerId !== this.activePointer) return;
            this.activePointer = null;
            try { cv.releasePointerCapture(e.pointerId); } catch { /* already released */ }
            if (e.pointerType !== 'mouse') this.cursorActive = false;
            if (cancelled) this.cancelDrag(); else this.onUp();
        };

        cv.addEventListener('pointerup', e => release(e, false));
        cv.addEventListener('pointercancel', e => release(e, true));

        cv.addEventListener('pointerleave', () => {
            if (this.activePointer === null) this.cursorActive = false;
        });
        cv.addEventListener('pointerenter', e => {
            if (e.pointerType === 'mouse') this.cursorActive = true;
        });
    }

    private updateCursor(p: { x: number; y: number }, active: boolean): void {
        this.cursorX = p.x;
        this.cursorY = p.y;
        this.cursorActive = active;
    }

    private pointerXY(e: PointerEvent) {
        const r = this.canvas.getBoundingClientRect();
        const sx = this.logicalW / r.width;
        const sy = this.logicalH / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    private onDown(p: { x: number; y: number }): void {
        if (this.state === State.GAMEOVER) {
            if (this.gameOverAnim > 0.6) this.restart();
            return;
        }
        if (this.state !== State.IDLE) return;
        const c = this.cell(p.x, p.y);
        if (!c) return;
        this.dragging = this.grid[c.r][c.c];
        this.dragging.faceState = 'selected';
        this.dragOrigin = { x: this.dragging.targetX, y: this.dragging.targetY };
        this.state = State.DRAGGING;
        this.canvas.style.cursor = 'grabbing';
        this.idleTimer = 0;
        this.hintMove = null;
        this.lastDragX = p.x;
        this.dragTilt = 0;
        this.dragTiltTarget = 0;
        this.dragDX = 0;
        this.dragDY = 0;
        this.previewNeighbor = null;
        this.dragTrail = [];
    }

    private onMove(p: { x: number; y: number }): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
        const o = this.dragOrigin!;

        // Lock to the dominant axis and clamp to a single cell, so the ball
        // previews the swap instead of flying across the whole board.
        let dx = p.x - o.x;
        let dy = p.y - o.y;
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0; else dx = 0;
        const max = this.cellSize;
        dx = Math.max(-max, Math.min(max, dx));
        dy = Math.max(-max, Math.min(max, dy));

        this.dragTiltTarget = Math.max(-0.35, Math.min(0.35, (p.x - this.lastDragX) * 0.06));
        this.lastDragX = p.x;

        this.dragDX = dx;
        this.dragDY = dy;
        this.dragging.x = o.x + dx;
        this.dragging.y = o.y + dy;

        this.previewNeighbor = this.neighborInDragDirection();
    }

    private neighborInDragDirection(): Ball | null {
        const b = this.dragging;
        if (!b) return null;
        const dc = this.dragDX === 0 ? 0 : (this.dragDX > 0 ? 1 : -1);
        const dr = this.dragDY === 0 ? 0 : (this.dragDY > 0 ? 1 : -1);
        if (dc === 0 && dr === 0) return null;
        const nr = b.row + dr, nc = b.col + dc;
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return null;
        return this.grid[nr][nc];
    }

    private cancelDrag(): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
        this.dragging.faceState = 'idle';
        this.dragging.x = this.dragging.targetX;
        this.dragging.y = this.dragging.targetY;
        this.dragging = null;
        this.dragOrigin = null;
        this.previewNeighbor = null;
        this.dragDX = 0;
        this.dragDY = 0;
        this.canvas.style.cursor = 'grab';
        this.state = State.IDLE;
    }

    private onUp(): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
        this.canvas.style.cursor = 'grab';

        const b = this.dragging;
        b.faceState = 'idle';
        b.x = b.targetX;
        b.y = b.targetY;

        const target = Math.abs(this.dragDX) > this.cellSize * 0.25 || Math.abs(this.dragDY) > this.cellSize * 0.25
            ? this.neighborInDragDirection()
            : null;

        this.dragging = null;
        this.dragOrigin = null;
        this.previewNeighbor = null;
        this.dragDX = 0;
        this.dragDY = 0;

        if (target) {
            this.beginSwap(b, target);
        } else {
            this.state = State.IDLE;
        }
    }

    private beginSwap(a: Ball, b: Ball): void {
        this.swap1 = a;
        this.swap2 = b;
        this.swapIsReverse = false;
        this.pendingPivot = a;
        this.pendingCombo = null;
        this.pendingColorBombSwap = null;

        if (a.power !== 'none' && b.power !== 'none') {
            // Two power-ups meeting is its own event — no line match required.
            this.pendingCombo = { a, b };
        } else if (a.power === 'colorBomb' && b.color !== RAINBOW_COLOR) {
            this.pendingColorBombSwap = { bomb: a, partner: b };
        } else if (b.power === 'colorBomb' && a.color !== RAINBOW_COLOR) {
            this.pendingColorBombSwap = { bomb: b, partner: a };
        }

        this.grid[a.row][a.col] = b;
        this.grid[b.row][b.col] = a;

        const [ar, ac] = [a.row, a.col];
        a.row = b.row; a.col = b.col;
        b.row = ar; b.col = ac;

        const pa = this.pos(a.row, a.col);
        const pb = this.pos(b.row, b.col);
        a.targetX = pa.x; a.targetY = pa.y;
        b.targetX = pb.x; b.targetY = pb.y;

        // The displaced neighbor was leaning out of the way; let it ride back in.
        a.offsetTargetX = 0; a.offsetTargetY = 0;
        b.offsetTargetX = 0; b.offsetTargetY = 0;

        audio.playSwap();
        this.state = State.SWAP_ANIM;
    }

    private undoSwap(): void {
        const a = this.swap1!, b = this.swap2!;

        this.grid[a.row][a.col] = b;
        this.grid[b.row][b.col] = a;

        const [ar, ac] = [a.row, a.col];
        a.row = b.row; a.col = b.col;
        b.row = ar; b.col = ac;

        const pa = this.pos(a.row, a.col);
        const pb = this.pos(b.row, b.col);
        a.targetX = pa.x; a.targetY = pa.y;
        b.targetX = pb.x; b.targetY = pb.y;

        this.swapIsReverse = true;
        this.pendingColorBombSwap = null;
        this.pendingCombo = null;
        this.pendingPivot = null;
        audio.playUndo();
    }

    // ── Update / Draw ─────────────────────────────────

    private updateBalls(): boolean {
        let anim = false;
        let maxImpact = 0;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b) continue;
                if (b === this.dragging) { anim = true; continue; }
                if (b.update()) anim = true;
                if (b.lastImpact > 0) {
                    if (b.lastImpact > maxImpact) maxImpact = b.lastImpact;
                    b.lastImpact = 0;
                }
            }

        // A cascade lands dozens of balls at once — play one thud for the
        // hardest of them rather than dozens of overlapping ones.
        if (this.dropSoundCooldown > 0) this.dropSoundCooldown -= STEP;
        if (maxImpact > 0 && this.dropSoundCooldown <= 0) {
            audio.playDrop(maxImpact);
            this.dropSoundCooldown = 0.06;
        }
        return anim;
    }

    private tick = (now: number = 0): void => {
        this.animId = requestAnimationFrame(this.tick);
        this.onTickAmbient?.(now);

        // Fixed timestep: the simulation advances in 1/60s slices regardless of
        // how often rAF fires, so a 120Hz display no longer runs at double speed.
        if (this.lastFrame === 0) this.lastFrame = now;
        const elapsed = Math.min((now - this.lastFrame) / 1000, MAX_FRAME);
        this.lastFrame = now;
        this.accumulator += elapsed;

        let steps = 0;
        while (this.accumulator >= STEP && steps < 5) {
            this.step();
            this.accumulator -= STEP;
            steps++;
        }
        // Ran out of budget — drop the backlog instead of spiralling.
        if (steps === 5) this.accumulator = 0;

        this.draw();
    };

    private step(): void {
        updateAndPrune(this.particles);
        updateAndPrune(this.popups);
        updateAndPrune(this.shockwaves);
        this.applyAmbientCharacterBehaviors();
        const anim = this.updateBalls();
        updateFaceTime(STEP);
        this.tickTimers();
        this.decayFx();

        // Drag tilt + trail
        this.dragTilt += (this.dragTiltTarget - this.dragTilt) * 0.22;
        this.dragTiltTarget *= 0.86;
        if (this.dragging) {
            this.dragTrail.push({ x: this.dragging.x, y: this.dragging.y, age: 0 });
            if (this.dragTrail.length > 10) this.dragTrail.shift();
        }
        for (const t of this.dragTrail) t.age += STEP;

        switch (this.state) {
            case State.SWAP_ANIM:
                if (!anim) {
                    if (this.swapIsReverse) {
                        this.state = State.IDLE;
                    } else if (
                        findMatches(this.grid).length === 0
                        && !this.pendingColorBombSwap
                        && !this.pendingCombo
                    ) {
                        this.undoSwap();
                    } else {
                        this.combo = 0;
                        this.processMatches();
                    }
                }
                break;

            case State.BREAK_ANIM:
                if (!anim) this.gravity();
                break;

            case State.FALL_ANIM:
                if (!anim) this.processMatches();
                break;

            case State.IDLE:
                this.idleTimer += STEP;
                if (!this.hintMove && this.idleTimer >= this.HINT_DELAY) {
                    this.hintMove = this.findValidMove();
                }
                break;

            case State.GAMEOVER:
                this.gameOverAnim = Math.min(1, this.gameOverAnim + STEP * 1.6);
                break;
        }

        this.tickUI();
    }

    /** Mode clocks — only tick once the opening cascade has settled. */
    private tickTimers(): void {
        if (this.mode !== 'time' || !this.started || this.state === State.GAMEOVER) return;

        this.timeLeft = Math.max(0, this.timeLeft - STEP);

        const sec = Math.ceil(this.timeLeft);
        if (sec <= 5 && sec !== this.lastWarnSecond) {
            this.lastWarnSecond = sec;
            if (sec > 0) audio.playTimeWarning(sec <= 3);
        }
        if (this.timeLeft <= 0 && this.state === State.IDLE) this.checkGameOver();
    }

    /** Screen-level effects decay on the fixed clock, not per rendered frame. */
    private decayFx(): void {
        if (this.shakeMag > 0.3) {
            this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeMag *= 0.88;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeMag = 0;
        }

        if (this.flashAlpha > 0.005) this.flashAlpha *= 0.85; else this.flashAlpha = 0;

        if (this.comboDisplayAlpha > 0.01) {
            this.comboDisplayScale += (1 - this.comboDisplayScale) * 0.15;
            this.comboDisplayAlpha -= 0.012;
        } else {
            this.comboDisplayAlpha = 0;
        }
    }

    private draw(): void {
        const { ctx } = this;
        const w = this.logicalW, h = this.logicalH;

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        ctx.fillStyle = '#141414';
        ctx.fillRect(-10, -10, w + 20, h + 20);

        if (this.gridDotCache) ctx.drawImage(this.gridDotCache, 0, 0);

        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b && b !== this.dragging) b.draw(ctx);
            }

        // Drag trail — older frames are faint and small
        if (this.dragTrail.length > 1) {
            const color = this.dragging?.color === RAINBOW_COLOR
                ? '#ffffff'
                : this.dragging?.color ?? '#ffffff';
            for (let i = 0; i < this.dragTrail.length - 1; i++) {
                const t = this.dragTrail[i];
                const fade = Math.max(0, 1 - t.age * 3);
                if (fade <= 0) continue;
                ctx.globalAlpha = fade * 0.28;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.ballRadius * (0.45 + fade * 0.35), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        if (this.dragging) {
            const d = this.dragging;
            ctx.save();
            ctx.translate(d.x + d.offsetX, d.y + d.offsetY);
            ctx.rotate(this.dragTilt);
            ctx.translate(-(d.x + d.offsetX), -(d.y + d.offsetY));
            d.drawSelected(ctx);
            d.draw(ctx);
            ctx.restore();
        }

        if (this.hintMove) {
            const [r1, c1, r2, c2] = this.hintMove;
            const pulse = 0.3 + Math.sin(getFaceTime() * 3) * 0.15;
            for (const b of [this.grid[r1][c1], this.grid[r2][c2]]) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(b.x, b.y, this.ballRadius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
                ctx.lineWidth = 2;
                if (!isLowPower()) {
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    ctx.shadowBlur = 10;
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        for (const s of this.shockwaves) s.draw(ctx);
        drawParticles(ctx, this.particles);
        for (const p of this.popups) p.draw(ctx);

        if (this.flashAlpha > 0.005) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(-10, -10, w + 20, h + 20);
            ctx.globalAlpha = 1;
        }

        if (this.comboDisplayAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = this.comboDisplayAlpha;
            const s = this.comboDisplayScale;

            ctx.translate(w / 2, 38);
            ctx.scale(s, s);

            ctx.font = 'bold 22px "Space Mono", "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = this.comboDisplayColor;
            if (!isLowPower()) {
                ctx.shadowColor = this.comboDisplayColor;
                ctx.shadowBlur = 16;
                ctx.fillText(this.comboDisplayText, 0, 0);
                ctx.shadowBlur = 8;
            }
            ctx.fillText(this.comboDisplayText, 0, 0);

            ctx.restore();
        }

        ctx.restore();

        if (this.state === State.GAMEOVER) this.drawGameOver();
    }

    private drawGameOver(): void {
        const { ctx } = this;
        const w = this.logicalW, h = this.logicalH;
        const t = this.gameOverAnim;
        const ease = 1 - Math.pow(1 - t, 3);

        ctx.save();
        ctx.globalAlpha = ease;
        ctx.fillStyle = 'rgba(10,10,10,0.78)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cy = h / 2 - 40 + (1 - ease) * 20;

        const title = this.newRecord
            ? 'NEW BEST!'
            : this.mode === 'time' ? 'TIME UP' : 'NO MOVES LEFT';

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${title.length > 10 ? 22 : 28}px "Space Mono", "Courier New", monospace`;
        ctx.fillText(title, w / 2, cy - 46);

        ctx.font = '10px "Space Mono", "Courier New", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('FINAL SCORE', w / 2, cy + 2);

        ctx.font = 'bold 46px "Space Mono", "Courier New", monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(String(this.score), w / 2, cy + 34);

        ctx.font = '11px "Space Mono", "Courier New", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(`BEST ${this.highScore}    TOP COMBO x${this.bestCombo}`, w / 2, cy + 74);

        ctx.font = 'bold 12px "Space Mono", "Courier New", monospace';
        ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(getFaceTime() * 3) * 0.25})`;
        ctx.fillText('TAP TO PLAY AGAIN', w / 2, cy + 124);

        ctx.restore();
    }

    // ── UI ────────────────────────────────────────────

    private renderModeStat(): void {
        if (!this.elModeStat) return;
        if (this.mode === 'zen') {
            this.elModeStat.textContent = '';
            this.elModeStat.className = 'mode-stat';
            return;
        }
        if (this.mode === 'moves') {
            this.elModeStat.textContent = `${Math.max(0, this.movesLeft)} MOVES`;
            this.elModeStat.className = this.movesLeft <= 5 ? 'mode-stat warn' : 'mode-stat';
            return;
        }
        const secs = Math.ceil(this.timeLeft);
        const mm = Math.floor(secs / 60);
        const ss = secs % 60;
        this.elModeStat.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
        this.elModeStat.className = secs <= 10 ? 'mode-stat warn' : 'mode-stat';
    }

    private tickUI(): void {
        let scoreChanged = false;
        let highChanged = false;

        if (this.displayScore < this.score) {
            const step = Math.max(1, Math.ceil((this.score - this.displayScore) * 0.15));
            this.displayScore = Math.min(this.displayScore + step, this.score);
            this.elScore.textContent = String(this.displayScore);
            scoreChanged = true;
        }

        if (this.displayHigh < this.highScore) {
            const step = Math.max(1, Math.ceil((this.highScore - this.displayHigh) * 0.15));
            this.displayHigh = Math.min(this.displayHigh + step, this.highScore);
            this.elHigh.textContent = String(this.displayHigh);
            highChanged = true;
        }

        this.elScore.classList.toggle('bump', scoreChanged);
        this.elHigh.classList.toggle('bump', highChanged);

        this.renderModeStat();
    }
}
