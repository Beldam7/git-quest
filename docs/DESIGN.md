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
