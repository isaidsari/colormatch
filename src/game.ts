import { Ball, updateFaceTime, getFaceTime, RAINBOW_COLOR, PowerType, prewarmSprites } from './balls.js';
import { Particle, ScorePopup, Shockwave } from './particle.js';
import * as audio from './audio.js';

const enum State {
    IDLE,
    DRAGGING,
    SWAP_ANIM,
    BREAK_ANIM,
    FALL_ANIM,
}

const COLORS = [
    '#E74C3C', // 0 → smirk
    '#F1C40F', // 1 → open
    '#2ECC71', // 2 → grin
    '#3498DB', // 3 → smug
    '#9B59B6', // 4 → flat
    '#E67E22', // 5 → worried
];

interface MatchGroup {
    balls: Ball[];
    orientation: 'h' | 'v';
}

function colorToIndex(color: string): number {
    const idx = COLORS.indexOf(color);
    return idx >= 0 ? idx : 0;
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
    private swap1: Ball | null = null;
    private swap2: Ball | null = null;
    private swapIsReverse = false;
    private animId = 0;
    private pendingPivot: Ball | null = null;
    private pendingColorBombSwap: { bomb: Ball; partner: Ball } | null = null;

    // Effects
    private particles: Particle[] = [];
    private popups: ScorePopup[] = [];
    private shockwaves: Shockwave[] = [];

    // Cursor / input tracking
    private cursorX = 0;
    private cursorY = 0;
    private cursorActive = false;

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
    private highScore = 0;

    // UI refs
    private elScore: HTMLElement;
    private elHigh: HTMLElement;

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

        this.highScore = parseInt(localStorage.getItem('colormatch-hs') || '0');
        this.buildGridDotCache();
        prewarmSprites(COLORS, this.ballRadius);

        this.bindEvents();
        this.init();
    }

    private init(): void {
        cancelAnimationFrame(this.animId);
        this.score = 0;
        this.displayScore = 0;
        this.displayHigh = this.highScore;
        this.combo = 0;
        this.particles = [];
        this.popups = [];
        this.shockwaves = [];
        this.dragTrail = [];
        this.dragTilt = 0;
        this.dragTiltTarget = 0;
        this.state = State.FALL_ANIM;
        this.pendingPivot = null;
        this.pendingColorBombSwap = null;
        this.elScore.textContent = '0';
        this.elHigh.textContent = String(this.highScore);

        this.buildGrid();
        this.purgeInitialMatches();
        this.cascadeEntrance();
        this.updateUI();
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
        return COLORS[Math.floor(Math.random() * COLORS.length)];
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
            const m = this.findMatches();
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

    // ── Match finding ─────────────────────────────────

    private findMatches(): MatchGroup[] {
        const matches: MatchGroup[] = [];

        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            let run: Ball[] = [this.grid[r][0]];
            for (let c = 1; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b.color === run[0].color && b.color !== RAINBOW_COLOR) {
                    run.push(b);
                } else {
                    if (run.length >= 3) matches.push({ balls: run, orientation: 'h' });
                    run = [b];
                }
            }
            if (run.length >= 3) matches.push({ balls: run, orientation: 'h' });
        }

        // Vertical
        for (let c = 0; c < this.cols; c++) {
            let run: Ball[] = [this.grid[0][c]];
            for (let r = 1; r < this.rows; r++) {
                const b = this.grid[r][c];
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

    // ── Move detection ─────────────────────────────────

    private swapCreatesMatch(r1: number, c1: number, r2: number, c2: number): boolean {
        const g = this.grid;
        if (g[r1][c1].power === 'colorBomb' || g[r2][c2].power === 'colorBomb') return true;

        const tmpColor = g[r1][c1].color;
        const tmpIdx = g[r1][c1].colorIndex;
        g[r1][c1].color = g[r2][c2].color;
        g[r1][c1].colorIndex = g[r2][c2].colorIndex;
        g[r2][c2].color = tmpColor;
        g[r2][c2].colorIndex = tmpIdx;

        const hasMatch = this.findMatches().length > 0;

        g[r2][c2].color = g[r1][c1].color;
        g[r2][c2].colorIndex = g[r1][c1].colorIndex;
        g[r1][c1].color = tmpColor;
        g[r1][c1].colorIndex = tmpIdx;

        return hasMatch;
    }

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

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (c + 1 < this.cols && this.swapCreatesMatch(r, c, r, c + 1)) {
                    return [r, c, r, c + 1];
                }
                if (r + 1 < this.rows && this.swapCreatesMatch(r, c, r + 1, c)) {
                    return [r, c, r + 1, c];
                }
            }
        }
        return null;
    }

    private shuffleGrid(): void {
        const colors: { color: string; idx: number; power: PowerType }[] = [];
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                colors.push({ color: b.color, idx: b.colorIndex, power: b.power });
            }

        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
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
    }

    // ── Game logic ────────────────────────────────────

    private activationAffected(p: Ball): Ball[] {
        const out: Ball[] = [];
        if (p.power === 'stripedH') {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[p.row][c];
                if (b && b !== p && b.targetScale > 0.5) out.push(b);
            }
            audio.playPowerDetonate(false);
        } else if (p.power === 'stripedV') {
            for (let r = 0; r < this.rows; r++) {
                const b = this.grid[r][p.col];
                if (b && b !== p && b.targetScale > 0.5) out.push(b);
            }
            audio.playPowerDetonate(false);
        } else if (p.power === 'colorBomb') {
            // Pick most populous non-bomb color
            const counts = new Map<string, number>();
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++) {
                    const b = this.grid[r][c];
                    if (b && b.targetScale > 0.5 && b.color !== RAINBOW_COLOR) {
                        counts.set(b.color, (counts.get(b.color) ?? 0) + 1);
                    }
                }
            let best = '', bestN = 0;
            for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++) {
                    const b = this.grid[r][c];
                    if (b && b !== p && b.color === best && b.targetScale > 0.5) out.push(b);
                }
            audio.playPowerDetonate(true);
        }
        return out;
    }

    private applyAmbientCharacterBehaviors(): void {
        const GAZE_RADIUS = 240;
        const LEAN_MAX = 4.5;
        const LEAN_CELL = this.cellSize * 1.2;

        const dragging = this.dragging;
        const origin = this.dragOrigin;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b || b.targetScale < 0.5) continue;

                // ── Universal cursor gaze — weak, only wins when no blast gaze active ──
                if (this.cursorActive) {
                    const dx = this.cursorX - b.x;
                    const dy = this.cursorY - b.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < GAZE_RADIUS && b.lookAtAmount < 0.7) {
                        b.lookAtX = this.cursorX;
                        b.lookAtY = this.cursorY;
                        const want = 0.4 + (1 - dist / GAZE_RADIUS) * 0.35;
                        if (want > b.lookAtAmount) b.lookAtAmount = want;
                    }
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

    private pokeNeighborsWobble(src: Ball): void {
        const REACH = this.cellSize * 2.2;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b || b === src || b.targetScale < 0.5) continue;
                const dx = b.x - src.x;
                const dy = b.y - src.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1 || dist > REACH) continue;
                const fall = 1 - dist / REACH;
                const kick = 2.6 * fall;
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

    private processMatches(): void {
        const groups = this.findMatches();
        const hasColorBombSwap = !!this.pendingColorBombSwap;

        if (groups.length === 0 && !hasColorBombSwap) {
            this.combo = 0;
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++)
                    this.grid[r][c].faceState = 'idle';

            if (!this.findValidMove()) {
                this.shuffleGrid();
                if (!this.findValidMove()) this.shuffleGrid();
            }

            this.state = State.IDLE;
            this.idleTimer = 0;
            this.hintMove = null;
            this.pendingPivot = null;
            audio.setPadIntensity(0);
            this.updateUI();
            return;
        }

        this.combo++;

        // ── Decide power-up creations ──
        const preserve = new Set<Ball>();
        const powerCreations: { ball: Ball; type: PowerType }[] = [];
        for (const g of groups) {
            if (g.balls.length < 4) continue;
            let pivot: Ball | null = null;
            const pending = this.pendingPivot;
            if (pending && g.balls.includes(pending) && pending.power === 'none') {
                pivot = pending;
            } else {
                const candidate = g.balls[Math.floor(g.balls.length / 2)];
                if (candidate.power === 'none') pivot = candidate;
            }
            if (!pivot) continue;
            const type: PowerType = g.balls.length >= 5
                ? 'colorBomb'
                : (g.orientation === 'h' ? 'stripedH' : 'stripedV');
            preserve.add(pivot);
            powerCreations.push({ ball: pivot, type });
        }

        // ── Build destroy set via BFS over power activations ──
        const destroy = new Set<Ball>();
        const queue: Ball[] = [];

        // From color bomb swap (always first)
        if (this.pendingColorBombSwap) {
            const { bomb, partner } = this.pendingColorBombSwap;
            if (!preserve.has(bomb)) destroy.add(bomb);
            const targetColor = partner.color;
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++) {
                    const b = this.grid[r][c];
                    if (b && b.color === targetColor && !preserve.has(b) && !destroy.has(b)) {
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
        while (queue.length > 0 && chainCount < 200) {
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

        for (const b of destroy) {
            b.faceState = 'scared';
            b.targetScale = 0;
            const displayColor = b.color === RAINBOW_COLOR ? '#ffffff' : b.color;
            this.spawnBurst(b.x, b.y, displayColor, 8);
            if (b.power === 'stripedH' || b.power === 'stripedV') {
                this.spawnStripeFx(b);
                this.shockwaves.push(new Shockwave(b.x, b.y, 140, b.color, 0.5));
            } else if (b.power === 'colorBomb') {
                this.spawnSparkleRing(b, '#ffffff');
                this.shockwaves.push(new Shockwave(b.x, b.y, 220, '#ffffff', 0.7));
            }
            this.pokeNeighborsWobble(b);
            sumX += b.x;
            sumY += b.y;
            if (displayColor !== '#ffffff' && representativeColors.length < 4) {
                representativeColors.push(displayColor);
            }
        }

        // Extra shockwave on big clears
        if (destroy.size >= 6) {
            const dw = destroy.size >= 12 ? 280 : 180;
            this.shockwaves.push(new Shockwave(sumX / destroy.size, sumY / destroy.size, dw, representativeColors[0] ?? '#ffffff', 0.6));
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
        const powerBonus = powerCreations.length * 50;
        const pts = (basePoints + powerBonus) * this.combo;
        this.score += pts;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('colormatch-hs', String(this.highScore));
        }

        // ── Audio — main match note + pad ──
        const intensity = Math.min(this.combo + Math.floor(destroyCount / 4), 10);
        audio.playMatch(this.combo, destroyCount);
        audio.setPadIntensity(intensity);

        // ── FX ──
        this.shakeMag = Math.min(2 + intensity * 1.6, 18);
        if (this.combo >= 2 || destroyCount >= 8) {
            this.flashAlpha = Math.min(0.08 + intensity * 0.03, 0.32);
            this.flashColor = representativeColors[0] ?? '#ffffff';
        }

        // Nearby balls gaze at blast center
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const nb = this.grid[r][c];
                if (nb && !destroy.has(nb) && nb.targetScale > 0.5) {
                    const dist = Math.hypot(nb.x - cx, nb.y - cy);
                    if (dist < this.cellSize * 4) {
                        nb.lookAtX = cx;
                        nb.lookAtY = cy;
                        nb.lookAtAmount = Math.min(1, (this.cellSize * 4) / (dist + 1));
                    }
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
        this.updateUI();
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

    // ── FX ────────────────────────────────────────────

    private spawnBurst(x: number, y: number, color: string, n: number): void {
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

        cv.addEventListener('mousedown', e => this.onDown(this.mouseXY(e)));
        cv.addEventListener('mousemove', e => {
            const p = this.mouseXY(e);
            this.updateCursor(p, true);
            this.onMove(p);
        });
        cv.addEventListener('mouseup', e => this.onUp(this.mouseXY(e)));
        cv.addEventListener('mouseleave', () => { this.cursorActive = false; });
        cv.addEventListener('mouseenter', () => { this.cursorActive = true; });

        cv.addEventListener('touchstart', e => {
            e.preventDefault();
            const p = this.touchXY(e);
            this.updateCursor(p, true);
            this.onDown(p);
        }, { passive: false });
        cv.addEventListener('touchmove', e => {
            e.preventDefault();
            const p = this.touchXY(e);
            this.updateCursor(p, true);
            this.onMove(p);
        }, { passive: false });
        cv.addEventListener('touchend', e => {
            e.preventDefault();
            this.cursorActive = false;
            this.onUp(this.touchXY(e));
        }, { passive: false });
    }

    private updateCursor(p: { x: number; y: number }, active: boolean): void {
        this.cursorX = p.x;
        this.cursorY = p.y;
        this.cursorActive = active;
    }

    private mouseXY(e: MouseEvent) {
        const r = this.canvas.getBoundingClientRect();
        const sx = this.logicalW / r.width;
        const sy = this.logicalH / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    private touchXY(e: TouchEvent) {
        const t = e.touches[0] || e.changedTouches[0];
        const r = this.canvas.getBoundingClientRect();
        const sx = this.logicalW / r.width;
        const sy = this.logicalH / r.height;
        return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }

    private onDown(p: { x: number; y: number }): void {
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
        this.dragTrail = [];
    }

    private onMove(p: { x: number; y: number }): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
        const dx = p.x - this.lastDragX;
        this.dragTiltTarget = Math.max(-0.35, Math.min(0.35, dx * 0.06));
        this.lastDragX = p.x;
        this.dragging.x = p.x;
        this.dragging.y = p.y;
    }

    private onUp(p: { x: number; y: number }): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
        this.canvas.style.cursor = 'grab';

        this.dragging.faceState = 'idle';

        const b = this.dragging;
        const o = this.dragOrigin!;
        const dx = p.x - o.x;
        const dy = p.y - o.y;

        b.x = b.targetX;
        b.y = b.targetY;

        let tr = b.row, tc = b.col;
        if (Math.abs(dx) > this.cellSize * 0.25 || Math.abs(dy) > this.cellSize * 0.25) {
            if (Math.abs(dx) > Math.abs(dy)) {
                tc += dx > 0 ? 1 : -1;
            } else {
                tr += dy > 0 ? 1 : -1;
            }
        }

        this.dragging = null;
        this.dragOrigin = null;

        if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && (tr !== b.row || tc !== b.col)) {
            this.beginSwap(b, this.grid[tr][tc]);
        } else {
            this.state = State.IDLE;
        }
    }

    private beginSwap(a: Ball, b: Ball): void {
        this.swap1 = a;
        this.swap2 = b;
        this.swapIsReverse = false;
        this.pendingPivot = a;

        // Color bomb swap detection (bomb + non-bomb → clear that color)
        if (a.power === 'colorBomb' && b.color !== RAINBOW_COLOR) {
            this.pendingColorBombSwap = { bomb: a, partner: b };
        } else if (b.power === 'colorBomb' && a.color !== RAINBOW_COLOR) {
            this.pendingColorBombSwap = { bomb: b, partner: a };
        } else {
            this.pendingColorBombSwap = null;
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
        this.pendingPivot = null;
        audio.playUndo();
    }

    // ── Update / Draw ─────────────────────────────────

    private updateBalls(): boolean {
        let anim = false;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b) continue;
                if (b === this.dragging) { anim = true; continue; }
                if (b.update()) anim = true;
            }
        return anim;
    }

    private tick = (now: number = 0): void => {
        this.onTickAmbient?.(now);

        this.particles = this.particles.filter(p => p.update());
        this.popups = this.popups.filter(p => p.update());
        this.shockwaves = this.shockwaves.filter(s => s.update());
        this.applyAmbientCharacterBehaviors();
        const anim = this.updateBalls();
        updateFaceTime(1 / 60);

        // Drag tilt + trail
        this.dragTilt += (this.dragTiltTarget - this.dragTilt) * 0.22;
        this.dragTiltTarget *= 0.86;
        if (this.dragging) {
            this.dragTrail.push({ x: this.dragging.x, y: this.dragging.y, age: 0 });
            if (this.dragTrail.length > 10) this.dragTrail.shift();
        }
        for (const t of this.dragTrail) t.age += 1 / 60;

        switch (this.state) {
            case State.SWAP_ANIM:
                if (!anim) {
                    if (this.swapIsReverse) {
                        this.state = State.IDLE;
                    } else if (this.findMatches().length === 0 && !this.pendingColorBombSwap) {
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
                this.idleTimer += 1 / 60;
                if (!this.hintMove && this.idleTimer >= this.HINT_DELAY) {
                    this.hintMove = this.findValidMove();
                }
                break;
        }

        this.tickUI();
        this.draw();
        this.animId = requestAnimationFrame(this.tick);
    };

    private draw(): void {
        const { ctx } = this;
        const w = this.logicalW, h = this.logicalH;

        if (this.shakeMag > 0.3) {
            this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeMag *= 0.88;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeMag = 0;
        }

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
                const age = t.age;
                const fade = Math.max(0, 1 - age * 3);
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
            const b1 = this.grid[r1][c1];
            const b2 = this.grid[r2][c2];
            for (const b of [b1, b2]) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(b.x, b.y, this.ballRadius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.restore();
            }
        }

        for (const s of this.shockwaves) s.draw(ctx);
        for (const p of this.particles) p.draw(ctx);
        for (const p of this.popups) p.draw(ctx);

        if (this.flashAlpha > 0.005) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(-10, -10, w + 20, h + 20);
            ctx.globalAlpha = 1;
            this.flashAlpha *= 0.85;
        }

        if (this.comboDisplayAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = this.comboDisplayAlpha;
            const s = this.comboDisplayScale;
            const bx = w / 2;
            const by = 38;

            ctx.translate(bx, by);
            ctx.scale(s, s);

            ctx.font = 'bold 22px "Space Mono", "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = this.comboDisplayColor;
            ctx.shadowBlur = 16;
            ctx.fillStyle = this.comboDisplayColor;
            ctx.fillText(this.comboDisplayText, 0, 0);
            ctx.shadowBlur = 8;
            ctx.fillText(this.comboDisplayText, 0, 0);

            ctx.restore();

            this.comboDisplayScale += (1 - this.comboDisplayScale) * 0.15;
            this.comboDisplayAlpha -= 0.012;
        }

        ctx.restore();
    }

    // ── UI ────────────────────────────────────────────

    private updateUI(): void {
        // Score counting animated in tick
    }

    private tickUI(): void {
        let changed = false;

        if (this.displayScore < this.score) {
            const step = Math.max(1, Math.ceil((this.score - this.displayScore) * 0.15));
            this.displayScore = Math.min(this.displayScore + step, this.score);
            this.elScore.textContent = String(this.displayScore);
            changed = true;
        }

        if (this.displayHigh < this.highScore) {
            const step = Math.max(1, Math.ceil((this.highScore - this.displayHigh) * 0.15));
            this.displayHigh = Math.min(this.displayHigh + step, this.highScore);
            this.elHigh.textContent = String(this.displayHigh);
            changed = true;
        }

        if (changed) {
            this.elScore.classList.add('bump');
            if (this.displayHigh > parseInt(this.elHigh.textContent || '0')) {
                this.elHigh.classList.add('bump');
            }
        } else {
            this.elScore.classList.remove('bump');
            this.elHigh.classList.remove('bump');
        }
    }
}
