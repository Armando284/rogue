// ROGUE.EXE — the dungeon engine: bump combat, gold & potions, stairs
// descent, permadeath, deterministic daily dungeon via mulberry32(daySeed).

import { mulberry32, dailySeed } from "./rng.ts"
import type { Rng } from "./rng.ts"
import {
	CELL_SIZE, FONT_SIZE, LOG_ROWS, LOG_HISTORY, DUNGEON_COLS, DUNGEON_ROWS,
	CANVAS_WIDTH, CANVAS_HEIGHT, GOLD_VALUE,
	POTION_HEAL, MAX_PLAYER_HP, PLAYER_ATK, PLAYER_DEF, START_XP, START_GOLD,
	POTION_CAPACITY, FIRE_DAMAGE, STRENGTH_BONUS, MAX_DEPTH, BOSSES,
	MSG_COLOR_HIT, MSG_COLOR_DAMAGE, MSG_COLOR_GAIN, MSG_COLOR_HEAL, MSG_COLOR_LEVEL, MSG_COLOR_DESCEND, MSG_COLOR_GOLD,
} from "./constants.ts"
import type { EnemyKindName, BossStats } from "./constants.ts"
import { generateDungeon, isWalkable } from "./dungeon.ts"
import type { Dungeon } from "./dungeon.ts"
import { manhattan } from "./geometry.ts"
import { BG, PLAYER, TEXT_DIM, rgbToFill } from "./canvas.ts"
import { Sfx } from "./audio.ts"
import { Particles } from "./particles.ts"
import { POTION_DEFS, randomPotion, freshKnowledge } from "./potions.ts"
import type { PotionType } from "./potions.ts"
import { BOSS_INTRO, BOSS_KILL, WIN_LINE } from "./lore.ts"
import { drawSprite } from "./sprite-draw.ts"
import { PadPoll } from "./gamepad.ts"
import {
	PLAYER as PLAYER_SPRITE,
	GOLD_SPRITE,
	FLASK as FLASK_SPRITE,
	STAIRS_SPRITE,
	MERCHANT as MERCHANT_SPRITE,
	FLOOR_A, FLOOR_B, FLOOR_C,
	WALL_A, WALL_B,
	ENEMY_SPRITES,
} from "./sprites.ts"
export type EnemyKind = EnemyKindName

const BOSS_BY_KIND: Partial<Record<EnemyKind, BossStats>> = (Object.values(BOSSES) as BossStats[]).reduce(
	(acc, b) => {
		acc[b.kind] = b
		return acc
	},
	{} as Partial<Record<EnemyKind, BossStats>>,
)

export interface Enemy {
	x: number
	y: number
	kind: EnemyKind
	hp: number
	maxHp: number
	atk: number
	def: number
	xp: number
	phase: number
	timer: number
}

export interface Item {
	x: number
	y: number
	kind: "gold" | "potion"
	qty: number
	ptype?: PotionType
	inShop?: boolean
}

export function enemyCountForDepth(depth: number): number {
	return Math.min(3 + depth * 2, 18)
}

function setHud(id: string, value: string): void {
	const el = document.getElementById(id)
	if (el) el.textContent = value
}

function killColor(kind: EnemyKind): string {
	switch (kind) {
		case "goblin":
			return "#7bc96b"
		case "skeleton":
			return "#e6dfc8"
		default:
			return BOSS_BY_KIND[kind]?.color ?? "#ffd886"
	}
}

// Sprite-time shading: low-HP enemies tint their primary key red.
const ENEMY_GLOW: Record<string, string> = {
	goblin: "rgba(123,201,107,0.45)",
	skeleton: "rgba(230,223,200,0.35)",
	troll: "rgba(78,122,68,0.6)",
	king: "rgba(217,207,174,0.6)",
	dragon: "rgba(255,106,94,0.7)",
}

const ENEMY_LOW_KEYS: Record<string, string> = {
	goblin: "g",
	skeleton: "b",
	troll: "t",
	king: "b",
	dragon: "r",
}

// Deterministic per-tile pick so floor/wall textures breathe without flicker.
function tileVariant(x: number, y: number, n: number): number {
	return (x * 3 + y * 7) % n
}

// A foot-soldier goblin or skeleton, scaled to the current depth.
function makeMinion(kind: "goblin" | "skeleton", x: number, y: number, depth: number, phase: number): Enemy {
	const maxHp = 8 + depth * 2
	return {
		x,
		y,
		kind,
		hp: maxHp,
		maxHp,
		atk: 3 + depth,
		def: 0,
		xp: 5 + depth,
		phase,
		timer: 0,
	}
}

// Adjacent floor cells around a merchant where wares sit on display.
const SHOP_DIRS8: ReadonlyArray<[number, number]> = [
	[0, -1], [1, 0], [0, 1], [-1, 0],
	[1, -1], [1, 1], [-1, 1], [-1, -1],
]

// The 8 movement keys, as one token set the input layer forwards.
const MOVE_TOKENS = new Set(["w", "s", "a", "d", "q", "e", "z", "c"])

const DIRS8: Record<string, [number, number]> = {
	w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
	q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1],
}

export class Game {
	private readonly ctx: CanvasRenderingContext2D
	private rnd: Rng
	private readonly sfx = new Sfx()
	private readonly particles = new Particles()
	private last = performance.now()
	private time = 0
	private shake = 0
	private hitstop = 0
	private flashColor = ""
	private flashA = 0
	private atk = PLAYER_ATK
	private depth = 1
	private dungeon!: Dungeon
	private merchant: { x: number; y: number } | null = null
	private shopOpen = false
	private shopMsg = ""
	private shopSel = 0
	private shopHintShown = false
	private potions: PotionType[] = []
	private showInventory = false
	private inventorySel = 0
	private readonly pad = new PadPoll((t) => this.dispatchInput(t))
	private invPanel: HTMLElement | null = null
	private invList: HTMLElement | null = null
	private shopPanel: HTMLElement | null = null
	private shopList: HTMLElement | null = null
	private shopHint: HTMLElement | null = null
	private potionKnown: Record<PotionType, boolean> = freshKnowledge()
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
	private log: Array<{ t: string; c: string }> = []
	private message = ""
	private messageColor = ""
	private dead = false
	private running = false

