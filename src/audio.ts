// ROGUE.EXE — chiptune audio: square/triangle-wave blips synthesized with the
// Web Audio API. No samples, no assets — pure 8-bit console SFX.

type Wave = OscillatorType

export class Sfx {
	muted = false

	private ctx: AudioContext | null = null
	private noiseBuf: AudioBuffer | null = null

	// Must be called from a user gesture (boot's Enter) to clear the autoplay gate.
	unlock(): void {
		const ctx = this.ensure()
		if (ctx && ctx.state === "suspended") {
			void ctx.resume().catch(() => undefined)
		}
	}

	private ensure(): AudioContext | null {
		if (this.ctx) return this.ctx
		const Ctor =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (!Ctor) return null
		try {
			this.ctx = new Ctor()
		} catch {
			this.ctx = null
		}
		return this.ctx
	}

	private tone(
		freq: number,
		dur: number,
		wave: Wave = "square",
		vol = 0.04,
		when = 0,
		slideTo = 0,
	): void {
		const ctx = this.ensure()
		if (!ctx || ctx.state !== "running" || this.muted) return
		const t = ctx.currentTime + when
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.type = wave
		const f0 = Math.max(1, freq)
		osc.frequency.setValueAtTime(f0, t)
		if (slideTo !== 0 && slideTo !== f0) {
			osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur)
		}
		gain.gain.setValueAtTime(vol, t)
		gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		osc.connect(gain)
		gain.connect(ctx.destination)
		osc.start(t)
		osc.stop(t + dur + 0.02)
	}

	private noise(dur: number, vol = 0.04, when = 0): void {
		const ctx = this.ensure()
		if (!ctx || ctx.state !== "running" || this.muted) return
		if (!this.noiseBuf) {
			const len = Math.floor(ctx.sampleRate * 0.5)
			this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
			const data = this.noiseBuf.getChannelData(0)
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
		}
		const t = ctx.currentTime + when
		const src = ctx.createBufferSource()
		src.buffer = this.noiseBuf
		const gain = ctx.createGain()
		gain.gain.setValueAtTime(vol, t)
		gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
		src.connect(gain)
		gain.connect(ctx.destination)
		src.start(t)
		src.stop(t + dur + 0.02)
	}

	step(): void {
		this.tone(70, 0.03, "square", 0.018, 0, 45)
	}

	block(): void {
		this.noise(0.06, 0.03)
	}

	hit(): void {
		this.tone(160, 0.07, "square", 0.05, 0, -70)
	}

	kill(): void {
		this.tone(520, 0.09, "square", 0.05)
		this.tone(840, 0.14, "triangle", 0.05, 0.07)
		this.noise(0.12, 0.03, 0.06)
	}

	damage(): void {
		this.tone(320, 0.1, "sawtooth", 0.05, 0, -110)
		this.noise(0.08, 0.03)
	}

	death(): void {
		this.tone(440, 0.45, "square", 0.06, 0, -320)
		this.noise(0.3, 0.05, 0.06)
	}

	gold(): void {
		this.tone(988, 0.05, "square", 0.04)
		this.tone(1319, 0.1, "square", 0.04, 0.055)
	}

	potion(): void {
		this.tone(523, 0.08, "triangle", 0.05)
		this.tone(659, 0.08, "triangle", 0.05, 0.09)
		this.tone(784, 0.16, "triangle", 0.05, 0.18)
	}

	level(): void {
		this.tone(523, 0.09, "square", 0.05)
		this.tone(659, 0.09, "square", 0.05, 0.1)
		this.tone(784, 0.09, "square", 0.05, 0.2)
		this.tone(1047, 0.18, "square", 0.05, 0.3)
	}

	descend(): void {
		this.tone(320, 0.1, "square", 0.05, 0, 540)
		this.tone(660, 0.16, "square", 0.05, 0.11)
	}

	win(): void {
		for (const [i, f] of [523, 659, 784, 1047, 1319].entries()) {
			this.tone(f, 0.15, "triangle", 0.05, i * 0.12)
		}
	}
}