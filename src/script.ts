import { Game } from './game.js';
import { initAmbient, tickAmbient } from './ambient.js';

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

const game = new Game(canvas, ctx, logicalW, logicalH, tickAmbient);

document.getElementById('restart')?.addEventListener('click', () => game.restart());
