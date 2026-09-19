import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32, dailySeed, seedLabel } from './rng.ts'

test('mulberry32 is deterministic for a given seed', () => {
	const seq = (seed: number) => {
		const rng = mulberry32(seed)
		return Array.from({ length: 8 }, () => Math.round(rng() * 100) / 100)
	}

	assert.deepEqual(seq(20260918), seq(20260918))
})

test('mulberry32 outputs are in [0, 1)', () => {
	const rng = mulberry32(99)

	for (let i = 0; i < 500; i++) {
		const v = rng()
		assert.ok(v >= 0 && v < 1)
	}
})

test('different seeds diverge', () => {
	const a = mulberry32(1)()
	const b = mulberry32(2)()
	assert.notEqual(a, b)
})

test('dailySeed is YYYYMMDD in local time', () => {
	assert.equal(dailySeed(new Date(2026, 8, 18)), 20260918)
	assert.equal(dailySeed(new Date(2001, 0, 5)), 20010105)
})

test('seedLabel pads to 8 digits', () => {
	assert.equal(seedLabel(20260918), '20260918')
	assert.equal(seedLabel(123), '00000123')
})
