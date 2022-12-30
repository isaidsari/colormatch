import { Game } from './game.js';
var shadow = true;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    shadow = false;
document.addEventListener('DOMContentLoaded', () => {
    navigator.serviceWorker.register('./dist/sw.js');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const game = new Game(canvas, context);
    game.shadow = shadow;
});
// ref https://dev.to/timhuang/a-simple-way-to-detect-if-browser-is-on-a-mobile-device-with-javascript-44j3
