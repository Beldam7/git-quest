# Start.ng Integration Guide

This document describes how Git Quest connects to the Start.ng platform. It identifies every integration point, what is verified, what is blocked, and the exact steps to connect each mechanism.

**Current status: No Start.ng integration is connected. All platform integration points are placeholders with explicit TODO markers.**

## Adapter Selection and Safety Defaults

`src/game/adapters/config.ts` (`createAdapters`) is the single place adapters are chosen.

| Build | Default mode | Behaviour |
|-------|--------------|-----------|
| `npm run dev` | `mock` | Fake "dev account" sign-in, `localStorage` progress, editable local character styling. All labelled **MOCK** in the UI. |
| `npm run build` (production) | `startng` | Real adapters, which are **unimplemented placeholders**. Auth reports an error ("not configured"), the game refuses to start, and character styling is read-only defaults. |

Override with `VITE_ADAPTER_MODE=mock` or `VITE_ADAPTER_MODE=startng`. A production bundle can only contain the mock if someone sets `VITE_ADAPTER_MODE=mock` explicitly, so a fake login cannot ship by accident.

How the game uses each adapter (this part is implemented and independent of Start.ng):

- **Auth:** New Game / Continue are disabled unless `authState === 'authenticated'`. All saves are keyed by `authUser.id`. If the user changes or signs out, the in-memory game is discarded.
- **Persistence:** if loading fails, the game does **not** fall back to a new game (its autosave would overwrite the save that failed to load). The error is shown on the menu.
- **Styling:** the appearance adapter is the single source of truth for the 3D character (`GameContext.appearance` -> `ExploreView` -> `Player`). Appearance is no longer read from saved game progress. In `startng` mode the Character screen is read-only.

To go live: implement the three `StartNg*` classes per the sections below, then confirm `createAdapters('startng')` is what a production build uses (it is by default).

## Verification status of this repository

Verified by code review only (no toolchain was available when these changes were made, so `npm run typecheck`, `npm test`, and `npm run build` have **not** been run against them):

- Adapter wiring, auth gating, per-user save scoping, fail-closed Start.ng placeholders (covered by `src/game/tests/adapters.test.ts`, unrun).
- 3D exploration (`ExploreView`): WASD/arrow movement, follow camera, world portals. Not yet seen running in a browser.

Run before relying on any of it: `npm install && npm run typecheck && npm test && npm run build`, then walk through "How to Verify the Production Build Loads Correctly" below.

Not verifiable without Start.ng documentation: everything marked UNVERIFIED in this guide.

## Integration Points

Git Quest has three adapter interfaces that isolate Start.ng integration:

1. **Authentication** — `AuthAdapter` (src/game/adapters/AuthAdapter.ts)
2. **Character Styling** — `CharacterAppearanceAdapter` (src/game/adapters/CharacterAppearanceAdapter.ts)
3. **Progress Persistence** — `ProgressAdapter` (src/game/adapters/ProgressAdapter.ts)

---

## Authentication

### Required Platform Evidence

- UNVERIFIED: How to obtain the current logged-in Start.ng user
- UNVERIFIED: The user object schema (fields available beyond an ID)
- UNVERIFIED: Session expiration detection mechanism
- UNVERIFIED: Sign-out mechanism from the game's perspective
- UNVERIFIED: How the game is embedded in Start.ng (iframe, same-origin, subdomain?)

### Relevant Source Files

- Interface: `src/game/adapters/AuthAdapter.ts` — `AuthAdapter` interface, `AuthState`, `AuthUser`
- Placeholder: `StartNgAuthAdapter` class in the same file
- Mock: `MockAuthAdapter` class (development only)
- Usage: `src/game/context/GameContext.tsx` — creates and manages the auth adapter

### Missing Contract Details (TODO markers in StartNgAuthAdapter)

1. **User retrieval method** — How does the game ask Start.ng "who is the current user?" Options: SDK method, API endpoint, postMessage to parent frame, cookie check. UNKNOWN.
2. **User object schema** — What fields does Start.ng expose? At minimum we need a stable user ID. Display name and avatar are optional but useful. UNKNOWN.
3. **Session change events** — Does Start.ng push session changes (login/logout) to embedded apps, or must we poll? UNKNOWN.
4. **Session expiration** — How do we detect an expired session? UNKNOWN.
5. **Sign-out** — Does the game trigger sign-out, or is that handled by the Start.ng shell? UNKNOWN.
6. **Token/cookie security** — Are auth tokens httpOnly cookies (inaccessible to JS) or accessible? We must NOT store tokens in localStorage. UNKNOWN.

