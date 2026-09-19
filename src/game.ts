// ROGUE.EXE — the dungeon engine: bump combat, gold & potions, stairs
// descent, permadeath, deterministic daily dungeon via mulberry32(daySeed).

import { mulberry32, dailySeed } from "./rng.ts"
import type { Rng } from "./rng.ts"
import {
	CELL_SIZE, FONT_SIZE, HUD_ROWS, LOG_ROWS, DUNGEON_COLS, DUNGEON_ROWS,
	CANVAS_WIDTH, CANVAS_HEIGHT, STAIRS_CHAR, GOLD_CHAR, GOLD_VALUE, POTION_CHAR,
	POTION_HEAL, MAX_PLAYER_HP, PLAYER_ATK, PLAYER_DEF, START_XP, START_GOLD,
	MSG_COLOR_HIT, MSG_COLOR_DAMAGE, MSG_COLOR_GAIN, MSG_COLOR_LEVEL, MSG_COLOR_DESCEND, MSG_COLOR_GOLD,
} from "./constants.ts"
import { generateDungeon, isWalkable } from "./dungeon.ts"
import type { Dungeon } from "./dungeon.ts"
import { manhattan, keyOf } from "./geometry.ts"
import { AMBER, AMBER_DIM, AMBER_PURE, rgbToFill } from "./canvas.ts"
export type EnemyKind = "goblin" | "skeleton"

export interface Enemy {
	x: number
	y: number
	kind: EnemyKind
	hp: number
	maxHp: number
	atk: number
	def: number
	xp: number
}

export interface Item {
	x: number
	y: number
	kind: "gold" | "potion"
	qty: number
}

export function enemyCountForDepth(depth: number): number {
	return Math.min(3 + depth * 2, 18)
}

export class Game {
	private readonly ctx: CanvasRenderingContext2D
	private readonly rnd: Rng
	private depth = 1
	private dungeon!: Dungeon
	private px = 0
	private py = 0
	private hp = MAX_PLAYER_HP
	private maxHp = MAX_PLAYER_HP
	private level = 1
	private xp = START_XP
	private gold = START_GOLD
	private stairs = { x: 1, y: 1 }
	private enemies: Enemy[] = []
	private items: Item[] = []
	private log: string[] = []
	private message = ""
	private dead = false
	private running = false

	constructor(ctx: CanvasRenderingContext2D) {
		void this.running
		this.ctx = ctx

		const base = dailySeed()
		this.rnd = mulberry32((base ^ (this.depth * 2654435761)) >>> 0)
		this.reset()
	}

	unlockAudio(): void {
		// ROGUE.EXE is silent by design; kept for arcade parity.
	}

	start(): void {
		window.addEventListener("keydown", (e) => this.onKey(e))
		this.render()
	}

