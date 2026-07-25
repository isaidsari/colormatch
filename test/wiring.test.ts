import { test, expect } from 'bun:test';

// The game looks these up by id/selector at boot. If the markup drifts, the
// failure is a silent null deref in the browser — cheap to guard here instead.
const html = await Bun.file(new URL('../index.html', import.meta.url)).text();

test.each([
    'score',
    'high-score',
    'mode-stat',
    'canvas',
    'bg-canvas',
    'restart',
    'music',
    'sfx',
    'perf',
])('index.html defines #%s', (id) => {
    expect(html).toContain(`id="${id}"`);
});

test('index.html defines exactly the three modes the game knows about', () => {
    const modes = [...html.matchAll(/class="mode-btn" data-mode="(\w+)"/g)].map(m => m[1]);
    expect(modes).toEqual(['zen', 'moves', 'time']);
});

test('index.html loads the built bundle', () => {
    expect(html).toContain('./dist/script.js');
});
