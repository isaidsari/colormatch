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

// ── Settings drawer ───────────────────────────────────────────────
// Music, effects and performance are set-and-forget, so they live behind a
// gear rather than taking a permanent row under the board.

const settingsBtn = document.getElementById('settings') as HTMLButtonElement | null;
const settingsPanel = document.getElementById('settings-panel') as HTMLElement | null;

function setSettingsOpen(open: boolean): void {
    if (!settingsBtn || !settingsPanel) return;
    settingsPanel.hidden = !open;
    settingsBtn.setAttribute('aria-expanded', String(open));
    settingsBtn.classList.toggle('active', open);
}

/** With the drawer shut, a dot on the gear is the only sign a channel is off. */
function renderSettingsFlag(): void {
    settingsBtn?.classList.toggle('flagged', isMusicMuted() || isSfxMuted());
}

// Start from code rather than trusting the markup's `hidden` attribute, so the
// panel state and aria-expanded can never drift apart.
setSettingsOpen(false);

settingsBtn?.addEventListener('click', () => setSettingsOpen(!!settingsPanel?.hidden));

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setSettingsOpen(false);
});

// Anything else the pointer lands on — including the board — closes the drawer.
document.addEventListener('pointerdown', e => {
    if (!settingsPanel || settingsPanel.hidden) return;
    const target = e.target as Node;
    if (settingsPanel.contains(target) || settingsBtn?.contains(target)) return;
    setSettingsOpen(false);
});

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
        renderSettingsFlag();
    });
}

// Audio toggles — music and sound effects are independent.
// `.muted` dims the button when the channel is silenced.
wireToggle('music', isMusicMuted, setMusicMuted, 'muted');
wireToggle('sfx', isSfxMuted, setSfxMuted, 'muted');

// Performance toggle — `.active` highlights it while low-power mode is on.
function applyPerf(): void {
    bgCanvas.style.display = isLowPower() ? 'none' : 'block';
}
applyPerf();
wireToggle('perf', isLowPower, (v) => { setLowPower(v); applyPerf(); }, 'active');

renderSettingsFlag();
