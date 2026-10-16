# What has been verified, and what has not

This was checked in a sandbox with **no internet and no `npm install`**, so the real toolchain (Vite, vitest, the React/Three typings, Tailwind) was not available. Instead the code was checked with a TypeScript compiler, `tsx`/esbuild and a real headless Chromium. Each check below says what it proves.

## Verified (and passing)

| Check | How | Result |
|---|---|---|
| Types | `tsc` (strict) over all of `src/`, with loose stand-in typings for React, Three, drei, lucide and vitest | 0 errors outside the stand-ins' own noise. Local types, imports/exports, props of our own components and the game context are all checked |
| Unit and logic tests | All 10 test files (221 tests) executed with `tsx` and a small test runner | 221 passed, 0 failed |
| Every map is playable | `worlds.test.ts` (new, permanent) loads all 8 worlds and 4 secret maps and walks each route with the game's real movement rules (obstacles, road corridor, monster barrier, jump physics, bridge decks) | All 12 maps: route completable, each barrier holds, hero stands on the bridge decks of worlds 1, 4 and 8, monsters/boss/gems on valid ground |
| The whole interface runs | The real app bundled with esbuild (only the 3D libraries and icons stubbed) and driven in headless Chromium: sign-in, new game, tutorial, fights, shield, explanations, hints, victory, auto-advance, defeat, practice mode, pause menu, leaderboard, character editor | 24/24 steps, no console errors |
| The start.ng integration | The production adapters in Chromium, served at `git-quest.start.ng`, with a stand-in for `https://start.ng/connect` that follows the documented message protocol and checks origins | 12/12 steps: signed-in player, exact leaderboard stats, per-player browser save, start.ng board with "You" highlighted, guest flow with sign-in redirect, offline fallback |
| Platform files | `public/startng.json` against the documented rules; `cover.png` is 1600 x 1000 (16:10) and 70 KB; no password fields, `eval`, hidden code, or redirects on load in the source | Pass |

| Every quest is completable | `questSolutions.test.ts` replays a solution for all 44 quests (8 worlds, their bosses, 4 secret missions). 42 were found by an automatic solver working from each quest's own hints; the two long PR bosses were walked by hand | 44/44 completable |

## Bugs this process found and fixed
- **`git push` / `git pull` were wrong in the simulator** (found after you reported "Send Your Work" not defeating the monster):
  - Push rejection was inverted: an ordinary "commit, then push" was rejected as if someone else had pushed first. It now rejects only when the remote has commits you don't have.
  - Pull of diverged histories dropped your own commit; it now makes a real merge commit with both parents. "Already up to date" and fast-forward now follow real Git.
  - History checks followed only the first parent, so a merge commit hid the remote's commit; they now follow all parents.
  - The World 5 boss and the Gate Crasher secret mission were **impossible to complete** because of the above; both are winnable now.
- **Brittle objectives:** "Send Your Work", "Sync with the Citadel" and "Accept the Changes" only accepted one hard-coded commit id, so committing before pushing/pulling (a natural thing to do) left you stuck. They now check what the task actually asks (the remote has your branch's latest commit; your branch includes the remote's commit).
- The zoom buttons overlapped the abilities list on shorter screens; they moved to the bottom right.
- A React duplicate-key warning on every wrong command (the red hit flash and the toast shared a key).
- The "in battle range" flag could get out of sync with the 3D hero; it now corrects itself.
- Gems could sit over a ravine or lava beside a bridge, or inside a rock (worlds 4 and 8); placement now picks valid ground.
- Vite's source page path (reported by you) was wrong; fixed by using `app.html` at the repo root.

## NOT verified (needs your machine or the live platform)
- **The 3D scenes themselves.** Three.js, React Three Fiber and drei were not installed, so nothing was rendered: the look of the worlds, creatures, hero and effects, camera feel, jump feel, performance and frame rate are all unseen.
- **Layout and styling.** Tailwind was not run, so responsive layout, colours and spacing were not seen (only behaviour and text).
- **`npm run build`.** The Vite build, and the small plugin in `vite.config.ts` that serves `app.html` in dev and renames it to `dist/index.html` for the build, could not be run. The config parses; run the build and confirm `dist/index.html` exists.
- **Real vitest.** Tests were run with a small stand-in runner and stand-ins for the browser. They should behave the same in vitest, but `worlds.test.ts` mocks `@react-three/fiber` and `@react-three/drei` and loads the real `three`; if vitest complains at import, tell me.
- **The live start.ng platform.** Our side of the documented protocol is verified; what the real connect page and `/games/check` say is not.
- **Sound** (synthesised music and effects were never listened to), **touch controls**, and **React 18**: the browser test used React 19.

## To run it yourself
```
npm install
npm run typecheck
npm test
npm run build      # then confirm dist/index.html, dist/startng.json, dist/cover.png exist
npm run dev
```
