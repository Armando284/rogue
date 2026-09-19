// ROGUE.EXE — mobile touch input: an on-screen D-pad mapped to the 8 move
// keys (arrows + q/e/z/c for diagonals) plus dedicated action keys.
// Mirrors INVADERS.EXE's approach: buttons dispatch the exact same key events
// the keyboard would, keeping the game logic input-agnostic.

const MOVE_KEYS: Record<string, string> = {
	ArrowUp: 'ArrowUp',
	ArrowDown: 'ArrowDown',
	ArrowLeft: 'ArrowLeft',
	ArrowRight: 'ArrowRight',
	q: 'q',
	e: 'e',
	z: 'z',
	c: 'c',
}

const ACTION_KEYS: string[] = [' ', '>', '<', 'Enter', 'Escape', 'm']

export class TouchControls {
	private readonly root: HTMLElement

	constructor(root: HTMLElement) {
		this.root = root
		this.build()
	}

	private build(): void {
		this.root.innerHTML = ''
		const pad = document.createElement('div')
		pad.className = 'touch-pad'
		const dpad = document.createElement('div')
		dpad.className = 'dpad'

		const glyphs: Record<string, string> = {
			q: '↖',
			ArrowUp: '▲',
			e: '↗',
			ArrowLeft: '◀',
			'': '·',
			ArrowRight: '▶',
			z: '↙',
			ArrowDown: '▼',
			c: '↘',
		}

		const order = [
			['q', 'ArrowUp', 'e'],
			['ArrowLeft', '', 'ArrowRight'],
			['z', 'ArrowDown', 'c'],
		]

		for (const row of order) {
			for (const key of row) {
				const btn = document.createElement('button')
				btn.type = 'button'
				btn.className = 'dpad-btn'
				btn.dataset.key = key
				btn.textContent = glyphs[key]
				btn.setAttribute('aria-label', `Move ${key}`)
				btn.addEventListener('pointerdown', (ev) => {
					ev.preventDefault()
					this.press(key)
				})
				btn.addEventListener('pointerup', () => this.release(key))
				btn.addEventListener('pointerleave', () => this.release(key))
				dpad.appendChild(btn)
			}
		}

		pad.appendChild(dpad)

		const actions = document.createElement('div')
		actions.className = 'action-buttons'

		const actionDefs: Array<[string, string, string]> = [
			[' ', 'FIRE/WAIT', 'bump attack'],
			['>', 'STAIRS', 'descend'],
			['!', 'POTION', 'drink'],
			['Enter', 'RUN', 'press to start'],
			['Escape', 'MENU', 'pause help'],
			['m', 'MUTE', 'sound on/off'],
		]

		for (const [key, label, hint] of actionDefs) {
			const btn = document.createElement('button')
			btn.type = 'button'
			btn.className = 'action-btn'
			btn.dataset.key = key
			btn.textContent = label
			btn.title = hint
			btn.setAttribute('aria-label', `${label} (${hint})`)
			btn.addEventListener('pointerdown', (ev) => {
				ev.preventDefault()
				this.press(key)
			})
			btn.addEventListener('pointerup', () => this.release(key))
			btn.addEventListener('pointerleave', () => this.release(key))
			actions.appendChild(btn)
		}

		pad.appendChild(actions)
		this.root.appendChild(pad)
	}

	private press(key: string): void {
		if (key === '') return
		if (MOVE_KEYS[key]) {
			this.send('keydown', key)
		} else if (ACTION_KEYS.includes(key)) {
			this.send('keydown', key)
			// Debounce a synthetic keyup so the game sees a clean press.
			const released = () => {
				this.send('keyup', key)
				window.clearTimeout(this.timeoutId)
			}
			this.timeoutId = window.setTimeout(released, 42)
		}
	}

	private timeoutId = 0


	private release(key: string): void {
		if (key && (MOVE_KEYS[key] || ACTION_KEYS.includes(key))) {
			this.send('keyup', key)
		}
	}

	private send(type: string, key: string): void {
		this.root.dispatchEvent(
			new KeyboardEvent(type, {
				key,
				bubbles: true,
				cancelable: true,
			}),
		)
	}
}
