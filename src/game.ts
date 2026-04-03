import { Ball, updateFaceTime } from './balls.js';
import { Particle, ScorePopup } from './particle.js';

const enum State {
    IDLE,
    DRAGGING,
    SWAP_ANIM,
    BREAK_ANIM,
    FALL_ANIM,
}

const COLORS = [
    '#E74C3C', // 0 → personality 0 (smirk)
    '#F1C40F', // 1 → personality 1 (open)
    '#2ECC71', // 2 → personality 2 (grin)
    '#3498DB', // 3 → personality 3 (smug)
    '#9B59B6', // 4 → personality 4 (flat)
    '#E67E22', // 5 → personality 5 (worried)
];

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

    // State
    private state: State = State.FALL_ANIM;
    private dragging: Ball | null = null;
    private dragOrigin: { x: number; y: number } | null = null;
    private swap1: Ball | null = null;
    private swap2: Ball | null = null;
    private swapIsReverse = false;
    private animId = 0;

    // Effects
    private particles: Particle[] = [];
    private popups: ScorePopup[] = [];
    private shakeX = 0;
    private shakeY = 0;
    private shakeMag = 0;
    private flashAlpha = 0;
    private flashColor = '#fff';
    private comboDisplayAlpha = 0;
    private comboDisplayScale = 1;
    private comboDisplayText = '';
    private comboDisplayColor = '#fff';

    // Score
    private score = 0;
    private combo = 0;
    private highScore = 0;

    // UI refs
    private elScore: HTMLElement;
    private elHigh: HTMLElement;

    constructor(
        private canvas: HTMLCanvasElement,
        private ctx: CanvasRenderingContext2D,
    ) {
        this.offsetX = (canvas.width - (this.cols - 1) * this.cellSize) / 2;
        this.offsetY = (canvas.height - (this.rows - 1) * this.cellSize) / 2;

        this.elScore = document.getElementById('score')!;
        this.elHigh = document.getElementById('high-score')!;

        this.highScore = parseInt(localStorage.getItem('colormatch-hs') || '0');

        this.bindEvents();
        this.init();
    }

    private init(): void {
        cancelAnimationFrame(this.animId);
        this.score = 0;
        this.combo = 0;
        this.particles = [];
        this.popups = [];
        this.state = State.FALL_ANIM;

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
                b.colorIndex = colorToIndex(color);  // ← EKLE
                this.grid[r][c] = b;
            }
        }
    }

    private purgeInitialMatches(): void {
        for (let i = 0; i < 200; i++) {
            const m = this.findMatches();
            if (m.length === 0) break;
            for (const g of m) for (const b of g) {
                b.color = this.rndColor();
                b.colorIndex = colorToIndex(b.color);  // ← EKLE
            }
        }
    }

    private cascadeEntrance(): void {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                b.y = b.targetY - this.canvas.height - r * 20 - Math.random() * 10;
            }
        }
    }

    // ── Match finding ─────────────────────────────────

    private findMatches(): Ball[][] {
        const matches: Ball[][] = [];

        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            let run: Ball[] = [this.grid[r][0]];
            for (let c = 1; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b.color === run[0].color) {
                    run.push(b);
                } else {
                    if (run.length >= 3) matches.push(run);
                    run = [b];
                }
            }
            if (run.length >= 3) matches.push(run);
        }

        // Vertical
        for (let c = 0; c < this.cols; c++) {
            let run: Ball[] = [this.grid[0][c]];
            for (let r = 1; r < this.rows; r++) {
                const b = this.grid[r][c];
                if (b.color === run[0].color) {
                    run.push(b);
                } else {
                    if (run.length >= 3) matches.push(run);
                    run = [b];
                }
            }
            if (run.length >= 3) matches.push(run);
        }

        return matches;
    }

    // ── Game logic ────────────────────────────────────

    private processMatches(): void {
        const matches = this.findMatches();

        if (matches.length === 0) {
            this.combo = 0;
            // Tüm topları idle'a döndür
            for (let r = 0; r < this.rows; r++)
                for (let c = 0; c < this.cols; c++)
                    this.grid[r][c].faceState = 'idle';
            this.state = State.IDLE;
            this.updateUI();
            return;
        }

        this.combo++;

        const set = new Set<Ball>();
        for (const g of matches) for (const b of g) set.add(b);

        const pts = set.size * 10 * this.combo;
        this.score += pts;

        for (const b of set) {
            b.faceState = 'scared';
        }

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('colormatch-hs', String(this.highScore));
        }



        // Effects — scale with combo
        const intensity = Math.min(this.combo, 6);
        const burstCount = 8 + intensity * 4;

        let sumX = 0, sumY = 0;
        for (const b of set) {
            this.spawnBurst(b.x, b.y, b.color, burstCount);
            b.targetScale = 0;
            sumX += b.x;
            sumY += b.y;
        }

        const cx = sumX / set.size;
        const cy = sumY / set.size;

        // Screen shake — light on first match, stronger on combos
        this.shakeMag = Math.min(2 + intensity * 1.5, 12);

        // Flash overlay from combo x2
        if (this.combo >= 2) {
            this.flashAlpha = Math.min(0.08 + intensity * 0.03, 0.28);
            const colors = [...set].map(b => b.color);
            this.flashColor = colors[0];
        }

        // Nearby balls look at the explosion
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const nb = this.grid[r][c];
                if (nb && !set.has(nb) && nb.targetScale > 0.5) {
                    const dist = Math.hypot(nb.x - cx, nb.y - cy);
                    if (dist < this.cellSize * 4) {
                        nb.lookAtX = cx;
                        nb.lookAtY = cy;
                        // Closer = stronger gaze
                        nb.lookAtAmount = Math.min(1, (this.cellSize * 4) / (dist + 1));
                    }
                }
            }

        const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
        const popupScale = this.combo > 1 ? 1 + Math.min(intensity * 0.15, 0.6) : 1;
        this.popups.push(new ScorePopup(cx, cy - 10, label, '#fff', popupScale));

        // Canvas combo banner
        if (this.combo >= 2) {
            const colors = [...set].map(b => b.color);
            this.comboDisplayText = `COMBO x${this.combo}`;
            this.comboDisplayAlpha = 1;
            this.comboDisplayScale = 1.6;
            this.comboDisplayColor = colors[0];
        }

        this.updateUI();
        this.state = State.BREAK_ANIM;
    }

    private gravity(): void {
        for (let c = 0; c < this.cols; c++) {
            let write = this.rows - 1;

            // Shift surviving balls down
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

            // Fill empty cells from top
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
        cv.addEventListener('mousemove', e => this.onMove(this.mouseXY(e)));
        cv.addEventListener('mouseup', e => this.onUp(this.mouseXY(e)));

        cv.addEventListener('touchstart', e => { e.preventDefault(); this.onDown(this.touchXY(e)); }, { passive: false });
        cv.addEventListener('touchmove', e => { e.preventDefault(); this.onMove(this.touchXY(e)); }, { passive: false });
        cv.addEventListener('touchend', e => { e.preventDefault(); this.onUp(this.touchXY(e)); }, { passive: false });
    }

    private mouseXY(e: MouseEvent) {
        const r = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / r.width;
        const sy = this.canvas.height / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    private touchXY(e: TouchEvent) {
        const t = e.touches[0] || e.changedTouches[0];
        const r = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / r.width;
        const sy = this.canvas.height / r.height;
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
    }

    private onMove(p: { x: number; y: number }): void {
        if (this.state !== State.DRAGGING || !this.dragging) return;
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

        // Snap back visually
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

        // Swap in grid
        this.grid[a.row][a.col] = b;
        this.grid[b.row][b.col] = a;

        const [ar, ac] = [a.row, a.col];
        a.row = b.row; a.col = b.col;
        b.row = ar; b.col = ac;

        const pa = this.pos(a.row, a.col);
        const pb = this.pos(b.row, b.col);
        a.targetX = pa.x; a.targetY = pa.y;
        b.targetX = pb.x; b.targetY = pb.y;

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
    }

    // ── Update / Draw ─────────────────────────────────

    private updateBalls(): boolean {
        let anim = false;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (this.grid[r][c]?.update()) anim = true;
        return anim;
    }

    private tick = (): void => {
        // Physics
        this.particles = this.particles.filter(p => p.update());
        this.popups = this.popups.filter(p => p.update());
        const anim = this.updateBalls();
        updateFaceTime(1 / 60);

        // State machine
        switch (this.state) {
            case State.SWAP_ANIM:
                if (!anim) {
                    if (this.swapIsReverse) {
                        this.state = State.IDLE;
                    } else if (this.findMatches().length === 0) {
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
        }

        this.draw();
        this.animId = requestAnimationFrame(this.tick);
    };

    private draw(): void {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;

        // Update screen shake
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

        // Background
        ctx.fillStyle = '#141414';
        ctx.fillRect(-10, -10, w + 20, h + 20);

        // Subtle grid dots
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = this.offsetX + c * this.cellSize;
                const y = this.offsetY + r * this.cellSize;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Balls (non-dragging first)
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b && b !== this.dragging) b.draw(ctx);
            }

        // Dragging ball on top
        if (this.dragging) {
            this.dragging.drawSelected(ctx);
            this.dragging.draw(ctx);
        }

        // Particles & popups
        for (const p of this.particles) p.draw(ctx);
        for (const p of this.popups) p.draw(ctx);

        // Flash overlay
        if (this.flashAlpha > 0.005) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(-10, -10, w + 20, h + 20);
            ctx.globalAlpha = 1;
            this.flashAlpha *= 0.85;
        }

        // Combo banner — big centered text on canvas
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

            // Glow
            ctx.shadowColor = this.comboDisplayColor;
            ctx.shadowBlur = 16;
            ctx.fillStyle = this.comboDisplayColor;
            ctx.fillText(this.comboDisplayText, 0, 0);
            // Second pass for brighter glow
            ctx.shadowBlur = 8;
            ctx.fillText(this.comboDisplayText, 0, 0);

            ctx.restore();

            // Animate: scale settles to 1, alpha fades
            this.comboDisplayScale += (1 - this.comboDisplayScale) * 0.15;
            this.comboDisplayAlpha -= 0.012;
        }

        ctx.restore();
    }

    // ── UI ────────────────────────────────────────────

    private updateUI(): void {
        this.elScore.textContent = String(this.score);
        this.elHigh.textContent = String(this.highScore);
    }
}
