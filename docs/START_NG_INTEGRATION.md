# Git Quest on start.ng

Everything here is written from the official start.ng documentation (`https://start.ng/docs.md`) and is **implemented in code**. Anything that could only be confirmed on the live platform is listed under "Still to confirm on start.ng" at the end.

## How the game talks to start.ng

Git Quest is a static, frontend-only game. start.ng is its backend for **players, their character, and the shared leaderboard**. It talks to start.ng through the hidden connect page `https://start.ng/connect` with `postMessage` (`src/game/platform/startng.ts`). Replies are accepted only if the origin is `https://start.ng` **and** the sender is our connect frame.

The connect page answers only games served from a `*.start.ng` address. Anywhere else (a local file, `localhost`, `vite preview`) there is no answer, and the game simply plays as an **offline guest**. It never gets stuck.

| Need | How it works here | Code |
|---|---|---|
| Who is playing | `startng:whoami` returns the signed-in `user` (id, character name, account, style, face) or start.ng's `guest`. Re-asked whenever the player returns to the tab (`visibilitychange`, `focus`) | `adapters/AuthAdapter.ts` (`StartNgAuthAdapter`) |
| Sign in | Guests see a **Sign in** button: `https://start.ng/?return_to=<game address>`. The `#startng_session=` that comes back is removed from the address bar (we use the connect page, not the HTTP API) | `platform/startng.ts` |
| The character | `user.style` (or the guest look) is drawn on the 3D hero. Unknown or missing values fall back to defaults, as the docs require | `adapters/CharacterAppearanceAdapter.ts`, `hero/HeroModel.tsx` |
| Leaderboard | `startng:score` after each save (signed-in players only), `startng:leaderboard` for the screen. Columns are declared in `public/startng.json` | `adapters/LeaderboardAdapter.ts` |
| Saved progress | **start.ng has no cloud save for games** (docs: "localStorage only lives in one browser"). Progress is saved in the browser, per player id. A save does not follow the player to another device | `adapters/ProgressAdapter.ts` (`LocalProgressAdapter`) |

Guests: they can play, and see the leaderboard, but cannot save a score (the docs say so). The menu and leaderboard screen invite them to sign in.

## The character rule

start.ng requires every game to show the player's start.ng character. The 3D hero shows all eight fields:

| start.ng field | On the hero |
|---|---|
| `body` (`female`/`male`) | Build: broader shoulders (male) or slimmer shoulders, wider hips and a skirt (female) |
| `primaryColor` (top) | Tunic and sleeves; the cloak is a darker shade of it |
| `secondaryColor` (trousers/skirt) | Trousers or skirt; also scarf and backpack |
| `skinColor` | Face, ears, neck |
| `hairColor` | Hair, brows, beard |
| `hair` (`short afro braids bun ponytail dreads bald`) | Seven hair styles |
| `hat` (`none cap beanie tophat crown`) | Five hats |
| `accessory` (`none glasses earrings beard scarf backpack`) | Six accessories |

The fantasy costume (leather harness, boots, gloves, sword, gold trim, glowing gem) is the same for everyone so the hero stays a recognisable Git Quest character. In production the Character screen is read-only and links to start.ng to edit. In development (`npm run dev`) it is a local editor for trying every option.

## Leaderboard columns (`public/startng.json`)

Ranked by the first stat, ties broken by the next ones, then whoever got there first (start.ng's rule). start.ng keeps each player's best run and accepts only exactly these whole numbers:

| key | label |
|---|---|
| `xp` | Total XP (ranks the board) |
| `worlds` | Worlds cleared |
| `gems` | Gems |
| `secrets` | Secret missions |

`leaderboardStats()` in `LeaderboardAdapter.ts` produces exactly these keys, clamped to 0 to 1,000,000,000. If you change a column, change **both** that function and `public/startng.json`.

**Cheating:** a browser game cannot be made cheat-proof. start.ng only accepts the declared numbers within limits from signed-in players. As the owner you can remove a bad score with `DELETE https://api.start.ng/games/git-quest/scores/{player_id}` using your start.ng sign-in.

## Publishing, step by step

start.ng serves a **static, already-built** game from a **public GitHub repo**. It never runs `npm install` or `npm run build`.

1. **Build:** `npm run build`. This writes the finished game to `dist/` (Vite's source page is `app.html`, not `index.html`, because a source `index.html` at the top of the repo is refused with "needs building first"; the build renames it to `dist/index.html`). `dist/` is deliberately **not** git-ignored: commit it.
2. **Check the output:** `dist/` should contain `index.html`, `assets/`, `startng.json` and `cover.png`. Paths are relative (`base: './'`).
3. **Commit and push** to a **public** GitHub repo (`git add dist` is the step people forget).
4. **Dry-run the platform's checks** (nothing goes live):
   ```
   curl -X POST https://api.start.ng/games/check -H "Content-Type: application/json" \
     -d '{"repo_url":"https://github.com/<you>/<repo>","name":"git-quest"}'
   ```
   `200` means it would go live. `422` lists every problem with a `code` and `file`.
5. **Publish:**
   ```
   curl -X POST https://api.start.ng/games/publish -H "Content-Type: application/json" \
     -d '{"repo_url":"https://github.com/<you>/<repo>","name":"git-quest"}'
   ```
   The first time you get `202` and an `approve_url`. **Open it, sign in with start.ng, say yes.** The game is then live at `https://git-quest.start.ng`.
6. **Updates:** just push. start.ng watches the branch and updates the game by itself within a minute or two. If a push has errors, the previous version stays live and the reason is shown on your game's card under **Your games**. Remember to run `npm run build` and commit the new `dist/` before pushing.

Name rules: lowercase letters, digits and hyphens, at most 40 characters; `api`, `auth`, `login`, `www` and `3rdmainland` are reserved; the first person to publish a name owns it.

### What the platform's checks look at, and how the game fares

| Check | Status |
|---|---|
| Built `index.html`, relative paths, allowed file types, under 100 MB / 25 MB per file | Satisfied by the Vite build (`app.html` -> `dist/index.html`; fonts are `.woff`/`.woff2`; no files over the limits are expected, but check the size of `dist/`) |
| No secrets, no password field, no redirect on load, no obfuscated code | None present. The build is minified, which is allowed |
| `external_script`, `insecure_link` warnings | Everything is bundled (fonts, scripts, sounds are synthesised). Library code contains `http://www.w3.org/...` XML-namespace strings, which are text, not loaded resources |
| `no_start_ng_player` warning | The game asks start.ng who is playing (`startng:whoami`) |
| `no_cover` warning | `cover.png` (16:10, 1600 x 1000) is included |
| `leaves_start_ng` warning | The only outbound links are the sign-in redirect and an "Edit on start.ng" link |

## Testing

Sign-in, scores and the leaderboard **only work once the game is live at `git-quest.start.ng`**. Locally the game runs as an offline guest, which is a good way to check it still plays without a player:

- `npm run dev` runs the **development mock** (fake sign-in, local character editor, demo leaderboard).
- `npm run build && npm run preview` runs the **production adapters** off-platform: offline guest, character defaults, no leaderboard.
- `VITE_ADAPTER_MODE=startng npm run dev` does the same during development.

## Still to confirm on start.ng

These can only be checked on the live platform:
- That the live connect page answers `startng:whoami`, `startng:score` and `startng:leaderboard` exactly as documented, and that the character appears as expected for a signed-in player with every hair, hat and accessory.
- That `dist/` passes `POST /games/check` with no errors (the size of the final bundle in particular).
- Behaviour of audio autoplay inside start.ng's page (sound starts after the first click or key, as browsers require).