	constructor(ctx: CanvasRenderingContext2D) {
		this.ctx = ctx

		this.invPanel = document.getElementById("inventory") as HTMLElement | null
		this.invList = document.getElementById("inv-list") as HTMLElement | null
		this.shopPanel = document.getElementById("shop") as HTMLElement | null
		this.shopList = document.getElementById("shop-list") as HTMLElement | null
		this.shopHint = document.getElementById("shop-hint") as HTMLElement | null

		const base = dailySeed()
		this.rnd = mulberry32((base ^ (this.depth * 2654435761)) >>> 0)
		this.reset()
	}

	unlockAudio(): void {
		this.sfx.unlock()
	}

	start(): void {
		this.running = true
		window.addEventListener("keydown", (e) => this.onKey(e))
		this.last = performance.now()
		const tick = (now: number): void => {
			this.frame(now)
			requestAnimationFrame(tick)
		}
		requestAnimationFrame(tick)
	}

	private frame(now: number): void {
		let dt = Math.min(0.05, (now - this.last) / 1000)
		this.last = now
		this.time += dt
		this.pad.poll(this.time)
		if (this.hitstop > 0) {
			this.hitstop -= dt
			dt *= 0.1
		}
		this.shake = Math.max(0, this.shake - 60 * dt)
		this.flashA = Math.max(0, this.flashA - dt * 1.6)
		this.particles.update(dt)
		if (this.running && !this.shopOpen && this.nearMerchant() && !this.shopHintShown) {
			this.shopHintShown = true
			this.tell("The merchant watches you. Press B to trade.", MSG_COLOR_LEVEL)
		}
		this.render()
	}

	private addShake(px: number): void {
		this.shake = Math.min(14, Math.max(this.shake, px))
	}

	private flash(color: string, a: number): void {
		this.flashColor = color
		this.flashA = Math.max(this.flashA, a)
	}

	private hitstopFor(sec: number): void {
		this.hitstop = Math.max(this.hitstop, sec)
	}

	private cxp(x: number): number {
		return (x + 0.5) * CELL_SIZE
	}

	private cyp(y: number): number {
		return (y + 0.5) * CELL_SIZE
	}

	private onKey(e: KeyboardEvent): void {
		if (e.repeat) return
		const k = e.key
		let token = ""
		if (k === "Escape") token = "escape"
		else if (k === "Enter") token = "enter"
		else if (k === " ") token = "space"
		else if (k === "ArrowUp") token = "w"
		else if (k === "ArrowDown") token = "s"
		else if (k === "ArrowLeft") token = "a"
		else if (k === "ArrowRight") token = "d"
		else token = k.toLowerCase()
		if (token === "") return
		if (MOVE_TOKENS.has(token)) e.preventDefault()
		this.dispatchInput(token)
	}

	private dispatchInput(token: string): void {
		if (this.shopOpen) {
			if (token === "w") this.shopMove(-1)
			else if (token === "s") this.shopMove(1)
			else if (token === "enter" || token === "space") {
				if (this.shopItems().length === 0) {
					this.shopMsg = "That shelf is bare."
					this.refreshShop()
				} else {
					this.shopBuy(this.shopSel)
				}
			} else if (token >= "1" && token <= "9") {
				const i = Number(token) - 1
				if (i < this.shopItems().length) {
					this.shopBuy(i)
				} else {
					this.shopMsg = "That shelf is bare."
					this.refreshShop()
				}
			} else if (token === "0" || token === "escape" || token === "b") {
				this.closeShop()
			}
			return
		}
		const restart = token === "r" || token === "enter"
		if (this.dead || !this.running) {
			if (restart) this.reincarnate()
			return
		}
		if (this.showInventory) {
			if (token === "w") this.invMove(-1)
			else if (token === "s") this.invMove(1)
			else if (token === "enter" || token === "space") this.quaffSlot(this.inventorySel)
			else if (token >= "1" && token <= "9") this.quaffSlot(Number(token) - 1)
			else this.closeInventory()
			return
		}
		if (token === "i") {
			this.openInventory()
			return
		}
		if (token === "p") {
			this.quaffPotion()
			return
		}
		if (token === "b") {
			this.openShop()
			return
		}
		if (token === "m") {
			this.sfx.muted = !this.sfx.muted
			this.tell(this.sfx.muted ? "Sound muted (M)." : "Sound on (M).")
			return
		}
		if (token === ">") {
			this.tryDescend()
			return
		}
		const mv = DIRS8[token]
		if (mv) {
			this.move(mv[0], mv[1])
			this.enemiesAct()
		} else if (token === "space" || token === "enter") {
			this.enemiesAct()
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
			this.sfx.step()
			this.particles.burst(this.cxp(nx), this.cyp(ny), "rgba(122,84,46,0.8)", 2, 24, 1.3, 0.3)
			this.pickup()
			if (nx === this.stairs.x && ny === this.stairs.y) this.tryDescend()
		} else {
			this.sfx.block()
			this.addShake(1.5)
			this.particles.burst(this.cxp(nx), this.cyp(ny), "rgba(122,84,46,0.7)", 5, 44, 2, 0.4)
			this.tell("The stone blocks you.")
		}
	}

	private attack(foe: Enemy): void {
		const dmg = Math.max(1, this.atk - foe.def + Math.floor(this.rnd() * 3))
		foe.hp -= dmg
		this.sfx.hit()
		const cx = this.cxp(foe.x)
		const cy = this.cyp(foe.y)
		this.particles.burst(cx, cy, "#ffd892", 8, 110, 2, 0.4)
		this.particles.label(cx, cy - 8, "-" + dmg, "#ffd886", 13, 0.8)
		this.addShake(3)
		this.hitstopFor(0.025)
		this.tell("You strike the " + foe.kind + " for " + dmg + ".", MSG_COLOR_HIT)
		if (foe.hp <= 0) this.killEnemy(foe, "The " + foe.kind + " dies. +" + foe.xp + " xp.")
	}

