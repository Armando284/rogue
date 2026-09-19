// RNG utility — deterministic mulberry32 PRNG plus daily seed helpers.
// ROGUE.EXE uses a daily seed so the dungeon is reproducible but changes daily,
// exactly like MAZE.EXE and INVADERS.EXE.

export function mulberry32(seed: number): () => number {
	let a = seed >>> 0

	return function rng(): number {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// Deterministic day-based seed: YYYYMMDD in local time.
export function dailySeed(date = new Date()): number {
	const y = date.getFullYear()
	// months are 0-indexed
	const m = date.getMonth() + 1
	const d = date.getDate()
	return y * 10000 + m * 100 + d
}

// 8-digit padded label for the seed (20260918 → "20260918").
export function seedLabel(seed: number): string {
	return seed.toString().padStart(8, '0')
}

// Deterministic source of randomness used throughout the game.
export type Rng = () => number
