export interface CharacterAppearance {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  accessory: CharacterAccessory;
  materialVariant: CharacterMaterial;
}

export type CharacterAccessory = 'none' | 'cape' | 'helmet' | 'wizard_hat' | 'dragon_armor';
export type CharacterMaterial = 'standard' | 'metallic' | 'crystal' | 'phoenix';

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  accentColor: '#fbbf24',
  accessory: 'none',
  materialVariant: 'standard',
};

export const ACCESSORY_OPTIONS: CharacterAccessory[] = ['none', 'cape', 'helmet', 'wizard_hat', 'dragon_armor'];
export const MATERIAL_OPTIONS: CharacterMaterial[] = ['standard', 'metallic', 'crystal', 'phoenix'];

const VALID_COLORS = /^#[0-9a-fA-F]{6}$/;

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value === 'string' && VALID_COLORS.test(value)) return value;
  return fallback;
}

function sanitizeEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function sanitizeAppearance(input: Partial<CharacterAppearance> | null | undefined): CharacterAppearance {
  return {
    primaryColor: sanitizeColor(input?.primaryColor, DEFAULT_APPEARANCE.primaryColor),
    secondaryColor: sanitizeColor(input?.secondaryColor, DEFAULT_APPEARANCE.secondaryColor),
    accentColor: sanitizeColor(input?.accentColor, DEFAULT_APPEARANCE.accentColor),
    accessory: sanitizeEnum(input?.accessory, ACCESSORY_OPTIONS, DEFAULT_APPEARANCE.accessory),
    materialVariant: sanitizeEnum(input?.materialVariant, MATERIAL_OPTIONS, DEFAULT_APPEARANCE.materialVariant),
  };
}

export interface CharacterAppearanceAdapter {
  getAppearance(): CharacterAppearance;
  setAppearance(partial: Partial<CharacterAppearance>): void;
  onChange(callback: (appearance: CharacterAppearance) => void): () => void;
}

export class LocalCharacterAppearanceAdapter implements CharacterAppearanceAdapter {
  private appearance: CharacterAppearance;
  private listeners: Set<(a: CharacterAppearance) => void> = new Set();

  // DEVELOPMENT-ONLY. Persists a local preview so it survives reloads. This is NOT
  // Start.ng's centralized styling and must not ship as the production source.
  private static STORAGE_KEY = 'gitquest:dev-appearance';

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
      // Storage unavailable: preview still works for this session.
    }
    this.listeners.forEach((cb) => cb(sanitized));
  }

  onChange(callback: (a: CharacterAppearance) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export class StartNgCharacterAppearanceAdapter implements CharacterAppearanceAdapter {
  private appearance: CharacterAppearance = DEFAULT_APPEARANCE;
  private listeners: Set<(a: CharacterAppearance) => void> = new Set();

  // TODO: START_NG_INTEGRATION — The actual platform styling contract is not yet verified.
  // This adapter must receive appearance data from Start.ng's centralized character styling
  // mechanism. The following are UNKNOWN and must be filled in from official documentation:
  // - UNVERIFIED: The source of centralized styling data (SDK, API, embedded config, postMessage, etc.)
  // - UNVERIFIED: The schema of the styling object Start.ng provides
  // - UNVERIFIED: Whether change notifications are push-based (events) or pull-based (polling)
  // - UNVERIFIED: Which properties map to color, accessory, and material in our model
  // - UNVERIFIED: Whether appearance is per-user or global
  // - UNVERIFIED: How to subscribe to styling change events from the platform

  getAppearance(): CharacterAppearance {
    // TODO: Replace with actual platform-provided appearance data.
    // Currently returns safe defaults.
    return { ...this.appearance };
  }

  setAppearance(_partial: Partial<CharacterAppearance>): void {
    // TODO: In production, appearance should NOT be settable from the game.
    // It should be driven by Start.ng's centralized styling. This method
    // may be removed or repurposed once the platform contract is verified.
    throw new Error(
      'StartNgCharacterAppearanceAdapter.setAppearance is not available until ' +
        'the Start.ng styling contract is verified. Use LocalCharacterAppearanceAdapter for development.'
    );
  }

  onChange(callback: (a: CharacterAppearance) => void): () => void {
    // TODO: Subscribe to the platform's styling change notification mechanism.
    // Currently a no-op since no platform event source exists.
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // TODO: Implement a method like `connectPlatformStyleSource()` once the
  // platform mechanism is known. It should:
  // 1. Fetch the current authenticated user's centralized styling
  // 2. Map platform properties to CharacterAppearance fields
  // 3. Subscribe to change events
  // 4. Validate all incoming values via sanitizeAppearance()
  // 5. Notify all registered listeners
}
