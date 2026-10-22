import type { HomeLayoutItem } from './home-layout';

/**
 * Home's widget matrix: each widget sits at a cell (`x`, `y`) and spans `w`
 * columns × `h` rows. Desktop and phone keep separate layouts (4 and 2
 * columns). Like a phone's home screen, widgets float up: nothing leaves an
 * empty row above it, though a widget can sit beside a shorter one with a
 * gap under that one. A widget dropped or grown onto others pushes them
 * down — except dragging one DOWN onto another, which moves that other one
 * up into the space it left (a swap), the usual way to reorder widgets.
 *
 * Pure functions only (no imports at runtime), so the layout rules can be
 * exercised on their own.
 */

export type GridDevice = 'desktop' | 'mobile';

export type GridItem = { id: HomeLayoutItem; x: number; y: number; w: number; h: number };

/** What's stored in `profiles.home_grid` — one layout per device, either may be missing. */
export type HomeGrid = Partial<Record<GridDevice, GridItem[]>>;

export const GRID_COLUMNS: Record<GridDevice, number> = { desktop: 4, mobile: 2 };

/** Tallest a widget can be, in rows. */
export const GRID_MAX_ROWS = 10;

type Size = { w: number; h: number };
type SizeSpec = { default: Size; min: Size };

/**
 * Default and minimum size of each widget, per device. The minimum keeps a
 * widget's content readable; beyond it any size goes (up to the full width
 * and `GRID_MAX_ROWS`).
 */
export const WIDGET_SIZES: Record<HomeLayoutItem, Record<GridDevice, SizeSpec>> = {
  pending: {
    desktop: { default: { w: 4, h: 1 }, min: { w: 2, h: 1 } },
    mobile: { default: { w: 2, h: 1 }, min: { w: 2, h: 1 } },
  },
  upcoming: {
    desktop: { default: { w: 4, h: 1 }, min: { w: 2, h: 1 } },
    mobile: { default: { w: 2, h: 1 }, min: { w: 2, h: 1 } },
  },
  budgets: {
    desktop: { default: { w: 2, h: 3 }, min: { w: 1, h: 2 } },
    mobile: { default: { w: 2, h: 3 }, min: { w: 2, h: 2 } },
  },
  categorySpend: {
    desktop: { default: { w: 2, h: 4 }, min: { w: 2, h: 3 } },
    mobile: { default: { w: 2, h: 5 }, min: { w: 2, h: 4 } },
  },
  weeklySpend: {
    desktop: { default: { w: 2, h: 3 }, min: { w: 1, h: 2 } },
    mobile: { default: { w: 2, h: 3 }, min: { w: 1, h: 2 } },
  },
  monthlyTrend: {
    desktop: { default: { w: 2, h: 4 }, min: { w: 2, h: 3 } },
    mobile: { default: { w: 2, h: 4 }, min: { w: 2, h: 3 } },
  },
  accounts: {
    desktop: { default: { w: 2, h: 3 }, min: { w: 1, h: 2 } },
    mobile: { default: { w: 2, h: 3 }, min: { w: 1, h: 2 } },
  },
};

