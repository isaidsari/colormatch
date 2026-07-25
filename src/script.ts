import { Game, Mode } from './game.js';
import { initAmbient, tickAmbient } from './ambient.js';
import { initAudio, isMusicMuted, setMusicMuted, isSfxMuted, setSfxMuted } from './audio.js';
import { isLowPower, setLowPower } from './perf.js';

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
initAmbient(bgCanvas);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Retina / HiDPI support. Cap at 2 normally; in low-power mode drop to 1.5 so
// high-DPR phones render far fewer pixels. (DPR is fixed at load — toggling
// performance mode changes the live effects immediately but only adjusts the
// backing-store resolution after a reload.)
const dpr = Math.min(window.devicePixelRatio || 1, isLowPower() ? 1.5 : 2);
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

// Mode picker — switching restarts the run, so re-picking the active mode is a no-op.
const modeButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.mode-btn[data-mode]'),
);
function renderModes(): void {
    for (const btn of modeButtons) {
        btn.classList.toggle('selected', btn.dataset.mode === game.getMode());
    }
}
for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
        game.setMode(btn.dataset.mode as Mode);
        renderModes();
    });
}
renderModes();

// Generic toggle button: reflects `isOn()` via a CSS class, flips it on click.
function wireToggle(
    id: string,
    isOn: () => boolean,
    setOn: (v: boolean) => void,
    cls: 'muted' | 'active',
): void {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (!btn) return;
    const render = () => btn.classList.toggle(cls, isOn());
    render();
    btn.addEventListener('click', () => {
        setOn(!isOn());
        render();
    });
}

// Audio toggles — music (drone) and sound effects are independent.
// `.muted` dims the button when the channel is silenced.
wireToggle('music', isMusicMuted, setMusicMuted, 'muted');
wireToggle('sfx', isSfxMuted, setSfxMuted, 'muted');

// Performance toggle — `.active` highlights it while low-power mode is on.
function applyPerf(): void {
    bgCanvas.style.display = isLowPower() ? 'none' : 'block';
}
applyPerf();
wireToggle('perf', isLowPower, (v) => { setLowPower(v); applyPerf(); }, 'active');
