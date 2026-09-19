// ROGUE.EXE — lore: classic dungeon fantasy, printed between iron bars.

export const BOOT_LINES: string[] = [
	'ROGUE.EXE',
	'',
	'The mountain swallows the road. Beneath the Keep of Kalathe',
	'a maze of iron and old stone still holds the last vein of the',
	'Cursed Crown. Kings died to seal it; merchants still fence the',
	'compass that leads to it. You have that compass, a single torch,',
	'and a dawn that forgets you hold either.',
	'',
	'WASD / QEZC move, bump to fight. Space waits a turn.',
	'P drinks a carried potion, B trades with a merchant.',
	'Walk the > stairs down. Guardians bar floors 5, 10 and 15.',
	'Every run is permadeath; the seed changes at midnight.',
	'',
	'PRESS ENTER / TAP TO START',
]

export const BOSS_INTRO: Record<number, string> = {
	5: 'Stone groans overhead. GRAM THE BRUTE rules this tier, club of black oak in hand.',
	10: 'The air thins into frost. THE BONE KING sits enthroned in the gloom of tier ten.',
	15: 'Below, light lies wounded. THE EMBER WYRM coils around the last stairhead.',
}

export const BOSS_KILL: Record<number, string> = {
	5: 'Gram the Brute collapses; the club sinks into the floor like a tombstone.',
	10: "The Bone King's crown rolls free and is still. The cold lifts from the stone.",
	15: 'The Ember Wyrm exhales once more, and does not. The deep is open at last.',
}

export const WIN_LINE =
	'Dawn finds you at the mountain\u2019s edge, crown-gold burning warm in your hands.'