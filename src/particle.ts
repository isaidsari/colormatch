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
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.radius * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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

        // Glow for big combos
        if (this.popScale > 1.1) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8 * this.popScale;
        }

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}
