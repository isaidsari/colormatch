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

// Eyebrow shape: angle (radians) and vertical offset per personality
interface BrowDef {
    angle: number;      // tilt in radians (positive = inner-up, angry look)
    offsetY: number;    // vertical shift from default position
    curve: number;      // curvature amount (0 = straight, positive = arched)
}

interface Personality {
    mouth: MouthType;
    lookBias: number;
    brow: BrowDef;
}

// Each color index maps to a personality
const PERSONALITIES: Personality[] = [
    { mouth: 'smirk',   lookBias: 0,    brow: { angle: 0.15, offsetY: 0, curve: 0.2 } },     // red — confident, slight arch
    { mouth: 'open',    lookBias: 0,    brow: { angle: -0.1, offsetY: -0.02, curve: 0.4 } },  // yellow — surprised, raised
    { mouth: 'grin',    lookBias: 0,    brow: { angle: 0, offsetY: 0, curve: 0.3 } },         // green — happy, relaxed arch
    { mouth: 'smug',    lookBias: 0.5,  brow: { angle: 0.2, offsetY: 0.02, curve: 0.1 } },   // blue — cool, one brow up
    { mouth: 'flat',    lookBias: -0.3, brow: { angle: 0, offsetY: 0.03, curve: 0 } },        // violet — bored, flat low brows
    { mouth: 'worried', lookBias: 0,    brow: { angle: -0.2, offsetY: -0.01, curve: 0.3 } },  // orange — nervous, inner-up
];

// Global animation time — updated each frame by the game loop
let _faceTime = 0;
export function updateFaceTime(dt: number): void {
    _faceTime += dt;
}
export function getFaceTime(): number {
    return _faceTime;
}

function drawFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    colorIndex: number,
    state: FaceState,
    lookAtDx: number = 0,
    lookAtDy: number = 0,
    lookAtAmt: number = 0,
): void {
    const t = _faceTime;
    const p = PERSONALITIES[colorIndex] ?? PERSONALITIES[0];

    // Layout — more spread out, lower mouth
    const span  = r * 0.36;   // eyes further apart
    const eyeY  = -r * 0.1;   // eyes slightly higher center
    const eyeR  = r * 0.13;   // white of eye
    const pupilR = r * 0.075; // pupil
    const my    = r * 0.38;   // mouth lower
    const browY = eyeY - eyeR - r * 0.1; // brow just above eye
    const browW = r * 0.19;
    const browLW = r * 0.045; // brow line width

    const blink = Math.sin(t * 1.7 + colorIndex * 1.4) > 0.93;

    // Gaze
    const idleLx = (Math.sin(t * 0.7 + colorIndex * 0.8) + p.lookBias) * 1.8;
    const idleLy = Math.cos(t * 0.6 + colorIndex) * 0.6;
    const lookDist = Math.hypot(lookAtDx, lookAtDy) || 1;
    const targetLx = (lookAtDx / lookDist) * (eyeR - pupilR) * 0.9;
    const targetLy = (lookAtDy / lookDist) * (eyeR - pupilR) * 0.7;
    const lx = state === 'scared'
        ? Math.sin(t * 7 + colorIndex) * 2.5
        : idleLx * (1 - lookAtAmt) + targetLx * lookAtAmt;
    const ly = state === 'scared'
        ? -1
        : idleLy * (1 - lookAtAmt) + targetLy * lookAtAmt;

    ctx.save();
    ctx.translate(x, y);

    // ── Eyebrows ──
    ctx.strokeStyle = 'rgba(20,14,10,0.85)';
    ctx.lineWidth = browLW;
    ctx.lineCap = 'round';

    if (state === 'scared') {
        for (const side of [-1, 1]) {
            const bx = side * span;
            ctx.beginPath();
            ctx.moveTo(bx - side * browW, browY + r * 0.05);
            ctx.lineTo(bx + side * browW * 0.5, browY - r * 0.07);
            ctx.stroke();
        }
    } else if (state === 'selected') {
        for (const side of [-1, 1]) {
            const bx = side * span;
            ctx.beginPath();
            ctx.moveTo(bx - browW, browY - r * 0.02);
            ctx.quadraticCurveTo(bx, browY - r * 0.12, bx + browW, browY - r * 0.02);
            ctx.stroke();
        }
    } else if (!blink) {
        const b = p.brow;
        for (const side of [-1, 1]) {
            const bx = side * span;
            const bAngle = b.angle * side;
            const by = browY + b.offsetY * r;
            const x1 = bx - browW;
            const y1 = by + Math.sin(bAngle) * browW;
            const x2 = bx + browW;
            const y2 = by - Math.sin(bAngle) * browW;
            ctx.beginPath();
            if (b.curve > 0.05) {
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(bx, by - b.curve * r * 0.18, x2, y2);
            } else {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }
    }

    // ── Eyes ──
    for (const side of [-1, 1]) {
        const ex = side * span;

        if (state === 'scared') {
            // Big white sclera
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeR * 1.25, 0, Math.PI * 2);
            ctx.fill();
            // Outline
            ctx.strokeStyle = 'rgba(20,14,10,0.15)';
            ctx.lineWidth = r * 0.012;
            ctx.stroke();
            // Tiny darting pupil
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(ex + lx * 0.5, eyeY + ly, pupilR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            // Specular
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(ex + lx * 0.5 - pupilR * 0.35, eyeY + ly - pupilR * 0.4, pupilR * 0.28, 0, Math.PI * 2);
            ctx.fill();
        } else if (blink) {
            ctx.beginPath();
            ctx.moveTo(ex - eyeR * 1.1, eyeY);
            ctx.lineTo(ex + eyeR * 1.1, eyeY);
            ctx.strokeStyle = 'rgba(20,14,10,0.85)';
            ctx.lineWidth = r * 0.045;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            // White sclera
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            // Subtle outline
            ctx.strokeStyle = 'rgba(20,14,10,0.1)';
            ctx.lineWidth = r * 0.01;
            ctx.stroke();
            // Pupil (clipped inside sclera)
            const px = ex + lx * 0.3;
            const py = eyeY + ly * 0.3;
            // Clamp pupil inside sclera
            const pdist = Math.hypot(px - ex, py - eyeY);
            const maxPD = eyeR - pupilR;
            const clampedPx = pdist > maxPD ? ex + (px - ex) / pdist * maxPD : px;
            const clampedPy = pdist > maxPD ? eyeY + (py - eyeY) / pdist * maxPD : py;
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(clampedPx, clampedPy, pupilR, 0, Math.PI * 2);
            ctx.fill();
            // Specular
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(clampedPx - pupilR * 0.35, clampedPy - pupilR * 0.4, pupilR * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Mouth ──
    ctx.strokeStyle = 'rgba(20,14,10,0.85)';
    ctx.lineWidth = r * 0.045;
    ctx.lineCap = 'round';

    if (state === 'scared') {
        // Open "O" with dark inside
        ctx.beginPath();
        ctx.ellipse(0, my, r * 0.1, r * 0.085, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20,14,10,0.75)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,14,10,0.5)';
        ctx.lineWidth = r * 0.02;
        ctx.stroke();
    } else if (state === 'selected') {
        // Big happy grin
        ctx.beginPath();
        ctx.arc(0, my - r * 0.04, r * 0.22, 0.1, Math.PI - 0.1);
        ctx.stroke();
    } else {
        switch (p.mouth) {
            case 'smirk':
                // Asymmetric confident smirk
                ctx.beginPath();
                ctx.moveTo(-r * 0.14, my + r * 0.01);
                ctx.quadraticCurveTo(0, my + r * 0.12, r * 0.2, my - r * 0.04);
                ctx.stroke();
                break;
            case 'open':
                // Surprised ellipse with dark inside
                ctx.beginPath();
                ctx.ellipse(0, my, r * 0.1, r * 0.08, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(20,14,10,0.7)';
                ctx.fill();
                break;
            case 'grin':
                // Wide happy arc
                ctx.beginPath();
                ctx.arc(0, my - r * 0.04, r * 0.2, 0.15, Math.PI - 0.15);
                ctx.stroke();
                break;
            case 'smug':
                // Flat slight upturn on one side
                ctx.beginPath();
                ctx.moveTo(-r * 0.08, my + r * 0.02);
                ctx.quadraticCurveTo(r * 0.05, my + r * 0.01, r * 0.19, my - r * 0.05);
                ctx.stroke();
                break;
            case 'flat':
                // Dead straight line
                ctx.beginPath();
                ctx.moveTo(-r * 0.14, my);
                ctx.lineTo(r * 0.14, my);
                ctx.stroke();
                break;
            case 'worried':
                // Trembling downward arc
                ctx.beginPath();
                ctx.arc(0, my + r * 0.18, r * 0.15, Math.PI + 0.4, Math.PI * 2 - 0.4);
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
            const sdx = r * 0.58;
            const sdy = -r * 0.1 + dt * r * 0.4;
            ctx.beginPath();
            ctx.moveTo(sdx, sdy - r * 0.1);
            ctx.quadraticCurveTo(sdx + r * 0.06, sdy + r * 0.02, sdx, sdy + r * 0.06);
            ctx.quadraticCurveTo(sdx - r * 0.06, sdy + r * 0.02, sdx, sdy - r * 0.1);
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

    // Gaze override — when set, eyes look toward this point
    public lookAtX: number = 0;
    public lookAtY: number = 0;
    public lookAtAmount: number = 0; // 0 = normal idle gaze, 1 = fully locked on

    // Physics
    public vy: number = 0;
    public useGravity: boolean = false;
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

        // --- LookAt decay ---
        if (this.lookAtAmount > 0.01) {
            this.lookAtAmount *= 0.93;
        } else {
            this.lookAtAmount = 0;
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
            drawFace(ctx, this.x, this.y, this.radius, this.colorIndex, this.faceState,
                this.lookAtX - this.x, this.lookAtY - this.y, this.lookAtAmount);
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