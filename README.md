# colormatch

![icon512](https://user-images.githubusercontent.com/78616024/210354697-c9a9b47a-0057-40a3-be2b-9c0e7c447771.png)

A match-three puzzle built on canvas with no runtime dependencies. Installable
as a PWA and playable offline. Every sound is synthesised in the browser via
Web Audio — there are no audio files.

## Modes

| Mode | Ends when |
| --- | --- |
| `zen` | Never. The board reshuffles whenever it runs out of moves. |
| `25 moves` | You have made 25 scoring swaps. |
| `60 sec` | The clock runs out. |

High scores are kept per mode.

## Power-ups

| Made by | Result | Effect |
| --- | --- | --- |
| 4 in a row | striped | Clears its row or column |
| L or T shape | wrapped | Clears the surrounding 3×3 |
| 5 in a row | color bomb | Clears every ball of one colour |

Swapping two power-ups combines them: striped + striped clears a full cross,
striped + wrapped clears three rows and three columns, wrapped + wrapped clears
a 5×5, colour bomb + striped/wrapped spreads that power across a whole colour,
and two colour bombs clear the board.

## Development

```sh
bun run dev        # build + watch + serve on http://localhost:3001
bun run build      # minified bundle into dist/
bun run typecheck  # tsc --noEmit (strict)
bun test           # unit + headless game-loop tests
bun run check      # typecheck and tests together
```

`dist/script.js` is committed because the page is served straight from the
repository — rebuild it before pushing gameplay changes.

## Layout

| Path | Role |
| --- | --- |
| `src/game.ts` | Board state, match resolution, input, rendering |
| `src/balls.ts` | Ball rendering, faces, power-up overlays, sprite caches |
| `src/match.ts` | Pure grid logic (matches, legal moves) — no DOM |
| `src/rng.ts` | Seeded PRNG for anything that decides outcomes |
| `src/audio.ts` | Web Audio synthesis and the music/sfx buses |
| `src/ambient.ts` | Blurred background blobs on their own low-res canvas |
| `src/perf.ts` | Low-power mode detection and toggle |
| `test/dom-stub.ts` | Browser stubs that let the real game run headlessly |

The simulation runs on a fixed 1/60s timestep driven by an accumulator, so
gameplay speed does not change with the display's refresh rate.
