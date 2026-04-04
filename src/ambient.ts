const COLORS = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#E67E22'];
const COUNT = 8;

interface AmbientBall {
    x: number;
    y: number;
    r: number;
    // Base direction & speed
    angle: number;
    speed: number;
    // Sinusoidal wobble perpendicular to movement
    wobbleAmp: number;
    wobbleFreq: number;
    wobblePhase: number;
    // Alpha pulse
    baseAlpha: number;
    alphaAmp: number;
    alphaFreq: number;
    alphaPhase: number;
    // Size pulse
    baseR: number;
    rAmp: number;
    rFreq: number;
    rPhase: number;

    color: string;
    t: number; // individual time counter
}

export function initAmbient(canvas: HTMLCanvasElement): void {
    canvas.style.filter = 'blur(45px)';
    canvas.style.transform = 'scale(1.08)';

    const ctx = canvas.getContext('2d')!;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const balls: AmbientBall[] = Array.from({ length: COUNT }, (_, i) => {
        const baseR = 65 + Math.random() * 85;
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: baseR,
            baseR,
            angle: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,
            wobbleAmp: 30 + Math.random() * 50,
            wobbleFreq: 0.3 + Math.random() * 0.4,
            wobblePhase: Math.random() * Math.PI * 2,
            baseAlpha: 0.3 + Math.random() * 0.2,
            alphaAmp: 0.08 + Math.random() * 0.08,
            alphaFreq: 0.2 + Math.random() * 0.3,
            alphaPhase: Math.random() * Math.PI * 2,
            rAmp: baseR * 0.12,
            rFreq: 0.15 + Math.random() * 0.2,
            rPhase: Math.random() * Math.PI * 2,
            color: COLORS[i % COLORS.length],
            t: Math.random() * 100,
        };
    });

    function tick() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        for (const b of balls) {
            b.t += 0.016; // ~60fps dt

            // Slowly drift direction
            b.angle += (Math.random() - 0.5) * 0.008;

            // Main movement
            const vx = Math.cos(b.angle) * b.speed;
            const vy = Math.sin(b.angle) * b.speed;

            // Perpendicular wobble
            const perpX = -Math.sin(b.angle);
            const perpY =  Math.cos(b.angle);
            const wobble = Math.sin(b.t * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp * 0.016;

            b.x += vx + perpX * wobble;
            b.y += vy + perpY * wobble;

            // Wrap
            if (b.x < -b.r)    b.x = w + b.r;
            if (b.x > w + b.r)  b.x = -b.r;
            if (b.y < -b.r)    b.y = h + b.r;
            if (b.y > h + b.r)  b.y = -b.r;

            // Pulsing alpha
            const alpha = b.baseAlpha + Math.sin(b.t * b.alphaFreq + b.alphaPhase) * b.alphaAmp;

            // Pulsing size
            b.r = b.baseR + Math.sin(b.t * b.rFreq + b.rPhase) * b.rAmp;

            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(tick);
    }

    tick();
}
