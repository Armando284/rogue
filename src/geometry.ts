// ROGUE.EXE — pure spatial helpers. No DOM, no canvas — unit-testable.

export interface Point2d {
	x: number
	y: number
}

export interface Rect2d {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Do two axis-aligned rectangles overlap when inflated by `margin` on
 * every side? Used by the room placer so corridors never glue rooms together.
 */
export function rectsOverlap(a: Rect2d, b: Rect2d, margin = 0): boolean {
	return !(
		a.x + a.w + margin <= b.x ||
		b.x + b.w + margin <= a.x ||
		a.y + a.h + margin <= b.y ||
		b.y + b.h + margin <= a.y
	)
}

/** Is point (x, y) inside rect r? */
export function rectContains(r: Rect2d, x: number, y: number): boolean {
	return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
}

/** Manhattan (city-block) distance between two points. */
export function manhattan(a: Point2d, b: Point2d): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/** Stable 1D key for a cell, e.g. "12,4". */
export function keyOf(x: number, y: number): string {
	return `${x},${y}`
}
