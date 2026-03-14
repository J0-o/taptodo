// Reads the current theme's list color ramps from CSS custom properties.
function getThemeListColors() {
  const styles = getComputedStyle(document.documentElement);
  const startRaw = styles.getPropertyValue('--list-ramp-start').trim();
  const endRaw = styles.getPropertyValue('--list-ramp-end').trim();
  const start = startRaw.split(',').map((v) => v.trim()).filter(Boolean);
  const end = endRaw.split(',').map((v) => v.trim()).filter(Boolean);
  return { start, end };
}

// Returns a fallback theme color for runtime color calculations.
function getThemeFallbackHex() {
  const styles = getComputedStyle(document.documentElement);
  return (
    styles.getPropertyValue('--list-accent').trim() ||
    styles.getPropertyValue('--accent').trim() ||
    styles.getPropertyValue('--button-grad-start').trim()
  );
}

// Converts a hex color into an RGB triplet string.
function hexToRgbTriplet(hexColor) {
  const source = String(hexColor || '').trim() || getThemeFallbackHex();
  const hex = source.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const int = Number.parseInt(normalized, 16);
  if (!Number.isFinite(int)) return '0, 0, 0';
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `${r}, ${g}, ${b}`;
}

// Converts a hex color into an RGB object.
function hexToRgb(hexColor) {
  const source = String(hexColor || '').trim() || getThemeFallbackHex();
  const hex = source.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const int = Number.parseInt(normalized, 16);
  if (!Number.isFinite(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

// Linearly interpolates between two numeric values.
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Builds RGB endpoints for a list-entry gradient pair.
function getEntryGradientPair(startHex, endHex) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return { start, end };
}
