import { Game } from './game.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const game = new Game(canvas, ctx);

document.getElementById('restart')?.addEventListener('click', () => game.restart());
