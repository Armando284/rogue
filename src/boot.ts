// ROGUE.EXE boot overlay — amber CRT splash. Contract: `new Boot()` + `boot.start(cb)`.
import { dailySeed, seedLabel } from "./rng.ts"
import { BOOT_LINES } from "./lore.ts"
import { PadPoll } from "./gamepad.ts"

const SEED_LINE = "Today dungeon is seeded for everyone; the seed changes at midnight."

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
		const glyphs = BOOT_LINES
		this.text.innerHTML =
			glyphs
				.map((l) => (l === "" ? "<br>" : `<div>${h(l)}</div>`))
				.join("") +
			`<div class="seed">${h(SEED_LINE)} — SEED ${h(seedLabel(seed))}</div>`
		this.overlay.classList.remove("hidden")
		this.overlay.classList.add("shown")
		const go = (): void => {
			if (this.done) return
			this.done = true
			this.overlay.classList.add("hidden")
			this.overlay.classList.remove("shown")
			window.removeEventListener("keydown", onKey)
			cancelAnimationFrame(raf)
			cb()
		}
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Enter" || e.key === " ") go()
		}
		window.addEventListener("keydown", onKey)
		this.overlay.addEventListener("click", go, { once: true })
		const padPoll = new PadPoll((t) => {
			if (t === "enter") go()
		})
		let raf = 0
		const loop = (): void => {
			if (this.done) {
				cancelAnimationFrame(raf)
				return
			}
			padPoll.poll(performance.now() / 1000)
			raf = requestAnimationFrame(loop)
		}
		raf = requestAnimationFrame(loop)
	}
}

function h(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
