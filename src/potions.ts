// ROGUE.EXE — potions: hidden types (classic Rogue identification), flask
// definitions and weighted spawns.

export type PotionType = 'healing' | 'fire' | 'strength'

export interface PotionDef {
	name: string
	color: string
	dark: string
	glow: string
	price: number
	glyph: string
}

export const POTION_DEFS: Record<PotionType, PotionDef> = {
	healing: { name: 'Healing Potion', color: '#ff7a6e', dark: '#7a1d18', glow: 'rgba(255,106,94,0.55)', price: 10, glyph: '♥' },
	fire: { name: 'Fire Potion', color: '#ffb03a', dark: '#7a4510', glow: 'rgba(255,176,58,0.55)', price: 20, glyph: '☼' },
	strength: { name: 'Potion of Might', color: '#c07bff', dark: '#4a1d66', glow: 'rgba(192,123,255,0.55)', price: 60, glyph: '▲' },
}

export const POTION_TYPES: readonly PotionType[] = ['healing', 'fire', 'strength']

// Weighted pick: healing is the common drop, might is rare.
export function randomPotion(rnd: () => number): PotionType {
	const r = rnd()
	if (r < 0.6) return 'healing'
	if (r < 0.9) return 'fire'
	return 'strength'
}

export function freshKnowledge(): Record<PotionType, boolean> {
	return { healing: true, fire: false, strength: false }
}