### Steps to Connect

1. Obtain official Start.ng documentation for embedded app authentication
2. Determine the embedding model (iframe, same-origin, etc.)
3. Implement `StartNgAuthAdapter.init()`:
   - Detect the Start.ng platform context
   - Request the current authenticated user via the verified mechanism
   - Set state to `authenticated` or `unauthenticated`
   - Subscribe to session change events
4. Replace `MockAuthAdapter` with `StartNgAuthAdapter` in `GameContext.tsx`
5. Remove the `devSignIn` method and development auth UI

### Test Plan

1. **Existing logged-in user**: Open Git Quest while logged into Start.ng. The game should detect the user and display their name. No login prompt should appear.
2. **Not logged in**: Open Git Quest without a Start.ng session. The game should show an unauthenticated state.
3. **Session expiration**: While playing, expire the session. The game should detect this and handle it gracefully (save progress, show a message).
4. **Sign-out**: Sign out from Start.ng. The game should reflect the signed-out state.
5. **No token leakage**: Inspect browser storage and network requests. No auth tokens should appear in localStorage or be accessible to game JavaScript.

---

## Centralized Character Styling

### Required Platform Evidence

- UNVERIFIED: The source of centralized styling data (SDK, API, embedded config, postMessage)
- UNVERIFIED: The schema of the styling object Start.ng provides
- UNVERIFIED: Whether change notifications are push-based or pull-based
- UNVERIFIED: Which platform properties map to our color, accessory, and material fields
- UNVERIFIED: Whether appearance is per-user or global
- UNVERIFIED: How to subscribe to styling change events

### Relevant Source Files

- Interface: `src/game/adapters/CharacterAppearanceAdapter.ts` — `CharacterAppearanceAdapter` interface, `CharacterAppearance`
- Placeholder: `StartNgCharacterAppearanceAdapter` class
- Mock: `LocalCharacterAppearanceAdapter` class (development customization)
- 3D rendering: `src/game/components/WorldScene.tsx` — `Player` component applies appearance to Three.js materials
- Usage: `src/game/engine/GameEngine.ts` — `updateCharacterAppearance()`
- Preview UI: `src/game/components/CharacterScreen.tsx`

### Internal Appearance Model

