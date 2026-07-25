export class Particle {
    public life: number = 1;
    private decay: number;

    constructor(
        public x: number,
        public y: number,
        public vx: number,
        public vy: number,
        public radius: number,
        public color: string,
    ) {
        this.decay = 0.025 + Math.random() * 0.03;
    }

    update(): boolean {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12;
        this.life -= this.decay;
        this.radius *= 0.95;
        return this.life > 0 && this.radius > 0.3;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// A board-wide clear puts hundreds of particles on screen, and one fill() each
// is what makes the refill stutter. Grouping by colour and quantised alpha
// turns that into a couple of dozen fills with no visible difference.
const ALPHA_STEPS = 6;
const batches = new Map<string, Particle[]>();

export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]): void {
    if (list.length === 0) return;
    if (list.length < 24) {
        for (const p of list) p.draw(ctx);
        ctx.globalAlpha = 1;
        return;
    }

    for (const bucket of batches.values()) bucket.length = 0;

    for (const p of list) {
        const step = Math.round(Math.max(0, Math.min(1, p.life)) * ALPHA_STEPS);
        if (step === 0) continue;
        const key = `${p.color}|${step}`;
        let bucket = batches.get(key);
        if (!bucket) {
            bucket = [];
            batches.set(key, bucket);
        }
        bucket.push(p);
    }

    for (const [key, bucket] of batches) {
        if (bucket.length === 0) continue;
        const sep = key.lastIndexOf('|');
        ctx.globalAlpha = Number(key.slice(sep + 1)) / ALPHA_STEPS;
        ctx.fillStyle = key.slice(0, sep);
        ctx.beginPath();
        for (const p of bucket) {
            // moveTo before each arc, or consecutive circles get joined by a line.
            ctx.moveTo(p.x + p.radius, p.y);
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export class Shockwave {
    private age = 0;
    private dur: number;

    constructor(
        public x: number,
        public y: number,
        public maxR: number,
        public color: string,
        dur: number = 0.55,
    ) {
        this.dur = dur;
    }

    update(): boolean {
        this.age += 1 / 60;
        return this.age < this.dur;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const t = this.age / this.dur;          // 0..1
        const eased = 1 - Math.pow(1 - t, 3);    // ease-out cubic
        const r = this.maxR * eased;
        const alpha = Math.max(0, 1 - t) * 0.75;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);

        // Two strokes fake the glow. shadowBlur looks marginally better but it
        // is one of the most expensive things canvas can do, and a big combo
        // puts a dozen of these on screen at once.
        ctx.globalAlpha = alpha * 0.3;
        ctx.lineWidth = 11 * (1 - t * 0.6);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.lineWidth = 4 * (1 - t * 0.6);
        ctx.stroke();
        ctx.restore();
    }
}

export class ScorePopup {
    private life: number = 1;
    private age: number = 0;
    private popScale: number;

    constructor(
        public x: number,
        public y: number,
        public text: string,
        public color: string,
        scale: number = 1,
    ) {
        this.popScale = scale;
    }

    update(): boolean {
        this.y -= 1.2;
        this.life -= 0.025;
        this.age += 1 / 60;
        return this.life > 0;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);

        // Pop-in: elastic scale at start
        const t = Math.min(this.age * 6, 1);
        const elastic = t < 1
            ? 1 - Math.pow(Math.cos(t * Math.PI * 0.5), 3) * (1 + 0.3 * Math.sin(t * Math.PI * 3))
            : 1;
        const s = this.popScale * elastic;

        ctx.translate(this.x, this.y);
        ctx.scale(s, s);

        const fontSize = Math.round(14 * this.popScale);
        ctx.font = `bold ${fontSize}px "Space Mono", "Courier New", monospace`;
        ctx.textAlign = 'center';

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}
