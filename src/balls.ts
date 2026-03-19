// Pre-rendered ball sprite cache: color → OffscreenCanvas
const spriteCache = new Map<string, OffscreenCanvas>();
const SPRITE_PAD = 6; // extra pixels for shadow

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 0xff, n & 0xff];
}

function adjustRgb([r, g, b]: [number, number, number], amt: number): string {
    return `rgb(${Math.max(0, Math.min(255, r + amt))},${Math.max(0, Math.min(255, g + amt))},${Math.max(0, Math.min(255, b + amt))})`;
}

function getSprite(color: string, radius: number): OffscreenCanvas {
    const key = `${color}_${radius}`;
    let cached = spriteCache.get(key);
    if (cached) return cached;

    const size = (radius + SPRITE_PAD) * 2;
    const oc = new OffscreenCanvas(size, size);
    const ctx = oc.getContext('2d')!;
    const cx = radius + SPRITE_PAD;
    const cy = cx;
    const r = radius;
    const rgb = hexToRgb(color);

    // Outer shadow (larger, softer)
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 3, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();

    // Inner shadow (tighter)
    ctx.beginPath();
    ctx.arc(cx + 0.5, cy + 1.5, r + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();

    // Base gradient — richer depth
    const grad = ctx.createRadialGradient(
        cx - r * 0.3, cy - r * 0.4, r * 0.05,
        cx + r * 0.05, cy + r * 0.15, r * 1.02,
    );
    grad.addColorStop(0, adjustRgb(rgb, 60));
    grad.addColorStop(0.35, adjustRgb(rgb, 20));
    grad.addColorStop(0.6, color);
    grad.addColorStop(0.85, adjustRgb(rgb, -25));
    grad.addColorStop(1, adjustRgb(rgb, -50));

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Primary specular highlight (top-left)
    const hl = ctx.createRadialGradient(
        cx - r * 0.28, cy - r * 0.32, 0,
        cx - r * 0.15, cy - r * 0.18, r * 0.55,
    );
    hl.addColorStop(0, 'rgba(255,255,255,0.65)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();

    // Bottom rim light (reflected light from surface)
    const rim = ctx.createRadialGradient(
        cx + r * 0.15, cy + r * 0.55, 0,
        cx + r * 0.1, cy + r * 0.4, r * 0.5,
    );
    rim.addColorStop(0, 'rgba(255,255,255,0.12)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();

    // Edge definition
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = adjustRgb(rgb, -40);
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.globalAlpha = 1;

    spriteCache.set(key, oc);
    return oc;
}

export class Ball {
    public targetX: number;
    public targetY: number;
    public scale: number = 1;
    public targetScale: number = 1;
    public row: number = 0;
    public col: number = 0;

    constructor(
        public x: number,
        public y: number,
        public radius: number,
        public color: string,
    ) {
        this.targetX = x;
        this.targetY = y;
    }

    update(speed: number = 0.3): boolean {
        let moving = false;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            this.x += dx * speed;
            this.y += dy * speed;
            moving = true;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        const ds = this.targetScale - this.scale;
        if (Math.abs(ds) > 0.01) {
            this.scale += ds * 0.35;
            moving = true;
        } else {
            this.scale = this.targetScale;
        }

        return moving;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.scale < 0.02) return;

        const sprite = getSprite(this.color, this.radius);
        const s = this.scale;
        const sw = sprite.width;
        const sh = sprite.height;
        const dw = sw * s;
        const dh = sh * s;

        ctx.drawImage(sprite, this.x - dw / 2, this.y - dh / 2, dw, dh);
    }

    drawSelected(ctx: CanvasRenderingContext2D): void {
        const r = this.radius * this.scale + 4;

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    clone(): Ball {
        const b = new Ball(this.x, this.y, this.radius, this.color);
        b.targetX = this.targetX;
        b.targetY = this.targetY;
        b.row = this.row;
        b.col = this.col;
        b.scale = this.scale;
        b.targetScale = this.targetScale;
        return b;
    }
}
