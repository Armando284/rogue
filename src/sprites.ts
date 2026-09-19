// ROGUE.EXE — embedded pixel-art sprites. No PNG assets: each sprite is a
// small palette plus 8x8 frames of palette keys ('.' = transparent). Rendered
// at integer scale by sprite-draw.ts with nearest-neighbor crunch.

export interface Sprite {
	name: string
	pal: Record<string, string>
	frames: string[][]
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

// Flagstone floor — dark, tread-worn brown so actors and loot pop against it.
const FLOOR_PAL = { f: '#5f4a2e', d: '#372a16' }

export const FLOOR_A: Sprite = {
	name: 'floor-a',
	pal: FLOOR_PAL,
	frames: [
		[
			'ffffffff',
			'ffffffff',
			'ffdfffff',
			'fffdddff',
			'ffdfffff',
			'ffffffff',
			'fffffffd',
			'ffffffff',
		],
	],
}

export const FLOOR_B: Sprite = {
	name: 'floor-b',
	pal: FLOOR_PAL,
	frames: [
		[
			'ffffffff',
			'ffffffff',
			'ffffffff',
			'fdfffffd',
			'ffffffff',
			'ffffffff',
			'ffffffff',
			'ffffffdd',
		],
	],
}

export const FLOOR_C: Sprite = {
	name: 'floor-c',
	pal: FLOOR_PAL,
	frames: [
		[
			'ffffffff',
			'ffffffff',
			'fffffffd',
			'ffffffff',
			'ffffffff',
			'ffdddfff',
			'ffffffff',
			'ffffffff',
		],
	],
}

// Stone wall — desaturated slate brick, stacked courses with mortar.
const WALL_PAL = { w: '#6c7868', k: '#1b1e19', d: '#434b42' }

export const WALL_A: Sprite = {
	name: 'wall-a',
	pal: WALL_PAL,
	frames: [
		[
			'wwdwwwww',
			'wwwkwwww',
			'kkdkkkkk',
			'wwwdwwww',
			'wdwkdwww',
			'kkkkkkkk',
			'wwwwdwww',
			'wwwkwwww',
		],
	],
}

export const WALL_B: Sprite = {
	name: 'wall-b',
	pal: WALL_PAL,
	frames: [
		[
			'wwwwwwww',
			'wwwkwwww',
			'kkkkkkkk',
			'wwwwwwww',
			'wwwkwwww',
			'kkkkkkkk',
			'wwwwdwww',
			'wwwwwwww',
		],
	],
}

// Stairs — the cyan portal downward, two frames rotating.
const STAIRS_PAL = { c: '#63c9d9', d: '#205c66', o: '#d8f6f8' }

export const STAIRS_SPRITE: Sprite = {
	name: 'stairs',
	pal: STAIRS_PAL,
	frames: [
		[
			'..cccc..',
			'.cddddc.',
			'.cd..dc.',
			'.cd.odc.',
			'.cd..dc.',
			'.cddddc.',
			'..cccc..',
			'........',
		],
		[
			'..cccc..',
			'.cddddc.',
			'.cd..dc.',
			'.cc.ooc.',
			'.c....c.',
			'.cddddc.',
			'..cccc..',
			'........',
		],
	],
}

// Merchant stall — a gold-lit tent with a counter.
const MERCHANT_PAL = { w: '#ffe08a', r: '#b0702c', d: '#ffb03a', k: '#241405' }

export const MERCHANT: Sprite = {
	name: 'merchant',
	pal: MERCHANT_PAL,
	frames: [
		[
			'..ww....',
			'.wwww...',
			'.wrdw...',
			'.wwww...',
			'.kkkk...',
			'd..k.k..',
			'...k.k..',
			'........',
		],
	],
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

// Coin pile with a faint gleam frame.
const GOLD_PAL = { g: '#ffd660', d: '#8a6a14', l: '#fff3c4' }

export const GOLD_SPRITE: Sprite = {
	name: 'gold',
	pal: GOLD_PAL,
	frames: [
		[
			'........',
			'...gg...',
			'..gllg..',
			'..dddd..',
			'.dggggd.',
			'.ddggdd.',
			'.dggggd.',
			'........',
		],
		[
			'........',
			'...gg...',
			'..gglg..',
			'..dddd..',
			'.dggggd.',
			'.ddggdd.',
			'.dggggd.',
			'........',
		],
	],
}

// One flask silhouette, tinted per potion type with `overrides` (see game.ts).
const FLASK_PAL = { b: '#ffd892', g: '#ff7a6e', d: '#7a1d18' }

export const FLASK: Sprite = {
	name: 'flask',
	pal: FLASK_PAL,
	frames: [
		[
			'..ggg...',
			'.ggggg..',
			'.gbbbg..',
			'.gg.gg..',
			'.ggggg..',
			'.gggggg.',
			'..gggg..',
			'........',
		],
	],
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

// The hero — the brightest thing on screen. Cream-white hood with a white
// gleam, hot amber cape, near-black rim so he reads against any floor.
export const PLAYER: Sprite = {
	name: 'player',
	pal: {
		a: '#fff3c4', // hood light
		b: '#ffb83a', // amber cape
		y: '#ffffff', // gleam
		e: '#3a1f06', // eyes
		k: '#191004', // outline rim
	},
	frames: [
		[
			'..kk....',
			'.kayk...',
			'.kay.k..',
			'..kk....',
			'.kbbbk..',
			'kbbkbbk.',
			'kbbkbbk.',
			'..kk....',
		],
		[
			'..kk....',
			'.kayk...',
			'.kay.k..',
			'..kk....',
			'.kbbbk..',
			'kb.b.bbk',
			'kbbkkbb.',
			'..k.kk..',
		],
	],
}

// Goblin — blade-green face, ember eyes, two-step scurry.
const GOBLIN_PAL = { g: '#7bc96b', e: '#ff5a3c', k: '#1a2a12' }

export const GOBLIN: Sprite = {
	name: 'goblin',
	pal: GOBLIN_PAL,
	frames: [
		[
			'.ggggg..',
			'ggggggg.',
			'geeggge.',
			'ggggggg.',
			'.ggggg..',
			'ggg.ggg.',
			'.g...g..',
			'........',
		],
		[
			'.ggggg..',
			'ggggggg.',
			'geeggge.',
			'ggggggg.',
			'.ggggg..',
			'gg...gg.',
			'..g..g..',
			'........',
		],
	],
}

// Skeleton — bare-bone shuffler, joints in shadow.
const SKELETON_PAL = { b: '#e6dfc8', d: '#9b9178', k: '#2a261d' }

export const SKELETON: Sprite = {
	name: 'skeleton',
	pal: SKELETON_PAL,
	frames: [
		[
			'.bbbb...',
			'bbbbbb..',
			'bkkbkkb.',
			'.bbbb...',
			'bb..bb..',
			'.bbbb...',
			'.b..b...',
			'........',
		],
		[
			'.bbbb...',
			'bbbbbb..',
			'bkkbkkb.',
			'.bbbb...',
			'bb..bb..',
			'.bbbb...',
			'..b.b...',
			'........',
		],
	],
}

// Troll — the brutish guardian of floor 5.
const TROLL_PAL = { t: '#4e7a44', d: '#233b20', e: '#ffb03a', k: '#0f180e' }

export const TROLL: Sprite = {
	name: 'troll',
	pal: TROLL_PAL,
	frames: [
		[
			't.ttttt.',
			'.tttttt.',
			'.tette..',
			'.tttttt.',
			'tttttttt',
			'tt.tt.tt',
			'.tt..t..',
			'........',
		],
		[
			't.ttttt.',
			'.tttttt.',
			'.tette..',
			'.tttttt.',
			'tttttttt',
			'tt.tt.tt',
			'..t..t..',
			'........',
		],
	],
}

// The Bone King — pale lord of floor 10, small crown catching light.
const KING_PAL = { b: '#d9cfae', d: '#8f866c', e: '#ff5a3c', c: '#ffd660', k: '#1c1912' }

export const KING: Sprite = {
	name: 'king',
	pal: KING_PAL,
	frames: [
		[
			'.c.c.c..',
			'.cccc...',
			'bbbbbb..',
			'beeb.be.',
			'bbbbbb..',
			'b.bb.b..',
			'.b..b...',
			'........',
		],
		[
			'.c.c.c..',
			'.cccc...',
			'bbbbbb..',
			'beeb.be.',
			'bbbbbb..',
			'b.bb.b..',
			'..b.b...',
			'........',
		],
	],
}

// The Ember Wyrm — the deep's guardian, floor 15.
const DRAGON_PAL = { r: '#b4453a', o: '#e8762c', d: '#4e1510', e: '#ffd660', k: '#1a0705' }

export const DRAGON: Sprite = {
	name: 'dragon',
	pal: DRAGON_PAL,
	frames: [
		[
			'..rr....',
			'..rro...',
			'.rrrro..',
			'rerrro..',
			'rrrrooo.',
			'.rr.rr..',
			'..o..o..',
			'........',
		],
		[
			'..rr....',
			'..rro...',
			'.rrrro..',
			'rerrro..',
			'rrrrooo.',
			'.rr.rr..',
			'..o..o..',
			'........',
		],
	],
}

export const ENEMY_SPRITES: Record<string, Sprite> = {
	goblin: GOBLIN,
	skeleton: SKELETON,
	'troll': TROLL,
	'king': KING,
	'dragon': DRAGON,
}