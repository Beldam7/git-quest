# Git Quest: The Repository Kingdom — Architecture

## Overview

Git Quest is a 3D browser-based RPG that teaches Git and GitHub through quests, combat, and exploration. Players enter git commands in an in-game terminal to solve challenges, defeat bosses, and progress through eight themed worlds.

## System Architecture

### Core Layers

```
┌─────────────────────────────────────────────────────┐
│                    React UI Layer                     │
│  (MainMenu, WorldMap, GameScreen, Terminal, HUD)     │
├─────────────────────────────────────────────────────┤
│                  Game Context Layer                   │
│  (GameContext — React context + state bridge)        │
├─────────────────────────────────────────────────────┤
│                   Game Engine Layer                   │
│  (GameEngine — progression, XP, ranks, achievements) │
├──────────────────────┬──────────────────────────────┤
│   Git Simulator      │       Game Data Layer          │
│   (GitSimulator)     │  (worlds, ranks, missions)     │
├──────────────────────┼──────────────────────────────┤
│     Adapters         │       Three.js Scene           │
│  (Auth, Progress,    │  (WorldScene — 3D rendering)   │
│   Appearance)        │                               │
└──────────────────────┴──────────────────────────────┘
```

### File Structure

```
src/
├── App.tsx                          # Root component, screen router
├── game/
│   ├── types.ts                     # All TypeScript types
│   ├── simulator/
│   │   └── GitSimulator.ts          # Git command parser + repo state machine
│   ├── engine/
│   │   └── GameEngine.ts            # Game state, progression, XP, ranks
│   ├── context/
│   │   └── GameContext.tsx          # React context wrapping GameEngine
│   ├── data/
│   │   ├── worlds.ts                # 8 worlds with challenges (worlds 1-3)
│   │   ├── expandedWorlds.ts        # Worlds 4-8 + secret mission challenges
│   │   ├── ranks.ts                 # Ranks, abilities, achievements, collectibles
│   │   └── secretMissions.ts        # Secret mission definitions
│   ├── adapters/
│   │   ├── AuthAdapter.ts           # Auth interface + dev Mock + real start.ng auth (connect page)
│   │   ├── ProgressAdapter.ts       # Progress saved in the browser, per player (start.ng has no cloud save)
│   │   └── CharacterAppearanceAdapter.ts  # Appearance interface + adapters
│   ├── components/
│   │   ├── MainMenu.tsx             # Main menu screen
│   │   ├── WorldMap.tsx             # World selection screen
│   │   ├── GameScreen.tsx           # Main gameplay screen with HUD + terminal
│   │   ├── Terminal.tsx             # In-game terminal component
│   │   ├── WorldScene.tsx           # 3D world scene (Three.js/R3F)
│   │   ├── AchievementsScreen.tsx   # Achievements, collectibles, missions
│   │   ├── CharacterScreen.tsx      # Character appearance customization
│   │   └── ProficiencyReport.tsx    # Final proficiency report
│   └── tests/
│       ├── gitSimulator.test.ts     # Git simulator tests (40+ tests)
│       └── gameEngine.test.ts       # Engine, progression, adapter tests
```

## Git Command Simulator

The `GitSimulator` is the heart of the game. It parses git commands and manages a simulated repository state without touching the real filesystem.

### Supported Commands

| Category    | Commands                                           |
|-------------|----------------------------------------------------|
| Beginner    | `init`, `status`, `add`, `commit`, `log`, `diff`   |
| Intermediate| `branch`, `switch`, `merge`, `clone`, `fetch`, `pull`, `push` |
| Advanced    | `stash`, `restore`, `revert`, `reset`, `cherry-pick`, `rebase`, `reflog` |
| GitHub sim  | `issue create/list/close`, `pr create/list/merge/review` |
| Utility     | `ignore` (gitignore management), `resolve` (conflict resolution) |

### State Machine

The simulator maintains a `RepositoryState` object that tracks:
- Branches and their head commits
- Commit history with parent links
- Working directory files (tracked, staged, ignored)
- Remotes and remote-tracking branches
- Merge conflicts and merge-in-progress state
- Stash entries
- Issues and pull requests (GitHub simulations)
- Reflog entries
- Gitignore patterns

