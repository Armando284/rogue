// ROGUE.EXE — pixel-sprite renderer. Each sprite is pre-rendered to a small
// offscreen canvas (cached) and stamped with nearest-neighbor scaling plus the
// same shadow glow the old glyphs had, so the 80s vibe survives.

import type { Sprite } from './sprites.ts'

export interface SpriteDrawOpts {
	scale?: number
	frame?: number
	overrides?: Record<string, string>
	glow?: string
	blur?: number
}

const cache = new Map<string, HTMLCanvasElement>()

export function drawSprite(
	ctx: CanvasRenderingContext2D,
	sprite: Sprite,
	x: number,
	y: number,
	opts: SpriteDrawOpts = {},
): void {
	const scale = opts.scale ?? 3
	const index = opts.frame ?? 0
	const rows = sprite.frames[index] ?? sprite.frames[0] ?? []
	const w = rows[0]?.length ?? 0
	const h = rows.length

	const key = cacheKey(sprite.name, index, scale, opts.overrides ?? null)
	let img = cache.get(key)
	if (!img) {
		img = document.createElement('canvas')
		img.width = w * scale
		img.height = h * scale
		renderRows(img, sprite, rows, scale, opts.overrides)
		cache.set(key, img)
	}

	ctx.save()
	ctx.imageSmoothingEnabled = false
	if (opts.glow) {
		ctx.shadowColor = opts.glow
		ctx.shadowBlur = opts.blur ?? 8
	}
	ctx.drawImage(img, Math.round(x), Math.round(y))
	ctx.restore()
}

function renderRows(
	target: HTMLCanvasElement,
	sprite: Sprite,
	rows: string[],
	scale: number,
	overrides: Record<string, string> | undefined,
): void {
	const ictx = target.getContext('2d')
	if (!ictx) return
	for (let r = 0; r < rows.length; r++) {
		const row = rows[r] ?? ''
		for (let c = 0; c < row.length; c++) {
			const ch = row.charAt(c)
			if (ch === '.') continue
			const color = overrides?.[ch] ?? sprite.pal[ch]
			if (!color) continue
			ictx.fillStyle = color
			ictx.fillRect(c * scale, r * scale, scale, scale)
		}
	}
}

function cacheKey(
	name: string,
	index: number,
	scale: number,
	overrides: Record<string, string> | null,
): string {
	const ov = overrides
		? Object.keys(overrides)
				.sort()
				.map((k) => `${k}${overrides[k]}`)
				.join('')
		: ''
	return `${name}#${index}@${scale}${ov ? `|${ov}` : ''}`
}