// ROGUE.EXE — procedural dungeon generation.
// Room-and-corridor generator with guaranteed connectivity.

import type { Rng } from './rng.ts'
import { rectsOverlap, keyOf, manhattan } from './geometry.ts'
import {
	CORRIDOR_T,
	DUNGEON_COLS,
	DUNGEON_ROWS,
	ROOM_MAX_H,
	ROOM_MAX_W,
	ROOM_MIN_H,
	ROOM_MIN_W,
	ROOM_SPACING,
	SHOP_FLOORS,
} from './constants.ts'

export type Terrain = 'wall' | 'floor' | 'stairs' | 'shop'

export interface Dungeon {
	width: number
	height: number
	terrain: Terrain[][]
	rooms: Room[]
	start: { x: number; y: number }
	stairs: { x: number; y: number }
	shop?: { x: number; y: number }
}

export interface Room {
	x: number
	y: number
	w: number
	h: number
}

const CHAR_TILE: Record<Terrain, string> = {
	wall: '#',
	floor: '.',
	stairs: '>',
	shop: 'M',
}

export function dungeonGlyphs(d: Dungeon): string[][] {
	return d.terrain.map((row) => row.map((t) => CHAR_TILE[t]))
}

export function isWalkable(d: Dungeon, x: number, y: number): boolean {
	if (x < 0 || y < 0 || x >= d.width || y >= d.height) return false
	const t = d.terrain[y]?.[x]
	return t === 'floor' || t === 'stairs'
}

export function randomFloor(rnd: Rng, d: Dungeon): { x: number; y: number } {
	for (let i = 0; i < 200; i++) {
		const x = 1 + Math.floor(rnd() * (d.width - 2))
		const y = 1 + Math.floor(rnd() * (d.height - 2))
		if (isWalkable(d, x, y) && d.terrain[y][x] !== 'stairs') return { x, y }
	}

	const room = d.rooms[Math.floor(rnd() * d.rooms.length)] ?? d.rooms[0]
	return { x: room.x + 1, y: room.y + 1 }
}

export function generateDungeon(rnd: Rng, depth = 1): Dungeon {
	const width = DUNGEON_COLS
	const height = DUNGEON_ROWS

	const terrain: Terrain[][] = Array.from({ length: height }, () =>
		Array.from({ length: width }, () => 'wall'),
	)

	const rooms: Room[] = []
	for (let i = 0; i < 260; i++) {
		const w = ROOM_MIN_W + Math.floor(rnd() * (ROOM_MAX_W - ROOM_MIN_W + 1))
		const h = ROOM_MIN_H + Math.floor(rnd() * (ROOM_MAX_H - ROOM_MIN_H + 1))
		const x = 1 + Math.floor(rnd() * (width - w - 2))
		const y = 1 + Math.floor(rnd() * (height - h - 2))
		const candidate = { x, y, w, h }

		const overlaps = rooms.some((r) =>
			rectsOverlap(candidate, r, ROOM_SPACING),
		)
		if (overlaps) continue

		rooms.push(candidate)
		for (let ry = y; ry < y + h; ry++) {
			for (let rx = x; rx < x + w; rx++) {
				terrain[ry][rx] = 'floor'
			}
		}
	}

	if (rooms.length === 0) {
		terrain[5][5] = 'floor'
		rooms.push({ x: 5, y: 5, w: 3, h: 3 })
	}

	const byX = [...rooms].sort((a, b) => a.x - b.x)
	const centers: { x: number; y: number }[] = byX.map((r) => ({
		x: r.x + Math.floor(r.w / 2),
		y: r.y + Math.floor(r.h / 2),
	}))

	for (let i = 1; i < centers.length; i++) {
		carveCorridor(terrain, centers[i - 1]!, centers[i]!)
	}

	const start = { x: centers[0]!.x, y: centers[0]!.y }
	const farthest = farthestRoom(terrain, start)
	terrain[farthest.y][farthest.x] = 'stairs'

	const stairs = { x: farthest.x, y: farthest.y }

	let shop: Dungeon['shop']
	if (SHOP_FLOORS.has(depth)) {
		const candidates = rooms.filter((r) => {
			const cx = r.x + Math.floor(r.w / 2)
			const cy = r.y + Math.floor(r.h / 2)
			return !(cx === start.x && cy === start.y) && !(cx === stairs.x && cy === stairs.y)
		})
		const room = candidates[Math.floor(rnd() * candidates.length)]
		if (room) {
			const cx = room.x + Math.floor(room.w / 2)
			const cy = room.y + Math.floor(room.h / 2)
			terrain[cy][cx] = 'shop'
			shop = { x: cx, y: cy }
		}
	}

	const rngTraffic = (CORRIDOR_T * depth) / 100
	void rngTraffic

	return { width, height, terrain, rooms, start, stairs, shop }
}

