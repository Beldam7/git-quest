# Git Quest: Design System, Audit and Plan

Status: implemented by code review only. `npm run typecheck`, `npm test` and `npm run build` have **not** been run against the redesign (no toolchain in the authoring environment), and nothing has been seen in a browser yet. See "Verification" at the bottom.

## 1. Audit of the original design (specific findings)

| Area | Finding |
|------|---------|
| 3D | `GameScreen` showed a placeholder house icon where the scene should be; the 3D `WorldScene` was never mounted. |
| Styling | ~90 hardcoded hex values (`#1a1f3a`, `#0d1117`, `#252b4a`…), default Tailwind blue/green gradients, browser-default fonts. Read as a generic dark dashboard, not a fantasy game. |
| Accessibility | 0 `aria-*` attributes and 0 focus styles in components; terminal input had `outline-none`; pause overlay was not a dialog; no `prefers-reduced-motion`. |
| Responsive | 11 breakpoint classes in ~1,900 lines; terminal fixed at 288px; no touch controls. |
| Readability | Terminal text 12px; secondary text low contrast on navy. |
| States | No loading state, no WebGL-failure fallback; Three.js in the main bundle. |
| Kept as is | Git simulator, progression engine, hint system, objectives, adapters. |

## 2. Design direction: "lantern-lit guild hall at dusk"

Deep navy stone panels; **cyan** = interaction/magic; **emerald** = success; **gold** = rewards and rank only; **ruby** = health/danger; **violet** = bosses. The expressive effort is spent on the menu's twilight kingdom and the 3D worlds; everything else stays calm and legible.

Tokens live in `tailwind.config.js` (`kq-*` colors, `font-display/sans/mono`) and `src/index.css` (`.kq-panel`, `.kq-btn-*`, `.kq-gold-text`, focus ring, reduced-motion). The default `blue`, `green` and `gray` scales are retuned, so older screens (World Map, Achievements, Report) inherit the palette without per-file rewrites.

| Token | Value | Use |
|-------|-------|-----|
| night / deep / panel / raised / edge | `#060b17` `#0a1327` `#101c36` `#16264a` `#243455` | page, panels, borders |
| text / muted | `#e8eefc` / `#9fb0cf` | body / secondary (muted is about 8:1 on deep) |
| cyan / emerald / gold / ruby / violet | `#3dd6f5` `#34d399` `#f5b942` `#f0596b` `#9b7cf6` | accents |

Type: **Cinzel** (headings only), **Alegreya Sans** (body, 17px base), **JetBrains Mono** (terminal, 14px+). Self-hosted via `@fontsource/*`, so no external CDN (Start.ng CSP is unverified).

## 3. What was changed, by screen

- **Main menu:** code-drawn logo + layered SVG kingdom (castle, floating islands, mountains), a single obvious primary action (Continue if a save exists, else New Game), clear auth/mock status.
- **Quest screen:** real 3D `QuestStage` (world-tinted sky, platform, floating islands, XP crystals, your styled hero; boss placeholder on boss quests), compact HUD with ARIA progress bars, quest tracker with an optional **Need a hint?** button (calls the existing `hint` command), proper pause dialog (focus trap, Esc), terminal sized by viewport.
- **Terminal:** 14px mono, `role="log"` live region, 16px input (prevents iOS zoom), visible focus ring, clearer placeholder.
- **Exploration:** castle landmark, stars, labelled portals facing the castle, solid castle collision, XP crystals, HUD stats, **touch joystick** on coarse-pointer devices, first-visit controls card (device-level preference in `localStorage`, not game progress).
- **Character screen:** the preview is now the real 3D `Player` model fed by the same appearance values the game uses (flat circle removed).
- **World map / achievements / report:** token retune only (not redesigned).

## 4. Asset mapping

The pack is concept art (largest crop 515px wide, baked-in text, no transparency). It is used as art direction, not placed in the app.

| Reference (`docs/design-reference/references/`) | Informs |
|---|---|
| 01 hero/logo/kingdom | `ui/Logo.tsx`, `ui/Backdrop.tsx` (gold-framed diamond emblem, castle + floating islands) |
| 02 environments | per-world tint in `QuestStage`; future world environments |
| 04 player + styles | existing `Player`; appearance presets stay driven by the appearance adapter |
| 05 enemies/bosses | `BossPlaceholder` (violet/History Eater direction) |
| 06 collectibles | `Crystal` (XP crystal) |
| 07 UI/HUD | HUD, quest tracker, terminal, pause menu styling |
| 03, 08 | promo only; not used in-game |

