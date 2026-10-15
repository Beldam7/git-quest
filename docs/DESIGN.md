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
