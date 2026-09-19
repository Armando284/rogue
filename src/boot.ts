// ROGUE.EXE boot overlay — amber CRT splash. Contract: `new Boot()` + `boot.start(cb)`.
import { dailySeed, seedLabel } from "./rng.ts"

const LINES = [
	"ROGUE.EXE",
	"",
	"You claw through crumbling stone toward a claim of gold.",
	"Six depths. Permadeath. Today dungeon is seeded for everyone.",
	"",
	"WASD / QEZC to move, bump to fight, walk over items to claim them,",
	"hit the > stairs to descend. Space waits a turn.",
	"",
	"PRESS ENTER / TAP TO START",
]

export class Boot {
	private readonly overlay: HTMLElement
	private readonly text: HTMLElement
	private done = false

	constructor() {
		const overlay = document.getElementById("boot")
		const text = document.getElementById("boot-text")
		if (!overlay || !text) throw new Error("rogue boot overlay missing")
		this.overlay = overlay
		this.text = text
	}

	start(cb: () => void): void {
		this.done = false
		const seed = dailySeed()
		const glyphs = LINES
		this.text.innerHTML =
			glyphs
				.map((l) => (l === "" ? "<br>" : `<div>${h(l)}</div>`))
				.join("") +
			`<div class="seed">SEED ${h(seedLabel(seed))}</div>`
		this.overlay.classList.remove("hidden")
		this.overlay.classList.add("shown")
		const go = (): void => {
			if (this.done) return
			this.done = true
			this.overlay.classList.add("hidden")
			this.overlay.classList.remove("shown")
			window.removeEventListener("keydown", onKey)
			cb()
		}
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Enter" || e.key === " ") go()
		}
		window.addEventListener("keydown", onKey)
		this.overlay.addEventListener("click", go, { once: true })
	}
}

function h(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