function carveCorridor(
	terrain: Terrain[][],
	a: { x: number; y: number },
	b: { x: number; y: number },
): void {
	let x = a.x
	let y = a.y
	const horizontalFirst = Math.abs(b.x - a.x) > Math.abs(b.y - a.y)

	if (horizontalFirst) {
		while (x !== b.x) {
			carve(terrain, x, y)
			x += x < b.x ? 1 : -1
		}
		while (y !== b.y) {
			carve(terrain, x, y)
			y += y < b.y ? 1 : -1
		}
	} else {
		while (y !== b.y) {
			carve(terrain, x, y)
			y += y < b.y ? 1 : -1
		}
		while (x !== b.x) {
			carve(terrain, x, y)
			x += x < b.x ? 1 : -1
		}
	}
	carve(terrain, x, y)
}

function carve(terrain: Terrain[][], x: number, y: number): void {
	if (y >= 0 && y < terrain.length && x >= 0 && x < (terrain[y]?.length ?? 0)) {
		terrain[y]![x] = 'floor'
	}
}

export function longestPath(
	d: Dungeon,
	from: { x: number; y: number },
): { x: number; y: number } {
	let best = from
	let bestDist = -1
	for (let y = 1; y < d.height - 1; y++) {
		for (let x = 1; x < d.width - 1; x++) {
			if (!isWalkable(d, x, y) || d.terrain[y][x] === 'stairs') continue
			const dist = manhattan(from, { x, y })
			if (dist > bestDist) {
				bestDist = dist
				best = { x, y }
			}
		}
	}
	return best
}

function farthestRoom(
	terrain: Terrain[][],
	from: { x: number; y: number },
): { x: number; y: number } {
	let best = from
	let bestDist = -1
	for (let y = 1; y < terrain.length - 1; y++) {
		for (let x = 1; x < (terrain[y]?.length ?? 0) - 1; x++) {
			if (terrain[y]![x] === 'wall') continue
			const dist = manhattan(from, { x, y })
			if (dist > bestDist) {
				bestDist = dist
				best = { x, y }
			}
		}
	}
	return best
}

export function countReachableFloors(
	d: Dungeon,
	from: { x: number; y: number },
): number {
	const seen = new Set<string>()
	const queue: { x: number; y: number }[] = [from]
	seen.add(keyOf(from.x, from.y))

	while (queue.length > 0) {
		const p = queue.shift()!
		for (const [dx, dy] of DIRS4) {
			const nx = p.x + dx
			const ny = p.y + dy
			if (!isWalkable(d, nx, ny)) continue
			const k = keyOf(nx, ny)
			if (seen.has(k)) continue
			seen.add(k)
			queue.push({ x: nx, y: ny })
		}
	}
	return seen.size
}

const DIRS4 = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
] as const

export function enemyCountForDepth(depth: number): number {
	return Math.min(3 + depth * 2, 18)
}

export function enemySpawns(
	rnd: Rng,
	d: Dungeon,
	player: { x: number; y: number },
	depth: number,
): { x: number; y: number; kind: 'goblin' | 'skeleton' }[] {
	const count = enemyCountForDepth(depth)
	const out: { x: number; y: number; kind: 'goblin' | 'skeleton' }[] = []
	const used = new Set<string>([keyOf(player.x, player.y), keyOf(d.stairs.x, d.stairs.y)])

	for (let i = 0; i < count; i++) {
		used.add(keyOf(player.x, player.y))
		const attempts = 60
		let placed = false
		for (let a = 0; a < attempts; a++) {
			const x = 1 + Math.floor(rnd() * (d.width - 2))
			const y = 1 + Math.floor(rnd() * (d.height - 2))
			if (!isWalkable(d, x, y)) continue
			if (manhattan({ x, y }, player) < 6) continue
			const k = keyOf(x, y)
			if (used.has(k)) continue
			used.add(k)
			const kind = rnd() < 0.55 ? 'goblin' : 'skeleton'
			out.push({ x, y, kind })
			placed = true
			break
		}
		void placed
	}
	return out
}
