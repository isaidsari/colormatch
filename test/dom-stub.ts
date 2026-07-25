// Minimal browser stubs so the real Game can be driven headlessly. Everything
// here is deliberately dumb: the point is to exercise game logic and catch
// runtime errors across the whole loop, not to verify pixels.

export interface StubCanvas {
    style: Record<string, string>;
    width: number;
    height: number;
    getContext(): unknown;
    getBoundingClientRect(): { left: number; top: number; width: number; height: number };
    addEventListener(type: string, fn: (e: unknown) => void): void;
    setPointerCapture(id: number): void;
    releasePointerCapture(id: number): void;
    /** Dispatch a synthetic event to the handlers the game registered. */
    fire(type: string, event: Record<string, unknown>): void;
}

function ctx2d(): any {
    const gradient = { addColorStop() { /* noop */ } };
    const props: Record<string | symbol, unknown> = {};
    return new Proxy(props, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
            if (prop === 'measureText') return () => ({ width: 10 });
            return () => undefined;
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
    });
}

export function makeCanvas(w = 380, h = 600): StubCanvas {
    const handlers = new Map<string, ((e: unknown) => void)[]>();
    return {
        style: {},
        width: w,
        height: h,
        getContext: () => ctx2d(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
        addEventListener(type, fn) {
            const list = handlers.get(type) ?? [];
            list.push(fn);
            handlers.set(type, list);
        },
        setPointerCapture() { /* noop */ },
        releasePointerCapture() { /* noop */ },
        fire(type, event) {
            for (const fn of handlers.get(type) ?? []) fn(event);
        },
    };
}

function makeElement() {
    const classes = new Set<string>();
    return {
        textContent: '',
        className: '',
        dataset: {} as Record<string, string>,
        classList: {
            add: (c: string) => { classes.add(c); },
            remove: (c: string) => { classes.delete(c); },
            toggle: (c: string, on?: boolean) => {
                const want = on ?? !classes.has(c);
                if (want) classes.add(c); else classes.delete(c);
                return want;
            },
            contains: (c: string) => classes.has(c),
        },
    };
}

let frameCallbacks: ((t: number) => void)[] = [];

/** Advance the rAF clock by `frames` ticks of `msPerFrame` each. */
export function runFrames(frames: number, msPerFrame = 1000 / 60): void {
    let now = (globalThis as any).__now ?? 0;
    for (let i = 0; i < frames; i++) {
        now += msPerFrame;
        const due = frameCallbacks;
        frameCallbacks = [];
        for (const fn of due) fn(now);
    }
    (globalThis as any).__now = now;
}

export function installDomStubs(): void {
    const g = globalThis as any;
    if (g.__stubsInstalled) return;
    g.__stubsInstalled = true;

    const store = new Map<string, string>();
    g.localStorage = {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => store.clear(),
    };

    const elements = new Map<string, ReturnType<typeof makeElement>>();
    g.document = {
        hidden: false,
        getElementById: (id: string) => {
            if (!elements.has(id)) elements.set(id, makeElement());
            return elements.get(id)!;
        },
        querySelectorAll: () => [],
        addEventListener: () => { /* noop */ },
    };

    g.window = g.window ?? {};
    g.window.addEventListener = () => { /* noop */ };
    // Leaving AudioContext undefined makes every audio call a safe no-op.

    class OffscreenCanvasStub {
        constructor(public width: number, public height: number) { }
        getContext() { return ctx2d(); }
    }
    g.OffscreenCanvas = OffscreenCanvasStub;

    g.requestAnimationFrame = (fn: (t: number) => void) => {
        frameCallbacks.push(fn);
        return frameCallbacks.length;
    };
    g.cancelAnimationFrame = () => { frameCallbacks = []; };
}