	private killEnemy(foe: Enemy, cause: string): void {
		this.enemies = this.enemies.filter((m) => m !== foe)
		this.xp += foe.xp
		this.sfx.kill()
		const cx = this.cxp(foe.x)
		const cy = this.cyp(foe.y)
		const c = killColor(foe.kind)
		this.particles.burst(cx, cy, c, 14, 130, 2.2, 0.55)
		this.particles.ring(cx, cy, "#ffd886", 4, 26, 0.45, 3)
		this.particles.label(cx, cy - 28, "+" + foe.xp + " XP", "#ffd660", 14, 1)
		this.addShake(5)
		this.hitstopFor(0.07)
		this.tell(cause, MSG_COLOR_GAIN)
		if (this.isBoss(foe)) {
			this.bossBounty(foe)
		} else {
			this.dropLoot(foe.x, foe.y)
		}
		this.maybeLevel()
	}

	// The slain enemy may leave a flask or a purse of gold behind.
	private dropLoot(x: number, y: number): void {
		if (this.rnd() < 0.4 && isWalkable(this.dungeon, x, y) && !this.enemies.some((o) => o.x === x && o.y === y)) {
			this.items.push({ x, y, kind: "potion", qty: 1, ptype: randomPotion(this.rnd) })
			return
		}
		if (this.rnd() < 0.45 && isWalkable(this.dungeon, x, y) && !this.items.some((o) => o.x === x && o.y === y)) {
			this.items.push({ x, y, kind: "gold", qty: 1 + Math.floor(this.rnd() * 3) })
		}
	}

	private bossBounty(foe: Enemy): void {
		const reward = 40 + this.depth * 6
		this.gold += reward
		const bx = this.cxp(foe.x)
		const by = this.cyp(foe.y)
		this.particles.burst(bx, by, "#ffd660", 26, 150, 2.4, 0.7)
		this.particles.ring(bx, by, "#ffd892", 8, 40, 0.7, 3)
		this.particles.label(bx, by - 26, "+" + reward + " GOLD", "#ffd660", 15, 1)
		this.tell(BOSS_KILL[this.depth] ?? "The guardian crumbles into dust.", MSG_COLOR_GAIN)
		if (isWalkable(this.dungeon, foe.x, foe.y) && !this.enemies.some((o) => o.x === foe.x && o.y === foe.y)) {
			this.items.push({ x: foe.x, y: foe.y, kind: "potion", qty: 1, ptype: randomPotion(this.rnd) })
		}
	}

	private isBoss(m: Enemy): boolean {
		return BOSS_BY_KIND[m.kind] !== undefined
	}

	private xpNeeded(): number {
		return this.level * 10
	}

	private maybeLevel(): void {
		const need = this.xpNeeded()
		if (this.xp < need) return
		this.xp -= need
		this.level++
		this.maxHp += 4
		this.hp = this.maxHp
		this.sfx.level()
		const cx = this.cxp(this.px)
		const cy = this.cyp(this.py)
		this.particles.ring(cx, cy, "#c07bff", 8, 40, 0.6, 3)
		this.particles.burst(cx, cy, "#c07bff", 20, 140, 2.2, 0.6)
		this.particles.label(cx, cy - 30, "LEVEL " + this.level + "!", "#c07bff", 16, 1.1)
		this.flash("rgba(192,123,255,0.5)", 0.16)
		this.tell("You reach level " + this.level + "!", MSG_COLOR_LEVEL)
	}

	private die(): void {
		this.dead = true
		this.running = false
		this.sfx.death()
		const cx = this.cxp(this.px)
		const cy = this.cyp(this.py)
		this.particles.burst(cx, cy, "#ff6a5e", 30, 160, 2.5, 0.8)
		this.particles.ring(cx, cy, "#ff6a5e", 6, 50, 0.7, 4)
		this.particles.label(cx, cy - 30, "YOU DIE", "#ff6a5e", 18, 1.2)
		this.addShake(14)
		this.flash("rgba(255,106,94,0.5)", 0.55)
		this.hitstopFor(0.16)
		this.tell("You die. Press R to reincarnate tomorrow.", MSG_COLOR_DAMAGE)
		this.render()
	}

	private reincarnate(): void {
		this.dead = false
		this.running = true
		this.depth = 1
		this.hp = MAX_PLAYER_HP
		this.maxHp = MAX_PLAYER_HP
		this.level = 1
		this.xp = START_XP
		this.gold = START_GOLD
		this.atk = PLAYER_ATK
		this.potions = []
		this.showInventory = false
		this.invPanel?.classList.add("hidden")
		this.shopOpen = false
		this.shopMsg = ""
		this.shopPanel?.classList.add("hidden")
		this.potionKnown = freshKnowledge()
		this.log = []
		this.message = ""
		this.messageColor = ""
		this.reset()
		this.sfx.level()
		const cx = this.cxp(this.px)
		const cy = this.cyp(this.py)
		this.particles.burst(cx, cy, "#ffd892", 24, 120, 2, 0.6)
		this.particles.ring(cx, cy, "#ffd892", 6, 36, 0.6, 3)
		this.particles.label(cx, cy - 26, "REBORN", "#ffd892", 16, 1)
		this.tell("You claw back into the light. Depth 1.", MSG_COLOR_LEVEL)
		this.render()
	}

	private enemiesAct(): void {
		if (this.dead) return
		for (const m of this.enemies) {
			if (this.dead) return
			if (this.isBoss(m)) {
				if (this.bossTactics(m)) continue
				this.chase(m)
				continue
			}
			const d = manhattan({ x: m.x, y: m.y }, { x: this.px, y: this.py })
			// Wounded goblins cut their losses and scatter; skeletons fight on.
			const injured = m.hp <= Math.ceil(m.maxHp * 0.3)
			if (m.kind === "goblin" && injured && this.rnd() < 0.45) {
				this.flee(m)
				continue
			}
			if (d <= 10) {
				this.chase(m)
			} else if (m.kind === "skeleton" && this.rnd() < 0.3) {
				this.wander(m)
			}
		}
	}

