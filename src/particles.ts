// ROGUE.EXE — juice: time-based particle effects layered over the tile grid.
// All coordinates are in canvas pixels. The Game class spawns these on
// gameplay events; the animation loop advances and draws them each frame.

export const MAX_SPARKS = 600
export const MAX_LABELS = 48
export const MAX_RINGS = 24

interface Spark {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	max: number
	size: number
	color: string
	grav: number
	drag: number
}

interface Label {
	x: number
	y: number
	life: number
	max: number
	text: string
	color: string
	size: number
}

interface Ring {
	x: number
	y: number
	life: number
	max: number
	r0: number
	r1: number
	color: string
	width: number
}

export class Particles {
	private sparks: Spark[] = []
	private labels: Label[] = []
	private rings: Ring[] = []

	clear(): void {
		this.sparks.length = 0
		this.labels.length = 0
		this.rings.length = 0
	}

	// Radial burst of small glowing dots.
	burst(cx: number, cy: number, color: string, count: number, speed = 90, size = 2, life = 0.45): void {
		for (let i = 0; i < count; i++) {
			if (this.sparks.length >= MAX_SPARKS) this.sparks.shift()
			const a = Math.random() * Math.PI * 2
			const v = speed * (0.3 + Math.random() * 0.7)
			this.sparks.push({
				x: cx,
				y: cy,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v,
				life: life * (0.5 + Math.random() * 0.6),
				max: life,
				size: size * (0.6 + Math.random() * 0.9),
				color,
				grav: 0,
				drag: 2.4,
			})
		}
	}

	// Floating combat/status text (rises and fades).
	label(cx: number, cy: number, text: string, color: string, size = 14, life = 0.9): void {
		if (this.labels.length >= MAX_LABELS) this.labels.shift()
		this.labels.push({ x: cx, y: cy, life, max: life, text, color, size })
	}

	// Expanding circle.
	ring(cx: number, cy: number, color: string, r0 = 6, r1 = 30, life = 0.5, width = 3): void {
		if (this.rings.length >= MAX_RINGS) this.rings.shift()
		this.rings.push({ x: cx, y: cy, life, max: life, r0, r1, color, width })
	}

	update(dt: number): void {
		for (let i = this.sparks.length - 1; i >= 0; i--) {
			const s = this.sparks[i]
			s.life -= dt
			if (s.life <= 0) {
				this.sparks.splice(i, 1)
				continue
			}
			s.vy += s.grav * dt
			const d = 1 - Math.min(1, s.drag * dt)
			s.vx *= d
			s.vy *= d
			s.x += s.vx * dt
			s.y += s.vy * dt
		}
		for (let i = this.labels.length - 1; i >= 0; i--) {
			const l = this.labels[i]
			l.life -= dt
			l.y -= 22 * dt
			if (l.life <= 0) this.labels.splice(i, 1)
		}
		for (let i = this.rings.length - 1; i >= 0; i--) {
			const r = this.rings[i]
			r.life -= dt
			if (r.life <= 0) this.rings.splice(i, 1)
		}
	}

	draw(ctx: CanvasRenderingContext2D): void {
		ctx.save()
		ctx.globalCompositeOperation = "lighter"
		for (const s of this.sparks) {
			ctx.globalAlpha = Math.max(0, s.life / s.max)
			ctx.fillStyle = s.color
			ctx.beginPath()
			ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
			ctx.fill()
		}
		for (const r of this.rings) {
			const t = 1 - r.life / r.max
			ctx.globalAlpha = Math.max(0, r.life / r.max)
			ctx.strokeStyle = r.color
			ctx.lineWidth = Math.max(0.5, r.width * (1 - t))
			ctx.beginPath()
			ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * t, 0, Math.PI * 2)
			ctx.stroke()
		}
		ctx.restore()
		ctx.globalAlpha = 1
		for (const l of this.labels) {
			ctx.globalAlpha = Math.min(1, (l.life / l.max) / 0.6)
			ctx.font = "bold " + l.size + "px monospace"
			ctx.textAlign = "center"
			ctx.fillStyle = l.color
			ctx.fillText(l.text, l.x, l.y)
			ctx.textAlign = "left"
		}
		ctx.globalAlpha = 1
	}
}