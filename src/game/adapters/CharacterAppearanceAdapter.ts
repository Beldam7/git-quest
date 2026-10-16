import type { StartNgStyle } from '../platform/startng';

/**
 * The player's character, in start.ng's own schema (VERIFIED against the platform docs, "Character style fields").
 * start.ng may add more options later, so every unknown or missing value falls back to something sensible.
 *
 * How the hero uses it (see hero/HeroModel.tsx): primaryColor = tunic/top and cloak, secondaryColor = trousers,
 * skinColor, hairColor, hair style, hat, accessory and body shape are all drawn on the 3D character.
 */
export type Body = 'female' | 'male';
export type Hair = 'short' | 'afro' | 'braids' | 'bun' | 'ponytail' | 'dreads' | 'bald';
export type Hat = 'none' | 'cap' | 'beanie' | 'tophat' | 'crown';
export type Accessory = 'none' | 'glasses' | 'earrings' | 'beard' | 'scarf' | 'backpack';

export interface CharacterAppearance {
  body: Body;
  primaryColor: string;
  secondaryColor: string;
  skinColor: string;
  hairColor: string;
  hair: Hair;
  hat: Hat;
  accessory: Accessory;
}

export const BODY_OPTIONS: readonly Body[] = ['female', 'male'];
export const HAIR_OPTIONS: readonly Hair[] = ['short', 'afro', 'braids', 'bun', 'ponytail', 'dreads', 'bald'];
export const HAT_OPTIONS: readonly Hat[] = ['none', 'cap', 'beanie', 'tophat', 'crown'];
export const ACCESSORY_OPTIONS: readonly Accessory[] = ['none', 'glasses', 'earrings', 'beard', 'scarf', 'backpack'];

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  body: 'male',
  primaryColor: '#3b82f6',
  secondaryColor: '#4b3a2c',
  skinColor: '#b97a56',
  hairColor: '#24160e',
  hair: 'short',
  hat: 'none',
  accessory: 'none',
};

const VALID_COLORS = /^#[0-9a-fA-F]{6}$/;

function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && VALID_COLORS.test(value) ? value : fallback;
}

function sanitizeEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Accepts anything (including a raw start.ng style object) and always returns a complete, valid appearance. */
export function sanitizeAppearance(input: Partial<Record<keyof CharacterAppearance, unknown>> | StartNgStyle | null | undefined): CharacterAppearance {
  const i = (input ?? {}) as Partial<Record<keyof CharacterAppearance, unknown>>;
  return {
    body: sanitizeEnum(i.body, BODY_OPTIONS, DEFAULT_APPEARANCE.body),
    primaryColor: sanitizeColor(i.primaryColor, DEFAULT_APPEARANCE.primaryColor),
    secondaryColor: sanitizeColor(i.secondaryColor, DEFAULT_APPEARANCE.secondaryColor),
    skinColor: sanitizeColor(i.skinColor, DEFAULT_APPEARANCE.skinColor),
    hairColor: sanitizeColor(i.hairColor, DEFAULT_APPEARANCE.hairColor),
    hair: sanitizeEnum(i.hair, HAIR_OPTIONS, DEFAULT_APPEARANCE.hair),
    hat: sanitizeEnum(i.hat, HAT_OPTIONS, DEFAULT_APPEARANCE.hat),
    accessory: sanitizeEnum(i.accessory, ACCESSORY_OPTIONS, DEFAULT_APPEARANCE.accessory),
  };
}

export interface CharacterAppearanceAdapter {
  getAppearance(): CharacterAppearance;
  setAppearance(partial: Partial<CharacterAppearance>): void;
  onChange(callback: (appearance: CharacterAppearance) => void): () => void;
}

/** DEVELOPMENT-ONLY editor: lets you design a character locally. In production start.ng owns the character. */
export class LocalCharacterAppearanceAdapter implements CharacterAppearanceAdapter {
  private appearance: CharacterAppearance;
  private listeners: Set<(a: CharacterAppearance) => void> = new Set();
  private static STORAGE_KEY = 'gitquest:dev-appearance-v2';

  constructor(initial?: Partial<CharacterAppearance>) {
    let stored: Partial<CharacterAppearance> | undefined;
    try {
      const raw = localStorage.getItem(LocalCharacterAppearanceAdapter.STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as Partial<CharacterAppearance>;
    } catch {
      stored = undefined;
    }
    this.appearance = sanitizeAppearance({ ...stored, ...initial });
  }

  getAppearance(): CharacterAppearance {
    return { ...this.appearance };
  }

  setAppearance(partial: Partial<CharacterAppearance>): void {
    const sanitized = sanitizeAppearance({ ...this.appearance, ...partial });
    this.appearance = sanitized;
    try {
      localStorage.setItem(LocalCharacterAppearanceAdapter.STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      /* storage unavailable: the preview still works for this session */
    }
    this.listeners.forEach((cb) => cb(sanitized));
  }

  onChange(callback: (a: CharacterAppearance) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

/**
 * Production: the player's character comes from start.ng (`user.style`, or the platform's guest look).
 * The game never edits it. Re-read when the player returns to the tab (they may have changed it on start.ng).
 * Pushed in by StartNgAuthAdapter, which already asks `startng:whoami`.
 */
export class StartNgCharacterAppearanceAdapter implements CharacterAppearanceAdapter {
  private appearance: CharacterAppearance = DEFAULT_APPEARANCE;
  private listeners: Set<(a: CharacterAppearance) => void> = new Set();

  getAppearance(): CharacterAppearance {
    return { ...this.appearance };
  }

  /** Called by the platform layer whenever start.ng reports the player's style. */
  applyStyle(style: StartNgStyle | null | undefined): void {
    const next = sanitizeAppearance(style);
    if (JSON.stringify(next) === JSON.stringify(this.appearance)) return;
    this.appearance = next;
    this.listeners.forEach((cb) => cb({ ...next }));
  }

  setAppearance(): void {
    // The character is owned by start.ng; the game cannot change it.
  }

  onChange(callback: (a: CharacterAppearance) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