	// Guardians spend a turn on a signature trick; return true when they do.
	private bossTactics(m: Enemy): boolean {
		const d = manhattan({ x: m.x, y: m.y }, { x: this.px, y: this.py })
		switch (m.kind) {
			case "troll": {
				const minions = this.enemies.filter((o) => o.kind === "goblin").length
				if (m.hp <= m.maxHp * 0.6 && minions < 2 && this.rnd() < 0.3) {
					this.trollSummon(m)
					return true
				}
				return false
			}
			case "king": {
				m.timer++
				if (m.timer % 3 === 0 && d > 1 && d <= 7) {
					this.rangedHit(m, 4, "The Bone King hurls a shard of rib at you.")
					return true
				}
				return false
			}
			case "dragon": {
				m.timer++
				if (m.timer % 2 === 0 && d <= 6) {
					this.dragonBreath(m)
					return true
				}
				return false
			}
			default:
				return false
		}
	}

	private trollSummon(m: Enemy): void {
		for (let i = 0; i < 30; i++) {
			const x = m.x + Math.floor(this.rnd() * 9) - 4
			const y = m.y + Math.floor(this.rnd() * 9) - 4
			if (!isWalkable(this.dungeon, x, y)) continue
			if (this.px === x && this.py === y) continue
			if (this.enemies.some((o) => o.x === x && o.y === y)) continue
			this.enemies.push(makeMinion("goblin", x, y, this.depth, Math.floor(this.rnd() * 2)))
			this.particles.burst(this.cxp(x), this.cyp(y), "#7bc96b", 10, 90, 2, 0.5)
			this.tell("Gram the Brute bellows; a goblin answers the call.", MSG_COLOR_DAMAGE)
			return
		}
	}

	private rangedHit(m: Enemy, dmg: number, msg: string): void {
		this.hp -= dmg
		this.sfx.damage()
		const mx = this.cxp(m.x)
		const my = this.cyp(m.y)
		this.particles.burst(mx, my, "#d9cfae", 6, 90, 2, 0.4)
		this.particles.burst(this.cxp(this.px), this.cyp(this.py), "#d9cfae", 10, 90, 2, 0.5)
		this.particles.label(this.cxp(this.px), this.cyp(this.py) - 6, "-" + dmg, "#d9cfae", 13, 0.8)
		this.addShake(6)
		this.hitstopFor(0.04)
		this.flash("rgba(217,207,174,0.4)", 0.2)
		this.tell(msg + " (" + dmg + ")", MSG_COLOR_DAMAGE)
		if (this.hp <= 0) this.die()
	}

	private dragonBreath(m: Enemy): void {
		const dmg = Math.max(6, 6 + this.depth - 14)
		this.hp -= dmg
		this.sfx.damage()
		const bx = this.cxp(m.x)
		const by = this.cyp(m.y)
		this.particles.burst(bx, by, "#ff7a3a", 26, 150, 2.6, 0.8)
		this.particles.ring(bx, by, "#ffb03a", 10, 56, 0.6, 4)
		this.particles.ring(bx, by, "#ff6a5e", 6, 34, 0.5, 3)
		this.particles.label(this.cxp(this.px), this.cyp(this.py) - 6, "-" + dmg, "#ff7a3a", 14, 0.9)
		this.addShake(10)
		this.hitstopFor(0.08)
		this.flash("rgba(255,122,58,0.45)", 0.28)
		this.tell("The Ember Wyrm exhales a wall of flame! (" + dmg + ")", MSG_COLOR_DAMAGE)
		if (this.hp <= 0) this.die()
	}

	private hurtPlayer(m: Enemy, msg?: string): void {
		const hurt = Math.max(1, m.atk - PLAYER_DEF + Math.floor(this.rnd() * 2))
		this.hp -= hurt
		this.sfx.damage()
		const cx = this.cxp(this.px)
		const cy = this.cyp(this.py)
		this.particles.burst(cx, cy, "#ff6a5e", 10, 90, 2, 0.45)
		this.particles.label(cx, cy - 6, "-" + hurt, "#ff6a5e", 13, 0.8)
		this.addShake(6)
		this.hitstopFor(0.03)
		this.flash("rgba(255,106,94,0.4)", 0.2)
		this.tell(msg ?? "The " + m.kind + " strikes you for " + hurt + ".", MSG_COLOR_DAMAGE)
		if (this.hp <= 0) this.die()
	}

	private isCellBusy(m: Enemy, x: number, y: number): boolean {
		if (!isWalkable(this.dungeon, x, y)) return true
		return this.enemies.some((o) => o !== m && o.x === x && o.y === y)
	}

	private chase(m: Enemy): void {
		let dx = Math.sign(this.px - m.x)
		let dy = Math.sign(this.py - m.y)
		const lumber = m.kind === "skeleton" || m.kind === "king" || m.kind === "dragon"
		if (lumber && dx !== 0 && dy !== 0) {
			// These move one axis per activation, alternating — slower on the
			// diagonal, ponderous. Trolls and goblins cut the corner instead.
			m.phase ^= 1
			if (m.phase === 0) dy = 0
			else dx = 0
		}
		this.stepEnemy(m, dx, dy)
	}

	private flee(m: Enemy): void {
		const dx = Math.sign(m.x - this.px)
		const dy = Math.sign(m.y - this.py)
		if (dx === 0 && dy === 0) return
		this.stepEnemy(m, dx, dy)
	}