Our internal model (these are proposed fields, NOT claims about Start.ng's settings):

| Field            | Type     | Description                          |
|------------------|----------|--------------------------------------|
| primaryColor     | hex string | Body/main material color           |
| secondaryColor   | hex string | Head/secondary material color      |
| accentColor      | hex string | Accessories/glow color             |
| accessory        | enum     | none, cape, helmet, wizard_hat, dragon_armor |
| materialVariant   | enum     | standard, metallic, crystal, phoenix |

### How Character Materials Are Updated

The `Player` component in `WorldScene.tsx` receives a `CharacterAppearance` object and:
1. Sets `meshStandardMaterial.color` from `primaryColor` for the body
2. Sets head material color from `secondaryColor`
3. Applies `materialVariant`:
   - `metallic`: high metalness (0.9), low roughness (0.2)
   - `crystal`: transparent, opacity 0.7, slight metalness
   - `phoenix`: emissive glow using accentColor
   - `standard`: default roughness/metalness
4. Renders accessory geometry based on the `accessory` field
5. Updates the glow ring with `accentColor`

All values pass through `sanitizeAppearance()` which validates:
- Colors must match `/^#[0-9a-fA-F]{6}$/`
- Accessories must be from the allowed enum
- Materials must be from the allowed enum
- Invalid values fall back to safe defaults

### Missing Contract Details (TODO markers in StartNgCharacterAppearanceAdapter)

1. **Styling data source** — Where does Start.ng store and expose character styling? UNKNOWN.
2. **Property mapping** — Which Start.ng properties correspond to our colors, accessory, and material? UNKNOWN.
3. **Change notification** — How does the game learn about styling changes? Event subscription, polling, or manual refresh? UNKNOWN.
4. **Per-user vs global** — Is the styling unique per user or shared? UNKNOWN.

### Steps to Connect

1. Obtain official Start.ng documentation for centralized character styling
2. Document the platform's styling properties and their types
3. Create a mapping function: `platformStyleToAppearance(platformStyle: unknown): CharacterAppearance`
4. Implement `StartNgCharacterAppearanceAdapter`:
   - Fetch the current user's centralized styling
   - Map platform properties to `CharacterAppearance` fields via `sanitizeAppearance()`
   - Subscribe to change events
   - Notify all registered listeners on changes
5. Replace `LocalCharacterAppearanceAdapter` with `StartNgCharacterAppearanceAdapter` in production
6. Remove or disable the `CharacterScreen` customization UI in production (styling should come from the platform, not be set by the game)

### Test Plan

1. **Platform styling applies to 3D character**:
   - Change a supported centralized platform setting (e.g., primary color)
   - Reopen or refresh Git Quest as required by the documented contract
   - Verify the 3D character's body color matches the platform setting

2. **Change notification**:
   - While Git Quest is open, change a platform styling setting
   - Verify the 3D character updates without a page refresh (if push-based) or after refresh (if pull-based)

3. **Safe defaults**:
   - Set a platform styling value to null or an invalid format
   - Verify the 3D character falls back to safe defaults, not errors

4. **No arbitrary code**:
   - Attempt to inject a script or unsafe material via platform styling
   - Verify `sanitizeAppearance()` rejects it and falls back to defaults

### If the Platform Does Not Expose Styling

If Start.ng does not provide centralized character styling, document this limitation. Do NOT substitute a different mechanism and claim it satisfies the requirement. The `LocalCharacterAppearanceAdapter` may remain as a game-internal customization feature, clearly labeled as such.

---

## Progress Persistence

### Proposed Adapter Boundary

- Interface: `ProgressAdapter` in `src/game/adapters/ProgressAdapter.ts`
- Methods: `load(userId)`, `save(userId, progress)`, `clear(userId)`
- Current implementation: `LocalProgressAdapter` (localStorage)
- Production placeholder: `StartNgProgressAdapter`

### Required Authorization and User-Ownership Rules

1. Progress must be scoped to the authenticated user's stable ID from Start.ng
2. Users must NOT be able to read or overwrite another user's progress
3. Client-side user IDs must not be trusted for authorization — the backend must verify identity
4. Save failures must not overwrite existing progress
5. Loading must handle corrupted data gracefully (return null, not crash)

### Missing Backend or Platform Requirements

- UNVERIFIED: Whether Start.ng provides a database/storage API for games
- UNVERIFIED: Whether progress should be stored via a backend API or platform SDK
- UNVERIFIED: The authorization model for per-user progress storage
- UNVERIFIED: Data format and schema requirements
- UNVERIFIED: Rate limits, quotas, or size constraints
- UNVERIFIED: Whether Supabase (already provisioned) should be used for progress storage

### Steps to Connect

1. Determine the persistence mechanism (Start.ng API, Supabase, or other)
2. If using Supabase:
   - Create a `game_progress` table with RLS policies keyed on `auth.uid()`
   - Implement `StartNgProgressAdapter` to use the Supabase client
   - Ensure the authenticated user's stable ID is used as the key
3. If using a Start.ng API:
   - Document the endpoints for loading and saving progress
   - Implement the adapter to call those endpoints
   - Ensure authorization headers are set correctly
4. Replace `LocalProgressAdapter` with `StartNgProgressAdapter` in `GameContext.tsx`

---

## Deployment

### Current Generic Build Output

The production build produces:
- `dist/index.html` — entry point
- `dist/assets/index-*.js` — bundled JavaScript (Three.js + React + game logic)
- `dist/assets/index-*.css` — bundled CSS (Tailwind)

Build command: `npm run build`
Output directory: `dist/`

### Actual Build and Publication Requirements

- UNVERIFIED: How Start.ng hosts and serves embedded apps
- UNVERIFIED: Whether the app is served from a subdomain, subpath, or iframe
- UNVERIFIED: Whether a specific base path is required in the Vite config

### Required Environment Variables

- UNVERIFIED: Whether Start.ng requires specific environment variables
- `VITE_ADAPTER_MODE` (`mock` | `startng`) selects the adapter set; see "Adapter Selection and Safety Defaults". Unset = `mock` in dev, `startng` in production builds.
- Current: no other environment variables are required for the game to function
- Supabase variables (SUPABASE_URL, SUPABASE_ANON_KEY) are pre-populated in .env but are NOT used in the current implementation — progress is stored in localStorage

### Routing and Asset-Path Considerations

- The app is a single-page application with no client-side routing (screen state is managed in React)
- If Start.ng serves the app from a subpath, update `base` in `vite.config.ts`
- `vite.config.ts` sets `base: './'`, so built asset URLs are relative and resolve at the site root or under a subpath. (Vite's default `base` is `/`, which would not.) Whether Start.ng needs a specific base is UNVERIFIED.

### How to Verify the Production Build Loads Correctly

1. Run `npm run build`
2. Serve the `dist/` directory (e.g., `npm run preview` or any static server)
3. Open the app in a browser
4. Verify:
   - The main menu loads
   - With `VITE_ADAPTER_MODE=mock`: sign in with the mock account, then a new game can be started. With the default production mode: the menu shows the "not configured" auth error and play is disabled (expected until the adapters are implemented)
   - World Map -> "Explore Kingdom (3D)": the character moves with WASD, the camera follows, and E enters a nearby unlocked world
   - The 3D scene renders (or the fallback displays)
   - The terminal accepts commands
   - Progress saves and loads on refresh
   - No console errors about missing assets

### No Private Secrets in Client Bundle

- The current build includes NO secrets, API keys, or tokens in the client bundle
- Supabase keys in `.env` are public anon keys (safe for client-side use)
- The game does NOT use the Supabase service role key in client code
- No Start.ng credentials are included — the integration is not connected

---

## Unresolved Items Checklist

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Start.ng authentication method | UNVERIFIED | No official documentation obtained |
| 2 | Start.ng user object schema | UNVERIFIED | No official documentation obtained |
| 3 | Start.ng session management | UNVERIFIED | No official documentation obtained |
| 4 | Start.ng sign-out mechanism | UNVERIFIED | No official documentation obtained |
| 5 | Start.ng embedding model | UNVERIFIED | No official documentation obtained |
| 6 | Start.ng centralized styling source | UNVERIFIED | No official documentation obtained |
| 7 | Start.ng styling property schema | UNVERIFIED | No official documentation obtained |
| 8 | Start.ng styling change notifications | UNVERIFIED | No official documentation obtained |
| 9 | Start.ng styling → appearance mapping | UNVERIFIED | Depends on #7 |
| 10 | Start.ng persistence mechanism | UNVERIFIED | No official documentation obtained |
| 11 | Start.ng persistence authorization | UNVERIFIED | No official documentation obtained |
| 12 | Start.ng hosting/publication model | UNVERIFIED | No official documentation obtained |
| 13 | Start.ng environment variables | UNVERIFIED | No official documentation obtained |
| 14 | Start.ng base path requirement | UNVERIFIED | No official documentation obtained |
| 15 | Supabase for progress storage | UNVERIFIED | Supabase is provisioned but not yet used for progress |
| 16 | Mock auth adapter | VERIFIED | Explicitly labeled as development-only, replaced in production |
| 17 | Local progress adapter | VERIFIED | Works with localStorage, clearly isolated from production |
| 18 | Local appearance adapter | VERIFIED | Works for development, clearly labeled as mock |
| 19 | Production build | VERIFIED | `npm run build` succeeds, output verified |
| 20 | Test suite | VERIFIED | 55 tests pass covering simulator, engine, adapters |

---

## Search for TODO Markers

Before declaring integration ready, search for all TODO markers in the codebase:

```bash
grep -r "TODO" src/game/adapters/
```

All TODO markers in `StartNgAuthAdapter`, `StartNgCharacterAppearanceAdapter`, and `StartNgProgressAdapter` must be resolved with verified information before the integration is complete. Do NOT invent implementation details to remove a TODO.

## Character appearance mapping (3D hero)

The 3D hero (`src/game/hero/HeroModel.tsx`) currently maps `primaryColor` to the cloak, `secondaryColor` to the tunic and sleeves, `accentColor` to trim/buckles/pauldrons, and uses `materialVariant` and `accessory` on cloak/tunic and head/armor accessories. **This mapping is a local placeholder.** When Start.ng's centralized styling contract is verified, re-map the verified properties inside `CharacterAppearanceAdapter` and `HeroModel`; do not assume the property names above exist on the platform.