Why no raster crops in the UI: upscaling a 515px crop to a full-screen hero would look blurry, and the crops contain baked text and unrelated objects.

## 4b. Temporary assets and the work still required

| Placeholder | Real asset needed |
|---|---|
| `BossPlaceholder` (icosahedron, horns, wings) | Modelled Conflict Dragon (red), Merge Dragon (blue), History Eater (violet), glTF, under ~5k tris each, with idle animation |
| `Castle` in `ExploreView` (boxes/cones) | Royal Repository model + baked lighting |
| Procedural trees, islands | Environment kit per world (Commit Forest, Branching Highlands, Conflict Canyon, Remote Kingdom, Time-Reversal Temple, Dragon's Citadel) |
| Enemies (goblin, skeleton, slime, shadow) | **Not built**; no enemy gameplay exists in the engine yet |
| Collectibles beyond crystals (potions, chests, coins, keys, scrolls, badges) | **Not built**; `COLLECTIBLES` data exists in `data/ranks.ts` but there is no inventory UI |
| Crystals/portals are decorative | Collecting them does nothing yet; hooking them to XP needs engine support |
| Inventory, Settings, Abilities screens | **Not built**; abilities show as a list in the quest HUD only |
| Victory screen | Reuses the quest-complete / level-up overlays; no dedicated screen |
| Sound, music | None |

## 5. Performance safeguards

Three.js is lazy-loaded (`React.lazy`); `dpr` capped at 1.5 (1 on touch devices); shadows and antialiasing off on coarse pointers; fewer trees/stars on touch; no raster textures; all decorative animation stops under `prefers-reduced-motion`; scenery is deterministic and memoised; `SceneBoundary` keeps a WebGL failure from breaking the quest terminal.

## 6. Acceptance checklist

- [ ] `npm run typecheck`, `npm test`, `npm run build` all pass (**not yet run**)
- [ ] Every screen uses the new palette; no leftover hardcoded navy hexes
- [ ] Menu: one obvious primary action; keyboard reachable; focus ring visible
- [ ] Quest screen: 3D stage renders; terminal usable on a 375px-wide viewport; hint button prints a hint; pause traps focus and Esc resumes
- [ ] Explore: WASD never fires while typing in the terminal; E enters an unlocked portal; castle blocks walking; touch stick works on a phone
- [ ] Character screen: changing colors/accessory changes the 3D preview; in `startng` mode it is read-only
- [ ] Reduced-motion OS setting stops bobbing/spinning
- [ ] 3D failure path: block WebGL and confirm the fallback messages appear

## 7. Known limitations

Not yet run or seen in a browser. Touch behaviour and low-end performance are untested. Old screens were only retuned. Start.ng integration is unchanged and still unverified (see `START_NG_INTEGRATION.md`).

---

# 8. Pass 2: eight-world 3D redesign

**Status: written, not yet compiled or seen running.** Run `npm run typecheck`, `npm test`, `npm run build`, then walk each world (checklist below). Anything marked "unverified" has not been tested.

## 8.1 Why pass 1 looked wrong (root causes)

| Symptom | Cause | Fix |
|---|---|---|
| Hero was a blue blob | The original `Player` was a capsule + sphere; pass 1 reused it | New articulated `hero/HeroModel.tsx` (hips/legs/knees, torso, head with face and hair, arms/elbows, cloak, leather armor, boots, sword) with a speed-driven walk cycle |
| Flat green strip with black triangles | One shared stage scene, accent-tinted background, unlit island undersides, no terrain | Per-world terrain + landmarks (`world3d/worlds/`), real lighting/fog/sky per world |
| 3D squeezed into a thin band | Tall quest panel + fixed-height terminal | Compact quest bar, terminal docked beside (wide) or below (narrow) the world, collapsible and resizable |
| Player could not move in quests | Quest screen had a static stage | `WorldCanvas`: WASD / touch stick, terrain following, collision, follow camera |

## 8.2 Architecture

```
src/game/
  hero/HeroModel.tsx          articulated hero + walk cycle (used by quests, explore hub, character preview)
  world3d/
    noise.ts                  deterministic noise/helpers
    types.ts                  WorldDef, WorldTheme, WorldSignals
    signals.ts                simulator state -> WorldSignals (the ONLY bridge from Git state to visuals)
    kit.tsx                   Terrain (height + slope colouring), instanced Scatter/Trees/Rocks/Crystals,
                              Wall/Tower/Column/Bridge/Island/Banner/Lantern, Glow (state-driven emissive), lighting
    creatures.tsx             Goblin, Skeleton, Slime, ShadowWraith + 8 bosses
    worlds/world1..8.tsx      one distinct world each; worlds/index.ts is the registry
  components/WorldCanvas.tsx  walkable world runtime (movement, collision, camera, boss, ambient creatures)
  components/GameScreen.tsx   quest layout (quest bar, world, resizable terminal)
```

Effects never run on their own: a `Glow`/`useSmooth` level moves only toward a value derived from `WorldSignals`, which comes from `RepositoryState`. A failed command changes no state, so it cannot light anything.

## 8.3 The eight worlds and what reacts to what

| # | World | Geography / landmarks | Reacts to (signal) |
|---|---|---|---|
| 1 | Forgotten Repository | Rolling hills, stream with bridge, mossy ruined castle wall and towers, sealed gate, floating islands, cyan crystals, stone path | `initialized`: shrine runes, central crystal and light beam ignite, castle gate seal dissolves, lanterns brighten |
| 2 | Cave of Lost Commits | Enclosed cavern with stalactites/stalagmites, pools, chasm with broken bridge, inscription wall, boss dais with broken columns | `commitCount`: floating fragments light one-by-one, crystals brighten; commits+reflog: glyphs on the wall; reflog >= 2: relic glows |
| 3 | Branching Forest | Dense pine/oak forest, mushrooms, ferns, stream with log bridge, fork signpost, three diverging trails rejoining at an ancient-tree clearing | `currentBranch`: the matching trail glows, others dim; trails are labelled with the real branch names |
| 4 | Conflict Canyon | Strata-coloured canyon walls, rock spires, lava-lit ravine crossed by a bridge, ruined arena | `unresolvedConflicts`/`mergeInProgress`: bridge breaks (gap, crossing red/cyan beams, glowing fault lines, impassable); `conflictsResolved`: bridge restored with cyan glow and gold motes |
| 5 | Remote Kingdom | Floating home island with houses and plaza, portal, fortified gate, docks and airship, distant floating kingdoms, bridge, clouds | `hasRemote`: portal opens; `pushed`: local beacon + distant beacon light, gold motes; `fetched`/`pushed`: distant islands light, bridge completes; `rejectedPush`: red warning beacon + label |
| 6 | Collaboration Guild | Cobbled courtyard, guild hall, workshops, notice board, work tables, fountain, PR dais, review chamber, forge | `issueCount`: notes light; `branchNames`/`currentBranch`: workshops (active branch glows); `openPullRequests`: floating scrolls; `approvedReviews`: seals light; `mergedPullRequests`: forge ignites |
| 7 | Time-Reversal Temple | Circular temple floor with temporal rings, 12-column colonnade with lintels, armillary, clocks, hourglasses | `commitCount`: timeline nodes; `branchNames`: branch row; `stashCount`: vault; `reflogCount >= 2`: relic; `worldProgress`: floor rings |
| 8 | Dragon's Citadel | Volcanic basalt, lava rivers, stone bridge, curtain wall, gate, four towers, inner keep, volcano | `worldProgress`: tower orbs ignite as quests are completed; `worldProgress = 1`: gold banners, gate and spire change colour, victory motes |

Boss models: Untracked Beast (W1), History Eater (W2), Branch Guardian (W3), Conflict Dragon (W4, red), Gatekeeper (W5), Code Review Council (W6), Timeline Keeper (W7), Merge Dragon (W8, blue). A boss appears only on boss quests. The boss bar on screen shows quest objectives completed, not a made-up HP value.

Mapping heuristics (design choices, not simulator facts): "reflog >= 2 means a recovered artifact", "worldProgress is completed quests / quests in the world". Change them in `signals.ts` and the world files if you want different triggers.

## 8.4 Controls and focus

WASD / arrows move the hero. Movement is ignored while a text field has focus. Clicking the world blurs the terminal so WASD works; clicking the terminal returns to typing. E enters portals on the explore hub. Esc pauses (when not typing). There is no jump, because jumping is not implemented in this game. Touch devices get an on-screen stick.

## 8.5 Not done / known limitations (be honest about these)

- **Nothing has been compiled, run, or looked at in a browser.** Expect small type errors and visual tuning needs.
- **All art is procedural placeholder.** Hero, creatures, castles, dragons are built from primitives. The dragons, treant and hero are much more detailed than before, but they are not modelled game assets. Replacing them with glTF models (for example from a CC0 pack, or an artist) is the next quality step; `HeroModel` and `creatures.tsx` are the swap points.
- **Hero is not skeletal-rigged**; the walk cycle is procedural (legs, knees, arms, elbows, torso, cloak).
- **Enemies are decorative.** Goblins, skeletons, slimes and shadows idle in some worlds. No combat exists in the engine and none was invented.
- **No collectibles pickup, inventory, abilities, settings or final-victory screens.** Collectible *models* beyond crystals were not built.
- **World 8's "final mission" visuals** only respond to quest completion fraction; the simulator-specific steps (clone, branch, merge, review) are shown by earlier worlds' mechanics, not a bespoke 7-step sequence.
- **Instancing is used for repeated scenery, but total draw-calls per world are untuned.** `coarse` (touch) devices get fewer particles/stars, no shadows and dpr 1. Test on a laptop before shipping.
- **Collision is circle-based**, and camera clipping through large structures is only prevented against terrain.
- Appearance mapping in `HeroModel` (primary = cloak, secondary = tunic, accent = trim) is a **local placeholder** until Start.ng's styling contract is verified.

## 8.6 Verification checklist (none of this has been performed)

- [ ] `npm run typecheck`, `npm test`, `npm run build`
- [ ] For each world 1-8: loads without console errors; hero walks and animates; camera stays above terrain; landmarks visible from spawn; terminal usable beside the world
- [ ] W1: run `git init` -> shrine ignites and gate unseals. A failed command does nothing
- [ ] W3: `git checkout -b feature` / `git switch main` -> matching trail glows
- [ ] W4: create a merge conflict -> bridge breaks and hero cannot cross; resolve -> restored
- [ ] W5: add remote / push -> portal and beacons; force a rejected push -> red warning
- [ ] Terminal focus: typing `wasd` into the terminal does not move the hero
- [ ] Resize terminal by dragging and with arrow keys; collapse/expand; canvas resizes
- [ ] Touch emulation: joystick moves hero, UI usable at 375px width

---

# 9. Pass 3: the game loop (path, monsters, combat, gems, zoom)

**Status: written, not compiled or run.** New engine tests (`gameEngine.test.ts`, "Combat, defeat, restart and gems") and `world3d.test.ts` cover the rules below, but have not been executed.

## 9.1 How it plays

1. Each world is a **path** from the spawn point to the boss (`path` in every `world3d/worlds/worldN.tsx`). The route is lit: cleared stretch green, the stretch to the next monster bright cyan, the rest dim.
2. **One monster per question.** Every quest in the world gets a monster standing on the path (goblin, slime, skeleton, shadow in rotation); the last quest is the **boss**, waiting at the end of the world. Boss models: see section 8.3.
3. **Walk to it** (WASD / arrows / touch stick) or press **Walk to monster** (auto-walk follows the path and stops at the edge of the battle zone). A ring on the ground shows the battle zone; a beam and arrow mark the next target.
4. Inside the zone the **fight starts**: the coach says "Fight! Type the right Git command" and shows the exact objective; the terminal gets keyboard focus.
5. **Correct command** (it completes a quest objective) = a hit on the monster. Each objective is one heart, so a 3-objective quest is a 3-heart monster. Last heart = **defeated**, XP awarded, +20 HP, and the hero strides on to the next monster.
6. **Wrong command** (the simulator reports a failure, e.g. a typo or `git add` before `git init`) = the monster strikes back: **-8 HP** (**-12** from a boss), with a red flash and camera shake. `help`, `hint` and `clear` are free. A command that works but is not the objective ("That worked, but it did not hurt the monster") costs nothing.
7. **Health 0 = defeat.** A dialog offers **Restart level**: full health, the world's quests reset, monsters respawn, the hero returns to the start. XP, gems and unlocked worlds are kept, but replaying a quest you already finished awards **no XP** (no farming).
8. **Gems** lie along the route (3 per leg). Walking through one gives +5 XP once. The HUD shows gems collected per world.
9. **Zoom**: mouse wheel, +/- keys, on-screen buttons, or pinch on touch (range 0.45x to 2.8x).
10. Commands only count at the monster. Typing anything other than `help`/`hint`/`clear` while away from it shows "Walk up to the monster first". (Secret missions are exempt.)

## 9.2 Learning the game from the first screen

A **How to play** card (4 steps, plain language) opens on the first visit and can be reopened with the ? button or the pause menu. A **coach bar** on the world always states the single next action: walk to the monster, or exactly which Git command objective to complete. The terminal placeholder changes with the situation. Toasts confirm every beat (direct hit, wrong command, gem, victory).

## 9.3 Engine changes (`GameEngine.ts`)

`onCombat` callback (optional) with events `hit | miss | player-hit | defeated | player-down | restart | gem`; `restartLevel()`, `collectGem()`, `isDefeated()`; `takeDamage` no longer silently restores health; defeated state blocks commands until restart; `clear` is handled; the challenge intro text now actually reaches the terminal (it previously only appeared after the first command). Damage: `MONSTER_DAMAGE = 8`, `BOSS_DAMAGE = 12`, `VICTORY_HEAL = 20` (exported constants, easy to tune).

## 9.4 Known limitations of this pass

- "Incorrect" means a command the simulator rejects. A valid Git command that is simply the wrong one for the question costs no health; it only prints the "did not hurt" hint. Making that harsher is a design choice (change the `else` branch in `processCommand`).
- Monsters are procedural models and do not attack visually beyond a lunge; there are no hit-point numbers beyond hearts.
- World 4's boss fights across the ravine from the south bank by design, so a broken bridge can never trap you.
- Auto-walk assumes the authored path is clear. Collision circles for scenery are generated from the same random placement as the visuals, and have not been playtested.
- Nothing has been run in a browser: expect tuning of spacing, battle-zone radii, camera distance and damage values.


## 9.5 Pass 4: movement fixes, road barrier, winding hilly routes

- **Stuck movement fixed.** A key held while a fight pulled focus into the terminal never registered its release (releases were ignored while a text field had focus), so the hero kept walking and a stuck W cancelled S. Releases are now always honoured, focus moving into a text field drops all held keys, and keys are also dropped on window blur, tab hide, pause/dialogs and when the touch stick loses its pointer.
- **No uncommanded walking.** Auto-walk now starts only when the player presses **Walk to monster**, cancels on any key or stick input, on starting a fight, and when there is no living monster to walk to. It no longer starts by itself after the tutorial or a victory.
- **Monsters block the road.** The hero is confined to a corridor around the route (`ROAD_CORRIDOR`, 6 units each side) and cannot pass the arc position of the first living monster (`constrainToRoad`). A shimmering gate marks the barrier; bumping into it shows "A monster blocks the road!". It opens only when that monster is defeated. Going around is impossible because the corridor edge pulls the hero back onto the road.
- **Curved, hilly routes.** Every route is a Catmull-Rom spline through winding control points (`smoothPath`), and terrain gets rolling hills along the route (`roadProfile`, always raising the ground so water and lava thresholds are not breached). World 6 (a flat paved courtyard) and World 7 (a temple floor) keep a flat floor by design but have winding routes. Worlds 1 and 8 keep a straight stretch where the route crosses a bridge, so the hero stays on the deck.
- Tests: `world3d.test.ts` covers the spline, the hills and the barrier/corridor rules.

Still unverified in a browser: hill amplitudes, corridor width and barrier placement per world.


---

# 10. Pass 5: visible combat, sound, leaderboard, secret maps

**Status: written, not compiled or run.** New tests: `audio.test.ts`, `leaderboard.test.ts`, additions to `world3d.test.ts` and `gameEngine.test.ts`. None executed yet.

## 10.1 Combat you can actually see (and why it was invisible)

Root cause: the engine emits `hit` then `defeated` in the same instant for a killing blow, and the UI stored only the latest event, so the hit effects, hit sound and hit toast were lost. The context now keeps an ordered list of events (`combatEvents`) and every consumer processes each event exactly once (`useCombatEvents`).

| Moment | What you see |
|---|---|
| Correct command | Hero draws a sword and swings (wind-up, slash arc, lunge). A glowing bolt flies to the monster, bursts on impact, "HIT!" floats up; the monster is knocked back and shakes |
| Killing blow | Green burst, "DEFEATED!", the monster collapses; victory fanfare and heal |
| Wrong command | The monster lunges, a red bolt flies to the hero, burst + "-8 HP", the hero staggers back, the screen flashes red and the camera shakes |
| Valid but not the objective | "No effect…" floats over the monster, which shrugs |
| Gem | Cyan burst and "+5 XP" over the hero |

Bolts are pure emissive meshes (no dynamic lights, which would force shader recompiles). With reduced-motion on, particle bursts and bolts are skipped but the text and animations that carry meaning remain.

## 10.2 Sound (`src/game/audio/GameAudio.ts`)

No audio files: everything is synthesised with the Web Audio API, so there is nothing to license or download.
- **Music:** a generative ambient score (pads, plucks, bass) with its own key, scale and tempo per map (menu, worlds 1-8, four secret maps), crossfaded on map change. A battle mood adds drums and a faster pulse while you are inside a monster's battle zone.
- **Effects:** hit, miss, hurt, XP, gem, victory, level-up, defeat, battle horn, blocked, button click, footsteps, restart.
- **Controls:** speaker button in the header and menu; music/effects sliders in the pause menu; settings persist per device. Sound starts only after your first click or key (browser rule).
- Limitation: it is synthesised, not recorded or composed. If you want real tracks, add files and replace `GameAudio`'s music scheduler; the call sites (`setTheme`, `setMood`, `playSfx`) will not change.

## 10.3 Leaderboard

`LeaderboardAdapter` follows the same pattern as auth/progress/styling.
- **Dev mock (`LocalLeaderboardAdapter`):** stores your best score in this browser plus six clearly labelled DEMO players. It is not shared between players and can be edited by anyone in DevTools.
- **Production placeholder (`StartNgLeaderboardAdapter`):** throws "not configured". No endpoint is invented. A real leaderboard must be server-authoritative: the server should compute or validate XP from verified progress, because anything the browser submits can be forged.
- Scores are submitted after each successful save; ranking is XP, then worlds cleared, then who arrived first. Entries are sanitised (name length/characters, clamped numbers). A restart never lowers your best score.
- Screen: Main menu > Leaderboard.

## 10.4 Secret-mission maps

Each of the four secret missions now has its own map and guardian (`world3d/secretMaps.ts`, `worlds/secret101-104.tsx`):

| Map | Mission | Look | Reacts to |
|---|---|---|---|
| 101 The Whispering Crypt | Ghost Commit | Misty graveyard, crypt, drifting orbs | commits + reflog entries light the orbs; the crypt door opens when reflog/commits exist |
| 102 The Moonlit Sanctum | Silent Guardian | Moonlit hedge avenue, ward stones, gate | one ward stone wakes per `.gitignore` rule (new `ignoreRules` signal) |
| 103 The Shattered Gatehouse | Gate Crasher | Gorge road, ruined gatehouse, portcullis | `rejectedPush`: portcullis glows red and stays locked; `pushed`: it rises and turns gold |
| 104 The Tangled Spire | Clean Timeline | Floating causeway, gears, ribbons of time | extra branches or an unfinished merge: ribbons knotted pink; linear history: they straighten and turn cyan |

Guardians: Ghost (new `Phantom` model), Silent Sentinel (stone knight), Gate Crasher Ogre (brute), Tangled Chronomancer (timeline keeper). The same road/monster/gem/barrier rules apply. Secret maps are reached from the World Map's secret-mission list, as before.

Heuristics that are design choices, not facts from the simulator: map 104's "tangled" test (more than one branch or a merge in progress), and map 101's "recovered" count (commits + reflog entries).

## 10.5 Not done / unverified

- Nothing here has been compiled or seen running. Likely tuning: sound levels and music balance, combat effect timing, secret-map scale.
- The achievement-unlocked sound and a dedicated "XP gained" counter animation are not wired (XP gain plays the `xp` chime on each hit).
- Secret maps have a single guardian each (their missions have one objective set), no side monsters.
- Leaderboard is a mock until Start.ng provides a verified backend.


---

# 11. Pass 6: jumping and walking on bridges

**Status: written, not compiled or run.** New tests: `surface.test.ts` (jump physics, decks, rails).

- **Jump:** Space (or the on-screen Jump button on touch). One jump at a time; gravity and landing are in `world3d/surface.ts` (`stepVertical`). The hero tucks its legs and raises its arms in the air; jump and landing sounds play. Space still presses a focused button, and never fires while typing in the terminal. Jumping does not get you past a monster: the road barrier works in the ground plane.
- **Steady camera:** the camera follows ground height rather than jump height, so a jump does not yank the view.
- **Bridge decks:** worlds can declare `bridges` (deck, width, optional gap). The hero stands on the deck (it is now a real surface instead of the terrain under it), steps up onto it from the bank, and walks across with wooden footstep sounds. Side rails stop you walking off the sides while you are on the deck; the ends stay open. If you drop below a deck (for example into the stream) you wade underneath instead of snapping up.
- **World 1:** the stream bridge is a real deck. **World 8:** the lava bridge has a deck and rails. **World 4:** the road now continues across the ravine bridge to the dragon's arena. The bridge is whole while no merge conflict is unresolved; if it breaks while you are on it you are put back on the south bank (`rescue`). Regular monsters still stand on the south bank only (`stationSpan`), so a broken bridge can never stop you from reaching a fight.
- Decor bridges in other worlds (the cave's broken bridge, the Remote Kingdom's rope bridge, the forest log) are not on the hero's road and remain scenery.

Unverified in a browser: jump height/feel (9.5 up, 28 gravity), deck step-up smoothness, and rail clearance.


---

# 12. Pass 7: a gentler, deeper game

**Status: written, not compiled or run.** Tests added: `explain.test.ts`, and new cases in `gameEngine.test.ts` (shield, practice, crystal, hints). Two older engine tests were updated because the first wrong command of every fight is now absorbed.

**Mistakes teach instead of just punishing**
- Every failed command now gets a plain-language "why and what to do" line (`engine/explain.ts`), built from the simulator's real error messages: no repository yet, file not found, push rejected, branch name taken, commit without a message, not a Git command, and more.
- **Commit Shield** (an ability already described in the data, now real): absorbs the first wrong command of every fight, then recharges. It is derived from your current rank, so beginners have it from the start (previously abilities unlocked only when the rank changed, so rank 1 would never have received one).
- **Recovery Crystal** (rank 2+): a header button that restores full health, once per level.
- **Conflict Sense**: when you ask for a hint during a merge, it names the files that still have conflicts.
- **Stepped hints**: the first `hint` gives a nudge; asking again also explains the concept.
- **Practice mode** (pause menu; offered on the defeat screen): wrong commands never cost health. XP is unchanged.

**Polish and reach**
- **Graphics quality** (High / Medium / Low) in the pause menu: shadows, resolution and particle counts. Phones start on Low. Changing it rebuilds the world.
- **Victory screen** after the Merge Dragon falls ("Claim victory!" on the cleared panel): rank, XP, gems, quests, proficiency score, links to the leaderboard.
- New feedback for the new beats (BLOCKED!, +HP, practice notes) in toasts, 3D effects and sounds.

**Deliberately not done**
- New challenge *types* (predict-the-output, fix-the-command, ordering). They need new quest data and UI, and are the best next content step.
- Branch Vision and Timekeeper abilities have no effect yet (they refer to map and quest-unlock features that do not exist).
- Start.ng integration: done in pass 8 below, from the official documentation.


---

# 13. Pass 8: real start.ng integration

The earlier sections (and the placeholders they describe) are superseded by the official start.ng documentation, now implemented. Full details and the publishing steps are in `docs/START_NG_INTEGRATION.md`.

- **Login:** the real connect-page protocol (`startng:whoami`), origin-checked, with start.ng's own guest and an offline-guest fallback when not on start.ng. Sign-in button for guests.
- **Character rule:** the 3D hero now draws every start.ng character field (body, tunic, trousers/skirt, skin, hair color, 7 hair styles, 5 hats, 6 accessories). The old local-only fields (accent colour, materials, cape/helmet/dragon armour) were removed because start.ng's schema replaces them.
- **Leaderboard:** `public/startng.json` declares four columns (xp, worlds, gems, secrets); scores are saved after each save for signed-in players; the screen reads start.ng's board. The dev mock and demo players remain for `npm run dev`.
- **Saves:** start.ng has no cloud save for games, so progress is saved in the browser per player id. Documented as a limitation.
- **Publishing:** the Vite source page moved to `web/` and the build goes to `dist/`, which is now committed (start.ng never builds; a source `index.html` at the repo top is refused). Added `cover.png` and `startng.json`.
- The platform's multiplayer rooms are not used (Git Quest is single-player).
