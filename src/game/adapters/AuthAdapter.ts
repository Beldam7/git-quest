import { cleanSessionFromAddress, startNg } from '../platform/startng';
import type { StartNgStyle } from '../platform/startng';

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  /** "@name" of the player's start.ng account. */
  account?: string;
  /** PNG data URL of the character's face. */
  face?: string;
  /** Playing as start.ng's guest: can play, but scores are not saved to the leaderboard. */
  isGuest?: boolean;
  /** Not connected to start.ng (for example running locally): playable, but there is no player. */
  offline?: boolean;
}

export interface AuthAdapter {
  getState(): AuthState;
  getUser(): AuthUser | null;
  getError(): string | null;
  onChange(callback: (state: AuthState, user: AuthUser | null) => void): () => void;
  signOut(): Promise<void>;
  /** Send the player to sign in (start.ng). Not available on the development mock. */
  signIn?(): void;
}

export class MockAuthAdapter implements AuthAdapter {
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private error: string | null = null;
  private listeners: Set<(s: AuthState, u: AuthUser | null) => void> = new Set();

  // DEVELOPMENT-ONLY mock. It does NOT represent a real start.ng sign-in; production uses StartNgAuthAdapter.

  constructor() {
    // Simulate async loading then settle as unauthenticated
    setTimeout(() => {
      // Only settle if nothing (e.g. devSignIn) changed the state in the meantime.
      if (this.state === 'loading') {
        this.state = 'unauthenticated';
        this.notify();
      }
    }, 100);
  }

  getState(): AuthState {
    return this.state;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getError(): string | null {
    return this.error;
  }

  onChange(callback: (s: AuthState, u: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signOut(): Promise<void> {
    this.state = 'unauthenticated';
    this.user = null;
    this.notify();
  }

  // Development helper — simulates a login for testing. NOT real authentication.
  devSignIn(id: string, displayName: string): void {
    this.state = 'authenticated';
    this.user = { id, displayName };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.state, this.user));
  }
}

/**
 * Production authentication through start.ng's connect page (VERIFIED against the platform docs).
 *
 * - Signed in on start.ng: the player's id, character name, account and face come straight from the platform.
 * - Not signed in: start.ng's own guest ("Guest" and the guest look). Guests can play; they cannot save scores.
 * - Not on start.ng (local file, localhost): no answer, so the game plays as an offline guest.
 * - The player may sign in or out on start.ng in another tab, so we ask again when they return to this tab.
 * The game never sees passwords, emails or a real sign-in.
 */
export class StartNgAuthAdapter implements AuthAdapter {
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private listeners: Set<(s: AuthState, u: AuthUser | null) => void> = new Set();
  private lastAsk = 0;

  /** `onStyle` receives the character style every time start.ng reports it. */
  constructor(private onStyle: (style: StartNgStyle | null) => void) {
    cleanSessionFromAddress();
    void this.refresh();
    if (typeof document !== 'undefined') {
      const again = () => {
        if (!document.hidden) void this.refresh();
      };
      document.addEventListener('visibilitychange', again);
      window.addEventListener('focus', again);
    }
  }

  async refresh(): Promise<void> {
    const now = Date.now();
    if (now - this.lastAsk < 1500 && this.state !== 'loading') return;
    this.lastAsk = now;
    const who = await startNg.whoami();
    let next: AuthUser;
    let style: StartNgStyle | null;
    if (who?.user) {
      next = { id: String(who.user.id), displayName: who.user.name || 'Player', account: who.user.account, face: who.user.face, isGuest: false };
      style = who.user.style;
    } else {
      next = { id: 'guest', displayName: who?.guest?.name ?? 'Guest', face: who?.guest?.face, isGuest: true, offline: !who };
      style = who?.guest?.style ?? null;
    }
    this.onStyle(style);
    const changed = JSON.stringify(next) !== JSON.stringify(this.user) || this.state !== 'authenticated';
    this.user = next;
    this.state = 'authenticated';
    if (changed) this.notify();
  }

  getState(): AuthState {
    return this.state;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getError(): string | null {
    return null;
  }

  onChange(callback: (s: AuthState, u: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  signIn(): void {
    startNg.signIn();
  }

  async signOut(): Promise<void> {
    // Signing out happens on start.ng itself; the game just notices on the next check.
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.state, this.user));
  }
}
