/** `#RRGGBB` blended toward white (`'light'`) or black (`'dark'`) by `amount` (0–1). */
export function mixColor(hex: string, toward: 'light' | 'dark', amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const target = toward === 'light' ? 255 : 0;
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (target - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
