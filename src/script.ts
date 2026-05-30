import { Game } from './game.js';
import { initAmbient, tickAmbient } from './ambient.js';
import { initAudio, isMusicMuted, setMusicMuted, isSfxMuted, setSfxMuted } from './audio.js';

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
initAmbient(bgCanvas);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Retina / HiDPI support — cap at 2 so high-DPR phones (dpr=3) don't pay
// for a 1.5x-larger backing store and per-frame gradient fills.
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const logicalW = 380;
const logicalH = 600;
canvas.width = logicalW * dpr;
canvas.height = logicalH * dpr;
canvas.style.width = `${logicalW}px`;
canvas.style.height = `${logicalH}px`;
ctx.scale(dpr, dpr);

initAudio();

const game = new Game(canvas, ctx, logicalW, logicalH, tickAmbient);

document.getElementById('restart')?.addEventListener('click', () => game.restart());

// Audio toggles — music (drone) and sound effects are independent
function wireToggle(
    id: string,
    label: string,
    isMuted: () => boolean,
    setMuted: (m: boolean) => void,
): void {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (!btn) return;
    const render = () => {
        btn.textContent = `${label}`;
        btn.classList.toggle('muted', isMuted());
    };
    render();
    btn.addEventListener('click', () => {
        setMuted(!isMuted());
        render();
    });
}

wireToggle('music', '♬ music', isMusicMuted, setMusicMuted);
wireToggle('sfx', '♪ fx', isSfxMuted, setSfxMuted);
