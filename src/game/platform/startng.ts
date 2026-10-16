/**
 * Start.ng platform client. VERIFIED against the official docs (docs.md "Talk to start.ng").
 *
 * The game talks to start.ng through a hidden page, https://start.ng/connect, using postMessage. That page
 * only answers games served from a *.start.ng address; anywhere else (localhost, a local file) there is no
 * reply, and the client resolves to `null` so the game still plays, as a guest, without a player.
 *
 * Replies are only trusted when both the origin is https://start.ng AND the sender is our connect frame.
 */

export const START_NG = 'https://start.ng';

/** The player's start.ng character, exactly as the platform documents it. Any field may be missing or unknown. */
export interface StartNgStyle {
  body?: string;
  primaryColor?: string;
  secondaryColor?: string;
  skinColor?: string;
  hairColor?: string;
  hair?: string;
  hat?: string;
  accessory?: string;
}

export interface StartNgUser {
  id: number;
  /** The character's name: show this in the game. */
  name: string;
  /** The account name, for a small "@name". */
  account?: string;
  style: StartNgStyle | null;
  /** PNG data URL of the character's face. */
  face?: string;
}

export interface StartNgGuest {
  name: string;
  style: StartNgStyle | null;
  face?: string;
}

export interface WhoAmI {
  user: StartNgUser | null;
  guest: StartNgGuest | null;
}

export interface ScoreResult {
  best: number;
  improved: boolean;
  rank: number;
  stats?: Record<string, number>;
}

export interface BoardEntry {
  rank: number;
  player_id: number;
  name: string;
  color?: string;
  score: number;
  stats?: Record<string, number>;
}

/** True when the game is served from <name>.start.ng, the only place the connect page answers. */
export function isOnStartNg(): boolean {
  return typeof location !== 'undefined' && /(^|\.)start\.ng$/.test(location.hostname);
}

/** After sign-in start.ng returns with `#startng_session=...`. We use the connect page, so just clean the address. */
export function cleanSessionFromAddress(): void {
  if (typeof location === 'undefined' || !location.hash.includes('startng_session')) return;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    /* ignore */
  }
}

class StartNgClient {
  private frame: Promise<HTMLIFrameElement> | null = null;

  private connectFrame(): Promise<HTMLIFrameElement> {
    this.frame ??= new Promise<HTMLIFrameElement>((resolve, reject) => {
      const el = document.createElement('iframe');
      el.src = `${START_NG}/connect`;
      el.hidden = true;
      el.title = 'start.ng connection';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('start.ng connect page failed to load'));
      document.body.append(el);
    });
    return this.frame;
  }

  /** Sends a message and resolves to start.ng's reply, or null if it did not answer in time. */
  async ask<T extends { type: string }>(message: Record<string, unknown>, replyType: string, timeoutMs = 5000): Promise<T | null> {
    if (!isOnStartNg() || typeof document === 'undefined') return null;
    let el: HTMLIFrameElement;
    try {
      el = await this.connectFrame();
    } catch {
      this.frame = null;
      return null;
    }
    return new Promise<T | null>((resolve) => {
      const requestId = Math.random().toString(36).slice(2);
      const done = (reply: T | null) => {
        clearTimeout(timer);
        removeEventListener('message', onMessage);
        resolve(reply);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      function onMessage(e: MessageEvent) {
        // Always check the origin AND the sender: this is what makes the reply trustworthy.
        if (e.origin !== START_NG || e.source !== el.contentWindow) return;
        const data = e.data as { type?: string; requestId?: string } | null;
        if (data?.type === replyType && data.requestId === requestId) done(e.data as T);
      }
      addEventListener('message', onMessage);
      el.contentWindow?.postMessage({ ...message, requestId }, START_NG);
    });
  }

  /** Who is playing? `null` when there is no answer (not on start.ng, or it timed out). */
  async whoami(): Promise<WhoAmI | null> {
    const reply = await this.ask<{ type: string; user?: StartNgUser | null; guest?: StartNgGuest | null }>({ type: 'startng:whoami' }, 'startng:user');
    if (!reply) return null;
    return { user: reply.user ?? null, guest: reply.guest ?? null };
  }

  /** Save a run (signed-in players only). Send exactly the stats declared in startng.json. */
  async saveScore(stats: Record<string, number>): Promise<{ ok: boolean; result?: ScoreResult; error?: string } | null> {
    return this.ask<{ type: string; ok: boolean; result?: ScoreResult; error?: string }>({ type: 'startng:score', stats }, 'startng:scoreSaved');
  }

  /** The top players. Works for everyone, guests included. */
  async leaderboard(limit = 20): Promise<{ ok: boolean; entries?: BoardEntry[] } | null> {
    return this.ask<{ type: string; ok: boolean; entries?: BoardEntry[] }>({ type: 'startng:leaderboard', limit: Math.max(1, Math.min(50, limit)) }, 'startng:leaderboardData');
  }

  /** Send the player to start.ng to sign in; they come straight back to the game. */
  signIn(): void {
    location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
  }
}

export const startNg = new StartNgClient();