export function collides(a: GridItem, b: GridItem): boolean {
  return a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Rows the layout takes up. */
export function gridRows(items: GridItem[]): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

/** Clamps a size to the widget's minimum, the column count and `GRID_MAX_ROWS`. */
export function clampSize(id: HomeLayoutItem, device: GridDevice, w: number, h: number): Size {
  const { min } = WIDGET_SIZES[id][device];
  const cols = GRID_COLUMNS[device];
  return {
    w: Math.max(Math.min(min.w, cols), Math.min(cols, Math.round(w))),
    h: Math.max(min.h, Math.min(GRID_MAX_ROWS, Math.round(h))),
  };
}

/**
 * Settles `items` so nothing overlaps: `anchor` (the one being moved or
 * resized) stays exactly where it is, and anything it overlaps is pushed
 * down just below it — which can push others in turn. Items are processed
 * top to bottom, so a pushed item never jumps over one that was above it.
 */
export function resolveCollisions(items: GridItem[], anchorId?: HomeLayoutItem): GridItem[] {
  const anchor = items.find((it) => it.id === anchorId);
  const placed: GridItem[] = anchor ? [{ ...anchor }] : [];
  const rest = items
    .filter((it) => it.id !== anchorId)
    .map((it) => ({ ...it }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of rest) {
    let hit = placed.find((p) => collides(p, it));
    while (hit) {
      it.y = hit.y + hit.h;
      hit = placed.find((p) => collides(p, it));
    }
    placed.push(it);
  }
  // Keep the caller's order (it's the render order, so widgets don't remount).
  const byId = new Map(placed.map((p) => [p.id, p]));
  return items.map((it) => byId.get(it.id)!);
}

/**
 * Floats every widget up as far as it goes without overlapping the ones
 * above it (top to bottom, left to right) — no empty rows over anything.
 */
export function compactUp(items: GridItem[]): GridItem[] {
  const placed: GridItem[] = [];
  const order = items.map((it) => ({ ...it })).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of order) {
    while (it.y > 0 && !placed.some((p) => collides(p, { ...it, y: it.y - 1 }))) it.y--;
    placed.push(it);
  }
  const byId = new Map(placed.map((p) => [p.id, p]));
  return items.map((it) => byId.get(it.id)!);
}

/**
 * Puts `id` at (`x`, `y`) — clamped inside the columns — then settles the
 * rest and floats everything up. Moving it down onto another widget moves
 * that one up into the space above it when it fits there (a swap);
 * anything else it lands on is pushed down.
 */
export function moveItem(
  items: GridItem[],
  id: HomeLayoutItem,
  x: number,
  y: number,
  device: GridDevice,
): GridItem[] {
  const cols = GRID_COLUMNS[device];
  const old = items.find((it) => it.id === id);
  if (!old) return items;
  const moved = { ...old, x: Math.max(0, Math.min(cols - old.w, x)), y: Math.max(0, y) };
  let next = items.map((it) => (it.id === id ? moved : it));
  if (moved.y > old.y) {
    // Going down: whatever it now covers tries to move up, to just above it.
    for (const other of next.filter((it) => collides(it, moved))) {
      const up = { ...other, y: Math.max(0, moved.y - other.h) };
      const free = !next.some((it) => it.id !== other.id && collides(it, up));
      if (free) next = next.map((it) => (it.id === other.id ? up : it));
    }
  }
  return compactUp(resolveCollisions(next, id));
}

/** Resizes `id` (clamped to its limits and the right edge), pushing whatever it now covers down. */
export function resizeItem(
  items: GridItem[],
  id: HomeLayoutItem,
  w: number,
  h: number,
  device: GridDevice,
): GridItem[] {
  const cols = GRID_COLUMNS[device];
  const next = items.map((it) => {
    if (it.id !== id) return it;
    const size = clampSize(id, device, Math.min(w, cols - it.x), h);
    return { ...it, ...size };
  });
  // Shrinking leaves room: what's below floats up into it.
  return compactUp(resolveCollisions(next, id));
}

/** The first spot, scanning rows top to bottom and left to right, where a `w`×`h` widget fits without overlapping. */
export function firstFit(items: GridItem[], w: number, h: number, device: GridDevice) {
  const cols = GRID_COLUMNS[device];
  for (let y = 0; ; y++) {
    for (let x = 0; x + w <= cols; x++) {
      const probe = { id: '__probe__' as HomeLayoutItem, x, y, w, h };
      if (!items.some((it) => collides(it, probe))) return { x, y };
    }
  }
}

/** Adds `id` at its default size in the first spot it fits. */
export function addItem(items: GridItem[], id: HomeLayoutItem, device: GridDevice): GridItem[] {
  if (items.some((it) => it.id === id)) return items;
  const size = WIDGET_SIZES[id][device].default;
  const w = Math.min(size.w, GRID_COLUMNS[device]);
  return [...items, { id, ...firstFit(items, w, size.h, device), w, h: size.h }];
}

/**
 * The layout to show for `device`: the stored one, cleaned up (unknown or
 * hidden widgets dropped, sizes clamped, overlaps resolved), plus any
 * visible widget it's missing — placed at its default size in the first
 * spot it fits, following `order` (the older `home_layout` order). With
 * nothing stored, that builds the default layout from `order` alone.
 */
export function normalizeGrid(
  stored: unknown,
  device: GridDevice,
  order: readonly HomeLayoutItem[],
  hidden: readonly string[],
): GridItem[] {
  const known = new Set<string>(order);
  const hiddenSet = new Set(hidden);
  const raw = Array.isArray(stored) ? stored : [];
  const seen = new Set<string>();
  let items: GridItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const { id, x, y, w, h } = r as Record<string, unknown>;
    if (typeof id !== 'string' || !known.has(id) || hiddenSet.has(id) || seen.has(id)) continue;
    if (![x, y, w, h].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    seen.add(id);
    const key = id as HomeLayoutItem;
    const size = clampSize(key, device, w as number, h as number);
    const cols = GRID_COLUMNS[device];
    items.push({
      id: key,
      x: Math.max(0, Math.min(cols - size.w, Math.round(x as number))),
      y: Math.max(0, Math.round(y as number)),
      ...size,
    });
  }
  items = compactUp(resolveCollisions(items));
  for (const id of order) {
    if (!hiddenSet.has(id) && !seen.has(id)) items = addItem(items, id, device);
  }
  return items;
}

/**
 * For showing (not editing) the layout: drops rows nothing occupies — e.g.
 * the ones a reminder card leaves when it has nothing to remind about and
 * renders nothing (`present` says which widgets are actually showing).
 */
export function collapseEmptyRows(items: GridItem[], present: (id: HomeLayoutItem) => boolean) {
  const shown = items.filter((it) => present(it.id));
  const rows = gridRows(shown);
  const used = new Array<boolean>(rows).fill(false);
  for (const it of shown) for (let r = it.y; r < it.y + it.h; r++) used[r] = true;
  // How many empty rows sit above each row.
  const shift: number[] = [];
  let empty = 0;
  for (let r = 0; r < rows; r++) {
    shift.push(empty);
    if (!used[r]) empty++;
  }
  return shown.map((it) => ({ ...it, y: it.y - (shift[it.y] ?? 0) }));
}
