// ROGUE.EXE — canvas bootstrap: Retina-aware sizing + dungeon palette.
// Warm amber CRTs as the base, each entity gets its own hue so the map reads
// at a glance: cyan stairs, green goblins, bone-white skeletons, gold & potions.

export interface Rgb {
	r: number
	g: number
	b: number
	a: number
}

// Background ink — near-black, slightly warm.
export const BG: Rgb = { r: 5, g: 3, b: 0, a: 255 }

// Terrain.
export const FLOOR: Rgb = { r: 189, g: 133, b: 62, a: 255 } // dim amber '.'
export const WALL: Rgb = { r: 108, g: 120, b: 104, a: 255 } // desaturated slate green '#'
export const STAIRS: Rgb = { r: 99, g: 201, b: 217, a: 255 } // cyan portal '>'

// Actors.
export const PLAYER: Rgb = { r: 255, g: 216, b: 146, a: 255 } // bright hero '@'
export const GOBLIN: Rgb = { r: 123, g: 201, b: 107, a: 255 } // goblin green 'g'
export const SKELETON: Rgb = { r: 230, g: 223, b: 200, a: 255 } // bone white 'K'

// Items.
export const GOLD: Rgb = { r: 255, g: 214, b: 96, a: 255 } // ' $'
export const POTION: Rgb = { r: 255, g: 122, b: 110, a: 255 } // hearthpotion red '!'

// Text.
export const TEXT: Rgb = { r: 255, g: 209, b: 117, a: 255 } // status/amber text
export const TEXT_DIM: Rgb = { r: 139, g: 96, b: 46, a: 255 } // log history

export class Canvas {
	readonly el: HTMLCanvasElement
	readonly width: number
	readonly height: number
	readonly ctx: CanvasRenderingContext2D
	private scale = 1

	constructor(el: HTMLCanvasElement, width: number, height: number) {
		this.el = el
		this.width = width
		this.height = height
		this.ctx = el.getContext('2d')!
		this.resize()
		window.addEventListener('resize', () => this.resize())
	}

	clear(): void {
		const ctx = this.ctx
		ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
		ctx.fillStyle = rgbToFill(BG)
		ctx.fillRect(0, 0, this.width, this.height)
	}

	private resize(): void {
		const dpr = window.devicePixelRatio || 1
		this.el.width = this.width * dpr
		this.el.height = this.height * dpr
		this.el.style.width = `${this.width}px`
		this.el.style.height = `${this.height}px`
		this.scale = dpr
	}
}

// Serialize an Rgb value to a fillStyle string for the 2D context.
export function rgbToFill(c: Rgb): string {
	return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`
}