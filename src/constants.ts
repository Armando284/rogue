export const CORRIDOR_T = 3
export const ENEMY_DENSITY = 7
export const CELL_SIZE = 24
export const FONT_SIZE = 24
export const LOG_ROWS = 3
export const LOG_HISTORY = 500
export const DUNGEON_COLS = 48
export const DUNGEON_ROWS = 26
export const CANVAS_WIDTH = DUNGEON_COLS * CELL_SIZE
export const CANVAS_HEIGHT = (DUNGEON_ROWS + 1 + LOG_ROWS) * CELL_SIZE
export const ROOM_MIN_W = 4
export const ROOM_MAX_W = 10
export const ROOM_MIN_H = 3
export const ROOM_MAX_H = 7
export const MAX_ROOM_ATTEMPTS = 220
export const ROOM_SPACING = 3
export const STAIRS_CHAR = '>'
export const GOLD_CHAR = '$'
export const GOLD_VALUE = 10
export const POTION_CHAR = '!'
export const POTION_HEAL = 10
export const MAX_PLAYER_HP = 20
export const PLAYER_ATK = 6
export const PLAYER_DEF = 2
export const START_XP = 0
export const START_GOLD = 0
export const MAX_DEPTH = 15
export const POTION_CAPACITY = 6
export const FIRE_DAMAGE = 4
export const STRENGTH_BONUS = 1
export const SHOP_FLOORS: ReadonlySet<number> = new Set([3, 6, 9, 12])
export type EnemyKindName = 'goblin' | 'skeleton' | 'troll' | 'king' | 'dragon'
export interface BossStats {
	kind: EnemyKindName
	hp: number
	atk: number
	def: number
	xp: number
	glyph: string
	color: string
	glow: string
}
export const BOSSES: Record<number, BossStats> = {
	5: { kind: 'troll', hp: 45, atk: 8, def: 1, xp: 50, glyph: 'T', color: '#4e7a44', glow: 'rgba(78,122,68,0.6)' },
	10: { kind: 'king', hp: 70, atk: 11, def: 2, xp: 90, glyph: 'S', color: '#d9cfae', glow: 'rgba(217,207,174,0.6)' },
	15: { kind: 'dragon', hp: 110, atk: 14, def: 3, xp: 200, glyph: 'D', color: '#b4453a', glow: 'rgba(255,106,94,0.7)' },
}
export const MSG_COLOR_HIT = '#ffd886'
export const MSG_COLOR_DAMAGE = '#ff6a5e'
export const MSG_COLOR_GAIN = '#ffd660'
export const MSG_COLOR_HEAL = '#84ef9a'
export const MSG_COLOR_LEVEL = '#c07bff'
export const MSG_COLOR_DESCEND = '#63c9d9'
export const MSG_COLOR_GOLD = '#ffd660'