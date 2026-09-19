// ROGUE.EXE — gamepad support. Polls the first connected pad each frame,
// turns button edges into one-shot input tokens and gives directionals a
// classic repeat rate (hold to move). Everything maps to the same tokens the
// keyboard uses, so the game logic stays input-agnostic.

export type PadToken =
	| 'w' | 's' | 'a' | 'd'
	| 'q' | 'e' | 'z' | 'c'
	| 'enter' | 'escape' | 'space' | 'i' | 'p' | 'b' | 'r'

// Standard mapping table (buttons in the browser Gamepad API):
//   0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 8=Select/Back, 9=Start, 12..15=d-pad.
const PAD_BUTTONS: ReadonlyArray<[number, PadToken]> = [
	[0, 'enter'],  // A — confirm / quaff / start
	[1, 'escape'], // B — cancel / close
	[9, 'enter'],  // Start — confirm
	[8, 'i'],      // Select — open/close the pack
	[3, 'b'],      // Y — trade with a nearby merchant
	[2, 'p'],      // X — quaff the first carried potion
	[5, 'r'],      // RB — reincarnate after death
]

const STICK_DEAD = 0.45
const REPEAT_FIRST = 0.28
const REPEAT_NEXT = 0.13

export class PadPoll {
	private prev = new Uint8Array(32)
	private dir = ''
	private repeatAt = 0

	constructor(private readonly emit: (token: string) => void) {}

	poll(now: number): void {
		const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : []
		const pad = pads[0]
		if (!pad) return

		const cur = new Uint8Array(32)
		for (let i = 0; i < pad.buttons.length && i < 32; i++) {
			cur[i] = pad.buttons[i]?.pressed ? 1 : 0
		}
		for (const [id, token] of PAD_BUTTONS) {
			if (cur[id] === 1 && this.prev[id] === 0) this.emit(token)
		}

		const left = cur[14] === 1
		const right = cur[15] === 1
		const up = cur[12] === 1
		const down = cur[13] === 1
		const ax = pad.axes[0] ?? 0
		const ay = pad.axes[1] ?? 0

		const dx = right ? 1 : left ? -1 : Math.abs(ax) > STICK_DEAD ? Math.sign(ax) : 0
		const dy = down ? 1 : up ? -1 : Math.abs(ay) > STICK_DEAD ? Math.sign(ay) : 0
		let dir = ''
		if (dy < 0) dir = dx < 0 ? 'q' : dx > 0 ? 'e' : 'w'
		else if (dy > 0) dir = dx < 0 ? 'z' : dx > 0 ? 'c' : 's'
		else if (dx < 0) dir = 'a'
		else if (dx > 0) dir = 'd'

		if (dir !== this.dir) {
			this.dir = dir
			if (dir) {
				this.emit(dir)
				this.repeatAt = now + REPEAT_FIRST
			}
		} else if (dir && now >= this.repeatAt) {
			this.emit(dir)
			this.repeatAt = now + REPEAT_NEXT
		}

		this.prev.set(cur)
	}
}