	private onKey(e: KeyboardEvent): void {
		if (e.repeat) return
		const dirs: Record<string, [number, number]> = {
			w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
			q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1],
		}
		const mv = dirs[e.key.toLowerCase()]
		if (mv) {
			e.preventDefault()
			this.move(mv[0], mv[1])
			this.enemiesAct()
			this.render()
		} else if (e.key === " ") {
			this.enemiesAct()
			this.render()
		}
	}

	private move(dx: number, dy: number): void {
		const nx = this.px + dx
		const ny = this.py + dy
		const foe = this.enemies.find((m) => m.x === nx && m.y === ny)
		if (foe) {
			this.attack(foe)
			return
		}
		if (isWalkable(this.dungeon, nx, ny)) {
			this.px = nx
			this.py = ny
			this.pickup()
			if (nx === this.stairs.x && ny === this.stairs.y) this.descend()
		} else {
			this.tell("The stone blocks you.")
		}
	}

	private attack(foe: Enemy): void {
		const dmg = Math.max(1, PLAYER_ATK - foe.def + Math.floor(this.rnd() * 3))
		foe.hp -= dmg
		this.tell("You strike the " + foe.kind + " for " + dmg + " (" + MSG_COLOR_HIT + ").")
		if (foe.hp <= 0) {
			this.enemies = this.enemies.filter((m) => m !== foe)
			this.xp += foe.xp
			this.tell("The " + foe.kind + " dies. +" + foe.xp + " xp (" + MSG_COLOR_GAIN + ").")
			this.maybeLevel()
		} else {
			const hurt = Math.max(1, foe.atk - PLAYER_DEF + Math.floor(this.rnd() * 2))
			this.hp -= hurt
			this.tell("It bites you for " + hurt + " (" + MSG_COLOR_DAMAGE + ").")
			if (this.hp <= 0) this.die()
		}
	}

	private maybeLevel(): void {
		const need = this.level * 10
		if (this.xp < need) return
		this.xp -= need
		this.level++
		this.maxHp += 4
		this.hp = this.maxHp
		this.tell("You reach level " + this.level + "! (" + MSG_COLOR_LEVEL + ").")
	}

	private die(): void {
		this.dead = true
		this.running = false
		this.tell("You die. Press R to reincarnate tomorrow.")
	}

	private enemiesAct(): void {
		for (const m of this.enemies) {
			const d = manhattan({ x: m.x, y: m.y }, { x: this.px, y: this.py })
			if (d > 12) continue
			const dx = Math.sign(this.px - m.x)
			const dy = Math.sign(this.py - m.y)
			const nx = m.x + dx
			const ny = m.y + dy
			if (nx === this.px && ny === this.py) {
				const hurt = Math.max(1, m.atk - PLAYER_DEF + Math.floor(this.rnd() * 2))
				this.hp -= hurt
				this.tell("The " + m.kind + " claws you for " + hurt + ".")
				if (this.hp <= 0) this.die()
				continue
			}
			if (isWalkable(this.dungeon, nx, ny) && !this.enemies.some((o) => o.x === nx && o.y === ny)) {
				m.x = nx
				m.y = ny
			}
		}
	}

	private tell(msg: string): void {
		this.message = msg
		this.log.push(msg)
		if (this.log.length > LOG_ROWS) this.log.shift()
	}

	private pickup(): void {
		for (let i = this.items.length - 1; i >= 0; i--) {
			const it = this.items[i]
			if (!it) continue
			if (it.x !== this.px || it.y !== this.py) continue
			this.items.splice(i, 1)
			if (it.kind === "gold") {
				this.gold += it.qty * GOLD_VALUE
				this.tell("+" + it.qty * GOLD_VALUE + " gold (" + MSG_COLOR_GOLD + ").")
			} else {
				this.hp = Math.min(this.maxHp, this.hp + POTION_HEAL)
				this.tell("You quaff a potion (+" + POTION_HEAL + " HP).")
			}
		}
	}

	private descend(): void {
		this.depth++
		if (this.depth > 9) {
			this.tell("You escape into the light! You are the Rogue (" + MSG_COLOR_DESCEND + ").")
			this.running = false
			window.dispatchEvent(new Event("rogue:win"))
			return
		}
		this.reset()
		this.tell("You descend to depth " + this.depth + " (" + MSG_COLOR_DESCEND + ").")
	}

	private reset(): void {
		this.dungeon = generateDungeon(this.rnd, this.depth)
		this.stairs = this.findStairs()
		this.px = this.dungeon.start.x
		this.py = this.dungeon.start.y
		this.enemies = this.spawnEnemies()
		this.items = this.spawnItems()
	}

	private spawnEnemies(): Enemy[] {
		const out: Enemy[] = []
		const count = enemyCountForDepth(this.depth)
		for (let i = 0; i < count; i++) {
			const p = this.randomFloor()
			if (!p) continue
			const kind: EnemyKind = this.rnd() < 0.5 ? "goblin" : "skeleton"
			const maxHp = 8 + this.depth * 2
			out.push({
				...p,
				kind,
				hp: maxHp,
				maxHp,
				atk: 3 + this.depth,
				def: 0,
				xp: 5 + this.depth,
			})
		}
		return out
	}

	private spawnItems(): Item[] {
		const out: Item[] = []
		for (let i = 0; i < 6; i++) {
			const p = this.randomFloor()
			if (!p) continue
			out.push({ ...p, kind: i % 2 === 0 ? "gold" : "potion", qty: 1 + Math.floor(this.rnd() * 6) })
		}
		return out
	}

	private findStairs(): { x: number; y: number } {
		for (let y = 0; y < DUNGEON_ROWS; y++) {
			for (let x = 0; x < DUNGEON_COLS; x++) {
				if (this.dungeon.terrain[y]?.[x] === "stairs") return { x, y }
			}
		}
		return { x: DUNGEON_COLS - 2, y: DUNGEON_ROWS - 2 }
	}

	private randomFloor(): { x: number; y: number } | undefined {
		for (let i = 0; i < 100; i++) {
			const x = 1 + Math.floor(this.rnd() * (DUNGEON_COLS - 2))
			const y = 1 + Math.floor(this.rnd() * (DUNGEON_ROWS - 2))
			if (isWalkable(this.dungeon, x, y)) return { x, y }
		}
		return undefined
	}

	private render(): void {
		const ctx = this.ctx
		ctx.fillStyle = "#050300"
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		ctx.font = FONT_SIZE + "px monospace"
		ctx.textBaseline = "top"
		ctx.fillStyle = String(rgbToFill(AMBER_DIM))
		ctx.fillText(
			"ROGUE.EXE  D" + this.depth + "  HP " + this.hp + "/" + this.maxHp + "  LVL " + this.level + "  XP " + this.xp + "  GOLD " + this.gold,
			4, 4,
		)
		for (let y = 0; y < DUNGEON_ROWS; y++) {
			for (let x = 0; x < DUNGEON_COLS; x++) {
				const t = this.dungeon.terrain[y]?.[x]
				if (!t) continue
				const ch = t === "wall" ? "#" : t === "stairs" ? STAIRS_CHAR : "."
				ctx.fillStyle = t === "wall" ? String(rgbToFill(AMBER_DIM)) : String(rgbToFill(AMBER))
				ctx.fillText(ch, x * CELL_SIZE, (HUD_ROWS + y) * CELL_SIZE)
			}
		}
		for (const it of this.items) {
			ctx.fillStyle = it.kind === "gold" ? String(rgbToFill(AMBER_PURE)) : String(rgbToFill(AMBER))
			ctx.fillText(it.kind === "gold" ? GOLD_CHAR : POTION_CHAR, it.x * CELL_SIZE, (HUD_ROWS + it.y) * CELL_SIZE)
		}
		for (const m of this.enemies) {
			ctx.fillStyle = String(rgbToFill(AMBER_PURE))
			ctx.fillText(m.kind === "goblin" ? "g" : "K", m.x * CELL_SIZE, (HUD_ROWS + m.y) * CELL_SIZE)
		}
		ctx.fillStyle = String(rgbToFill(AMBER_PURE))
		ctx.fillText("@", this.px * CELL_SIZE, (HUD_ROWS + this.py) * CELL_SIZE)
		ctx.fillStyle = String(rgbToFill(AMBER_DIM))
		ctx.fillText(this.message, 4, HUD_ROWS * CELL_SIZE + DUNGEON_ROWS * CELL_SIZE)
		for (let i = 0; i < LOG_ROWS; i++) {
			ctx.fillText(this.log[this.log.length - 1 - i] ?? "", 4, (HUD_ROWS + DUNGEON_ROWS + 1 + i) * CELL_SIZE)
		}
		if (this.dead) {
			ctx.fillStyle = String(rgbToFill(AMBER_PURE))
			ctx.fillText("PRESS R TO REINCARNATE", 4, (HUD_ROWS + DUNGEON_ROWS + LOG_ROWS + 1) * CELL_SIZE)
		}
		this.playersXp()
	}

	private playersXp(): void {
		const k = keyOf(this.px, this.py)
		void k
	}
}
