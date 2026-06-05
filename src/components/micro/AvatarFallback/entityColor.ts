export type ColorEntityKind = "member" | "team" | "customer" | "organization";

type ColorFamily = {
  name: string;
  hue: number;
};

type ColorShade = {
  saturation: number;
  lightness: number;
};

export const ENTITY_COLOR_FAMILIES: ColorFamily[] = [
  { name: "navy", hue: 220 },
  { name: "blue", hue: 205 },
  { name: "teal", hue: 175 },
  { name: "green", hue: 145 },
  { name: "amber", hue: 40 },
  { name: "orange", hue: 22 },
  { name: "rose", hue: 345 },
  { name: "violet", hue: 265 },
];

export const ENTITY_COLOR_SHADES: ColorShade[] = [
  { saturation: 62, lightness: 34 },
  { saturation: 64, lightness: 42 },
  { saturation: 66, lightness: 50 },
  { saturation: 60, lightness: 58 },
];

export function buildEntityColorSeed(kind: ColorEntityKind, id: string): string {
  return `${kind}:${id}`;
}

export function stableHash(input: string): number {
  // FNV-1a 32-bit hash for consistent results across sessions and devices.
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert to an unsigned 32-bit integer.
  return hash >>> 0;
}

export function getDeterministicIndex(seed: string, range: number): number {
  if (range <= 0) {
    return 0;
  }

  return stableHash(seed) % range;
}

export function pickDeterministicValue<T>(seed: string, values: T[]): T | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values[getDeterministicIndex(seed, values.length)];
}

export function toHslColor(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function getDeterministicPaletteColor(seed: string): string {
  const family = pickDeterministicValue(seed, ENTITY_COLOR_FAMILIES);
  if (!family) {
    return "hsl(220 62% 42%)";
  }

  const shadeSeed = `${seed}:shade`;
  const shade = pickDeterministicValue(shadeSeed, ENTITY_COLOR_SHADES);
  if (!shade) {
    return toHslColor(family.hue, 62, 42);
  }

  return toHslColor(family.hue, shade.saturation, shade.lightness);
}

export function getEntityColor(kind: ColorEntityKind, id: string): string {
  const seed = buildEntityColorSeed(kind, id);
  return getDeterministicPaletteColor(seed);
}

export function getEntityColorWithFallback(
  kind: ColorEntityKind,
  id: string | null | undefined,
  fallbackSeed: string,
): string {
  const normalizedId = (id ?? "").trim();
  if (normalizedId.length > 0) {
    return getEntityColor(kind, normalizedId);
  }

  return getDeterministicPaletteColor(`${kind}:${fallbackSeed}`);
}

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(color: string): Rgb | null {
  const hex = color.trim().replace("#", "");

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  return null;
}

function parseRgbColor(color: string): Rgb | null {
  const match = color
    .trim()
    .match(/^rgba?\((\d{1,3})\s*[ ,]\s*(\d{1,3})\s*[ ,]\s*(\d{1,3})(?:\s*[,/]\s*[\d.]+)?\)$/i);

  if (!match) {
    return null;
  }

  return {
    r: clampByte(Number(match[1])),
    g: clampByte(Number(match[2])),
    b: clampByte(Number(match[3])),
  };
}

function hslToRgb(h: number, sPercent: number, lPercent: number): Rgb {
  const hNorm = ((h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, sPercent)) / 100;
  const l = Math.max(0, Math.min(100, lPercent)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hNorm < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hNorm < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hNorm < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hNorm < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hNorm < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: clampByte((rPrime + m) * 255),
    g: clampByte((gPrime + m) * 255),
    b: clampByte((bPrime + m) * 255),
  };
}

function parseHslColor(color: string): Rgb | null {
  const match = color
    .trim()
    .match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*[/,]\s*[\d.]+)?\s*\)$/i);

  if (!match) {
    return null;
  }

  return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

function parseColorToRgb(color: string): Rgb | null {
  if (color.startsWith("#")) {
    return parseHexColor(color);
  }

  if (/^rgba?\(/i.test(color)) {
    return parseRgbColor(color);
  }

  if (/^hsla?\(/i.test(color)) {
    return parseHslColor(color);
  }

  return null;
}

function getRelativeLuminance({ r, g, b }: Rgb): number {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    if (normalized <= 0.03928) {
      return normalized / 12.92;
    }
    return ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getReadableTextColor(
  backgroundColor: string,
  darkText: string = "#111827",
  lightText: string = "#ffffff",
): string {
  const rgb = parseColorToRgb(backgroundColor);
  if (!rgb) {
    return lightText;
  }

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.46 ? darkText : lightText;
}