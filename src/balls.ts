// ── Sprite cache (body only — gradient, highlight, shadow) ──────────
const spriteCache = new Map<string, OffscreenCanvas>();
const SPRITE_PAD = 6;

function hexToRgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 0xff, n & 0xff];
}

function hslFromRgb(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
        const d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        switch (mx) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s * 100, l * 100];
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
    const [h, s, l] = hslFromRgb(rgb[0], rgb[1], rgb[2]);

    // Shadow
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 3, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + 0.5, cy + 1.5, r + 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();

    // Body gradient
    const grad = ctx.createRadialGradient(
        cx - r * 0.3, cy - r * 0.3, r * 0.05,
        cx + r * 0.08, cy + r * 0.12, r * 1.05,
    );
    grad.addColorStop(0, `hsl(${h},${Math.min(100, s + 5)}%,${Math.min(88, l + 22)}%)`);
    grad.addColorStop(0.45, color);
    grad.addColorStop(0.85, `hsl(${h},${Math.min(100, s + 5)}%,${Math.max(12, l - 16)}%)`);
    grad.addColorStop(1, `hsl(${h},${Math.min(100, s + 8)}%,${Math.max(8, l - 26)}%)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular highlight
    const hl = ctx.createRadialGradient(
        cx - r * 0.22, cy - r * 0.26, 0,
        cx - r * 0.08, cy - r * 0.1, r * 0.5,
    );
    hl.addColorStop(0, 'rgba(255,255,255,0.4)');
    hl.addColorStop(0.6, 'rgba(255,255,255,0.08)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();

    spriteCache.set(key, oc);
    return oc;
}

// ── Face definitions ────────────────────────────────────────────────

type MouthType = 'smirk' | 'open' | 'grin' | 'smug' | 'flat' | 'worried';
type FaceState = 'idle' | 'selected' | 'scared';

interface Personality {
    mouth: MouthType;
    lookBias: number; // subtle gaze offset per character
}

// Each color index maps to a personality
const PERSONALITIES: Personality[] = [
    { mouth: 'smirk', lookBias: 0 },    // red — confident
    { mouth: 'open', lookBias: 0 },    // yellow — surprised
    { mouth: 'grin', lookBias: 0 },    // green — happy
    { mouth: 'smug', lookBias: 0.5 },  // blue — cool
    { mouth: 'flat', lookBias: -0.3 }, // violet — bored
    { mouth: 'worried', lookBias: 0 },    // orange — nervous
];

// Global animation time — updated each frame by the game loop
let _faceTime = 0;
export function updateFaceTime(dt: number): void {
    _faceTime += dt;
}

function drawFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    colorIndex: number,
    state: FaceState,
): void {
    const t = _faceTime;
    const p = PERSONALITIES[colorIndex] ?? PERSONALITIES[0];

    // ── Eyes ──
    const span = r * 0.32;
    const eyeY = -r * 0.15;
    const dotR = r * 0.09;
    const blink = Math.sin(t * 1.7 + colorIndex * 1.4) > 0.93;
    const lx = state === 'scared'
        ? Math.sin(t * 7 + colorIndex) * 3
        : (Math.sin(t * 0.7 + colorIndex * 0.8) + p.lookBias) * 1.5;
    const ly = state === 'scared' ? -1 : Math.cos(t * 0.6 + colorIndex) * 0.5;

    ctx.save();
    ctx.translate(x, y);

    for (const side of [-1, 1]) {
        const ex = side * span;

        if (state === 'scared') {
            // Wide white eyes with tiny pupil
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, eyeY, r * 0.17, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(30,20,15,0.25)';
            ctx.lineWidth = r * 0.015;
            ctx.beginPath();
            ctx.arc(ex, eyeY, r * 0.17, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(ex + lx * 0.5, eyeY + ly, r * 0.055, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(ex + lx * 0.5 - r * 0.02, eyeY + ly - r * 0.025, r * 0.025, 0, Math.PI * 2);
            ctx.fill();
        } else if (blink) {
            // Blink — short horizontal line
            ctx.beginPath();
            ctx.moveTo(ex - dotR * 1.2, eyeY);
            ctx.lineTo(ex + dotR * 1.2, eyeY);
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = r * 0.04;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // Normal — dot eyes with specular
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(ex + lx * 0.3, eyeY + ly * 0.3, dotR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(
                ex + lx * 0.3 - dotR * 0.3,
                eyeY + ly * 0.3 - dotR * 0.35,
                dotR * 0.35,
                0, Math.PI * 2,
            );
            ctx.fill();
        }
    }

    // ── Mouth ──
    const my = r * 0.3;
    ctx.strokeStyle = '#1a1612';
    ctx.lineWidth = r * 0.04;
    ctx.lineCap = 'round';

    if (state === 'scared') {
        // Small "o" mouth
        ctx.beginPath();
        ctx.arc(0, my + r * 0.06, r * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1612';
        ctx.fill();
    } else if (state === 'selected') {
        // Happy arc
        ctx.beginPath();
        ctx.arc(0, my + r * 0.02, r * 0.17, 0.15, Math.PI - 0.15);
        ctx.stroke();
    } else {
        // Personality mouth
        switch (p.mouth) {
            case 'smirk':
                ctx.beginPath();
                ctx.moveTo(-r * 0.13, my);
                ctx.quadraticCurveTo(r * 0.02, my + r * 0.1, r * 0.16, my - r * 0.02);
                ctx.stroke();
                break;
            case 'open':
                ctx.beginPath();
                ctx.ellipse(0, my + r * 0.03, r * 0.09, r * 0.07, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#1a1612';
                ctx.fill();
                break;
            case 'grin':
                ctx.beginPath();
                ctx.arc(0, my, r * 0.16, 0.2, Math.PI - 0.2);
                ctx.stroke();
                break;
            case 'smug':
                ctx.beginPath();
                ctx.moveTo(-r * 0.06, my + r * 0.01);
                ctx.lineTo(r * 0.16, my - r * 0.02);
                ctx.stroke();
                break;
            case 'flat':
                ctx.beginPath();
                ctx.moveTo(-r * 0.12, my + r * 0.01);
                ctx.lineTo(r * 0.12, my + r * 0.01);
                ctx.stroke();
                break;
            case 'worried':
                ctx.beginPath();
                ctx.arc(0, my + r * 0.16, r * 0.13, Math.PI + 0.35, Math.PI * 2 - 0.35);
                ctx.stroke();
                break;
        }
    }

    // ── Sweat drop (scared only) ──
    if (state === 'scared') {
        const dt = (t * 2.5 + colorIndex * 0.7) % 1.8;
        if (dt <= 1) {
            ctx.globalAlpha = (1 - dt) * 0.5;
            ctx.fillStyle = '#aed6f1';
            const dx = r * 0.52;
            const dy = -r * 0.1 + dt * r * 0.4;
            ctx.beginPath();
            ctx.moveTo(dx, dy - r * 0.1);
            ctx.quadraticCurveTo(dx + r * 0.05, dy + r * 0.02, dx, dy + r * 0.05);
            ctx.quadraticCurveTo(dx - r * 0.05, dy + r * 0.02, dx, dy - r * 0.1);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    ctx.restore();
}

// ── Ball class ──────────────────────────────────────────────────────

export class Ball {
    public targetX: number;
    public targetY: number;
    public scale: number = 1;
    public targetScale: number = 1;
    public row: number = 0;
    public col: number = 0;
    public colorIndex: number = 0;
    public faceState: FaceState = 'idle';

    // Physics
    public vy: number = 0;
    public useGravity: boolean = false;  // only for in-game falls
    private squashY: number = 1;
    private breathPhase: number;

    constructor(
        public x: number,
        public y: number,
        public radius: number,
        public color: string,
    ) {
        this.targetX = x;
        this.targetY = y;
        this.breathPhase = Math.random() * Math.PI * 2;
    }

    update(speed: number = 0.3): boolean {
        let moving = false;

        // --- Vertical movement ---
        const dy = this.targetY - this.y;

        if (this.useGravity && dy > 1) {
            // In-game fall — gravity
            this.vy += 0.55;
            this.vy = Math.min(this.vy, 14);
            this.y += this.vy;

            if (this.y >= this.targetY) {
                const impactV = this.vy;
                this.y = this.targetY;
                this.vy = 0;
                this.useGravity = false;
                if (impactV > 4) {
                    this.squashY = 1 - Math.min(0.04, impactV * 0.003);
                }
            }
            moving = true;
        } else if (Math.abs(dy) > 0.5) {
            // Lerp (entrance, swap, small moves)
            this.y += dy * speed;
            if (Math.abs(this.targetY - this.y) <= 0.5) this.y = this.targetY;
            this.vy = 0;
            moving = true;
        } else {
            this.y = this.targetY;
            this.vy = 0;
        }

        // --- Horizontal movement (lerp, used for swap) ---
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 0.5) {
            this.x += dx * speed;
            moving = true;
        } else {
            this.x = this.targetX;
        }

        // --- Scale ---
        const ds = this.targetScale - this.scale;
        if (Math.abs(ds) > 0.01) {
            this.scale += ds * 0.35;
            moving = true;
        } else {
            this.scale = this.targetScale;
        }

        // --- Squash decay (fast settle, no oscillation) ---
        if (Math.abs(1 - this.squashY) > 0.002) {
            this.squashY += (1 - this.squashY) * 0.25;
            moving = true;
        } else {
            this.squashY = 1;
        }

        return moving;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.scale < 0.02) return;

        const s = this.scale;

        // Breathing: very subtle idle pulse
        const breath = this.faceState === 'idle' && this.targetScale === 1
            ? Math.sin(_faceTime * 2 + this.breathPhase) * 0.004
            : 0;

        const sy = s * this.squashY * (1 - breath);
        const sx = s * (2 - this.squashY) * (1 + breath); // conserve volume

        // 1) Draw cached body sprite
        const sprite = getSprite(this.color, this.radius);
        const sw = sprite.width;
        const sh = sprite.height;
        const dw = sw * sx;
        const dh = sh * sy;
        // Anchor bottom so squash looks grounded
        const anchorY = this.y + (sh * s - dh) * 0.5;
        ctx.drawImage(sprite, this.x - dw / 2, anchorY - dh / 2, dw, dh);

        // 2) Draw live face on top
        if (s > 0.3) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(sx, sy);
            ctx.translate(-this.x, -this.y);
            drawFace(ctx, this.x, this.y, this.radius, this.colorIndex, this.faceState);
            ctx.restore();
        }
    }

    drawSelected(ctx: CanvasRenderingContext2D): void {
        const r = this.radius * this.scale + 4;
        const t = _faceTime;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -t * 20;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    clone(): Ball {
        const b = new Ball(this.x, this.y, this.radius, this.color);
        b.targetX = this.targetX;
        b.targetY = this.targetY;
        b.row = this.row;
        b.col = this.col;
        b.scale = this.scale;
        b.targetScale = this.targetScale;
        b.colorIndex = this.colorIndex;
        b.faceState = this.faceState;
        return b;
    }
}