import { Game } from './game.js';

var shadow: boolean = true;

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        shadow = false;

document.addEventListener('DOMContentLoaded', () => {

        navigator.serviceWorker.register('./dist/sw.js');

        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;

        const game = new Game(canvas, context);
        game.shadow = shadow;
});
