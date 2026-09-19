// ROGUE.EXE — canvas bootstrap: Retina-aware sizing + phosphor-amber palette.


export interface Rgb {
	r: number
	g: number
	b: number
	a: number
}

// Amber CRT phosphor — the ROGUE identity (MAZE=green, INVADERS=green, ROGUE=amber).
export const AMBER: Rgb = { r: 255, g: 176, b: 46, a: 42 }
export const AMBER_DIM: Rgb = { r: 255, g: 176, b: 46, a: 18 }
export const AMBER_PURE: Rgb = { r: 255, g: 176, b: 45, a: 255 }

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
		ctx.fillStyle = '#140c02'
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
