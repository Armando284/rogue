// ROGUE.EXE — turn-based state shape (pure data, no canvas logic).
// Kept intentionally minimal: the Game class owns all mutation + rendering.

export type Terrain = 'wall' | 'floor' | 'stairs'

export interface Entity {
	x: number
	y: number
}

export interface Enemy extends Entity {
	kind: 'goblin' | 'skeleton'
	hp: number
	maxHp: number
	atk: number
	def: number
	xp: number
}

export interface Pickup extends Entity {
	kind: 'gold' | 'potion'
}

export interface Player {
	x: number
	y: number
	hp: number
	maxHp: number
	level: number
	xp: number
	gold: number
}

export interface GameState {
	depth: number
	player: Player
	enemies: Enemy[]
	items: Pickup[]
	message: string
	messageHistory: string[]
	stairs: Entity
	dungeon: {
		cols: number
		rows: number
		terrain: Terrain[][]
	}
}
