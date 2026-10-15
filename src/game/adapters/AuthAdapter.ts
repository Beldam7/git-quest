export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface AuthAdapter {
  getState(): AuthState;
  getUser(): AuthUser | null;
  getError(): string | null;
  onChange(callback: (state: AuthState, user: AuthUser | null) => void): () => void;
  signOut(): Promise<void>;
}

export class MockAuthAdapter implements AuthAdapter {
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private error: string | null = null;
  private listeners: Set<(s: AuthState, u: AuthUser | null) => void> = new Set();

  // This is a DEVELOPMENT-ONLY mock adapter.
  // It does NOT represent successful Start.ng authentication.
  // It must be replaced by StartNgAuthAdapter once the platform contract is verified.

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

export class StartNgAuthAdapter implements AuthAdapter {
  private state: AuthState = 'loading';
  private user: AuthUser | null = null;
  private error: string | null = null;
  private listeners: Set<(s: AuthState, u: AuthUser | null) => void> = new Set();

  // TODO: START_NG_INTEGRATION — The actual Start.ng authentication contract is not yet verified.
  // The following are UNKNOWN and must be determined from official Start.ng documentation:
  // - UNVERIFIED: How to obtain the current logged-in user (SDK method, API endpoint, cookie, postMessage, etc.)
  // - UNVERIFIED: The user object schema (what fields are available beyond an ID?)
  // - UNVERIFIED: The stable user identifier format
  // - UNVERIFIED: Session expiration detection and behavior
  // - UNVERIFIED: Sign-out mechanism (if any from the game's perspective)
  // - UNVERIFIED: Whether tokens/cookies are httpOnly or accessible to JS
  // - UNVERIFIED: How the game is embedded in Start.ng (iframe, same-origin, subdomain?)
  // - UNVERIFIED: Whether there is a JavaScript SDK or browser API to call

  constructor() {
    // Fail closed: until the Start.ng contract is implemented, nobody is authenticated
    // and the game surfaces a clear "not configured" state instead of loading forever.
    this.state = 'error';
    this.error =
      'Start.ng authentication is not configured. The platform contract is unverified; ' +
      'see docs/START_NG_INTEGRATION.md.';
  }

  getState(): AuthState {
    return this.state;
  }

  getUser(): AuthUser | null {
    // TODO: Return the real Start.ng user object once the contract is verified.
    return this.user;
  }

  getError(): string | null {
    return this.error;
  }

  onChange(callback: (s: AuthState, u: AuthUser | null) => void): () => void {
    // TODO: Subscribe to the platform's session/auth state change events.
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signOut(): Promise<void> {
    // TODO: Implement sign-out using the verified Start.ng mechanism.
    // The game may not own sign-out — it might be handled by the platform shell.
    throw new Error(
      'StartNgAuthAdapter.signOut is not available until the Start.ng auth contract is verified. ' +
        'Sign-out may be handled by the Start.ng platform itself.'
    );
  }

  // TODO: Implement a method like `init()` or `connect()` that:
  // 1. Detects the Start.ng platform context
  // 2. Requests the current authenticated user
  // 3. Sets state to 'authenticated' or 'unauthenticated'
  // 4. Subscribes to session change events
  // 5. Handles session expiration gracefully
  // DO NOT store tokens in localStorage. DO NOT expose secrets to the browser.
}
