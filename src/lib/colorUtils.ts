/**
 * Converts a hex color (#RRGGBB or #RGB) to an HSL triple string
 * suitable for CSS custom properties consumed via `hsl(var(--x))`.
 * Example: "#3b82f6" -> "217 91% 60%"
 */
export function hexToHslTriple(hex: string): string | null {
  if (!hex) return null;
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Returns a readable foreground (black or white) for a given HSL lightness triple.
 */
export function readableForegroundHsl(triple: string): string {
  const parts = triple.split(' ');
  const l = parseInt(parts[2] || '50', 10);
  return l > 60 ? '222 47% 11%' : '0 0% 100%';
}

/**
 * Builds inline CSS variables that theme a scoped section with brand colors.
 */
export function buildBrandCssVars(
  primary?: string | null,
  secondary?: string | null,
): React.CSSProperties {
  const vars: Record<string, string> = {};
  const primaryHsl = primary ? hexToHslTriple(primary) : null;
  const secondaryHsl = secondary ? hexToHslTriple(secondary) : null;

  if (primaryHsl) {
    vars['--primary'] = primaryHsl;
    vars['--primary-foreground'] = readableForegroundHsl(primaryHsl);
    vars['--ring'] = primaryHsl;
    vars['--brand-primary'] = primaryHsl;
  }
  if (secondaryHsl) {
    vars['--brand-secondary'] = secondaryHsl;
    // Keep shadcn's --secondary neutral to avoid breaking muted UI; expose custom token instead.
  }
  return vars as React.CSSProperties;
}
