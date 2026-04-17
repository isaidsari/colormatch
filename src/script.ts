import { Game } from './game.js';
import { initAmbient, tickAmbient } from './ambient.js';
import { initAudio, isMuted, setMuted } from './audio.js';

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
initAmbient(bgCanvas);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Retina / HiDPI support
const dpr = window.devicePixelRatio || 1;
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

// Mute toggle
const muteBtn = document.getElementById('mute') as HTMLButtonElement | null;
if (muteBtn) {
    const render = () => {
        muteBtn.textContent = isMuted() ? '♪ off' : '♪ on';
        muteBtn.classList.toggle('muted', isMuted());
    };
    render();
    muteBtn.addEventListener('click', () => {
        setMuted(!isMuted());
        render();
    });
}