	private wander(m: Enemy): void {
		const dirs: Array<[number, number]> = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]
		const [dx, dy] = dirs[Math.floor(this.rnd() * dirs.length)]
		if (!this.isCellBusy(m, m.x + dx, m.y + dy)) {
			m.x += dx
			m.y += dy
			this.particles.burst(this.cxp(m.x), this.cyp(m.y), "rgba(230,223,200,0.5)", 1, 18, 1, 0.3)
		}
	}

	// Try the desired step, then axis-by-axis fallbacks. Melee range checks
	// come first so an adjacent enemy always strikes even if blocked.
	private stepEnemy(m: Enemy, dx: number, dy: number): void {
		if (dx === 0 && dy === 0) return
		if (m.x + dx === this.px && m.y + dy === this.py) {
			this.hurtPlayer(m)
			return
		}
		if (!this.isCellBusy(m, m.x + dx, m.y + dy)) {
			m.x += dx
			m.y += dy
			this.particles.burst(this.cxp(m.x), this.cyp(m.y), "rgba(122,84,46,0.6)", 1, 20, 1, 0.28)
			return
		}
		if (dx !== 0 && dy !== 0) {
			if (m.x + dx === this.px && m.y === this.py) {
				this.hurtPlayer(m)
				return
			}
			if (m.x === this.px && m.y + dy === this.py) {
				this.hurtPlayer(m)
				return
			}
			if (!this.isCellBusy(m, m.x + dx, m.y)) {
				m.x += dx
				return
			}
			if (!this.isCellBusy(m, m.x, m.y + dy)) {
				m.y += dy
				return
			}
		}
	}

	private tell(msg: string, color = ""): void {
		this.message = msg
		this.messageColor = color
		this.log.push({ t: msg, c: color })
		if (this.log.length > LOG_HISTORY) this.log.shift()
	}

	private pickup(): void {
		for (let i = this.items.length - 1; i >= 0; i--) {
			const it = this.items[i]
			if (!it) continue
			if (it.x !== this.px || it.y !== this.py) continue
			if (it.inShop) {
				this.tell("Those wares belong to the merchant. Press B to trade.", MSG_COLOR_GOLD)
				continue
			}
			if (it.kind === "gold") {
				this.items.splice(i, 1)
				this.gold += it.qty * GOLD_VALUE
				this.sfx.gold()
				const cx = this.cxp(it.x)
				const cy = this.cyp(it.y)
				this.particles.burst(cx, cy, "#ffd660", 8, 70, 2, 0.5)
				this.particles.ring(cx, cy, "rgba(255,214,96,0.5)", 3, 18, 0.35, 2)
				this.particles.label(cx, cy - 6, "+" + it.qty * GOLD_VALUE + " GOLD", "#ffd660", 13, 0.9)
				this.flash("rgba(255,214,96,0.35)", 0.14)
				this.tell("+" + it.qty * GOLD_VALUE + " gold.", MSG_COLOR_GOLD)
				continue
			}
			if (this.potions.length >= POTION_CAPACITY) {
				this.tell("Your pack is full; you leave the potion behind.", "")
				continue
			}
			this.items.splice(i, 1)
			this.potions.push(it.ptype ?? "healing")
			const cx = this.cxp(it.x)
			const cy = this.cyp(it.y)
			this.particles.burst(cx, cy, "#84ef9a", 10, 80, 2.2, 0.5)
			this.sfx.potion()
			this.tell("You stow a potion (" + this.potions.length + "/" + POTION_CAPACITY + " carried).", MSG_COLOR_HEAL)
		}
	}

	private quaffPotion(): void {
		if (this.potions.length === 0) {
			this.tell("Your pack holds no potions.", "")
			return
		}
		const first = this.potions.shift()
		if (first) this.drink(first)
	}

	private quaffSlot(idx: number): void {
		if (this.showInventory) this.closeInventory()
		const chosen = this.potions[idx]
		if (!chosen) return
		this.potions.splice(idx, 1)
		this.refreshInventory()
		this.drink(chosen)
	}

	private drink(potion: PotionType): void {
		this.sfx.potion()
		this.learnPotion(potion)
		if (potion === "strength") {
			this.atk += STRENGTH_BONUS
			this.sfx.level()
			this.particles.burst(this.cxp(this.px), this.cyp(this.py), "#c07bff", 18, 110, 2, 0.6)
			this.particles.ring(this.cxp(this.px), this.cyp(this.py), "#c07bff", 8, 42, 0.6, 3)
			this.tell("Strange fire runs up your arm\u2026 Strength rises to " + this.atk + ".", MSG_COLOR_LEVEL)
		} else if (potion === "fire") {
			const cx = this.cxp(this.px)
			const cy = this.cyp(this.py)
			this.particles.burst(cx, cy, "#ff7a3a", 26, 150, 2.4, 0.7)
			this.particles.ring(cx, cy, "#ffb03a", 10, 46, 0.6, 3)
			this.sfx.kill()
			this.tell("You drink a bubbling draught and spit flame. (" + FIRE_DAMAGE + " blast)", MSG_COLOR_LEVEL)
			const nearby = this.enemies.filter((e) => manhattan(e, { x: this.px, y: this.py }) <= 1)
			for (const foe of nearby) {
				foe.hp -= FIRE_DAMAGE
				this.particles.burst(this.cxp(foe.x), this.cyp(foe.y), "#ff7a3a", 10, 90, 2, 0.5)
				this.tell("The " + foe.kind + " caught the blast (" + FIRE_DAMAGE + ").", MSG_COLOR_HIT)
				if (foe.hp <= 0) this.killEnemy(foe, "The " + foe.kind + " dies in flame. +" + foe.xp + " xp.")
			}
		} else {
			this.hp = Math.min(this.maxHp, this.hp + POTION_HEAL)
			this.particles.burst(this.cxp(this.px), this.cyp(this.py), "#ff7a6e", 16, 100, 2, 0.5)
			this.tell("You down a red cordial; your wounds close. (+" + POTION_HEAL + " HP)", MSG_COLOR_HEAL)
		}
	}

	private learnPotion(watched: PotionType): void {
		if (this.potionKnown[watched]) return
		this.potionKnown[watched] = true
		this.tell("Eureka \u2014 you identify " + POTION_DEFS[watched].name + "!", MSG_COLOR_LEVEL)
	}

	private openShop(): void {
		if (!this.merchant) {
			this.tell("There is no merchant here.", "")
			return
		}
		if (manhattan(this.merchant, { x: this.px, y: this.py }) > 2) {
			this.tell("The merchant is not close enough to trade.", "")
			return
		}
		this.shopOpen = true
		this.shopMsg = ""
		this.shopSel = 0
		this.refreshShop()
		this.shopPanel?.classList.remove("hidden")
		this.render()
	}

	private closeShop(): void {
		this.shopOpen = false
		this.shopMsg = ""
		this.shopPanel?.classList.add("hidden")
		this.render()
	}

	private shopItems(): Item[] {
		return this.items.filter((o) => o.inShop)
	}

	private shopMove(d: number): void {
		const n = this.shopItems().length
		if (n === 0) return
		this.shopSel = (this.shopSel + d + n) % n
		this.refreshShop()
	}

	private shopBuy(i: number): void {
		const stock = this.shopItems()
		const it = stock[i]
		if (!it || !it.ptype) return
		const price = POTION_DEFS[it.ptype].price
		if (this.gold < price) {
			this.shopMsg = "The merchant clicks his tongue. You lack " + (price - this.gold) + " gold."
			this.refreshShop()
			return
		}
		if (this.potions.length >= POTION_CAPACITY) {
			this.shopMsg = "Your pack is full. Drink something first."
			this.refreshShop()
			return
		}
		this.gold -= price
		this.learnPotion(it.ptype)
		this.potions.push(it.ptype)
		this.items.splice(this.items.indexOf(it), 1)
		this.sfx.gold()
		this.shopMsg = "You buy " + POTION_DEFS[it.ptype].name + " for " + price + " gold."
		this.shopSel = Math.max(0, Math.min(this.shopSel, this.shopItems().length - 1))
		this.refreshShop()
	}

	private refreshShop(): void {
		const list = this.shopList
		if (!list) return
		const stock = this.shopItems()
		list.innerHTML = ""
		if (stock.length === 0) {
			const li = document.createElement("li")
			li.textContent = "The shelf is bare."
			li.style.color = "#8a8174"
			list.appendChild(li)
			this.updateShopHint()
			return
		}
		for (let i = 0; i < stock.length; i++) {
			const it = stock[i]
			if (!it?.ptype) continue
			const known = this.potionKnown[it.ptype]
			const def = POTION_DEFS[it.ptype]
			const li = document.createElement("li")
			if (i === this.shopSel) li.className = "pick"
			li.setAttribute("role", "button")
			li.setAttribute("aria-label", "Shelf " + (i + 1))
			const num = document.createElement("b")
			num.textContent = String(i + 1) + "."
			const glyph = document.createElement("span")
			glyph.className = "inv-glyph"
			glyph.textContent = known ? def.glyph : "?"
			glyph.style.color = known ? def.color : "#7a7164"
			const name = document.createElement("span")
			name.className = "inv-name"
			name.textContent = known ? def.name : "UNKNOWN DRAUGHT"
			const price = document.createElement("span")
			price.className = "inv-price"
			price.textContent = def.price + "G"
			li.append(num, glyph, name, price)
			li.addEventListener("click", () => {
				this.shopSel = i
				this.shopBuy(i)
			})
			list.appendChild(li)
		}
		this.updateShopHint()
	}

	private updateShopHint(): void {
		if (this.shopHint) {
			this.shopHint.textContent =
				this.shopMsg || "Up / Down choose \u00b7 A / Enter buys \u00b7 B / Esc leaves"
		}
	}

	private nearMerchant(): boolean {
		if (!this.merchant) return false
		return manhattan(this.merchant, { x: this.px, y: this.py }) <= 2
	}

	private tryDescend(): void {
		if (!(this.px === this.stairs.x && this.py === this.stairs.y)) {
			this.tell("The stairhead is elsewhere.", "")
			return
		}
		const boss = BOSSES[this.depth]
		if (boss && this.enemies.some((o) => o.kind === boss.kind)) {
			this.tell("A presence holds this stairhead shut. " + (BOSS_INTRO[this.depth] ?? ""), MSG_COLOR_DESCEND)
			this.sfx.block()
			return
		}
		this.descend()
	}

	private descend(): void {
		const cx = this.cxp(this.px)
		const cy = this.cyp(this.py)
		this.depth++
		if (this.depth > MAX_DEPTH) {
			this.sfx.win()
			this.particles.burst(cx, cy, "#ffd660", 40, 180, 3, 1)
			this.particles.burst(cx, cy, "#ffd892", 24, 120, 2.4, 0.8)
			this.particles.ring(cx, cy, "#ffd892", 10, 60, 0.8, 4)
			this.flash("rgba(255,216,146,0.5)", 0.3)
			this.addShake(8)
			this.tell(WIN_LINE, MSG_COLOR_DESCEND)
			this.running = false
			window.dispatchEvent(new Event("rogue:win"))
			return
		}
		this.rnd = mulberry32((dailySeed() ^ (this.depth * 2654435761)) >>> 0)
		this.particles.burst(cx, cy, "#63c9d9", 18, 120, 2.5, 0.6)
		this.particles.ring(cx, cy, "#63c9d9", 6, 40, 0.5, 3)
		this.particles.label(cx, cy - 26, "DEPTH " + this.depth, "#63c9d9", 16, 1)
		this.addShake(4)
		this.flash("rgba(99,201,217,0.35)", 0.2)
		this.reset()
		this.sfx.descend()
		const intro = BOSS_INTRO[this.depth]
		if (intro) {
			this.tell(intro, MSG_COLOR_DESCEND)
		} else {
			this.tell("You descend to depth " + this.depth + ".", MSG_COLOR_DESCEND)
		}
	}

	private reset(): void {
		this.dungeon = generateDungeon(this.rnd, this.depth)
		this.stairs = this.findStairs()
		this.px = this.dungeon.start.x
		this.py = this.dungeon.start.y
		this.merchant = this.dungeon.shop ?? null
		this.shopHintShown = false
		this.enemies = this.spawnEnemies()
		this.items = this.spawnItems()
	}

	private spawnEnemies(): Enemy[] {
		const boss = BOSSES[this.depth]
		if (boss) {
			for (let i = 0; i < 200; i++) {
				const p = this.randomFloor()
				if (!p) continue
				if (manhattan(p, { x: this.px, y: this.py }) < 8) continue
				return [
					{
						...p,
						kind: boss.kind,
						hp: boss.hp,
						maxHp: boss.hp,
						atk: boss.atk,
						def: boss.def,
						xp: boss.xp,
						phase: 0,
						timer: 0,
					},
				]
			}
			return []
		}
		const out: Enemy[] = []
		const count = enemyCountForDepth(this.depth)
		for (let i = 0; i < count; i++) {
			const p = this.randomFloor()
			if (!p) continue
			const kind: EnemyKind = this.rnd() < 0.5 ? "goblin" : "skeleton"
			out.push(makeMinion(kind, p.x, p.y, this.depth, Math.floor(this.rnd() * 2)))
		}
		return out
	}

	private spawnItems(): Item[] {
		const out: Item[] = []
		for (let i = 0; i < 6; i++) {
			const p = this.randomFloor()
			if (!p) continue
			if (i % 2 === 0) {
				out.push({ ...p, kind: "gold", qty: 1 + Math.floor(this.rnd() * 6) })
			} else {
				out.push({ ...p, kind: "potion", qty: 1, ptype: randomPotion(this.rnd) })
			}
		}
		if (this.merchant) {
			for (const s of this.shopSpots()) {
				out.push({ ...s, kind: "potion", qty: 1, ptype: randomPotion(this.rnd), inShop: true })
			}
		}
		return out
	}

	private shopSpots(): { x: number; y: number }[] {
		if (!this.merchant) return []
		const out: { x: number; y: number }[] = []
		for (const [dx, dy] of SHOP_DIRS8) {
			const x = this.merchant.x + dx
			const y = this.merchant.y + dy
			if (!isWalkable(this.dungeon, x, y)) continue
			if (this.items.some((o) => o.x === x && o.y === y)) continue
			out.push({ x, y })
			if (out.length >= 4) break
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
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		ctx.fillStyle = String(rgbToFill(BG))
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		ctx.save()
		if (this.shake > 0) {
			ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
		}
		ctx.font = FONT_SIZE + "px monospace"
		ctx.textBaseline = "top"
		ctx.textAlign = "left"
		for (let y = 0; y < DUNGEON_ROWS; y++) {
			for (let x = 0; x < DUNGEON_COLS; x++) {
				const t = this.dungeon.terrain[y]?.[x]
				if (!t) continue
				const px = x * CELL_SIZE
				const py = y * CELL_SIZE
				if (t === "shop") {
					const pulse = 10 + Math.sin(this.time * 3 + x * 2) * 3
					drawSprite(this.ctx, MERCHANT_SPRITE, px, py, {
						glow: "rgba(255,224,138,0.6)",
						blur: pulse,
					})
					continue
				}
				if (t === "stairs") {
					const pulse = 12 + Math.sin(this.time * 3 + x) * 3
					drawSprite(this.ctx, STAIRS_SPRITE, px, py, {
						frame: Math.floor(this.time * 3) % STAIRS_SPRITE.frames.length,
						glow: "rgba(99,201,217,0.5)",
						blur: pulse,
					})
					continue
				}
				if (t === "wall") {
					drawSprite(this.ctx, tileVariant(x, y, 2) === 1 ? WALL_B : WALL_A, px, py)
					continue
				}
				const floorVariant = tileVariant(x, y, 3)
				const floorSprite = floorVariant === 2 ? FLOOR_C : floorVariant === 1 ? FLOOR_B : FLOOR_A
				drawSprite(this.ctx, floorSprite, px, py)
			}
		}
		for (let i = 0; i < this.items.length; i++) {
			const it = this.items[i]
			if (!it) continue
			const px = it.x * CELL_SIZE
			const py = it.y * CELL_SIZE
			if (it.kind === "gold") {
				const pulse = 8 + Math.sin(this.time * 5 + i * 1.3) * 3
				drawSprite(this.ctx, GOLD_SPRITE, px, py, {
					frame: Math.floor(this.time * 4) % GOLD_SPRITE.frames.length,
					glow: "rgba(255,214,96,0.55)",
					blur: pulse,
				})
				continue
			}
			const pt = it.ptype ?? "healing"
			const known = it.inShop || this.potionKnown[pt]
			const pulse = 10 + Math.sin(this.time * 4 + i * 1.7) * 4
			drawSprite(this.ctx, FLASK_SPRITE, px, py, {
				glow: it.inShop ? "rgba(255,224,138,0.6)" : "rgba(255,122,110,0.55)",
				blur: pulse,
				overrides: known ? { g: POTION_DEFS[pt].color, d: POTION_DEFS[pt].dark } : undefined,
			})
			if (it.inShop) {
				ctx.font = "10px monospace"
				ctx.fillStyle = "#e9c95a"
				ctx.fillText(String(POTION_DEFS[pt].price), px + 12, py + 16)
				ctx.font = FONT_SIZE + "px monospace"
			}
		}
		for (const m of this.enemies) {
			const sprite = ENEMY_SPRITES[m.kind] ?? ENEMY_SPRITES["goblin"]
			const low = m.hp <= m.maxHp * 0.3
			const lowKey = ENEMY_LOW_KEYS[m.kind]
			drawSprite(this.ctx, sprite, m.x * CELL_SIZE, m.y * CELL_SIZE, {
				frame: Math.floor(this.time * (m.kind === "goblin" ? 5 : 2.2)) % sprite.frames.length,
				glow: low ? "#ff6a5e" : ENEMY_GLOW[m.kind] ?? "rgba(255,216,136,0.5)",
				blur: 8,
				overrides: low && lowKey ? { [lowKey]: "#ff6a5e" } : undefined,
			})
			const hpr = m.hp / m.maxHp
			if (hpr < 1) {
				ctx.fillStyle = "rgba(5,3,0,0.55)"
				ctx.fillRect(m.x * CELL_SIZE + 2, m.y * CELL_SIZE - 4, CELL_SIZE - 4, 2)
				ctx.fillStyle = hpr > 0.5 ? "#7bc96b" : "#ff7a6e"
				ctx.fillRect(m.x * CELL_SIZE + 2, m.y * CELL_SIZE - 4, (CELL_SIZE - 4) * hpr, 2)
			}
		}
		const ppx = this.px * CELL_SIZE
		const ppy = this.py * CELL_SIZE
		const halo = this.ctx.createRadialGradient(ppx + 12, ppy + 21, 2, ppx + 12, ppy + 21, 20)
		halo.addColorStop(0, "rgba(255,220,150,0.30)")
		halo.addColorStop(1, "rgba(255,220,150,0)")
		this.ctx.fillStyle = halo
		this.ctx.beginPath()
		this.ctx.arc(ppx + 12, ppy + 21, 20, 0, Math.PI * 2)
		this.ctx.fill()
		drawSprite(this.ctx, PLAYER_SPRITE, ppx, ppy, {
			frame: Math.floor(this.time * 2.5) % PLAYER_SPRITE.frames.length,
			glow: "rgba(255,224,150,0.85)",
			blur: 14 + Math.sin(this.time * 5) * 4,
		})
		ctx.fillStyle = this.messageColor || String(rgbToFill(TEXT_DIM))
		ctx.fillText(this.message, 4, DUNGEON_ROWS * CELL_SIZE)
		for (let i = 0; i < LOG_ROWS; i++) {
			const entry = this.log[this.log.length - 2 - i]
			if (!entry) break
			ctx.fillStyle = entry.c || String(rgbToFill(TEXT_DIM))
			ctx.fillText(entry.t, 4, (DUNGEON_ROWS + 1 + i) * CELL_SIZE)
		}
		this.particles.draw(ctx)
		ctx.restore()
		if (this.flashA > 0) {
			ctx.globalAlpha = Math.min(0.5, this.flashA)
			ctx.fillStyle = this.flashColor
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
			ctx.globalAlpha = 1
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		if (!this.running) this.drawGameOver()
		this.syncHud()
	}

	// The pack as a DOM panel: readable at any canvas scale, navigable with
	// arrows / d-pad / gamepad and tappable on touch screens.
	private openInventory(): void {
		if (this.potions.length === 0) {
			this.tell("Your pack holds no potions.", "")
			return
		}
		this.inventorySel = 0
		this.showInventory = true
		this.refreshInventory()
		this.invPanel?.classList.remove("hidden")
		this.tell("You open your pack \u2014 choose a phial.")
	}

	private closeInventory(): void {
		this.showInventory = false
		this.invPanel?.classList.add("hidden")
	}

	private invMove(d: number): void {
		if (this.potions.length === 0) return
		this.inventorySel = (this.inventorySel + d + this.potions.length) % this.potions.length
		this.refreshInventory()
	}

	private refreshInventory(): void {
		const list = this.invList
		if (!list) return
		list.innerHTML = ""
		for (let i = 0; i < this.potions.length; i++) {
			const p = this.potions[i] as PotionType
			const known = this.potionKnown[p]
			const li = document.createElement("li")
			if (i === this.inventorySel) li.className = "pick"
			li.setAttribute("role", "button")
			li.setAttribute("aria-label", "Potion slot " + (i + 1))
			const num = document.createElement("b")
			num.textContent = String(i + 1) + "."
			const glyph = document.createElement("span")
			glyph.className = "inv-glyph"
			glyph.textContent = known ? POTION_DEFS[p].glyph : "?"
			glyph.style.color = known ? POTION_DEFS[p].color : "#7a7164"
			const name = document.createElement("span")
			name.className = "inv-name"
			name.textContent = known ? POTION_DEFS[p].name : "UNKNOWN DRAUGHT"
			li.append(num, glyph, name)
			li.addEventListener("click", () => this.quaffSlot(i))
			list.appendChild(li)
		}
	}

	// The trade menu lives in the DOM now: readable at any canvas scale and
	// navigable by arrows, d-pad, gamepad or touch.

	private drawGameOver(): void {
		const ctx = this.ctx
		const top = 0
		const height = DUNGEON_ROWS * CELL_SIZE
		const cx = CANVAS_WIDTH / 2
		const cy = top + height / 2
		ctx.fillStyle = "rgba(5,3,0,0.82)"
		ctx.fillRect(0, top, CANVAS_WIDTH, height)
		ctx.textAlign = "center"
		ctx.font = "bold " + FONT_SIZE * 2 + "px monospace"
		ctx.shadowColor = "rgba(255,106,94,0.9)"
		ctx.shadowBlur = 18
		ctx.fillStyle = "#ff6a5e"
		ctx.fillText("YOU DIED", cx, cy - FONT_SIZE)
		ctx.shadowBlur = 0
		ctx.font = FONT_SIZE + "px monospace"
		ctx.shadowColor = "rgba(255,209,117,0.6)"
		ctx.shadowBlur = 8
		ctx.fillStyle = String(rgbToFill(PLAYER))
		ctx.fillText(this.dead ? "PRESS R TO REINCARNATE" : "YOU ESCAPED — R FOR ANOTHER RUN", cx, cy + FONT_SIZE)
		ctx.shadowBlur = 0
		ctx.textAlign = "left"
	}

	private syncHud(): void {
		setHud("hud-depth", "D" + this.depth)
		setHud("hud-lvl", "LVL " + this.level)
		setHud("hud-xp", "XP " + this.xp + "/" + this.xpNeeded())
		setHud("hud-gold", "GOLD " + this.gold)
		setHud("hud-atk", "ATK " + this.atk)
		const pot = this.potions.map((t) => (this.potionKnown[t] ? POTION_DEFS[t].glyph : "?")).join(" ")
		setHud("hud-potions", (pot || "·") + " (" + this.potions.length + ")" + (this.potions.length >= POTION_CAPACITY ? " MAX" : ""))
		const hp = Math.max(0, this.hp)
		const hpEl = document.getElementById("hud-hp")
		if (hpEl) {
			hpEl.textContent = "HP " + hp + "/" + this.maxHp
			hpEl.style.color = this.dead || this.hp <= this.maxHp / 3 ? "#ff6a5e" : ""
		}
	}
}
