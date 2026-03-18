import { Ball } from './balls.js';
import { Particle, ScorePopup } from './particle.js';
const COLORS = [
    '#ff0054', // red
    '#00e5ff', // cyan
    '#b388ff', // lavender
    '#ffea00', // yellow
    '#00e676', // green
    '#2979ff', // blue
    '#ff6d00', // orange
];
export class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        // Grid
        this.grid = [];
        this.rows = 12;
        this.cols = 8;
        this.cellSize = 44;
        this.ballRadius = 18;
        // State
        this.state = 4 /* State.FALL_ANIM */;
        this.dragging = null;
        this.dragOrigin = null;
        this.swap1 = null;
        this.swap2 = null;
        this.swapIsReverse = false;
        this.animId = 0;
        // Effects
        this.particles = [];
        this.popups = [];
        // Score
        this.score = 0;
        this.combo = 0;
        this.highScore = 0;
        this.numColors = 5;
        this.tick = () => {
            // Physics
            this.particles = this.particles.filter(p => p.update());
            this.popups = this.popups.filter(p => p.update());
            const anim = this.updateBalls();
            // State machine
            switch (this.state) {
                case 2 /* State.SWAP_ANIM */:
                    if (!anim) {
                        if (this.swapIsReverse) {
                            this.state = 0 /* State.IDLE */;
                        }
                        else if (this.findMatches().length === 0) {
                            this.undoSwap();
                        }
                        else {
                            this.combo = 0;
                            this.processMatches();
                        }
                    }
                    break;
                case 3 /* State.BREAK_ANIM */:
                    if (!anim)
                        this.gravity();
                    break;
                case 4 /* State.FALL_ANIM */:
                    if (!anim)
                        this.processMatches();
                    break;
            }
            this.draw();
            this.animId = requestAnimationFrame(this.tick);
        };
        this.offsetX = (canvas.width - (this.cols - 1) * this.cellSize) / 2;
        this.offsetY = (canvas.height - (this.rows - 1) * this.cellSize) / 2;
        this.elScore = document.getElementById('score');
        this.elCombo = document.getElementById('combo');
        this.elHigh = document.getElementById('high-score');
        this.highScore = parseInt(localStorage.getItem('colormatch-hs') || '0');
        this.bindEvents();
        this.init();
    }
    init() {
        cancelAnimationFrame(this.animId);
        this.score = 0;
        this.combo = 0;
        this.particles = [];
        this.popups = [];
        this.numColors = 5;
        this.state = 4 /* State.FALL_ANIM */;
        this.buildGrid();
        this.purgeInitialMatches();
        this.cascadeEntrance();
        this.updateUI();
        this.animId = requestAnimationFrame(this.tick);
    }
    restart() {
        this.init();
    }
    // ── Grid ──────────────────────────────────────────
    pos(r, c) {
        return {
            x: this.offsetX + c * this.cellSize,
            y: this.offsetY + r * this.cellSize,
        };
    }
    cell(px, py) {
        const c = Math.round((px - this.offsetX) / this.cellSize);
        const r = Math.round((py - this.offsetY) / this.cellSize);
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols)
            return { r, c };
        return null;
    }
    rndColor() {
        return COLORS[Math.floor(Math.random() * this.numColors)];
    }
    buildGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const p = this.pos(r, c);
                const b = new Ball(p.x, p.y, this.ballRadius, this.rndColor());
                b.row = r;
                b.col = c;
                this.grid[r][c] = b;
            }
        }
    }
    purgeInitialMatches() {
        for (let i = 0; i < 200; i++) {
            const m = this.findMatches();
            if (m.length === 0)
                break;
            for (const g of m)
                for (const b of g)
                    b.color = this.rndColor();
        }
    }
    cascadeEntrance() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                b.y = b.targetY - this.canvas.height - r * 20 - Math.random() * 10;
            }
        }
    }
    // ── Match finding ─────────────────────────────────
    findMatches() {
        const matches = [];
        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            let run = [this.grid[r][0]];
            for (let c = 1; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b.color === run[0].color) {
                    run.push(b);
                }
                else {
                    if (run.length >= 3)
                        matches.push(run);
                    run = [b];
                }
            }
            if (run.length >= 3)
                matches.push(run);
        }
        // Vertical
        for (let c = 0; c < this.cols; c++) {
            let run = [this.grid[0][c]];
            for (let r = 1; r < this.rows; r++) {
                const b = this.grid[r][c];
                if (b.color === run[0].color) {
                    run.push(b);
                }
                else {
                    if (run.length >= 3)
                        matches.push(run);
                    run = [b];
                }
            }
            if (run.length >= 3)
                matches.push(run);
        }
        return matches;
    }
    // ── Game logic ────────────────────────────────────
    processMatches() {
        const matches = this.findMatches();
        if (matches.length === 0) {
            this.combo = 0;
            this.state = 0 /* State.IDLE */;
            this.updateUI();
            return;
        }
        this.combo++;
        const set = new Set();
        for (const g of matches)
            for (const b of g)
                set.add(b);
        const pts = set.size * 10 * this.combo;
        this.score += pts;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('colormatch-hs', String(this.highScore));
        }
        // Difficulty progression
        if (this.score >= 1500 && this.numColors < 7)
            this.numColors = 7;
        else if (this.score >= 600 && this.numColors < 6)
            this.numColors = 6;
        // Effects
        let sumX = 0, sumY = 0;
        for (const b of set) {
            this.spawnBurst(b.x, b.y, b.color, 6);
            b.targetScale = 0;
            sumX += b.x;
            sumY += b.y;
        }
        const cx = sumX / set.size;
        const cy = sumY / set.size;
        const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
        this.popups.push(new ScorePopup(cx, cy - 10, label, '#fff'));
        this.updateUI();
        this.state = 3 /* State.BREAK_ANIM */;
    }
    gravity() {
        for (let c = 0; c < this.cols; c++) {
            let write = this.rows - 1;
            // Shift surviving balls down
            for (let r = this.rows - 1; r >= 0; r--) {
                const b = this.grid[r][c];
                if (b.targetScale > 0.5) {
                    if (r !== write) {
                        this.grid[write][c] = b;
                        this.grid[r][c] = null;
                        b.row = write;
                        b.col = c;
                        const p = this.pos(write, c);
                        b.targetX = p.x;
                        b.targetY = p.y;
                    }
                    write--;
                }
            }
            // Fill empty cells from top
            for (let r = write; r >= 0; r--) {
                const p = this.pos(r, c);
                const startY = -this.ballRadius * 2 - (write - r) * this.cellSize;
                const nb = new Ball(p.x, startY, this.ballRadius, this.rndColor());
                nb.targetX = p.x;
                nb.targetY = p.y;
                nb.row = r;
                nb.col = c;
                nb.scale = 0.6;
                nb.targetScale = 1;
                this.grid[r][c] = nb;
            }
        }
        this.state = 4 /* State.FALL_ANIM */;
    }
    // ── FX ────────────────────────────────────────────
    spawnBurst(x, y, color, n) {
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
            const spd = 2.5 + Math.random() * 3;
            this.particles.push(new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 2 + Math.random() * 4, color));
        }
    }
    // ── Input ─────────────────────────────────────────
    bindEvents() {
        const cv = this.canvas;
        cv.style.cursor = 'grab';
        cv.addEventListener('mousedown', e => this.onDown(this.mouseXY(e)));
        cv.addEventListener('mousemove', e => this.onMove(this.mouseXY(e)));
        cv.addEventListener('mouseup', e => this.onUp(this.mouseXY(e)));
        cv.addEventListener('touchstart', e => { e.preventDefault(); this.onDown(this.touchXY(e)); }, { passive: false });
        cv.addEventListener('touchmove', e => { e.preventDefault(); this.onMove(this.touchXY(e)); }, { passive: false });
        cv.addEventListener('touchend', e => { e.preventDefault(); this.onUp(this.touchXY(e)); }, { passive: false });
    }
    mouseXY(e) {
        const r = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / r.width;
        const sy = this.canvas.height / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }
    touchXY(e) {
        const t = e.touches[0] || e.changedTouches[0];
        const r = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / r.width;
        const sy = this.canvas.height / r.height;
        return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
    }
    onDown(p) {
        if (this.state !== 0 /* State.IDLE */)
            return;
        const c = this.cell(p.x, p.y);
        if (!c)
            return;
        this.dragging = this.grid[c.r][c.c];
        this.dragOrigin = { x: this.dragging.targetX, y: this.dragging.targetY };
        this.state = 1 /* State.DRAGGING */;
        this.canvas.style.cursor = 'grabbing';
    }
    onMove(p) {
        if (this.state !== 1 /* State.DRAGGING */ || !this.dragging)
            return;
        this.dragging.x = p.x;
        this.dragging.y = p.y;
    }
    onUp(p) {
        if (this.state !== 1 /* State.DRAGGING */ || !this.dragging)
            return;
        this.canvas.style.cursor = 'grab';
        const b = this.dragging;
        const o = this.dragOrigin;
        const dx = p.x - o.x;
        const dy = p.y - o.y;
        // Snap back visually
        b.x = b.targetX;
        b.y = b.targetY;
        let tr = b.row, tc = b.col;
        if (Math.abs(dx) > this.cellSize * 0.25 || Math.abs(dy) > this.cellSize * 0.25) {
            if (Math.abs(dx) > Math.abs(dy)) {
                tc += dx > 0 ? 1 : -1;
            }
            else {
                tr += dy > 0 ? 1 : -1;
            }
        }
        this.dragging = null;
        this.dragOrigin = null;
        if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && (tr !== b.row || tc !== b.col)) {
            this.beginSwap(b, this.grid[tr][tc]);
        }
        else {
            this.state = 0 /* State.IDLE */;
        }
    }
    beginSwap(a, b) {
        this.swap1 = a;
        this.swap2 = b;
        this.swapIsReverse = false;
        // Swap in grid
        this.grid[a.row][a.col] = b;
        this.grid[b.row][b.col] = a;
        const [ar, ac] = [a.row, a.col];
        a.row = b.row;
        a.col = b.col;
        b.row = ar;
        b.col = ac;
        const pa = this.pos(a.row, a.col);
        const pb = this.pos(b.row, b.col);
        a.targetX = pa.x;
        a.targetY = pa.y;
        b.targetX = pb.x;
        b.targetY = pb.y;
        this.state = 2 /* State.SWAP_ANIM */;
    }
    undoSwap() {
        const a = this.swap1, b = this.swap2;
        this.grid[a.row][a.col] = b;
        this.grid[b.row][b.col] = a;
        const [ar, ac] = [a.row, a.col];
        a.row = b.row;
        a.col = b.col;
        b.row = ar;
        b.col = ac;
        const pa = this.pos(a.row, a.col);
        const pb = this.pos(b.row, b.col);
        a.targetX = pa.x;
        a.targetY = pa.y;
        b.targetX = pb.x;
        b.targetY = pb.y;
        this.swapIsReverse = true;
    }
    // ── Update / Draw ─────────────────────────────────
    updateBalls() {
        var _a;
        let anim = false;
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if ((_a = this.grid[r][c]) === null || _a === void 0 ? void 0 : _a.update())
                    anim = true;
        return anim;
    }
    draw() {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        // Flat BG
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let r = 0; r < this.rows; r++) {
            const y = this.offsetY + r * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.offsetX - this.cellSize / 2, y);
            ctx.lineTo(this.offsetX + (this.cols - 1) * this.cellSize + this.cellSize / 2, y);
            ctx.stroke();
        }
        for (let c = 0; c < this.cols; c++) {
            const x = this.offsetX + c * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.offsetY - this.cellSize / 2);
            ctx.lineTo(x, this.offsetY + (this.rows - 1) * this.cellSize + this.cellSize / 2);
            ctx.stroke();
        }
        // Balls (non-dragging first)
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b && b !== this.dragging)
                    b.draw(ctx);
            }
        // Dragging ball on top
        if (this.dragging) {
            this.dragging.drawSelected(ctx);
            this.dragging.draw(ctx);
        }
        // Particles & popups
        for (const p of this.particles)
            p.draw(ctx);
        for (const p of this.popups)
            p.draw(ctx);
    }
    // ── UI ────────────────────────────────────────────
    updateUI() {
        this.elScore.textContent = String(this.score);
        this.elHigh.textContent = String(this.highScore);
        if (this.combo > 1) {
            this.elCombo.textContent = `COMBO x${this.combo}`;
            this.elCombo.classList.add('visible');
        }
        else {
            this.elCombo.classList.remove('visible');
        }
    }
}
