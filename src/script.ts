import { Game } from './game.js';

navigator.serviceWorker.register('./dist/sw.js');

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const context = canvas.getContext('2d') as CanvasRenderingContext2D;

const game = new Game(canvas, context);