Each command is a pure function: `(state, input) → { result, newState }`. The state is deep-cloned before mutation, ensuring immutability for React's change detection.

### Safety

- No real filesystem access — entirely simulated
- Only implemented commands are accepted; unknown commands return errors
- Non-git commands are rejected
- Destructive commands (reset --hard, revert) produce warnings but are allowed in the simulation

## Progression System

### XP and Levels

- XP is awarded for completing objectives, challenges, and secret missions
- Bonus XP for completing challenges without using hints
- Levels increase with XP using an accelerating curve
- Repeated completion of the same challenge does not re-award XP

### Ranks

Six ranks based on XP thresholds AND worlds completed:
1. Repository Rookie (0 XP, 0 worlds)
2. Commit Apprentice (50 XP, 1 world)
3. Branch Guardian (150 XP, 2 worlds)
4. Merge Specialist (300 XP, 4 worlds)
5. Git Master (600 XP, 6 worlds)
6. Git Legend (1000 XP, 8 worlds)

### Abilities

Unlocked at rank levels:
- Commit Shield (rank 1) — protects against one failed challenge
- Recovery Crystal (rank 2) — restores health
- Branch Vision (rank 3) — reveals branch relationships
- Conflict Sense (rank 4) — conflict resolution hints
- Timekeeper (rank 5) — advanced time-reversal challenges

### Secret Missions

Four hidden missions with unique discovery conditions:
- Ghost Commit (reflog recovery) — discovered after world 2
- Silent Guardian (gitignore) — discovered after world 2
- Gate Crasher (rejected push) — discovered after world 5
- Clean Timeline (rebase) — discovered after world 7

## 3D Rendering

The 3D world uses React Three Fiber and Drei, built on Three.js:
- Procedural terrain with height-mapped geometry
- Low-poly castles representing each world
- Player character with customizable appearance
- Floating crystals, trees, portals, and environmental decorations
- Orbit camera controls

### Character Appearance

The character's 3D appearance is driven by the `CharacterAppearanceAdapter`:
- Primary/secondary/accent colors map to Three.js material colors
- Accessories (cape, helmet, wizard hat, dragon armor) add 3D geometry
- Material variants (standard, metallic, crystal, phoenix) change material properties
- `StartNgCharacterAppearanceAdapter` maps the player's start.ng character (`body`, colours, `hair`, `hat`, `accessory`) onto this model

## Adapter Pattern

Adapter interfaces isolate the start.ng platform integration (see `docs/START_NG_INTEGRATION.md`):

### AuthAdapter
- `getState()`, `getUser()`, `onChange()`, `signOut()`
- `MockAuthAdapter` — development-only mock
- `StartNgAuthAdapter` — real: asks start.ng's connect page who is playing (user, guest, or offline guest)

### ProgressAdapter
- `load(userId)`, `save(userId, progress)`, `clear(userId)`
- `LocalProgressAdapter` — localStorage-based persistence
- (no start.ng progress adapter: progress is saved in the browser by `LocalProgressAdapter`)

### CharacterAppearanceAdapter
- `getAppearance()`, `setAppearance()`, `onChange()`
- `LocalCharacterAppearanceAdapter` — development customization
- `StartNgCharacterAppearanceAdapter` — real: shows the start.ng character; the game cannot edit it

## State Management

Game state flows through a single `GameEngine` instance:
1. `GameContext` creates the engine and exposes it via React context
2. UI components call engine methods (processCommand, startChallenge, etc.)
3. Engine callbacks notify React of state changes
4. React re-renders affected components
5. Progress auto-saves to localStorage every 2 seconds when changed

## Testing

Tests use Vitest with happy-dom for browser environment simulation:
- `gitSimulator.test.ts` — 40+ tests covering all git commands, state transitions, merge conflicts, remote operations, destructive safeguards
- `gameEngine.test.ts` — tests for XP/rank progression, challenge completion, XP farming prevention, persistence, appearance sanitization, secret mission discovery
