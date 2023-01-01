import { Game } from './game.js';
navigator.serviceWorker.register('./dist/sw.js');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const game = new Game(canvas, context);
