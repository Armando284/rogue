import './style.css'
import { Game } from './game.ts'
import { Boot } from './boot.ts'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants.ts'
import { TouchControls } from './touch-controls.ts'
import { installLegendIcons } from './legend-icons.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game')

if (!canvas) {
	throw new Error('Canvas element not found')
}

const context = canvas.getContext('2d')

if (!context) {
	throw new Error('Failed to get 2D context')
}

canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT

const game = new Game(context)
const boot = new Boot()

installLegendIcons()

boot.start(() => {
	game.unlockAudio()
	game.start()
})

const touchRoot = document.getElementById('touch-controls')

if (touchRoot) {
	new TouchControls(touchRoot)
}
