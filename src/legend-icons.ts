// ROGUE.EXE — the footer legend shows the real pixel-art. Each sprite is
// stamped into an inline <svg> so the list matches what the canvas draws.

import type { Sprite } from './sprites.ts'
import {
	PLAYER, WALL_A, FLOOR_A, STAIRS_SPRITE, GOLD_SPRITE, FLASK, MERCHANT,
	GOBLIN, SKELETON, DRAGON,
} from './sprites.ts'

const CELL = 3

// A leather pouch so the "pack / choose / quaff" hint can be a picture too.
const POUCH: Sprite = {
	name: 'pouch',
	pal: { b: '#9b6b2c', d: '#4e3112' },
	frames: [
		[
			'........',
			'.bbbbbb.',
			'.bbbbbb.',
			'.bdbbdb.',
			'.bbbbbb.',
			'..bbbb..',
			'..bbbb..',
			'........',
		],
	],
}

function icon(s: Sprite): string {
	const rows = s.frames[0]
	const w = rows[0].length * CELL
	const h = rows.length * CELL
	let inner = ''
	for (let y = 0; y < rows.length; y++) {
		const row = rows[y]
		for (let x = 0; x < row.length; x++) {
			const c = row[x]
			if (c === '.') continue
			const fill = s.pal[c]
			if (!fill) continue
			inner += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${fill}"/>`
		}
	}
	return `<svg class="legend-icon" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${inner}</svg>`
}

const ICONS: Record<string, string> = {
	player: icon(PLAYER),
	wall: icon(WALL_A),
	floor: icon(FLOOR_A),
	stairs: icon(STAIRS_SPRITE),
	gold: icon(GOLD_SPRITE),
	potion: icon(FLASK),
	pack: icon(POUCH),
	merchant: icon(MERCHANT),
	goblin: icon(GOBLIN),
	skeleton: icon(SKELETON),
	boss: icon(DRAGON),
}

export function installLegendIcons(root?: HTMLElement | Document): void {
	const scope = root ?? document
	const spans = scope.querySelectorAll<HTMLElement>('[data-sprite]')
	for (const span of spans) {
		const id = span.dataset.sprite
		const svg = id ? ICONS[id] : ''
		if (svg) span.innerHTML = svg
	}
}