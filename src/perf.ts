// Global low-power / performance switch.
// Auto-detected on first run from the device, then overridable + persisted.

function autoDetect(): boolean {
    const cores = navigator.hardwareConcurrency || 8;
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return cores <= 4 || coarse;
}

let lowPower = (localStorage.getItem('colormatch-perf') ?? (autoDetect() ? '1' : '0')) === '1';
const listeners: Array<() => void> = [];

export function isLowPower(): boolean {
    return lowPower;
}

export function setLowPower(b: boolean): void {
    lowPower = b;
    localStorage.setItem('colormatch-perf', b ? '1' : '0');
    for (const f of listeners) f();
}

export function onPerfChange(fn: () => void): void {
    listeners.push(fn);
}
