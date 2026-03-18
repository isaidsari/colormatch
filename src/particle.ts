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
        const s = this.radius * 2;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
        ctx.restore();
    }
}

export class ScorePopup {
    private life: number = 1;

    constructor(
        public x: number,
        public y: number,
        public text: string,
        public color: string,
    ) {}

    update(): boolean {
        this.y -= 1.2;
        this.life -= 0.025;
        return this.life > 0;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = 'bold 14px "Space Mono", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
