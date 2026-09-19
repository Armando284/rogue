import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rectsOverlap, rectContains, manhattan, keyOf } from './geometry.ts'

test('rectsOverlap detects touching rectangles', () => {
	assert.equal(rectsOverlap({ x: 0, y: 0, w: 5, h: 5 }, { x: 5, y: 0, w: 5, h: 5 }), false)
	assert.equal(rectsOverlap({ x: 0, y: 0, w: 5, h: 5 }, { x: 4, y: 0, w: 2, h: 5 }), true)
	assert.equal(rectsOverlap({ x: 0, y: 0, w: 5, h: 5 }, { x: 5, y: 0, w: 2, h: 5 }, 0), false)
	assert.equal(rectsOverlap({ x: 0, y: 0, w: 5, h: 5 }, { x: 4, y: 0, w: 2, h: 5 }, 0), true)
})

test('rectContains checks inclusive-left exclusive-right', () => {
	const r = { x: 2, y: 3, w: 4, h: 5 }
	assert.equal(rectContains(r, { x: 2, y: 3 }), true)
	assert.equal(rectContains(r, { x: 5, y: 7 }), true)
	assert.equal(rectContains(r, { x: 6, y: 8 }), false)
	assert.equal(rectContains(r, { x: 1, y: 3 }), false)
})

test('manhattan distance', () => {
	assert.equal(manhattan({ x: 0, y: 0 }, { x: 3, y: 4 }), 7)
	assert.equal(manhattan({ x: 5, y: 5 }, { x: 5, y: 5 }), 0)
})

test('keyOf round-trips a coordinate', () => {
	assert.equal(keyOf(12, 7), '12,7')
})
